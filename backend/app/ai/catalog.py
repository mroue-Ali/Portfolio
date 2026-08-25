"""
The tables, described for a model instead of for SQL.

Step one of the pipeline shows a model this catalogue — key and description only,
never rows — and asks which entries a question needs. Step two loads just those
and nothing else. That keeps the prompt small and, more usefully, keeps the
answer anchored to a named part of the site rather than to everything at once.

Each entry is one section of the site, not necessarily one table: `experience`
covers roles and footnotes together because no question wants one without the
other. Split a collection only when a question could plausibly want one half.

Adding a table to the site means adding a `Collection` here. Nothing else in the
pipeline needs to know it exists.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models


@dataclass(frozen=True)
class Collection:
    #: What the router model returns to select this.
    key: str
    #: Tables behind it — shown to the router so "what did they build" reaches
    #: `projects` even when the description doesn't use that word.
    tables: tuple[str, ...]
    #: One line, written for a model deciding relevance. Name the questions it
    #: answers, not the columns it has.
    description: str
    #: Rows to text. Empty string when the table has nothing in it.
    load: Callable[[Session], str]


def _lines(*parts: str) -> str:
    return "\n".join(p for p in parts if p)


def _bullets(items: list[str], indent: str = "  ") -> str:
    return "\n".join(f"{indent}- {i}" for i in items if i)


def _profile(db: Session) -> str:
    p = db.get(models.Profile, 1)
    if not p:
        return ""
    return _lines(
        f"Name: {p.name}",
        f"Role: {p.role}",
        # One line under the hero name. Holds location, availability, or
        # both — labelled loosely so the model does not read a bare city as
        # an answer to "are you free?".
        f"Location / availability line: {p.availability}",
        f"Intro: {p.intro}",
        f"Specialities: {', '.join(p.specialities or []) or 'none listed'}",
    )


def _about(db: Session) -> str:
    about = db.get(models.AboutContent, 1)
    stats = list(db.scalars(select(models.Stat).order_by(models.Stat.position)))
    return _lines(
        _bullets(list(about.paragraphs or []), indent="") if about else "",
        "Figures:" if stats else "",
        _bullets([f"{s.value}{s.suffix} {s.label}" for s in stats]),
    )


def _stack(db: Session) -> str:
    groups = db.scalars(select(models.StackGroup).order_by(models.StackGroup.position))
    out: list[str] = []
    for g in groups:
        out.append(f"{g.name}:")
        out.append(
            _bullets(
                [
                    t.name + (f" — used in {t.where_used}" if t.where_used else "")
                    for t in g.tiles
                ]
            )
        )
        if g.pills:
            out.append(f"  also: {', '.join(g.pills)}")
    return _lines(*out)


def _projects(db: Session) -> str:
    rows = db.scalars(
        select(models.Project)
        .where(models.Project.published.is_(True))
        .order_by(models.Project.position)
    )
    out: list[str] = []
    for p in rows:
        out.append(f"{p.number} {p.title}".strip())
        out.append(f"  {p.summary}" if p.summary else "")
        out.append(_bullets(list(p.points or []), indent="    "))
        out.append(f"  Built with: {', '.join(p.tags)}" if p.tags else "")
        out.append(f"  Link: {p.link}" if p.link else "")
    return _lines(*out)


def _experience(db: Session) -> str:
    roles = db.scalars(select(models.Role).order_by(models.Role.position))
    notes = db.scalars(select(models.Footnote).order_by(models.Footnote.position))
    out: list[str] = []
    for r in roles:
        out.append(f"{r.period} — {r.title}")
        out.append(f"  {r.body}" if r.body else "")
    tail = [n.text for n in notes]
    if tail:
        out.append("Education and languages:")
        out.append(_bullets(tail))
    return _lines(*out)


def _contact(db: Session) -> str:
    c = db.get(models.ContactContent, 1)
    p = db.get(models.Profile, 1)
    return _lines(
        f"Call to action: {c.cta}" if c and c.cta else "",
        f"Based in: {c.place}" if c and c.place else "",
        f"Email: {p.email}" if p and p.email else "",
        f"Phone: {p.phone}" if p and p.phone else "",
        f"LinkedIn: {p.linkedin}" if p and p.linkedin else "",
        f"GitHub: {p.github}" if p and p.github else "",
    )


def _answers(db: Session) -> str:
    rows = db.scalars(
        select(models.Answer)
        .where(models.Answer.published.is_(True))
        .order_by(models.Answer.position)
    )
    return _lines(*[f"Q: {a.question}\nA: {a.answer}" for a in rows])


COLLECTIONS: tuple[Collection, ...] = (
    Collection(
        key="profile",
        tables=("profile",),
        description=(
            "Who they are: full name, current role, whether they are open to "
            "work, their introduction, and the specialities they lead with."
        ),
        load=_profile,
    ),
    Collection(
        key="about",
        tables=("about_content", "stats"),
        description=(
            "Their background in prose, plus the headline figures — years of "
            "experience, projects shipped, and similar counters."
        ),
        load=_about,
    ),
    Collection(
        key="stack",
        tables=("stack_groups", "stack_tiles"),
        description=(
            "Technologies they work with, grouped by area (languages, frameworks, "
            "databases, tooling), and where each one was used. Anything asking "
            "whether they know a specific tool belongs here."
        ),
        load=_stack,
    ),
    Collection(
        key="projects",
        tables=("projects",),
        description=(
            "Things they have built: title, what it does, what it was built with, "
            "and links. Use for anything about their work, portfolio, or examples."
        ),
        load=_projects,
    ),
    Collection(
        key="experience",
        tables=("roles", "footnotes"),
        description=(
            "Employment history as a timeline — dates, job titles, what they did "
            "in each role — plus education and spoken languages."
        ),
        load=_experience,
    ),
    Collection(
        key="contact",
        tables=("contact_content", "profile"),
        description=(
            "How to reach them and where they are based: email, phone, LinkedIn, "
            "GitHub, location."
        ),
        load=_contact,
    ),
    Collection(
        key="answers",
        tables=("answers",),
        description=(
            "Questions already answered in their own words. Worth checking for "
            "anything personal, opinionated, or about how they work — prefer "
            "this wording over paraphrasing the other tables."
        ),
        load=_answers,
    ),
)

BY_KEY: dict[str, Collection] = {c.key: c for c in COLLECTIONS}

ALL_KEYS: list[str] = [c.key for c in COLLECTIONS]


def menu() -> str:
    """The catalogue as the router model sees it: keys, tables, descriptions."""
    return "\n".join(
        f"- {c.key} (tables: {', '.join(c.tables)}): {c.description}"
        for c in COLLECTIONS
    )


def load(db: Session, keys: list[str], *, budget: int) -> str:
    """
    The selected collections as one block of text, capped at `budget` chars.

    Selection order is the model's, so a truncation drops what it asked for last
    — the closest thing we have to a relevance ranking.
    """
    out: list[str] = []
    used = 0
    for key in keys:
        collection = BY_KEY.get(key)
        if collection is None:
            continue
        body = collection.load(db).strip()
        if not body:
            continue
        block = f"## {key}\n{body}"
        if used + len(block) > budget:
            break
        out.append(block)
        used += len(block)
    return "\n\n".join(out)
