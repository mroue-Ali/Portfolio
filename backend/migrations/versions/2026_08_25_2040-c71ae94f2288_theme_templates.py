"""theme templates

Revision ID: c71ae94f2288
Revises: b3d80e5a17c2
Create Date: 2026-08-25 20:40:00.000000

Saved pointer setups — cursor and trail, not the palette. The table is created
empty; `python -m app.seed` fills in the five starters, and it is idempotent, so
running it on an existing database adds them without touching anything else.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c71ae94f2288'
down_revision: Union[str, Sequence[str], None] = 'b3d80e5a17c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'theme_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=80), nullable=False),
        sa.Column('note', sa.String(length=200), nullable=False),
        sa.Column('settings', sa.JSON(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index(
        op.f('ix_theme_templates_position'), 'theme_templates', ['position'], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_theme_templates_position'), table_name='theme_templates')
    op.drop_table('theme_templates')
