"""
Two families of schemas.

*Public* schemas are camelCase and shaped exactly like the exports in
`frontend/src/content/index.ts`, so the frontend can swap that module for a fetch
without touching a component.

*Admin* schemas are snake_case and mirror the tables one for one, so the CMS
edits columns rather than a reshaped view. Update schemas make every field
optional: writes are PATCH-style, only what is sent changes.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

# --------------------------------------------------------------------------- #
# Public — GET /api/content
# --------------------------------------------------------------------------- #


class Public(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ProfileOut(Public):
    name: str
    role: str
    availability: str
    intro: str
    specialities: list[str]
    email: str
    phone: str
    phone_href: str
    linkedin: str
    github: str


class NavItemOut(Public):
    #: The frontend's NavItem.id — the anchor slug, not the database id.
    id: str
    #: The database id, so edit mode knows which row a link came from.
    row_id: int
    label: str
    href: str


class AnswerOut(Public):
    keywords: list[str]
    question: str
    answer: str


class AskOut(Public):
    placeholder: str
    #: Indices into `answers` — which questions are offered as chips.
    chip_indices: list[int]
    limit: int
    fallback: str


class StatOut(Public):
    #: Database id — the handle inline editing patches against.
    id: int
    value: int
    suffix: str
    label: str


class AboutOut(Public):
    eyebrow: str
    heading: str
    portrait_placeholder: str
    portrait_image: str
    paragraphs: list[str]
    stats: list[StatOut]


class StackTileOut(Public):
    #: Database id — the handle inline editing patches against.
    id: int
    name: str
    icon: str
    color: str
    #: `where_used` in the database; `where` in the frontend type.
    where: str


class StackGroupOut(Public):
    #: Database id — the handle inline editing patches against.
    id: int
    name: str
    tiles: list[StackTileOut]
    pills: list[str]


class StackOut(Public):
    eyebrow: str
    heading: str
    groups: list[StackGroupOut]


class ProjectOut(Public):
    #: Database id — the handle inline editing patches against.
    id: int
    number: str
    title: str
    summary: str
    points: list[str]
    tags: list[str]
    image: str
    link: str
    link_label: str


class ProjectsOut(Public):
    eyebrow: str
    heading: str
    items: list[ProjectOut]


class RoleOut(Public):
    #: Database id — the handle inline editing patches against.
    id: int
    period: str
    title: str
    body: str


class FootnoteOut(Public):
    id: int
    text: str


class ExperienceOut(Public):
    eyebrow: str
    heading: str
    roles: list[RoleOut]
    footnotes: list[FootnoteOut]


class ContactOut(Public):
    eyebrow: str
    heading: str
    cta: str
    colophon: str
    place: str


class ThemeColorsOut(Public):
    bg: str
    surface: str
    border: str
    text: str
    muted: str
    accent: str
    accent_alt: str


class ThemeCursorOut(Public):
    style: str
    size: int
    spin: bool


class ThemeTrailOut(Public):
    enabled: bool
    particle: str
    links: bool
    link_distance: int
    threads: bool
    motion: str
    speed: int
    life: int
    opacity: int
    size: int
    density: int
    color: str
    swirl: int
    repel: int
    burst: bool
    reduced: str


class ThemeOut(Public):
    """
    Grouped rather than flat, unlike the table it comes from.

    The seven colours, the cursor, and the trail are consumed by three different
    parts of the frontend, so they arrive as three objects — `theme.ts` takes the
    colours, `Cursor` takes the cursor, `trail.ts` takes the trail, and none of
    them has to know the column prefixes.
    """

    preset: str
    colors: ThemeColorsOut
    cursor: ThemeCursorOut
    trail: ThemeTrailOut


class SiteContent(Public):
    """Everything the site renders, in one response."""

    theme: ThemeOut
    profile: ProfileOut
    nav: list[NavItemOut]
    ask: AskOut
    answers: list[AnswerOut]
    about: AboutOut
    stack: StackOut
    projects: ProjectsOut
    experience: ExperienceOut
    contact: ContactOut


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


class AskResponse(BaseModel):
    answer: str
    #: False when nothing matched and the fallback answered.
    matched: bool


# --------------------------------------------------------------------------- #
# Admin — CRUD over the tables
# --------------------------------------------------------------------------- #


class Admin(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Row(Admin):
    """Read shape for any table: its own columns plus the identity/audit ones."""

    id: int


# -- singletons -------------------------------------------------------------- #


class ProfileUpdate(Admin):
    name: Optional[str] = None
    role: Optional[str] = None
    availability: Optional[str] = None
    intro: Optional[str] = None
    specialities: Optional[list[str]] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    phone_href: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None


class ProfileRow(Row, ProfileUpdate):
    pass


class SectionUpdate(Admin):
    eyebrow: Optional[str] = None
    heading: Optional[str] = None
    position: Optional[int] = None


class SectionRow(Row):
    key: str
    eyebrow: str
    heading: str
    position: int


class AboutUpdate(Admin):
    portrait_placeholder: Optional[str] = None
    portrait_image: Optional[str] = None
    paragraphs: Optional[list[str]] = None


class AboutRow(Row, AboutUpdate):
    pass


class ContactUpdate(Admin):
    cta: Optional[str] = None
    colophon: Optional[str] = None
    place: Optional[str] = None


class ContactRow(Row, ContactUpdate):
    pass


class AskSettingsUpdate(Admin):
    placeholder: Optional[str] = None
    question_limit: Optional[int] = Field(default=None, ge=1, le=100)
    fallback: Optional[str] = None


class AskSettingsRow(Row, AskSettingsUpdate):
    pass


HEX = "^#[0-9A-Fa-f]{6}$"


class ThemeUpdate(Admin):
    """
    Every knob, bounded.

    The ranges are not decoration: these values drive a particle simulation and a
    stylesheet, and a life of 0 or an opacity of 900 is a broken-looking site
    rather than a validation error the editor would ever see. Clamping at the
    edge of the API means the frontend can trust what it reads.
    """

    preset: Optional[str] = Field(default=None, max_length=40)

    color_bg: Optional[str] = Field(default=None, pattern=HEX)
    color_surface: Optional[str] = Field(default=None, pattern=HEX)
    color_border: Optional[str] = Field(default=None, pattern=HEX)
    color_text: Optional[str] = Field(default=None, pattern=HEX)
    color_muted: Optional[str] = Field(default=None, pattern=HEX)
    color_accent: Optional[str] = Field(default=None, pattern=HEX)
    color_accent_alt: Optional[str] = Field(default=None, pattern=HEX)

    cursor_style: Optional[str] = Field(
        default=None, pattern="^(reticle|ring|dot|crosshair|halo|native)$"
    )
    cursor_size: Optional[int] = Field(default=None, ge=12, le=96)
    cursor_spin: Optional[bool] = None

    trail_enabled: Optional[bool] = None
    trail_particle: Optional[str] = Field(
        default=None, pattern="^(dot|ring|square|spark|plus|diamond)$"
    )
    trail_links: Optional[bool] = None
    trail_link_distance: Optional[int] = Field(default=None, ge=0, le=320)
    trail_threads: Optional[bool] = None
    trail_motion: Optional[str] = Field(
        default=None, pattern="^(follow|opposite|random|outward|inward|still)$"
    )
    trail_speed: Optional[int] = Field(default=None, ge=0, le=300)
    trail_life: Optional[int] = Field(default=None, ge=100, le=8000)
    trail_opacity: Optional[int] = Field(default=None, ge=0, le=100)
    trail_size: Optional[int] = Field(default=None, ge=1, le=60)
    trail_density: Optional[int] = Field(default=None, ge=2, le=60)
    trail_color: Optional[str] = Field(
        default=None, pattern="^(theme|accent|accent-alt|white|muted)$"
    )
    trail_swirl: Optional[int] = Field(default=None, ge=0, le=100)
    trail_repel: Optional[int] = Field(default=None, ge=0, le=100)
    trail_burst: Optional[bool] = None
    trail_reduced: Optional[str] = Field(default=None, pattern="^(calm|full|off)$")


class ThemeRow(Row, ThemeUpdate):
    pass


#: The half of `ThemeUpdate` a template carries — the pointer, not the palette.
POINTER_FIELDS = frozenset(
    name
    for name in ThemeUpdate.model_fields
    if name.startswith("cursor_") or name.startswith("trail_")
)


def _clean_pointer_settings(value: dict) -> dict:
    """
    A template's payload, held to the same standard as a live write.

    Run through `ThemeUpdate` so every value is range-checked exactly once, in
    one place; anything outside the pointer half is dropped rather than rejected,
    so a template saved from a future version of the form does not 422 here.
    """
    if not isinstance(value, dict):
        raise ValueError("settings must be an object")
    known = {k: v for k, v in value.items() if k in POINTER_FIELDS}
    checked = ThemeUpdate.model_validate(known)
    return checked.model_dump(exclude_unset=True)


class ThemeTemplateCreate(Admin):
    name: str = Field(min_length=1, max_length=80)
    note: str = Field(default="", max_length=200)
    settings: dict = Field(default_factory=dict)
    position: int = 0

    @field_validator("settings")
    @classmethod
    def _check_settings(cls, value: dict) -> dict:
        return _clean_pointer_settings(value)


class ThemeTemplateUpdate(Admin):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    note: Optional[str] = Field(default=None, max_length=200)
    settings: Optional[dict] = None
    position: Optional[int] = None

    @field_validator("settings")
    @classmethod
    def _check_settings(cls, value: dict | None) -> dict | None:
        return None if value is None else _clean_pointer_settings(value)


class ThemeTemplateRow(Row, ThemeTemplateCreate):
    pass


# -- the ask bar's model ----------------------------------------------------- #


class AiSettingsUpdate(Admin):
    mode: Optional[str] = Field(default=None, pattern="^(hybrid|ai|keyword)$")
    model: Optional[str] = Field(default=None, max_length=120)
    router_model: Optional[str] = Field(default=None, max_length=120)
    #: Validated in `ai.store.validate_prompts` rather than here — the rule is
    #: "renderable by the pipeline", which a regex cannot express.
    system_prompt: Optional[str] = None
    user_prompt: Optional[str] = None
    log_questions: Optional[bool] = None


class AiSettingsRow(Row, AiSettingsUpdate):
    #: Read-only mirrors of `.env`, so the CMS can say which provider it is
    #: talking to and whether a key is present without ever showing the key.
    provider: str = ""
    provider_ready: bool = False
    #: What the shipped prompts say, for a "reset to default" button.
    default_system_prompt: str = ""
    default_user_prompt: str = ""


class AiModel(BaseModel):
    """One entry in the CMS model dropdown."""

    id: str
    label: str
    free: bool


class AskLogRow(Admin):
    id: int
    question: str
    answer: str
    #: "model" or "written".
    source: str
    collections: list[str]
    model: str
    ms: int
    error: str
    streamed: bool
    created_at: datetime


class AskLogPage(BaseModel):
    """A page of log rows, newest first, plus what the header needs."""

    items: list[AskLogRow]
    total: int
    #: Rows whose answer came from a model rather than the written set.
    answered_by_model: int


# -- collections ------------------------------------------------------------- #


class NavItemCreate(Admin):
    slug: str
    label: str
    href: str
    visible: bool = True
    position: int = 0


class NavItemUpdate(Admin):
    slug: Optional[str] = None
    label: Optional[str] = None
    href: Optional[str] = None
    visible: Optional[bool] = None
    position: Optional[int] = None


class NavItemRow(Row, NavItemCreate):
    pass


class StatCreate(Admin):
    value: int
    suffix: str = ""
    label: str
    position: int = 0


class StatUpdate(Admin):
    value: Optional[int] = None
    suffix: Optional[str] = None
    label: Optional[str] = None
    position: Optional[int] = None


class StatRow(Row, StatCreate):
    pass


class StackTileCreate(Admin):
    group_id: int
    name: str
    icon: str
    color: str = "#E9ECF0"
    where_used: str = ""
    position: int = 0


class StackTileUpdate(Admin):
    group_id: Optional[int] = None
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    where_used: Optional[str] = None
    position: Optional[int] = None


class StackTileRow(Row, StackTileCreate):
    pass


class StackGroupCreate(Admin):
    name: str
    pills: list[str] = Field(default_factory=list)
    position: int = 0


class StackGroupUpdate(Admin):
    name: Optional[str] = None
    pills: Optional[list[str]] = None
    position: Optional[int] = None


class StackGroupRow(Row, StackGroupCreate):
    tiles: list[StackTileRow] = Field(default_factory=list)


class ProjectCreate(Admin):
    number: str = ""
    title: str
    summary: str = ""
    points: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    image: str = ""
    link: str = ""
    link_label: str = ""
    published: bool = True
    position: int = 0


class ProjectUpdate(Admin):
    number: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    points: Optional[list[str]] = None
    tags: Optional[list[str]] = None
    image: Optional[str] = None
    link: Optional[str] = None
    link_label: Optional[str] = None
    published: Optional[bool] = None
    position: Optional[int] = None


class ProjectRow(Row, ProjectCreate):
    pass


class RoleCreate(Admin):
    period: str
    title: str
    body: str = ""
    position: int = 0


class RoleUpdate(Admin):
    period: Optional[str] = None
    title: Optional[str] = None
    body: Optional[str] = None
    position: Optional[int] = None


class RoleRow(Row, RoleCreate):
    pass


class FootnoteCreate(Admin):
    text: str
    position: int = 0


class FootnoteUpdate(Admin):
    text: Optional[str] = None
    position: Optional[int] = None


class FootnoteRow(Row, FootnoteCreate):
    pass


class AnswerCreate(Admin):
    question: str
    answer: str
    keywords: list[str] = Field(default_factory=list)
    is_chip: bool = False
    published: bool = True
    position: int = 0


class AnswerUpdate(Admin):
    question: Optional[str] = None
    answer: Optional[str] = None
    keywords: Optional[list[str]] = None
    is_chip: Optional[bool] = None
    published: Optional[bool] = None
    position: Optional[int] = None


class AnswerRow(Row, AnswerCreate):
    pass


class ReorderItem(Admin):
    id: int
    position: int


class Reorder(Admin):
    """Body for the per-resource reorder endpoints."""

    items: list[ReorderItem]


# --------------------------------------------------------------------------- #
# Auth — sign-in and accounts
# --------------------------------------------------------------------------- #


class LoginRequest(BaseModel):
    #: Username or email; the login route accepts either.
    username: str = Field(min_length=1, max_length=160)
    password: str = Field(min_length=1, max_length=200)


class UserOut(Admin):
    """What the CMS knows about an account. Never includes the hash."""

    id: int
    username: str
    email: str
    name: str
    role: str
    is_active: bool
    last_login_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    #: Seconds until the token stops being accepted.
    expires_in: int
    user: UserOut


class UserCreate(Admin):
    username: str = Field(min_length=2, max_length=60)
    password: str = Field(min_length=8, max_length=200)
    email: str = ""
    name: str = ""
    role: str = Field(default="editor", pattern="^(admin|editor)$")
    is_active: bool = True


class UserUpdate(Admin):
    username: Optional[str] = Field(default=None, min_length=2, max_length=60)
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = Field(default=None, pattern="^(admin|editor)$")
    is_active: Optional[bool] = None
    #: Set to change someone's password without knowing the old one (admins only).
    password: Optional[str] = Field(default=None, min_length=8, max_length=200)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=8, max_length=200)
