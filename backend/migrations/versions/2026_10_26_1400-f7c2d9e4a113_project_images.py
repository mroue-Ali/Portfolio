"""project gallery images

Revision ID: f7c2d9e4a113
Revises: e5b1a7c3d902
Create Date: 2026-10-26 14:00:00.000000

A list of extra images per project for the details view. MySQL gives JSON
columns no default, so the column arrives nullable, is filled, then tightened.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7c2d9e4a113'
down_revision: Union[str, Sequence[str], None] = 'e5b1a7c3d902'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('projects', sa.Column('images', sa.JSON(), nullable=True))
    op.execute("UPDATE projects SET images = JSON_ARRAY()")
    op.alter_column('projects', 'images', existing_type=sa.JSON(), nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('projects', 'images')
