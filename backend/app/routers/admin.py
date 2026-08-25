"""
CRUD surface for the CMS.

Every table gets the same six routes, so the admin UI can drive them all with one
generic client: list, create, read, patch, delete, reorder. Singletons get read
and patch only — they are one row by definition, and the id is always 1.

All routes sit behind `require_editor`: a signed-in account, or the legacy
shared key for scripts.
"""

from typing import Any, Callable

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..ai import llm as ai_llm
from ..ai import models_api as ai_models
from ..ai import prompts as ai_prompts
from ..ai import store as ai_store
from ..config import settings
from ..database import get_db
from ..security import require_editor

router = APIRouter(
    prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_editor)]
)


def _commit(db: Session) -> None:
    """Turns a constraint violation into a 409 instead of a 500."""
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="Constraint violation (duplicate or bad reference)."
        ) from exc


def _apply(obj: Any, payload: BaseModel) -> Any:
    """PATCH semantics: only fields actually sent are written."""
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    return obj


def _get_or_404(db: Session, model: type, item_id: int) -> Any:
    obj = db.get(model, item_id)
    if obj is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, detail=f"{model.__name__} {item_id} not found."
        )
    return obj


def collection_router(
    *,
    path: str,
    name: str,
    model: type,
    create_schema: type[BaseModel],
    update_schema: type[BaseModel],
    row_schema: type[BaseModel],
    list_query: Callable[[], Any] | None = None,
) -> APIRouter:
    """Builds the standard six routes for one table."""
    sub = APIRouter(prefix=path, tags=[f"admin:{name}"])
    order = model.position if hasattr(model, "position") else model.id

    @sub.get("", response_model=list[row_schema], summary=f"List {name}")
    def list_items(db: Session = Depends(get_db)):
        stmt = list_query() if list_query else select(model).order_by(order, model.id)
        return list(db.scalars(stmt))

    @sub.post(
        "",
        response_model=row_schema,
        status_code=status.HTTP_201_CREATED,
        summary=f"Create {name}",
    )
    def create_item(payload: create_schema, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        obj = model(**payload.model_dump())
        db.add(obj)
        _commit(db)
        db.refresh(obj)
        return obj

    @sub.put(
        "/reorder",
        response_model=list[row_schema],
        summary=f"Reorder {name}",
    )
    def reorder(payload: schemas.Reorder, db: Session = Depends(get_db)):
        """Positions in one transaction, so a drag-and-drop save is atomic."""
        for item in payload.items:
            _get_or_404(db, model, item.id).position = item.position
        _commit(db)
        return list(db.scalars(select(model).order_by(order, model.id)))

    @sub.get("/{item_id}", response_model=row_schema, summary=f"Get {name}")
    def get_item(item_id: int, db: Session = Depends(get_db)):
        return _get_or_404(db, model, item_id)

    @sub.patch("/{item_id}", response_model=row_schema, summary=f"Update {name}")
    def update_item(item_id: int, payload: update_schema, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        obj = _apply(_get_or_404(db, model, item_id), payload)
        _commit(db)
        db.refresh(obj)
        return obj

    @sub.delete(
        "/{item_id}", status_code=status.HTTP_204_NO_CONTENT, summary=f"Delete {name}"
    )
    def delete_item(item_id: int, db: Session = Depends(get_db)):
        db.delete(_get_or_404(db, model, item_id))
        _commit(db)

    return sub


def singleton_router(
    *,
    path: str,
    name: str,
    model: type,
    update_schema: type[BaseModel],
    row_schema: type[BaseModel],
) -> APIRouter:
    """Read + patch for a one-row table."""
    sub = APIRouter(prefix=path, tags=[f"admin:{name}"])

    @sub.get("", response_model=row_schema, summary=f"Get {name}")
    def get_singleton(db: Session = Depends(get_db)):
        return _get_or_404(db, model, 1)

    @sub.patch("", response_model=row_schema, summary=f"Update {name}")
    def update_singleton(payload: update_schema, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        obj = _apply(_get_or_404(db, model, 1), payload)
        _commit(db)
        db.refresh(obj)
        return obj

    return sub


# --------------------------------------------------------------------------- #
# Wiring
# --------------------------------------------------------------------------- #

router.include_router(
    singleton_router(
        path="/profile",
        name="profile",
        model=models.Profile,
        update_schema=schemas.ProfileUpdate,
        row_schema=schemas.ProfileRow,
    )
)
router.include_router(
    singleton_router(
        path="/about",
        name="about",
        model=models.AboutContent,
        update_schema=schemas.AboutUpdate,
        row_schema=schemas.AboutRow,
    )
)
router.include_router(
    singleton_router(
        path="/contact",
        name="contact",
        model=models.ContactContent,
        update_schema=schemas.ContactUpdate,
        row_schema=schemas.ContactRow,
    )
)
router.include_router(
    singleton_router(
        path="/theme",
        name="theme",
        model=models.ThemeSettings,
        update_schema=schemas.ThemeUpdate,
        row_schema=schemas.ThemeRow,
    )
)
router.include_router(
    singleton_router(
        path="/ask",
        name="ask settings",
        model=models.AskSettings,
        update_schema=schemas.AskSettingsUpdate,
        row_schema=schemas.AskSettingsRow,
    )
)

for spec in (
    dict(
        path="/nav",
        name="nav item",
        model=models.NavItem,
        create_schema=schemas.NavItemCreate,
        update_schema=schemas.NavItemUpdate,
        row_schema=schemas.NavItemRow,
    ),
    dict(
        path="/stats",
        name="stat",
        model=models.Stat,
        create_schema=schemas.StatCreate,
        update_schema=schemas.StatUpdate,
        row_schema=schemas.StatRow,
    ),
    dict(
        path="/stack-groups",
        name="stack group",
        model=models.StackGroup,
        create_schema=schemas.StackGroupCreate,
        update_schema=schemas.StackGroupUpdate,
        row_schema=schemas.StackGroupRow,
    ),
    dict(
        path="/stack-tiles",
        name="stack tile",
        model=models.StackTile,
        create_schema=schemas.StackTileCreate,
        update_schema=schemas.StackTileUpdate,
        row_schema=schemas.StackTileRow,
    ),
    dict(
        path="/projects",
        name="project",
        model=models.Project,
        create_schema=schemas.ProjectCreate,
        update_schema=schemas.ProjectUpdate,
        row_schema=schemas.ProjectRow,
    ),
    dict(
        path="/roles",
        name="role",
        model=models.Role,
        create_schema=schemas.RoleCreate,
        update_schema=schemas.RoleUpdate,
        row_schema=schemas.RoleRow,
    ),
    dict(
        path="/footnotes",
        name="footnote",
        model=models.Footnote,
        create_schema=schemas.FootnoteCreate,
        update_schema=schemas.FootnoteUpdate,
        row_schema=schemas.FootnoteRow,
    ),
    dict(
        path="/theme-templates",
        name="theme template",
        model=models.ThemeTemplate,
        create_schema=schemas.ThemeTemplateCreate,
        update_schema=schemas.ThemeTemplateUpdate,
        row_schema=schemas.ThemeTemplateRow,
    ),
    dict(
        path="/answers",
        name="answer",
        model=models.Answer,
        create_schema=schemas.AnswerCreate,
        update_schema=schemas.AnswerUpdate,
        row_schema=schemas.AnswerRow,
    ),
):
    router.include_router(collection_router(**spec))  # type: ignore[arg-type]


# Sections are addressed by their anchor key, not a numeric id — that is what the
# CMS shows and what the frontend anchors to, so they get their own two routes.
sections = APIRouter(prefix="/sections", tags=["admin:section"])


@sections.get("", response_model=list[schemas.SectionRow], summary="List sections")
def list_sections(db: Session = Depends(get_db)):
    return list(db.scalars(select(models.Section).order_by(models.Section.position)))


@sections.get("/{key}", response_model=schemas.SectionRow, summary="Get section")
def get_section(key: str, db: Session = Depends(get_db)):
    obj = db.scalar(select(models.Section).where(models.Section.key == key))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Section '{key}' not found.")
    return obj


@sections.patch("/{key}", response_model=schemas.SectionRow, summary="Update section")
def update_section(
    key: str, payload: schemas.SectionUpdate, db: Session = Depends(get_db)
):
    obj = get_section(key, db)
    _apply(obj, payload)
    _commit(db)
    db.refresh(obj)
    return obj


router.include_router(sections)


# --------------------------------------------------------------------------- #
# The ask bar's model
#
# Not `singleton_router`: the read shape mixes the row with facts from `.env`
# and the shipped prompts, and the write has to validate a template rather than
# a value. Both are one-offs, so they are written out rather than generated.
# --------------------------------------------------------------------------- #

ai = APIRouter(prefix="/ai", tags=["admin: ai"])


def _ai_row(db: Session) -> schemas.AiSettingsRow:
    row = ai_store.get(db)
    return schemas.AiSettingsRow(
        id=row.id,
        mode=row.mode,
        model=row.model,
        router_model=row.router_model,
        system_prompt=row.system_prompt,
        user_prompt=row.user_prompt,
        log_questions=row.log_questions,
        # From .env, never editable here — a key in a form is a key in a
        # screenshot. `provider_ready` is the honest version of "is it on".
        provider=settings.ai_provider,
        provider_ready=settings.ai_enabled,
        default_system_prompt=ai_prompts.ANSWER_SYSTEM,
        default_user_prompt=ai_prompts.ANSWER_USER,
    )


@ai.get("", response_model=schemas.AiSettingsRow, summary="Get AI settings")
def get_ai(db: Session = Depends(get_db)):
    return _ai_row(db)


@ai.patch("", response_model=schemas.AiSettingsRow, summary="Update AI settings")
def update_ai(payload: schemas.AiSettingsUpdate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude_unset=True)
    try:
        ai_store.validate_prompts(data)
    except ai_store.PromptError as exc:
        # 422 rather than 400: this is a field the editor can fix, and the CMS
        # renders it against the field.
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    row = ai_store.get(db)
    _apply(row, payload)
    _commit(db)
    db.refresh(row)
    return _ai_row(db)


@ai.get("/models", response_model=list[schemas.AiModel], summary="List available models")
def list_ai_models():
    """
    What the configured key can actually reach, asked live.

    A 502 here means the provider said no — a bad key, or an outage. That is a
    different problem from "no models exist", so it is not flattened into an
    empty list.
    """
    if not settings.ai_enabled:
        return []
    try:
        return ai_models.available()
    except ai_llm.LLMError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@ai.get("/logs", response_model=schemas.AskLogPage, summary="List asked questions")
def list_ask_logs(
    limit: int = 50,
    offset: int = 0,
    source: str = "",
    db: Session = Depends(get_db),
):
    """
    What visitors asked, newest first.

    `source=model` or `source=written` narrows it — the useful filter being
    `written`, which is every question the model did not answer and therefore
    every gap worth either writing an answer for or fixing the prompt over.
    """
    limit = max(1, min(limit, 200))
    offset = max(0, offset)

    where = []
    if source in ("model", "written"):
        where.append(models.AskLog.source == source)

    total = db.scalar(select(func.count()).select_from(models.AskLog).where(*where)) or 0
    by_model = (
        db.scalar(
            select(func.count())
            .select_from(models.AskLog)
            .where(models.AskLog.source == "model")
        )
        or 0
    )
    items = db.scalars(
        select(models.AskLog)
        .where(*where)
        .order_by(models.AskLog.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()

    return schemas.AskLogPage(items=list(items), total=total, answered_by_model=by_model)


@ai.delete("/logs", status_code=status.HTTP_204_NO_CONTENT, summary="Clear the log")
def clear_ask_logs(db: Session = Depends(get_db)):
    db.query(models.AskLog).delete()
    _commit(db)


@ai.delete("/logs/{item_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete one row")
def delete_ask_log(item_id: int, db: Session = Depends(get_db)):
    obj = db.get(models.AskLog, item_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Log entry not found.")
    db.delete(obj)
    _commit(db)


router.include_router(ai)
