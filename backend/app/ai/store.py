"""
The editable half of the ask bar's configuration.

`config.py` reads `.env` — provider, key, timeouts, the things a deploy decides.
This reads the `ai_settings` row — mode, model, prompts, the things an editor
decides. Everything here has a working default in code, so an empty table, a
missing row, or a prompt someone broke all degrade to the shipped behaviour
rather than to an error.

`validate_prompts` is the other half of that promise: a template is checked when
it is *saved*, so a missing `{context}` is a red field in the CMS rather than a
question that quietly falls back at midnight.
"""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from .. import models
from ..config import settings
from . import llm, prompts

log = logging.getLogger(__name__)

MODES = ("hybrid", "ai", "keyword")

#: Placeholders each template must still contain after an edit. A prompt without
#: `{context}` would send the model the question and no rows to answer from —
#: which reads as a plausible answer made of nothing.
REQUIRED = {
    "system_prompt": ("{name}",),
    "user_prompt": ("{context}", "{question}"),
}


class PromptError(ValueError):
    """A template that would break at answer time. Raised on save, not on use."""


def get(db: Session) -> models.AiSettings:
    """
    The settings row, created on first read if it isn't there yet.

    Seeded from the shipped prompts so the CMS opens on the real text rather
    than on empty boxes an editor has to fill before the bar works.
    """
    row = db.get(models.AiSettings, 1)
    if row is None:
        row = models.AiSettings(
            id=1,
            mode=settings.ask_mode if settings.ask_mode in MODES else "hybrid",
            system_prompt=prompts.ANSWER_SYSTEM,
            user_prompt=prompts.ANSWER_USER,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def mode(db: Session) -> str:
    """The configured mode, and the moment the chosen models take effect."""
    row = get(db)
    # Done here because every entry point into the pipeline asks for the mode
    # first — one call, rather than a line every caller could forget.
    llm.use_models(row.model, row.router_model)
    return row.mode if row.mode in MODES else "hybrid"


def system_prompt(db: Session, *, name: str) -> str:
    """The answering system prompt, with the owner's name substituted in."""
    return _render(get(db).system_prompt, prompts.ANSWER_SYSTEM, name=name)


def user_prompt(db: Session, *, context: str, question: str) -> str:
    return _render(
        get(db).user_prompt, prompts.ANSWER_USER, context=context, question=question
    )


def _render(template: str, shipped: str, **values: str) -> str:
    """
    Fill a template, falling back to the shipped one if the stored text is
    broken.

    `validate_prompts` should have caught this at save time. It can still happen
    — a row edited straight in SQL, or a placeholder that stopped existing when
    the code changed — and a visitor's question is the wrong place to find out.
    """
    for candidate, is_stored in ((template or "", True), (shipped, False)):
        if not candidate:
            continue
        try:
            return candidate.format(**values)
        except (KeyError, IndexError, ValueError):
            if is_stored:
                log.warning("ask: stored prompt is not renderable, using the shipped one")
    return shipped.format(**values)


def validate_prompts(payload: dict) -> None:
    """
    Reject a prompt edit that would break at answer time.

    Two ways to break one: drop a placeholder the pipeline substitutes, or leave
    a stray brace that makes `str.format` raise. Both are caught here, while the
    editor is still looking at the form.
    """
    for field, required in REQUIRED.items():
        text = payload.get(field)
        if text is None:
            continue
        if not text.strip():
            # Cleared on purpose — the shipped prompt takes over.
            continue

        missing = [p for p in required if p not in text]
        if missing:
            raise PromptError(
                f"{field.replace('_', ' ')} must contain {', '.join(missing)}"
            )
        try:
            text.format(**{p.strip("{}"): "" for p in required})
        except (KeyError, IndexError, ValueError) as exc:
            raise PromptError(
                f"{field.replace('_', ' ')} has a placeholder the pipeline does not "
                f"substitute — write a literal brace as {{{{ or }}}} ({exc})"
            ) from exc
