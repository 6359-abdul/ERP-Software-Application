"""add class_section table

Revision ID: 277226953cdd
Revises: f67f3a264da1
Create Date: 2026-02-14 11:04:16.635277

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '277226953cdd'
down_revision = 'f67f3a264da1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'class_sections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('class_id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('academic_year', sa.String(length=20), nullable=False),
        sa.Column('section_name', sa.String(length=10), nullable=False),
        sa.Column('student_strength', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'class_id',
            'branch_id',
            'academic_year',
            'section_name',
            name='uq_class_branch_year_section'
        )
    )

    op.create_index(
        'idx_class_section_branch_year',
        'class_sections',
        ['branch_id', 'academic_year'],
        unique=False
    )

    op.create_index(
        'idx_class_section_class',
        'class_sections',
        ['class_id'],
        unique=False
    )



def downgrade():
    op.drop_index('idx_class_section_class', table_name='class_sections')
    op.drop_index('idx_class_section_branch_year', table_name='class_sections')
    op.drop_table('class_sections')

    # ### end Alembic commands ###
