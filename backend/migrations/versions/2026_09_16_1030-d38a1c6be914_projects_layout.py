"""projects section layout

Revision ID: d38a1c6be914
Revises: c71ae94f2288
Create Date: 2026-09-16 10:30:00.000000

One row, one column: which way the projects section renders. Seeded with
`showcase`, the layout every existing site is already using, so the migration
changes nothing visible on its own — the switch to `list` is a CMS decision.

`build_content` falls back to `showcase` when the row is missing, so a database
that has the table but has not been re-seeded still serves.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd38a1c6be914'
down_revision: Union[str, Sequence[str], None] = 'c71ae94f2288'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    projects_content = op.create_table(
        'projects_content',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('layout', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    op.bulk_insert(projects_content, [dict(id=1, layout='showcase')])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('projects_content')
