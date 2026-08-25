"""
Seeds the database with the copy currently living in
`frontend/src/content/index.ts`, so the CMS opens on the real site rather than an
empty form.

    python -m app.seed          # insert only what is missing
    python -m app.seed --reset  # wipe the content tables and re-insert

Idempotent by design: re-running without --reset leaves edits alone.
"""

import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models
from .accounts import ensure_bootstrap_admin
from .database import Base, SessionLocal, engine

PROFILE = dict(
    name="Ali Mroue",
    role="Full-Stack AI Engineer",
    availability="Beirut, Lebanon — available for work",
    intro=(
        "Three years shipping production systems. Now building retrieval pipelines, "
        "ingestion, and LLM integration — from the vector store to the UI."
    ),
    specialities=["RAG Systems", "Document Pipelines", "React & React Native"],
    email="alimroue2001@gmail.com",
    phone="+961 81 651 281",
    phone_href="tel:+96181651281",
    linkedin="https://www.linkedin.com/",
    github="https://github.com/",
)

SECTIONS = [
    dict(key="about", eyebrow="01 / the person", heading="I build the whole line."),
    dict(key="stack", eyebrow="02 / the toolkit", heading="Things I reach for."),
    dict(key="projects", eyebrow="03 / selected work", heading="Four things worth showing."),
    dict(key="experience", eyebrow="04 / the path", heading="Where I've built."),
    dict(key="contact", eyebrow="05 / next", heading="Send me a hard problem."),
]

ABOUT = dict(
    portrait_placeholder="portrait / drop image here",
    portrait_image="",
    paragraphs=[
        "Ingestion, chunking, vector search, API, and the interface people actually "
        "touch. Most of my work has been on systems where the hard part isn't the "
        "model, it's everything around it: parsing messy real-world documents, keeping "
        "webhooks exactly-once, making 15,000 stores fit into six drivers' weeks.",
        "Right now I work independently, running my own Linux VPS with Docker Compose "
        "and GitHub Actions, and shipping client web apps and RAG systems end to end.",
    ],
)

#: The palette and pointer the site ships with — "Graphite Violet" in the CMS.
THEME = dict(
    preset="graphite-violet",
    color_bg="#15181D",
    color_surface="#1E2228",
    color_border="#2F353E",
    color_text="#E9ECF0",
    color_muted="#9AA2AD",
    color_accent="#7B68FA",
    color_accent_alt="#45D9EF",
    cursor_style="reticle",
    cursor_size=36,
    cursor_spin=True,
    trail_enabled=True,
    trail_particle="dot",
    trail_links=True,
    trail_link_distance=112,
    trail_threads=True,
    trail_motion="follow",
    trail_speed=100,
    trail_life=1900,
    trail_opacity=85,
    trail_size=11,
    trail_density=8,
    trail_color="theme",
    trail_swirl=40,
    trail_repel=40,
    trail_burst=True,
    trail_reduced="calm",
)

def _pointer(**overrides) -> dict:
    """A pointer template, stated as its difference from the shipped settings."""
    base = {k: v for k, v in THEME.items() if k.startswith(("cursor_", "trail_"))}
    base.update(overrides)
    return base


#: Starter templates, so the picker is useful before anyone has saved one.
#: Each is a whole pointer setup — cursor and trail — and none of them touch the
#: palette, so applying one never changes the site's colours.
THEME_TEMPLATES = [
    dict(
        name="Comet",
        note="The shipped feel, thrown harder. Dots that carry your hand's momentum.",
        settings=_pointer(trail_speed=140),
    ),
    dict(
        name="Constellation",
        note="Nodes stay where you drop them and hold for four seconds, linking far. Draws a map of where you have been.",
        settings=_pointer(
            cursor_style="crosshair",
            cursor_size=34,
            trail_motion="still",
            trail_speed=0,
            trail_life=4000,
            trail_opacity=60,
            trail_size=5,
            trail_density=26,
            trail_link_distance=210,
            trail_color="white",
            trail_swirl=8,
            trail_repel=10,
        ),
    ),
    dict(
        name="Whisper",
        note="Barely there. A bare dot cursor and a short, dim trail with no links.",
        settings=_pointer(
            cursor_style="dot",
            cursor_size=20,
            cursor_spin=False,
            trail_links=False,
            trail_threads=False,
            trail_speed=60,
            trail_life=900,
            trail_opacity=14,
            trail_size=7,
            trail_density=14,
            trail_color="muted",
            trail_swirl=15,
            trail_repel=0,
            trail_burst=False,
        ),
    ),
    dict(
        name="Circuitry",
        note="Crosses on a tight grid of links. Technical, static, no glow.",
        settings=_pointer(
            cursor_style="ring",
            cursor_size=30,
            cursor_spin=False,
            trail_particle="plus",
            trail_threads=False,
            trail_motion="still",
            trail_speed=0,
            trail_life=2600,
            trail_opacity=45,
            trail_size=8,
            trail_density=22,
            trail_link_distance=90,
            trail_color="accent-alt",
            trail_swirl=0,
            trail_repel=0,
        ),
    ),
    dict(
        name="Embers",
        note="Sparks blown outward from the cursor, wandering as they burn out.",
        settings=_pointer(
            cursor_style="halo",
            cursor_size=44,
            cursor_spin=False,
            trail_particle="spark",
            trail_links=False,
            trail_threads=False,
            trail_motion="outward",
            trail_speed=120,
            trail_life=1400,
            trail_opacity=70,
            trail_size=14,
            trail_density=7,
            trail_color="accent",
            trail_swirl=70,
            trail_repel=60,
        ),
    ),
]

CONTACT = dict(
    cta="Start a conversation",
    colophon="Built with React, GSAP, and too much coffee.",
    place="Beirut, 2026.",
)

NAV = [
    dict(slug="about", label="About", href="#about"),
    dict(slug="stack", label="Stack", href="#stack"),
    dict(slug="projects", label="Work", href="#projects"),
    dict(slug="experience", label="Path", href="#experience"),
    dict(slug="contact", label="Contact", href="#contact"),
]

STATS = [
    dict(value=3, suffix="+", label="years shipping"),
    dict(value=15000, suffix="+", label="stores routed"),
    dict(value=4, suffix="", label="production stacks owned"),
]

ASK = dict(
    placeholder="Ask me anything about my work",
    question_limit=10,
    fallback=(
        "I haven't written an answer for that one. What I can tell you: I build "
        "retrieval systems end to end — ingestion, chunking, vector search, API, "
        "interface — and I've shipped four production stacks doing it. Ask me about "
        "the RAG pipeline, the routing problem, or whether I'm free."
    ),
)

ANSWERS = [
    dict(
        question="How does his RAG pipeline handle images?",
        keywords=["image", "images", "photo", "visual", "picture", "caption", "multimodal"],
        answer=(
            "Embedded images get captioned at ingestion, so a diagram or a scanned table "
            "becomes searchable text sitting next to the chunk it came from. The caption "
            "carries the parent document's metadata, which means retrieval can filter on "
            "it the same way it filters text. When an image chunk wins, the UI surfaces "
            "the source so you can see what it actually matched."
        ),
        is_chip=True,
    ),
    dict(
        question="What has he shipped end to end?",
        keywords=["shipped", "end to end", "built", "projects", "work", "portfolio"],
        answer=(
            "Four systems. A RAG platform over private document collections — ingestion "
            "through retrieval through UI. A clinical data capture platform with a CRF "
            "builder and full audit trails. A multi-tenant delivery operations platform "
            "with Shopify and WooCommerce webhooks processed exactly once. And a Quran "
            "app shipped to web, then to app stores off the same component architecture."
        ),
        is_chip=True,
    ),
    dict(
        question="Django or .NET?",
        keywords=["django", ".net", "dotnet", "net core", "prefer", "which", "backend", "compare"],
        answer=(
            "Django when the job is speed and the data model is the product — the delivery "
            "platform went from nothing to multi-tenant with webhooks in weeks. .NET when "
            "the requirement is regulatory traceability and typed contracts, which is why "
            "the clinical EDC system was built on it. I've owned both in production, so "
            "the answer is whichever one the constraints pick."
        ),
    ),
    dict(
        question="Is he available?",
        keywords=["available", "hire", "hiring", "free", "availability", "open", "remote", "contract"],
        answer=(
            "Yes — working independently out of Beirut and taking on new work now, remote "
            "or hybrid. Currently shipping client web apps and RAG systems end to end, and "
            "running the infrastructure they sit on. Email is the fastest way in."
        ),
        is_chip=True,
    ),
    dict(
        question="How does he keep webhooks exactly-once?",
        keywords=["webhook", "exactly-once", "idempotent", "shopify", "woocommerce", "reconcil"],
        answer=(
            "Every inbound event is keyed and claimed through Redis before any work "
            "happens, so a duplicate delivery finds the lock already taken and exits. "
            "Celery does the processing off the request path. Then a scheduled "
            "reconciliation sweeps the provider's API for anything the webhook stream "
            "dropped entirely — because it always drops something."
        ),
    ),
    dict(
        question="What was the 15,000-store routing problem?",
        keywords=["15000", "15,000", "routes", "routing", "stores", "driver", "map"],
        answer=(
            "Fifteen thousand stores had to be split across six driver regions and covered "
            "every week, over an offline embedded map. I partitioned the set "
            "geographically, then generated weekly routes that guaranteed full coverage "
            "instead of just short trips. The hard part wasn't the algorithm, it was "
            "making it stable when the store list changed under it."
        ),
    ),
]

STACK_GROUPS = [
    dict(
        name="Languages",
        pills=[],
        tiles=[
            dict(name="TypeScript", icon="typescript", color="#3178C6", where_used="Every frontend, 2023 →"),
            dict(name="JavaScript", icon="javascript", color="#F7DF1E", where_used="Node/Express at Weave Wider"),
            dict(name="Python", icon="python", color="#3776AB", where_used="FastAPI + Django services"),
            dict(name="C#", icon="csharp", color="#512BD4", where_used="EDC platform, Born Interactive"),
        ],
    ),
    dict(
        name="AI",
        pills=["GGUF", "Rerankers", "MCP tool-calling", "Embedding pipelines", "Document parsing"],
        tiles=[
            dict(name="LangChain", icon="langchain", color="#1C3C3C", where_used="Knowledge Base RAG"),
            dict(name="Hugging Face", icon="huggingface", color="#FFD21E", where_used="Embeddings + captioning"),
            dict(name="Milvus", icon="milvus", color="#00A1EA", where_used="Knowledge Base RAG"),
            dict(name="LM Studio", icon="lmstudio", color="#9AA2AD", where_used="Local GGUF inference"),
        ],
    ),
    dict(
        name="Frontend & Mobile",
        pills=[],
        tiles=[
            dict(name="React", icon="react", color="#61DAFB", where_used="Every client app"),
            dict(name="Angular", icon="angular", color="#DD0031", where_used="EDC + component library"),
            dict(name="React Native", icon="reactnative", color="#61DAFB", where_used="Quran Application"),
            dict(name="Expo", icon="expo", color="#E9ECF0", where_used="Quran Application"),
        ],
    ),
    dict(
        name="Backend & Data",
        pills=["EF Core"],
        tiles=[
            dict(name="FastAPI", icon="fastapi", color="#009688", where_used="Knowledge Base RAG"),
            dict(name="Django", icon="django", color="#092E20", where_used="Delivery Operations"),
            dict(name=".NET Core", icon="dotnet", color="#512BD4", where_used="Electronic Data Capture"),
            dict(name="Express", icon="express", color="#E9ECF0", where_used="Weave Wider SaaS"),
            dict(name="Celery", icon="celery", color="#37814A", where_used="Webhook processing"),
            dict(name="Redis", icon="redis", color="#FF4438", where_used="Queues + exactly-once locks"),
            dict(name="PostgreSQL", icon="postgresql", color="#4169E1", where_used="Multi-tenant delivery data"),
            dict(name="Supabase", icon="supabase", color="#3FCF8E", where_used="Client web apps"),
        ],
    ),
    dict(
        name="Infrastructure",
        pills=[],
        tiles=[
            dict(name="Docker", icon="docker", color="#2496ED", where_used="Self-hosted VPS stack"),
            dict(name="GitHub Actions", icon="githubactions", color="#2088FF", where_used="CI/CD, all repos"),
            dict(name="Linux", icon="linux", color="#FCC624", where_used="Self-managed VPS"),
            dict(name="Vercel", icon="vercel", color="#E9ECF0", where_used="Frontend deploys"),
            dict(name="Azure", icon="microsoftazure", color="#0078D4", where_used="Born Interactive"),
            dict(name="AWS S3", icon="amazons3", color="#569A31", where_used="Document storage"),
            dict(name="Git", icon="git", color="#F05032", where_used="Everywhere"),
        ],
    ),
]

PROJECTS = [
    dict(
        number="01",
        title="Knowledge Base RAG System",
        summary="Question answering over private document collections.",
        points=[
            "Configurable ingestion with custom chunking and include/exclude filters.",
            "Embedded images are captioned automatically so non-text assets stay searchable.",
            "Rerankers and metadata-aware retrieval sharpen relevance; answers stay grounded, "
            "with source chunks surfaced in the UI.",
            "Validated against full directory trees of mixed real-world files. Local inference "
            "via LM Studio and GGUF.",
        ],
        tags=["FastAPI", "Milvus", "LangChain", "Hugging Face", "React", "Docker"],
        image="/projects/knowledge-base-rag.svg",
        link="https://github.com/",
        link_label="View the system",
    ),
    dict(
        number="02",
        title="Electronic Data Capture System",
        summary="Role-based clinical data platform for regulated studies.",
        points=[
            "CRF builder for study teams to compose case report forms without engineering.",
            "Full audit trails for regulatory traceability, plus secure exports.",
            "Query management across study, site, and subject modules.",
            "Versioned API contracts so clients never break mid-study.",
        ],
        tags=[".NET Core", "Angular", "SurveyJS"],
        image="/projects/electronic-data-capture.svg",
        link="https://github.com/",
        link_label="View the platform",
    ),
    dict(
        number="03",
        title="Delivery Operations Platform",
        summary="Multi-tenant delivery operations, from order to cash.",
        points=[
            "Orders, waybills, returns, COD, and driver workflows as separate modules.",
            "Shopify and WooCommerce integrated over webhooks with exactly-once processing.",
            "Scheduled reconciliation catches anything the webhook stream drops.",
            "RBAC, audit logging, API versioning.",
        ],
        tags=["Django", "React", "Celery", "Redis", "PostgreSQL"],
        image="/projects/delivery-operations.svg",
        link="https://github.com/",
        link_label="View the platform",
    ),
    dict(
        number="04",
        title="Quran Application",
        summary="One codebase, shipped to the web and to app stores.",
        points=[
            "Built and deployed as a web app first.",
            "Then shipped as a cross-platform mobile build reusing the same component "
            "architecture and state logic.",
        ],
        tags=["Django", "React", "React Native", "Expo"],
        image="/projects/quran-application.svg",
        link="https://github.com/",
        link_label="View the app",
    ),
]

ROLES = [
    dict(
        period="Jan 2026 – Present",
        title="Full-Stack AI Engineer · Independent",
        body=(
            "Ships client web apps and RAG systems end to end: ingestion, vector search, "
            "backend APIs, React/TypeScript frontends, deployment. Runs his own "
            "infrastructure — self-managed Linux VPS, Docker Compose, GitHub Actions, Vercel."
        ),
    ),
    dict(
        period="Jul 2025 – Dec 2025",
        title="Full-Stack Developer · Parcel Tracer · Remote",
        body=(
            "Multi-tenant delivery modules in Django and React. Shopify and WooCommerce "
            "webhooks with Celery/Redis, exactly-once processing, scheduled reconciliation. "
            "RBAC, audit logging, API versioning, Dockerized CI/CD."
        ),
    ),
    dict(
        period="May 2024 – May 2025",
        title="Full-Stack Developer · Weave Wider · Hybrid",
        body=(
            "Partitioned 15,000+ stores across 6 driver regions and generated weekly "
            "full-coverage routes over an offline embedded map. Built the "
            "Node/Express/Sequelize SaaS backend and a custom Angular component library "
            "used across product teams. Led releases and standardized API contracts across teams."
        ),
    ),
    dict(
        period="May 2023 – May 2024",
        title="Full-Stack Developer · Born Interactive · Beirut",
        body=(
            ".NET and Angular features for CMS and insurance products. ASP.NET MVC, REST "
            "APIs, Azure App Service."
        ),
    ),
]

FOOTNOTES = [
    "License in Computer Science · Al Maaref University · 2019–2023",
    "Arabic (native) · English (professional) · French (basic)",
]

#: Wiped by --reset, in FK-safe order.
CONTENT_MODELS = [
    models.StackTile,
    models.StackGroup,
    models.Answer,
    models.AskLog,
    models.Project,
    models.Role,
    models.Footnote,
    models.Stat,
    models.NavItem,
    models.Section,
    models.AskSettings,
    models.ThemeTemplate,
    models.ThemeSettings,
    models.AboutContent,
    models.ContactContent,
    models.Profile,
]


def _empty(db: Session, model: type) -> bool:
    return db.scalar(select(model.id).limit(1)) is None


def _seed_ordered(db: Session, model: type, rows: list[dict]) -> None:
    """Inserts a list with positions from its order. Skipped if the table has rows."""
    if not _empty(db, model):
        return
    for position, row in enumerate(rows):
        db.add(model(position=position, **row))


def seed(db: Session, reset: bool = False) -> None:
    if reset:
        for model in CONTENT_MODELS:
            db.query(model).delete()
        db.commit()

    if _empty(db, models.Profile):
        db.add(models.Profile(id=1, **PROFILE))
    if _empty(db, models.AboutContent):
        db.add(models.AboutContent(id=1, **ABOUT))
    if _empty(db, models.ContactContent):
        db.add(models.ContactContent(id=1, **CONTACT))
    if _empty(db, models.AskSettings):
        db.add(models.AskSettings(id=1, **ASK))
    if _empty(db, models.ThemeSettings):
        db.add(models.ThemeSettings(id=1, **THEME))

    _seed_ordered(db, models.ThemeTemplate, THEME_TEMPLATES)
    _seed_ordered(db, models.Section, SECTIONS)
    _seed_ordered(db, models.NavItem, NAV)
    _seed_ordered(db, models.Stat, STATS)
    _seed_ordered(db, models.Answer, ANSWERS)
    _seed_ordered(db, models.Project, PROJECTS)
    _seed_ordered(db, models.Role, ROLES)
    _seed_ordered(db, models.Footnote, [dict(text=t) for t in FOOTNOTES])

    if _empty(db, models.StackGroup):
        for position, group in enumerate(STACK_GROUPS):
            fields = {k: v for k, v in group.items() if k != "tiles"}
            db.add(
                models.StackGroup(
                    position=position,
                    tiles=[
                        models.StackTile(position=i, **tile)
                        for i, tile in enumerate(group["tiles"])
                    ],
                    **fields,
                )
            )

    db.commit()


def main() -> None:
    reset = "--reset" in sys.argv
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db, reset=reset)
        counts = {m.__tablename__: db.query(m).count() for m in reversed(CONTENT_MODELS)}
        # --reset wipes content, never accounts: losing your login because you
        # re-seeded the copy would be a nasty surprise.
        ensure_bootstrap_admin(db)
    print("seeded:", ", ".join(f"{k}={v}" for k, v in counts.items()))


if __name__ == "__main__":
    main()
