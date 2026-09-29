"""remediation_financial_precision_and_new_models

Revision ID: b7f8bbbeff6f
Revises: a6f7aaaffe5e
Create Date: 2026-09-29 15:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7f8bbbeff6f'
down_revision: Union[str, Sequence[str], None] = 'a6f7aaaffe5e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create accounts table
    op.create_table(
        'accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('account_name', sa.String(), nullable=False),
        sa.Column('account_number_mask', sa.String(), nullable=True),
        sa.Column('bank_name', sa.String(), nullable=False),
        sa.Column('account_type', sa.String(), nullable=False, server_default='Savings'),
        sa.Column('balance', sa.Numeric(precision=14, scale=2), nullable=False, server_default='0.00'),
        sa.Column('currency', sa.String(), server_default='INR'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_accounts_id'), 'accounts', ['id'], unique=False)
    op.create_index(op.f('ix_accounts_user_id'), 'accounts', ['user_id'], unique=False)

    # 2. Create transfers table
    op.create_table(
        'transfers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_account_id', sa.Integer(), sa.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('destination_account_id', sa.Integer(), sa.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('transfer_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('reference_number', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transfers_id'), 'transfers', ['id'], unique=False)
    op.create_index(op.f('ix_transfers_user_id'), 'transfers', ['user_id'], unique=False)

    # 3. Create liabilities table
    op.create_table(
        'liabilities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('liability_type', sa.String(), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('remaining_amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('interest_rate', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0.00'),
        sa.Column('minimum_payment', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(), server_default='Active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_liabilities_id'), 'liabilities', ['id'], unique=False)
    op.create_index(op.f('ix_liabilities_user_id'), 'liabilities', ['user_id'], unique=False)

    # 4. Create india_post_rates table
    op.create_table(
        'india_post_rates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('scheme_code', sa.String(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('annual_rate', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('compounding_frequency', sa.String(), nullable=False, server_default='Annual'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_india_post_rates_id'), 'india_post_rates', ['id'], unique=False)
    op.create_index(op.f('ix_india_post_rates_scheme_code'), 'india_post_rates', ['scheme_code'], unique=False)

    # 5. Create investment_transactions table
    op.create_table(
        'investment_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('investment_id', sa.Integer(), sa.ForeignKey('investments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('transaction_type', sa.String(), nullable=False),
        sa.Column('units', sa.Numeric(precision=14, scale=4), nullable=False),
        sa.Column('price_per_unit', sa.Numeric(precision=14, scale=4), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('transaction_date', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('notes', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_investment_transactions_id'), 'investment_transactions', ['id'], unique=False)
    op.create_index(op.f('ix_investment_transactions_investment_id'), 'investment_transactions', ['investment_id'], unique=False)
    op.create_index(op.f('ix_investment_transactions_user_id'), 'investment_transactions', ['user_id'], unique=False)

    # 6. Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('resource_type', sa.String(), nullable=False),
        sa.Column('resource_id', sa.String(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('user_agent', sa.String(), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_timestamp'), 'audit_logs', ['timestamp'], unique=False)

    # 7. Create category_feedbacks table
    op.create_table(
        'category_feedbacks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('transaction_id', sa.Integer(), sa.ForeignKey('transactions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('raw_narration', sa.String(), nullable=False),
        sa.Column('old_category', sa.String(), nullable=True),
        sa.Column('new_category', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_category_feedbacks_id'), 'category_feedbacks', ['id'], unique=False)
    op.create_index(op.f('ix_category_feedbacks_user_id'), 'category_feedbacks', ['user_id'], unique=False)

    # 8. Add account_id, transfer_id, fingerprint to transactions
    op.add_column('transactions', sa.Column('account_id', sa.Integer(), sa.ForeignKey('accounts.id', ondelete='SET NULL'), nullable=True))
    op.add_column('transactions', sa.Column('transfer_id', sa.Integer(), sa.ForeignKey('transfers.id', ondelete='SET NULL'), nullable=True))
    op.add_column('transactions', sa.Column('fingerprint', sa.String(64), nullable=True))
    op.create_index(op.f('ix_transactions_account_id'), 'transactions', ['account_id'], unique=False)
    op.create_index(op.f('ix_transactions_transfer_id'), 'transactions', ['transfer_id'], unique=False)
    op.create_index(op.f('ix_transactions_fingerprint'), 'transactions', ['fingerprint'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_transactions_fingerprint'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_transfer_id'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_account_id'), table_name='transactions')
    op.drop_column('transactions', 'fingerprint')
    op.drop_column('transactions', 'transfer_id')
    op.drop_column('transactions', 'account_id')
    op.drop_table('category_feedbacks')
    op.drop_table('audit_logs')
    op.drop_table('investment_transactions')
    op.drop_table('india_post_rates')
    op.drop_table('liabilities')
    op.drop_table('transfers')
    op.drop_table('accounts')
