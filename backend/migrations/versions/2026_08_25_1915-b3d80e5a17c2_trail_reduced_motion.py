"""trail reduced motion policy

Revision ID: b3d80e5a17c2
Revises: 9c4f21ab6d10
Create Date: 2026-08-25 19:15:00.000000

What a visitor who has asked their system for less motion sees. It was hard-coded
to the equivalent of "calm", which meant an editor on a reduce-motion machine was
previewing one thing and shipping another — and had no way to tell, or to choose.

`calm` keeps the previous behaviour, so an existing site does not change.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3d80e5a17c2'
down_revision: Union[str, Sequence[str], None] = '9c4f21ab6d10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'theme_settings',
        sa.Column('trail_reduced', sa.String(length=10), nullable=False, server_default='calm'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('theme_settings', 'trail_reduced')
