"""
Keyword resolution for the ask bar.

Deliberately the same scoring as `frontend/src/lib/ask.ts`: an exact question
match wins outright, otherwise each matched keyword scores its own length so a
specific term outweighs a generic one. Keeping them identical means pointing
VITE_ASK_API at this endpoint doesn't change a single answer — it only moves
where the answers are edited.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models, schemas

EXACT_MATCH_SCORE = 99


def resolve(db: Session, question: str) -> schemas.AskResponse:
    q = (question or "").lower().strip()

    answers = db.scalars(
        select(models.Answer)
        .where(models.Answer.published.is_(True))
        .order_by(models.Answer.position)
    ).all()

    best: models.Answer | None = None
    best_score = 0
    for candidate in answers:
        if candidate.question.lower() == q:
            score = EXACT_MATCH_SCORE
        else:
            score = sum(len(k) for k in candidate.keywords or [] if k and k in q)
        if score > best_score:
            best_score, best = score, candidate

    if best is None:
        settings = db.get(models.AskSettings, 1)
        return schemas.AskResponse(
            answer=settings.fallback if settings else "",
            matched=False,
        )

    return schemas.AskResponse(answer=best.answer, matched=True)
