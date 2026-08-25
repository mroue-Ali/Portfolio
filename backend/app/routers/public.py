"""Read-only endpoints the site itself calls. No auth, no writes."""

import json
from collections.abc import Iterator

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import ai, content, schemas
from ..database import get_db

router = APIRouter(prefix="/api", tags=["public"])


@router.get("/content", response_model=schemas.SiteContent)
def get_content(response: Response, db: Session = Depends(get_db)):
    """
    The entire site, shaped like `frontend/src/content/index.ts`.

    One request rather than a call per section: the payload is a few KB and the
    page needs all of it before the first paint anyway.
    """
    try:
        payload = content.build_content(db)
    except LookupError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    response.headers["Cache-Control"] = "public, max-age=60"
    return payload


@router.post("/ask", response_model=schemas.AskResponse)
def post_ask(payload: schemas.AskRequest, db: Session = Depends(get_db)):
    """
    Answers a question about the site owner, in one response.

    `{ question }` in, `{ answer, matched }` out. Kept alongside the streaming
    route because a whole answer is what a script, a test, or a `curl` wants —
    only a browser painting text as it arrives needs the other one. Never errors:
    with no model configured, or when a call to one fails, the written answers
    reply instead and a miss comes back with `matched: false`.
    """
    return ai.answer_question(db, payload.question)


@router.post("/ask/stream")
def post_ask_stream(payload: schemas.AskRequest, db: Session = Depends(get_db)):
    """
    The same answer, as server-sent events, written as it is generated.

    Two event types: `delta` carrying `{ text }` for each chunk, then `done`.
    SSE rather than a raw chunked body because a bare stream has no way to say
    "that was the end" as distinct from "the connection dropped" — and the
    difference decides whether the caret keeps blinking.

    Errors are not an event type. Everything recoverable has already become the
    written answer by the time the first chunk is yielded, and a failure after
    that ends the stream with whatever was said — see `pipeline.stream_answer`.
    """

    def events() -> Iterator[str]:
        for chunk in ai.stream_answer(db, payload.question):
            # json.dumps to survive newlines and quotes: a raw newline inside an
            # SSE `data:` line would silently split it into two events.
            yield f"event: delta\ndata: {json.dumps({'text': chunk})}\n\n"
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            # Nginx buffers proxied responses by default, which holds the whole
            # answer back until it is finished — the one thing streaming exists
            # to avoid. Harmless anywhere else.
            "X-Accel-Buffering": "no",
        },
    )
