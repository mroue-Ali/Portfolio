"""
The whole site as tables.

The shapes here mirror `frontend/src/content/index.ts` one for one — that module
is the contract the components read, so anything stored differently would have to
be reshaped on the way out. Ordered collections carry an explicit `position`
rather than relying on insertion order, because a CMS reorders things.

Free-form string lists (tags, points, pills, keywords) are JSON columns: they are
edited as one list in one form field, never queried individually, and a table per
list would triple the schema for no gain.
"""

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Ordered:
    """Sort key for anything the CMS presents as a reorderable list."""

    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)


# --------------------------------------------------------------------------- #
# Singletons — one row, id == 1. Kept as real tables rather than a key/value
# blob so the CMS can render a real form with real columns.
# --------------------------------------------------------------------------- #


class Profile(TimestampMixin, Base):
    """Hero identity: name, role, and how to reach him."""

    __tablename__ = "profile"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(160), nullable=False)
    availability: Mapped[str] = mapped_column(String(200), nullable=False)
    intro: Mapped[str] = mapped_column(Text, nullable=False)
    #: Cycled by the rolling headline.
    specialities: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    email: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str] = mapped_column(String(60), default="", nullable=False)
    phone_href: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    linkedin: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    github: Mapped[str] = mapped_column(String(255), default="", nullable=False)


class Section(TimestampMixin, Ordered, Base):
    """
    Eyebrow + heading for each scroll section, keyed by the anchor id
    (`about`, `stack`, `projects`, `experience`, `contact`).
    """

    __tablename__ = "sections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    eyebrow: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    heading: Mapped[str] = mapped_column(String(200), default="", nullable=False)


class AboutContent(TimestampMixin, Base):
    """The about section's body copy. Its eyebrow/heading live in `sections`."""

    __tablename__ = "about_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    portrait_placeholder: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    #: Real portrait once there is one; empty keeps the placeholder frame.
    portrait_image: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    paragraphs: Mapped[list] = mapped_column(JSON, default=list, nullable=False)


class ContactContent(TimestampMixin, Base):
    """Closing section: call to action and colophon."""

    __tablename__ = "contact_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cta: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    colophon: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    place: Mapped[str] = mapped_column(String(120), default="", nullable=False)


class ThemeSettings(TimestampMixin, Base):
    """
    How the site looks and how it answers the pointer.

    Colours are stored as seven roles rather than a palette name: `preset` is a
    label for which set they came from, and the CMS writes the seven columns when
    one is picked. That way a preset is a starting point an editor can then take
    apart, and the site never has to know the preset table at all.

    The trail columns are the particle system in `frontend/src/lib/trail.ts`,
    one column per knob. Percentages are stored 0-100 and durations in
    milliseconds, so every value in this table is a plain integer an editor can
    read — the conversion to the simulation's units happens in one place, in the
    frontend, next to the physics that consumes them.
    """

    __tablename__ = "theme_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    #: Which shipped palette these colours came from; "custom" once edited.
    preset: Mapped[str] = mapped_column(String(40), default="graphite-violet", nullable=False)

    # Prefixed because `text` and `border` are reserved words in MySQL, and a
    # column that needs quoting everywhere it appears is a column named badly.
    color_bg: Mapped[str] = mapped_column(String(20), default="#15181D", nullable=False)
    color_surface: Mapped[str] = mapped_column(String(20), default="#1E2228", nullable=False)
    color_border: Mapped[str] = mapped_column(String(20), default="#2F353E", nullable=False)
    color_text: Mapped[str] = mapped_column(String(20), default="#E9ECF0", nullable=False)
    color_muted: Mapped[str] = mapped_column(String(20), default="#9AA2AD", nullable=False)
    #: The two brand colours every gradient on the site is mixed from.
    color_accent: Mapped[str] = mapped_column(String(20), default="#7B68FA", nullable=False)
    color_accent_alt: Mapped[str] = mapped_column(String(20), default="#45D9EF", nullable=False)

    #: "reticle" | "ring" | "dot" | "crosshair" | "halo" | "native".
    cursor_style: Mapped[str] = mapped_column(String(20), default="reticle", nullable=False)
    cursor_size: Mapped[int] = mapped_column(Integer, default=36, nullable=False)
    #: Whether the reticle turns. Ignored by the styles that have no arcs.
    cursor_spin: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    trail_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    #: What each node is drawn as — see TRAIL_PARTICLES in the frontend.
    trail_particle: Mapped[str] = mapped_column(String(20), default="dot", nullable=False)
    #: Lines between neighbouring nodes.
    trail_links: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    trail_link_distance: Mapped[int] = mapped_column(Integer, default=112, nullable=False)
    #: Lines from the live pointer back to the nodes nearest it.
    trail_threads: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    #: Which way a node leaves the cursor — see TRAIL_MOTIONS in the frontend.
    trail_motion: Mapped[str] = mapped_column(String(20), default="follow", nullable=False)
    #: Share of the pointer's speed a node is launched with, as a percentage.
    trail_speed: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    #: Milliseconds from spawn to gone.
    trail_life: Mapped[int] = mapped_column(Integer, default=1900, nullable=False)
    #: Ceiling on how bright the whole trail draws, as a percentage.
    trail_opacity: Mapped[int] = mapped_column(Integer, default=85, nullable=False)
    #: Base node radius in pixels, before speed and age scale it.
    trail_size: Mapped[int] = mapped_column(Integer, default=11, nullable=False)
    #: Pixels of pointer travel between two nodes. Lower is denser.
    trail_density: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    #: "theme" | "accent" | "accent-alt" | "white" | "muted".
    trail_color: Mapped[str] = mapped_column(String(20), default="theme", nullable=False)
    #: Strength of the curl field that makes nodes wander, as a percentage.
    trail_swirl: Mapped[int] = mapped_column(Integer, default=40, nullable=False)
    #: How hard the pointer pushes nodes out of its way, as a percentage.
    trail_repel: Mapped[int] = mapped_column(Integer, default=40, nullable=False)
    #: Whether a click throws a ring of nodes outwards.
    trail_burst: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    #: What a visitor who asked their system for less motion gets:
    #: "calm" keeps the nodes but takes the travel out, "full" ignores the
    #: request, "off" shows them nothing. See CALM in frontend/src/lib/trail.ts.
    trail_reduced: Mapped[str] = mapped_column(String(10), default="calm", nullable=False)


class ThemeTemplate(TimestampMixin, Ordered, Base):
    """
    A pointer setup, saved under a name so it can be brought back in one click.

    Covers the cursor and the trail, not the palette: colours already have their
    own presets and their own picker, and an editor who has spent an evening
    tuning a trail wants it back without their brand changing underneath them.

    The settings are one JSON column rather than a second copy of the eighteen
    on `theme_settings`. A template is written and read as a whole, never queried
    a field at a time, and mirroring the columns would mean every new knob had to
    be added to two tables and a migration written for both. The trade is that
    the database cannot check the contents, so `ThemeTemplateCreate` runs them
    through the same validator the live settings go through.
    """

    __tablename__ = "theme_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    #: Unique so that "apply the tested one" cannot be ambiguous.
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    #: What it is for, in a line. Shown under the name in the CMS.
    note: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    #: The `cursor_*` and `trail_*` fields of `theme_settings`, as saved.
    settings: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class AskSettings(TimestampMixin, Base):
    """Behaviour of the hero ask bar. Chips come from `answers.is_chip`."""

    __tablename__ = "ask_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    placeholder: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    #: Questions per session before the bar locks (`limit` is reserved in SQL).
    question_limit: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    fallback: Mapped[str] = mapped_column(Text, nullable=False)


# --------------------------------------------------------------------------- #
# Ordered collections
# --------------------------------------------------------------------------- #


class NavItem(TimestampMixin, Ordered, Base):
    __tablename__ = "nav_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    #: Anchor id the link scrolls to; matches a `sections.key`.
    slug: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(60), nullable=False)
    href: Mapped[str] = mapped_column(String(120), nullable=False)
    visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Stat(TimestampMixin, Ordered, Base):
    """Counter in the about section (value counts up, suffix renders after it)."""

    __tablename__ = "stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    value: Mapped[int] = mapped_column(Integer, nullable=False)
    suffix: Mapped[str] = mapped_column(String(10), default="", nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)


class StackGroup(TimestampMixin, Ordered, Base):
    __tablename__ = "stack_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    #: Text-only extras listed beneath the tiles.
    pills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    tiles: Mapped[list["StackTile"]] = relationship(
        back_populates="group",
        cascade="all, delete-orphan",
        order_by="StackTile.position",
        lazy="selectin",
    )


class StackTile(TimestampMixin, Ordered, Base):
    __tablename__ = "stack_tiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(
        ForeignKey("stack_groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    #: simple-icons slug; also the key into the generated ICON_PATHS fallback.
    icon: Mapped[str] = mapped_column(String(60), nullable=False)
    #: Brand colour revealed on hover.
    color: Mapped[str] = mapped_column(String(20), default="#E9ECF0", nullable=False)
    #: Where it was used. Stored as data; not rendered on the tile.
    where_used: Mapped[str] = mapped_column(String(160), default="", nullable=False)

    group: Mapped["StackGroup"] = relationship(back_populates="tiles")


class Project(TimestampMixin, Ordered, Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    #: Display number on the card ("01"), text so the leading zero survives.
    number: Mapped[str] = mapped_column(String(8), default="", nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    points: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    #: Path under frontend/public, e.g. /projects/knowledge-base-rag.svg.
    image: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    link: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    #: Wording for the card's affordance.
    link_label: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Role(TimestampMixin, Ordered, Base):
    """One entry on the experience timeline."""

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    period: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, default="", nullable=False)


class Footnote(TimestampMixin, Ordered, Base):
    """Education / languages lines under the timeline."""

    __tablename__ = "footnotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    text: Mapped[str] = mapped_column(String(255), nullable=False)


class Answer(TimestampMixin, Ordered, Base):
    """A written answer for the ask bar, matched on keywords."""

    __tablename__ = "answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question: Mapped[str] = mapped_column(String(255), nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    #: Lowercase substrings matched against the incoming question.
    keywords: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    #: Offered as a suggestion chip under the bar.
    is_chip: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


# --------------------------------------------------------------------------- #
# The ask bar's model
# --------------------------------------------------------------------------- #


class AiSettings(TimestampMixin, Base):
    """
    Everything about the ask bar's model that is not a secret.

    The provider and the API key stay in `.env`: they are deployment facts, and
    a key in a table is a key in a backup. What lives here is what an editor has
    a reason to change without a redeploy — which model, and what it is told.
    """

    __tablename__ = "ai_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    #: "hybrid" | "ai" | "keyword" — see `config.Settings.ask_mode`.
    mode: Mapped[str] = mapped_column(String(20), default="hybrid", nullable=False)
    #: Empty falls through to the provider's default in `ai/llm.py`, so a model
    #: being retired is a dropdown change rather than a deploy.
    model: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    #: Smaller model for the routing call. Empty means the provider's default.
    router_model: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    #: `{name}` is substituted. Empty falls back to the shipped prompt.
    system_prompt: Mapped[str] = mapped_column(Text, default="", nullable=False)
    #: `{context}` and `{question}` are substituted, and both are required —
    #: `ai/store.py` refuses to save a template missing either.
    user_prompt: Mapped[str] = mapped_column(Text, default="", nullable=False)
    #: Off keeps the bar working and stops writing down what visitors typed.
    log_questions: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class AskLog(TimestampMixin, Base):
    """
    One row per question a visitor asked, and what came back.

    Written after the answer is sent, never before: logging is not allowed to be
    the reason the bar fails. `error` carries why a row fell back to the written
    answers, which is the column worth reading when quality drops.
    """

    __tablename__ = "ask_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question: Mapped[str] = mapped_column(String(600), nullable=False)
    answer: Mapped[str] = mapped_column(Text, default="", nullable=False)
    #: "model" when a model wrote it, "written" for a CMS answer or the fallback.
    source: Mapped[str] = mapped_column(String(16), default="written", nullable=False)
    #: Collection keys the router chose. Empty when no model ran.
    collections: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    model: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    #: Wall clock for the whole answer, including both model calls.
    ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    #: Why it fell back, when it did. Empty on a clean model answer.
    error: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    #: Whether the visitor was reading it as it arrived.
    streamed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


# --------------------------------------------------------------------------- #
# CMS accounts
# --------------------------------------------------------------------------- #


class User(TimestampMixin, Base):
    """
    Someone who can sign into the CMS.

    Passwords are never stored — only a bcrypt hash, written by
    `security.hash_password`. `is_active` is the off switch: a deactivated
    account keeps its history but cannot log in, which is what you want when
    someone leaves rather than deleting rows they authored.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    #: "admin" can manage other accounts; "editor" can only edit content.
    role: Mapped[str] = mapped_column(String(20), default="admin", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
