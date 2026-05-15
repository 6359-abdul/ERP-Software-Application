"""Add test_id to StudentHifzProgress

Revision ID: 1cafbf1e067d
Revises: 88b57aa22f96
Create Date: 2026-05-14 09:51:17.685862
"""

# pyrefly: ignore [missing-import]
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '1cafbf1e067d'
down_revision = '88b57aa22f96'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    insp = inspect(conn)

    columns = [c['name'] for c in insp.get_columns('student_hifz_progress')]
    fks = [fk['name'] for fk in insp.get_foreign_keys('student_hifz_progress')]
    indexes = [idx['name'] for idx in insp.get_indexes('student_hifz_progress')]

    with op.batch_alter_table('student_hifz_progress', schema=None) as batch_op:

        # Add column if missing
        if 'test_id' not in columns:
            batch_op.add_column(
                sa.Column('test_id', sa.Integer(), nullable=True)
            )

        # Create FK if missing
        if 'fk_student_hifz_progress_test_id' not in fks:
            batch_op.create_foreign_key(
                'fk_student_hifz_progress_test_id',
                'testtype',
                ['test_id'],
                ['id']
            )

        # Create new unique index
        if 'uq_student_hifz_month_new' not in indexes:
            batch_op.create_index(
                'uq_student_hifz_month_new',
                ['student_id', 'academic_year', 'test_id', 'completed_months'],
                unique=True
            )

        # Drop old index if exists
        if 'uq_student_hifz_month' in indexes:
            batch_op.drop_index('uq_student_hifz_month')


def downgrade():
    with op.batch_alter_table('student_hifz_progress', schema=None) as batch_op:

        batch_op.create_index(
            'uq_student_hifz_month',
            ['student_id', 'academic_year', 'completed_months'],
            unique=True
        )

        batch_op.drop_index('uq_student_hifz_month_new')

        batch_op.drop_constraint(
            'fk_student_hifz_progress_test_id',
            type_='foreignkey'
        )

        batch_op.drop_column('test_id')