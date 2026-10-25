"""project repo and description

Revision ID: e5b1a7c3d902
Revises: d38a1c6be914
Create Date: 2026-10-26 12:00:00.000000

The projects section became a grid of cards that open a details view. That view
needs a repository link next to the site link, and room for a longer write-up
than the one-line summary on the card. Both default to empty, which hides them.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5b1a7c3d902'
down_revision: Union[str, Sequence[str], None] = 'd38a1c6be914'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('projects', sa.Column('repo', sa.String(length=255), server_default='', nullable=False))
    op.add_column('projects', sa.Column('description', sa.Text(), nullable=True))
    op.execute("UPDATE projects SET description = ''")
    op.alter_column('projects', 'description', existing_type=sa.Text(), nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('projects', 'description')
    op.drop_column('projects', 'repo')
