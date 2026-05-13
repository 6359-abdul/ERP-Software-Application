"""Added Hifz Models

Revision ID: 88b57aa22f96
Revises: 92d7b557f856
Create Date: 2026-05-13 19:07:05.322877
"""

# pyrefly: ignore [missing-import]
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '88b57aa22f96'
down_revision = '92d7b557f856'
branch_labels = None
depends_on = None


def upgrade():
    # Create hifz_programs table
    op.create_table(
        'hifz_programs',

        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('program_name', sa.String(length=100), nullable=False),
        sa.Column('total_months', sa.Integer(), nullable=False),
        sa.Column('total_paras', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),

        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),

        sa.ForeignKeyConstraint(['created_by'], ['users.user_id']),
        sa.ForeignKeyConstraint(['updated_by'], ['users.user_id']),

        sa.PrimaryKeyConstraint('id')
    )

    # Create student_hifz_progress table
    op.create_table(
        'student_hifz_progress',

        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),

        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('academic_year', sa.String(length=50), nullable=False),

        sa.Column('completed_months', sa.Integer(), nullable=False),
        sa.Column('completed_paras', sa.Numeric(precision=5, scale=2), nullable=False),

        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),

        sa.ForeignKeyConstraint(['student_id'], ['students.student_id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.user_id']),
        sa.ForeignKeyConstraint(['updated_by'], ['users.user_id']),

        sa.PrimaryKeyConstraint('id'),

        sa.UniqueConstraint(
            'student_id',
            'completed_months',
            name='uq_student_hifz_month'
        )
    )


def downgrade():
    op.drop_table('student_hifz_progress')
    op.drop_table('hifz_programs')