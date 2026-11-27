"""fix_merchant_unique_and_budgets

Revision ID: c8f9ccceff70
Revises: b7f8bbbeff6f
Create Date: 2026-11-27 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c8f9ccceff70'
down_revision: Union[str, Sequence[str], None] = 'b7f8bbbeff6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. Clean invalid out-of-range budget rows
    if inspector.has_table('budgets'):
        op.execute("DELETE FROM budgets WHERE month < 1 OR month > 12")

    # 2. Update merchant constraints: unique on (user_id, name)
    if inspector.has_table('merchants'):
        with op.batch_alter_table('merchants') as batch_op:
            try:
                batch_op.create_unique_constraint('uq_merchants_user_id_name', ['user_id', 'name'])
            except Exception:
                pass

def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table('merchants'):
        with op.batch_alter_table('merchants') as batch_op:
            try:
                batch_op.drop_constraint('uq_merchants_user_id_name', type_='unique')
            except Exception:
                pass
