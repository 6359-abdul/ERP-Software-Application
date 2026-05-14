# revision identifiers, used by Alembic.
"""Add test_id to StudentHifzProgress

Revision ID: 1cafbf1e067d
Revises: 88b57aa22f96
Create Date: 2026-05-14 09:51:17.685862

"""
# pyrefly: ignore [missing-import]
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '1cafbf1e067d'
down_revision = '88b57aa22f96'
branch_labels = None
depends_on = None


def upgrade():
    try:
        with op.batch_alter_table('student_hifz_progress', schema=None) as batch_op:
            batch_op.add_column(sa.Column('test_id', sa.Integer(), nullable=True))
    except Exception as e:
        print("Column test_id might already exist:", str(e))
        
    try:
        with op.batch_alter_table('student_hifz_progress', schema=None) as batch_op:
            batch_op.create_foreign_key('fk_student_hifz_progress_test_id', 'testtype', ['test_id'], ['id'])
    except Exception as e:
        print("FK might already exist:", str(e))
        
    try:
        with op.batch_alter_table('student_hifz_progress', schema=None) as batch_op:
            batch_op.create_index('uq_student_hifz_month_new', ['student_id', 'academic_year', 'test_id', 'completed_months'], unique=True)
            batch_op.drop_index('uq_student_hifz_month')
    except Exception as e:
        print("Index issue:", str(e))


def downgrade():
    with op.batch_alter_table('student_hifz_progress', schema=None) as batch_op:
        batch_op.create_index('uq_student_hifz_month', ['student_id', 'academic_year', 'completed_months'], unique=True)
        batch_op.drop_index('uq_student_hifz_month_new')
        batch_op.drop_constraint('fk_student_hifz_progress_test_id', type_='foreignkey')
        batch_op.drop_column('test_id')
