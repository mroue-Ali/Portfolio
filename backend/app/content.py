"""
Assembles the public payload.

The frontend addresses chips by index (`ask.chipIndices`) while the database
stores a flag, so the translation happens here, once, against the same ordered
list that ships in the response.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models, schemas


def _sections(db: Session) -> dict[str, models.Section]:
    return {s.key: s for s in db.scalars(select(models.Section))}


def _heading(sections: dict[str, models.Section], key: str) -> tuple[str, str]:
    section = sections.get(key)
    return (section.eyebrow, section.heading) if section else ("", "")


def build_content(db: Session) -> schemas.SiteContent:
    sections = _sections(db)

    profile = db.get(models.Profile, 1)
    about = db.get(models.AboutContent, 1)
    contact = db.get(models.ContactContent, 1)
    ask = db.get(models.AskSettings, 1)
    if not (profile and about and contact and ask):
        raise LookupError("content tables are empty — run `python -m app.seed`")

    answers = list(
        db.scalars(
            select(models.Answer)
            .where(models.Answer.published.is_(True))
            .order_by(models.Answer.position)
        )
    )

    nav = list(
        db.scalars(
            select(models.NavItem)
            .where(models.NavItem.visible.is_(True))
            .order_by(models.NavItem.position)
        )
    )
    stats = list(db.scalars(select(models.Stat).order_by(models.Stat.position)))
    groups = list(
        db.scalars(select(models.StackGroup).order_by(models.StackGroup.position))
    )
    projects = list(
        db.scalars(
            select(models.Project)
            .where(models.Project.published.is_(True))
            .order_by(models.Project.position)
        )
    )
    roles = list(db.scalars(select(models.Role).order_by(models.Role.position)))
    footnotes = list(
        db.scalars(select(models.Footnote).order_by(models.Footnote.position))
    )

    about_eyebrow, about_heading = _heading(sections, "about")
    stack_eyebrow, stack_heading = _heading(sections, "stack")
    projects_eyebrow, projects_heading = _heading(sections, "projects")
    experience_eyebrow, experience_heading = _heading(sections, "experience")
    contact_eyebrow, contact_heading = _heading(sections, "contact")

    return schemas.SiteContent(
        profile=schemas.ProfileOut(
            name=profile.name,
            role=profile.role,
            availability=profile.availability,
            intro=profile.intro,
            specialities=profile.specialities,
            email=profile.email,
            phone_href=profile.phone_href,
            phone=profile.phone,
            linkedin=profile.linkedin,
            github=profile.github,
        ),
        nav=[
            schemas.NavItemOut(
                id=item.slug, row_id=item.id, label=item.label, href=item.href
            )
            for item in nav
        ],
        ask=schemas.AskOut(
            placeholder=ask.placeholder,
            chip_indices=[i for i, a in enumerate(answers) if a.is_chip],
            limit=ask.question_limit,
            fallback=ask.fallback,
        ),
        answers=[
            schemas.AnswerOut(
                keywords=a.keywords,
                question=a.question,
                answer=a.answer,
            )
            for a in answers
        ],
        about=schemas.AboutOut(
            eyebrow=about_eyebrow,
            heading=about_heading,
            portrait_placeholder=about.portrait_placeholder,
            portrait_image=about.portrait_image,
            paragraphs=about.paragraphs,
            stats=[
                schemas.StatOut(id=s.id, value=s.value, suffix=s.suffix, label=s.label)
                for s in stats
            ],
        ),
        stack=schemas.StackOut(
            eyebrow=stack_eyebrow,
            heading=stack_heading,
            groups=[
                schemas.StackGroupOut(
                    id=g.id,
                    name=g.name,
                    pills=g.pills,
                    tiles=[
                        schemas.StackTileOut(
                            id=t.id,
                            name=t.name,
                            icon=t.icon,
                            color=t.color,
                            where=t.where_used,
                        )
                        for t in g.tiles
                    ],
                )
                for g in groups
            ],
        ),
        projects=schemas.ProjectsOut(
            eyebrow=projects_eyebrow,
            heading=projects_heading,
            items=[
                schemas.ProjectOut(
                    id=p.id,
                    number=p.number,
                    title=p.title,
                    summary=p.summary,
                    points=p.points,
                    tags=p.tags,
                    image=p.image,
                    link=p.link,
                    link_label=p.link_label,
                )
                for p in projects
            ],
        ),
        experience=schemas.ExperienceOut(
            eyebrow=experience_eyebrow,
            heading=experience_heading,
            roles=[
                schemas.RoleOut(id=r.id, period=r.period, title=r.title, body=r.body)
                for r in roles
            ],
            footnotes=[schemas.FootnoteOut(id=f.id, text=f.text) for f in footnotes],
        ),
        contact=schemas.ContactOut(
            eyebrow=contact_eyebrow,
            heading=contact_heading,
            cta=contact.cta,
            colophon=contact.colophon,
            place=contact.place,
        ),
    )
