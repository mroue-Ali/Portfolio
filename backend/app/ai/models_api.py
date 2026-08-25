"""
What the configured key can actually reach, asked at the time of asking.

The dropdown in the CMS is built from this rather than from a list in code, for
the reason that already bit this project once: Groq retired every Llama model,
the hard-coded default became a 404, and nothing in the codebase could have
known. A live list cannot go stale.

The filtering is a filter, not a guarantee. Providers do not label which models
take a chat turn, so the non-chat families are excluded by name — accurate today,
and wrong the first time someone ships `whisper-4-chat`. A model that slips
through fails loudly on the next question rather than silently, and the fix is
picking a different entry in the same dropdown.
"""

from __future__ import annotations

import httpx

from ..config import settings
from .llm import LLMError, provider

#: Families that exist for something other than answering a question. Matched as
#: substrings against the model id, lowercased.
NOT_CHAT = (
    "whisper",      # speech to text
    "tts",          # text to speech
    "orpheus",      # ditto, under a brand name rather than a description
    "embed",        # embeddings
    "rerank",
    "moderation",
    "guard",        # prompt-injection and safety classifiers
    "safeguard",
    "-vision-only",
)


def available() -> list[dict]:
    """
    Chat models the configured provider offers this key, newest names first.

    Returns `[{id, label, free}]`. Raises `LLMError` if the provider cannot be
    reached — the CMS shows that message rather than an empty dropdown, because
    "no models" and "your key is wrong" are different problems.
    """
    p = provider()

    if p.dialect == "gemini":
        rows = _gemini(p.base_url)
    else:
        rows = _openai(p.base_url)

    chat = [r for r in rows if not any(bad in r["id"].lower() for bad in NOT_CHAT)]
    chat.sort(key=lambda r: r["id"])
    return chat


def _openai(base_url: str) -> list[dict]:
    headers = {}
    if settings.ai_api_key:
        headers["authorization"] = f"Bearer {settings.ai_api_key}"
    data = _get(f"{base_url}/models", headers)

    out = []
    for m in data.get("data") or []:
        mid = str(m.get("id") or "")
        if not mid:
            continue
        # OpenRouter is the one provider that bills per model rather than per
        # key, and it marks the free ones in the id itself.
        free = mid.endswith(":free") or "openrouter" not in base_url
        out.append({"id": mid, "label": mid, "free": free})
    return out


def _gemini(base_url: str) -> list[dict]:
    data = _get(f"{base_url}/models", {}, params={"key": settings.ai_api_key})

    out = []
    for m in data.get("models") or []:
        # Google publishes what each model can do, so the filter here is real
        # rather than a guess at the name.
        if "generateContent" not in (m.get("supportedGenerationMethods") or []):
            continue
        mid = str(m.get("name") or "").removeprefix("models/")
        if not mid:
            continue
        out.append({"id": mid, "label": m.get("displayName") or mid, "free": True})
    return out


def _get(url: str, headers: dict, params: dict | None = None) -> dict:
    try:
        response = httpx.get(url, headers=headers, params=params, timeout=settings.ai_timeout)
    except httpx.HTTPError as exc:
        raise LLMError(f"{exc.__class__.__name__} calling {url}") from exc

    if response.status_code >= 400:
        raise LLMError(
            f"{response.status_code} from {url}: {response.text[:200]}",
            status=response.status_code,
            body=response.text,
        )
    try:
        return response.json()
    except ValueError as exc:
        raise LLMError(f"non-JSON model list from {url}") from exc
