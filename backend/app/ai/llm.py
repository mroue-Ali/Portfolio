"""
One call to one model, whichever vendor is in .env.

Every provider here has a free tier that needs no card. Three of them speak the
OpenAI chat-completions shape, so they share a single request builder and differ
only in base URL and model name; Gemini gets its own because its body is a
different shape entirely.

Nothing above this module knows which one is configured. `complete()` takes a
system prompt and a question and returns text — swapping vendors is an .env edit.
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterator
from contextvars import ContextVar
from dataclasses import dataclass

import httpx

from ..config import settings


class LLMError(RuntimeError):
    """Anything that stopped us getting text back. Always caught upstream."""

    def __init__(self, message: str, *, status: int = 0, body: str = ""):
        super().__init__(message)
        #: HTTP status, 0 when we never got a response.
        self.status = status
        #: Raw error body, so a caller can tell one 400 from another.
        self.body = body


@dataclass(frozen=True)
class Provider:
    #: "openai" for the chat-completions shape, "gemini" for Google's.
    dialect: str
    base_url: str
    model: str
    #: Where to sign up for a key.
    docs: str
    #: Smaller sibling for the routing call, which only has to pick table names.
    #: Empty means "no cheaper option — use `model` for both".
    router_model: str = ""


#: Defaults per provider, all free to sign up for. `AI_MODEL` / `AI_BASE_URL`
#: override the model and host without needing a new entry here.
PROVIDERS: dict[str, Provider] = {
    # Fastest of the four by a wide margin, and the free tier is generous.
    # Groq rotates its catalogue — `GET /openai/v1/models` with your key is the
    # only reliable list, and a stale name here is a 404, not a fallback.
    "groq": Provider(
        dialect="openai",
        base_url="https://api.groq.com/openai/v1",
        model="openai/gpt-oss-120b",
        router_model="openai/gpt-oss-20b",
        docs="https://console.groq.com/keys",
    ),
    # Largest free daily quota; best choice if Groq's rate limit bites.
    "gemini": Provider(
        dialect="gemini",
        base_url="https://generativelanguage.googleapis.com/v1beta",
        model="gemini-2.0-flash",
        router_model="gemini-2.0-flash-lite",
        docs="https://aistudio.google.com/apikey",
    ),
    # One key, many models. The `:free` suffix is what keeps it free.
    "openrouter": Provider(
        dialect="openai",
        base_url="https://openrouter.ai/api/v1",
        model="meta-llama/llama-3.3-70b-instruct:free",
        docs="https://openrouter.ai/keys",
    ),
    # No key, no network: a model running on this machine.
    "ollama": Provider(
        dialect="openai",
        base_url="http://localhost:11434/v1",
        model="llama3.1",
        docs="https://ollama.com/download",
    ),
}


#: Set once per request by `use_models`, so `complete` and `stream` can pick up
#: the CMS's choice without every call site threading it through.
#:
#: A ContextVar rather than a module global, and the distinction matters: sync
#: endpoints run in a threadpool, so a plain global is shared by every request
#: in flight. Two visitors asking at once would race, and the loser would be
#: answered by the other's model — with nothing in the log to explain it.
#: anyio copies the context into the worker thread, so this stays per-request.
_override: ContextVar[tuple[str, str]] = ContextVar("ai_models", default=("", ""))


def use_models(model: str = "", router_model: str = "") -> None:
    """
    Point this request's calls at the models chosen in the CMS.

    Empty strings mean "whatever `.env` or the provider default says", which is
    also the state a fresh install is in.
    """
    _override.set((model or "", router_model or ""))


def provider() -> Provider:
    """
    The configured provider.

    Precedence, most specific first: the CMS choice, then `.env`, then the
    provider's own default. A model retired upstream is then a dropdown change,
    an .env edit, or a release — in that order of effort.
    """
    name = (settings.ai_provider or "").strip().lower()
    base = PROVIDERS.get(name)
    if base is None:
        raise LLMError(
            f"AI_PROVIDER={name!r} is not one of {', '.join(sorted(PROVIDERS))}"
        )
    chosen, chosen_router = _override.get()
    return Provider(
        dialect=base.dialect,
        base_url=(settings.ai_base_url or base.base_url).rstrip("/"),
        model=chosen or settings.ai_model or base.model,
        router_model=chosen_router or settings.ai_router_model or base.router_model,
        docs=base.docs,
    )


def complete(
    system: str, user: str, *, router: bool = False, json_object: bool = False
) -> str:
    """
    Send one turn, get the reply text.

    `router` picks the provider's smaller model where it has one — the routing
    call only has to choose table names. `json_object` asks for machine-readable
    output; it is a hint, not a guarantee, which is why `parse_json` below
    assumes the reply may still arrive wrapped in prose or a code fence.
    """
    p = provider()
    model = (p.router_model or p.model) if router else p.model

    if p.dialect == "gemini":
        return _gemini(p, model, system, user, json_object)
    return _openai(p, model, system, user, json_object)


def _openai(p: Provider, model: str, system: str, user: str, json_object: bool) -> str:
    body: dict = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
        "max_tokens": settings.ai_max_output_tokens,
    }
    if json_object:
        body["response_format"] = {"type": "json_object"}

    headers = {"content-type": "application/json"}
    # Ollama serves the same shape without auth; everyone else needs the key.
    if settings.ai_api_key:
        headers["authorization"] = f"Bearer {settings.ai_api_key}"

    url = f"{p.base_url}/chat/completions"
    try:
        data = _post(url, body, headers)
    except LLMError as exc:
        # Some models reason out loud and blow their own JSON guarantee, which
        # the provider reports as a 400 rather than returning the text. Asking
        # again without the constraint gets a reply that `parse_json` can
        # usually still salvage — better than failing the whole question.
        if exc.status != 400 or "json_validate_failed" not in exc.body:
            raise
        body.pop("response_format", None)
        data = _post(url, body, headers)

    try:
        return data["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMError(f"unexpected response shape from {p.base_url}") from exc


def _gemini(p: Provider, model: str, system: str, user: str, json_object: bool) -> str:
    body: dict = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": settings.ai_max_output_tokens,
        },
    }
    if json_object:
        body["generationConfig"]["responseMimeType"] = "application/json"

    url = f"{p.base_url}/models/{model}:generateContent"
    data = _post(url, body, {"content-type": "application/json"}, params={"key": settings.ai_api_key})
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"] or ""
    except (KeyError, IndexError, TypeError) as exc:
        # A safety block returns 200 with no candidates — same handling as a
        # malformed body: give up and let the caller fall back to keywords.
        raise LLMError(f"no text in response from {model}") from exc


def _post(url: str, body: dict, headers: dict, params: dict | None = None) -> dict:
    try:
        response = httpx.post(
            url,
            json=body,
            headers=headers,
            params=params,
            timeout=settings.ai_timeout,
        )
    except httpx.HTTPError as exc:
        raise LLMError(f"{exc.__class__.__name__} calling {url}") from exc

    if response.status_code >= 400:
        # Truncated in the message: provider errors can echo the prompt back.
        raise LLMError(
            f"{response.status_code} from {url}: {response.text[:300]}",
            status=response.status_code,
            body=response.text,
        )
    try:
        return response.json()
    except ValueError as exc:
        raise LLMError(f"non-JSON body from {url}") from exc


def stream(system: str, user: str) -> Iterator[str]:
    """
    The same call as `complete`, yielding text as it is generated.

    Only the answering step streams — routing returns a few tokens of JSON that
    nobody reads until it is whole. JSON mode is deliberately not offered here:
    a streamed answer is prose going straight to the page, so there is nothing
    to parse and no reason to make the model wrap it in a envelope first.

    Raises `LLMError` before the first chunk if the request fails. After that a
    connection can still drop mid-sentence — see `pipeline.stream_answer`, which
    is what decides whether a partial answer is better than no answer.
    """
    p = provider()
    if p.dialect == "gemini":
        yield from _gemini_stream(p, system, user)
    else:
        yield from _openai_stream(p, system, user)


def _openai_stream(p: Provider, system: str, user: str) -> Iterator[str]:
    body = {
        "model": p.model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
        "max_tokens": settings.ai_max_output_tokens,
        "stream": True,
    }
    headers = {"content-type": "application/json"}
    if settings.ai_api_key:
        headers["authorization"] = f"Bearer {settings.ai_api_key}"

    url = f"{p.base_url}/chat/completions"
    for payload in _sse(url, body, headers):
        if payload == "[DONE]":
            return
        try:
            delta = json.loads(payload)["choices"][0].get("delta", {})
        except (ValueError, KeyError, IndexError):
            continue  # keep-alives and comment frames
        text = delta.get("content")
        if text:
            yield text


def _gemini_stream(p: Provider, system: str, user: str) -> Iterator[str]:
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": settings.ai_max_output_tokens,
        },
    }
    url = f"{p.base_url}/models/{p.model}:streamGenerateContent"
    params = {"key": settings.ai_api_key, "alt": "sse"}
    for payload in _sse(url, body, {"content-type": "application/json"}, params):
        try:
            parts = json.loads(payload)["candidates"][0]["content"]["parts"]
        except (ValueError, KeyError, IndexError):
            continue
        for part in parts:
            if part.get("text"):
                yield part["text"]


def _sse(
    url: str, body: dict, headers: dict, params: dict | None = None
) -> Iterator[str]:
    """
    `data:` payloads from a server-sent-events response.

    The 4xx check happens inside the `stream` context because the status arrives
    with the headers, before any body — which is what lets the caller fall back
    cleanly on a bad key or a dead model rather than mid-answer.
    """
    try:
        with httpx.stream(
            "POST", url, json=body, headers=headers, params=params,
            timeout=settings.ai_timeout,
        ) as response:
            if response.status_code >= 400:
                response.read()
                raise LLMError(
                    f"{response.status_code} from {url}: {response.text[:300]}",
                    status=response.status_code,
                    body=response.text,
                )
            for line in response.iter_lines():
                if line.startswith("data:"):
                    yield line[5:].strip()
    except httpx.HTTPError as exc:
        raise LLMError(f"{exc.__class__.__name__} streaming {url}") from exc


_FENCE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


def parse_json(text: str) -> dict:
    """
    Best-effort JSON out of a model's reply.

    Free-tier models honour `response_format` unevenly, so this peels a code
    fence and, failing that, takes the outermost braces before giving up.
    """
    raw = (text or "").strip()
    if not raw:
        raise LLMError("empty reply")

    fenced = _FENCE.search(raw)
    if fenced:
        raw = fenced.group(1)

    for candidate in (raw, raw[raw.find("{") : raw.rfind("}") + 1]):
        if not candidate:
            continue
        try:
            parsed = json.loads(candidate)
        except ValueError:
            continue
        if isinstance(parsed, dict):
            return parsed

    raise LLMError(f"reply was not JSON: {raw[:200]}")
