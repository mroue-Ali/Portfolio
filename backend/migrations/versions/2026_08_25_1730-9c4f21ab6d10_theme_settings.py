"""theme settings

Revision ID: 9c4f21ab6d10
Revises: 7a0a1d29be23
Create Date: 2026-08-25 17:30:00.000000

The table is created *and* seeded with the palette the site already shipped
with. `build_content` treats a missing theme row the way it treats a missing
profile — as an un-seeded database — so creating the table without a row would
take the public site down between the migration and the next `python -m app.seed`.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c4f21ab6d10'
down_revision: Union[str, Sequence[str], None] = '7a0a1d29be23'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    theme = op.create_table(
        'theme_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('preset', sa.String(length=40), nullable=False),
        sa.Column('color_bg', sa.String(length=20), nullable=False),
        sa.Column('color_surface', sa.String(length=20), nullable=False),
        sa.Column('color_border', sa.String(length=20), nullable=False),
        sa.Column('color_text', sa.String(length=20), nullable=False),
        sa.Column('color_muted', sa.String(length=20), nullable=False),
        sa.Column('color_accent', sa.String(length=20), nullable=False),
        sa.Column('color_accent_alt', sa.String(length=20), nullable=False),
        sa.Column('cursor_style', sa.String(length=20), nullable=False),
        sa.Column('cursor_size', sa.Integer(), nullable=False),
        sa.Column('cursor_spin', sa.Boolean(), nullable=False),
        sa.Column('trail_enabled', sa.Boolean(), nullable=False),
        sa.Column('trail_particle', sa.String(length=20), nullable=False),
        sa.Column('trail_links', sa.Boolean(), nullable=False),
        sa.Column('trail_link_distance', sa.Integer(), nullable=False),
        sa.Column('trail_threads', sa.Boolean(), nullable=False),
        sa.Column('trail_motion', sa.String(length=20), nullable=False),
        sa.Column('trail_speed', sa.Integer(), nullable=False),
        sa.Column('trail_life', sa.Integer(), nullable=False),
        sa.Column('trail_opacity', sa.Integer(), nullable=False),
        sa.Column('trail_size', sa.Integer(), nullable=False),
        sa.Column('trail_density', sa.Integer(), nullable=False),
        sa.Column('trail_color', sa.String(length=20), nullable=False),
        sa.Column('trail_swirl', sa.Integer(), nullable=False),
        sa.Column('trail_repel', sa.Integer(), nullable=False),
        sa.Column('trail_burst', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    op.bulk_insert(
        theme,
        [
            dict(
                id=1,
                preset='graphite-violet',
                color_bg='#15181D',
                color_surface='#1E2228',
                color_border='#2F353E',
                color_text='#E9ECF0',
                color_muted='#9AA2AD',
                color_accent='#7B68FA',
                color_accent_alt='#45D9EF',
                cursor_style='reticle',
                cursor_size=36,
                cursor_spin=True,
                trail_enabled=True,
                trail_particle='dot',
                trail_links=True,
                trail_link_distance=112,
                trail_threads=True,
                trail_motion='follow',
                trail_speed=100,
                trail_life=1900,
                trail_opacity=85,
                trail_size=11,
                trail_density=8,
                trail_color='theme',
                trail_swirl=40,
                trail_repel=40,
                trail_burst=True,
            )
        ],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('theme_settings')
