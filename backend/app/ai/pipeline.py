"""
Route, load, answer.

    question
      -> model picks collections from the catalogue   (catalog.menu)
      -> those collections are loaded from MySQL      (catalog.load)
      -> model answers from those rows only           (the prompts in `store`)

Two calls rather than one because the second prompt should contain the tables the
question needs and no others. Sending the whole site every time would work today
— it is a few kilobytes — but the shape stops working the moment there is enough
content to matter.

`answer_question` returns the whole answer; `stream_answer` yields it as it is
written. They share the routing and the prompts and differ only in how much of a
failure they can still hide, which is the one thing streaming genuinely costs.

Every failure path here ends in `ask.resolve`, the written answers. A missing
key, a rate limit, a model that returns nothing: the bar answers anyway, from
content an editor wrote. That is the point of the fallback — the AI is an upgrade
to the ask bar, never a dependency of it.

Every path also ends in a log row, written after the answer is on its way out.
`ask_logs` is where the CMS reads what visitors asked and what came back, and
`error` on a row is why that one fell back.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Iterator

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import ask as keyword_ask
from .. import models, schemas
from ..config import settings
from . import catalog, llm, prompts, store

log = logging.getLogger(__name__)

#: Longer than this is not a question, it is a paste. Truncated before it costs
#: tokens; the first sentences carry the intent anyway.
MAX_QUESTION_CHARS = 600


class _Entry:
    """A log row being filled in as the answer is produced."""

    __slots__ = ("question", "streamed", "source", "collections", "model", "error")

    def __init__(self, question: str, *, streamed: bool):
        self.question = question
        self.streamed = streamed
        self.source = "written"
        self.collections: list[str] = []
        self.model = ""
        self.error = ""


def answer_question(db: Session, question: str) -> schemas.AskResponse:
    """
    The ask bar's answer, from a model when one is configured and from the
    written answers when it is not. Never raises.
    """
    question = (question or "").strip()[:MAX_QUESTION_CHARS]
    if not question:
        return keyword_ask.resolve(db, question)

    started = time.monotonic()
    entry = _Entry(question, streamed=False)
    mode = store.mode(db)

    if mode == "keyword" or not settings.ai_enabled:
        if mode != "keyword":
            entry.error = "no provider configured"
        written = keyword_ask.resolve(db, question)
        return _finish(db, entry, written, started)

    if mode == "hybrid" and _is_exact(db, question):
        # An exact match is an answer someone wrote for this question by name.
        # No model beats that, and it costs nothing.
        return _finish(db, entry, keyword_ask.resolve(db, question), started)

    try:
        answer = _generate(db, question, entry)
    except llm.LLMError as exc:
        log.warning("ask: falling back to written answers (%s)", exc)
        entry.error = str(exc)
    except Exception as exc:  # noqa: BLE001 — the bar must answer, whatever broke
        log.exception("ask: unexpected failure, falling back to written answers")
        entry.error = f"{exc.__class__.__name__}: {exc}"
    else:
        entry.source = "model"
        return _finish(db, entry, schemas.AskResponse(answer=answer, matched=True), started)

    return _finish(db, entry, keyword_ask.resolve(db, question), started)


def stream_answer(db: Session, question: str) -> Iterator[str]:
    """
    The ask bar's answer as it is written, chunk by chunk. Never raises.

    Streaming costs the clean fallback that `answer_question` enjoys: once a
    chunk has left the building it cannot be taken back, so a connection that
    dies mid-sentence leaves a half answer on the page. The line is drawn at the
    first chunk — everything before it (routing, a bad key, a dead model, an
    empty reply) still falls back to the written answers, and only a failure
    after real text has been sent is allowed to end the answer short.
    """
    question = (question or "").strip()[:MAX_QUESTION_CHARS]
    if not question:
        yield keyword_ask.resolve(db, question).answer
        return

    started = time.monotonic()
    entry = _Entry(question, streamed=True)
    mode = store.mode(db)

    if mode == "keyword" or not settings.ai_enabled:
        if mode != "keyword":
            entry.error = "no provider configured"
        written = keyword_ask.resolve(db, question)
        yield written.answer
        _finish(db, entry, written, started)
        return

    if mode == "hybrid" and _is_exact(db, question):
        written = keyword_ask.resolve(db, question)
        yield written.answer
        _finish(db, entry, written, started)
        return

    parts: list[str] = []
    try:
        keys = _route(question)
        entry.collections = keys
        context = catalog.load(db, keys, budget=settings.ai_context_chars) if keys else ""
        if not context:
            raise llm.LLMError("nothing in the catalogue matches the question")

        entry.model = llm.provider().model
        for chunk in llm.stream(
            store.system_prompt(db, name=_name(db)),
            store.user_prompt(db, context=context, question=question),
        ):
            parts.append(chunk)
            yield chunk
    except Exception as exc:  # noqa: BLE001 — the bar must answer, whatever broke
        entry.error = f"{exc.__class__.__name__}: {exc}"
        if parts:
            # Mid-answer. The visitor already has most of a sentence; another
            # answer stapled to the end of it would read worse than a short one.
            log.warning("ask: stream cut short after first chunk (%s)", exc)
            entry.source = "model"
            _finish(db, entry, schemas.AskResponse(answer="".join(parts), matched=True), started)
            return
        log.warning("ask: falling back to written answers (%s)", exc)
        written = keyword_ask.resolve(db, question)
        yield written.answer
        _finish(db, entry, written, started)
        return

    if not parts:
        # A 200 that produced no text at all — treat it as a failure, not as an
        # empty answer, because an empty panel is worse than the written one.
        entry.error = "model returned no answer text"
        written = keyword_ask.resolve(db, question)
        yield written.answer
        _finish(db, entry, written, started)
        return

    entry.source = "model"
    _finish(db, entry, schemas.AskResponse(answer="".join(parts), matched=True), started)


def _generate(db: Session, question: str, entry: _Entry) -> str:
    keys = _route(question)
    if not keys:
        # The router found nothing relevant — an off-topic question.
        raise llm.LLMError("nothing in the catalogue matches the question")
    entry.collections = keys

    context = catalog.load(db, keys, budget=settings.ai_context_chars)
    if not context:
        raise llm.LLMError("the selected tables are empty")

    entry.model = llm.provider().model
    # Prose, not JSON: the same prompts serve both routes, and the streaming one
    # sends its chunks straight to the page.
    answer = llm.complete(
        store.system_prompt(db, name=_name(db)),
        store.user_prompt(db, context=context, question=question),
    ).strip()
    if not answer:
        raise llm.LLMError("model returned no answer text")
    return answer


def _name(db: Session) -> str:
    profile = db.get(models.Profile, 1)
    return profile.name if profile else "the owner"


def _route(question: str) -> list[str]:
    """
    Which collections to read. Falls back to all of them rather than to none:
    a bad routing call should cost tokens, not correctness.
    """
    try:
        reply = llm.parse_json(
            llm.complete(
                prompts.ROUTE_SYSTEM,
                prompts.ROUTE_USER.format(menu=catalog.menu(), question=question),
                router=True,
                json_object=True,
            )
        )
    except llm.LLMError as exc:
        log.warning("ask: routing failed, reading everything (%s)", exc)
        return catalog.ALL_KEYS

    raw = reply.get("collections")
    if not isinstance(raw, list):
        return catalog.ALL_KEYS

    # Order is the model's ranking; `catalog.load` truncates from the end.
    keys = [k for k in (str(v).strip().lower() for v in raw) if k in catalog.BY_KEY]
    keys = list(dict.fromkeys(keys))

    # Who they are is five lines and underpins almost any answer, but routers
    # skip it whenever the question looks like it is about something else —
    # "are you available?" reaches `contact` and misses the availability field
    # sitting in `profile`. Cheaper to always carry it than to route it right.
    if keys and "profile" not in keys:
        keys.insert(0, "profile")
    return keys


def _is_exact(db: Session, question: str) -> bool:
    """Whether a written answer is titled with this exact question."""
    q = question.lower()
    return any(
        a.lower() == q
        for a in db.scalars(
            select(models.Answer.question).where(models.Answer.published.is_(True))
        )
    )


def _finish(
    db: Session, entry: _Entry, response: schemas.AskResponse, started: float
) -> schemas.AskResponse:
    """
    Write the log row, then hand back the response untouched.

    Wrapped in its own try: a full disk or a locked table is not a reason for a
    visitor to lose their answer. The row is best-effort, the answer is not.
    """
    try:
        if store.get(db).log_questions:
            db.add(
                models.AskLog(
                    question=entry.question,
                    answer=response.answer,
                    source=entry.source,
                    collections=entry.collections,
                    model=entry.model,
                    ms=int((time.monotonic() - started) * 1000),
                    error=entry.error[:300],
                    streamed=entry.streamed,
                )
            )
            db.commit()
    except Exception:  # noqa: BLE001
        log.exception("ask: could not write the log row")
        db.rollback()

    return response
