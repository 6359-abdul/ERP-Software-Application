import sys
import os

# Fix path to allow importing from parent directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from extensions import db
from app import create_app
from models import Student, StudentAcademicRecord
from datetime import datetime

app = create_app()

def migrate_academic_records():
    # SAFETY GUARD
    import os
    import sys
    ENV = os.getenv("FLASK_ENV", "development")
    if ENV not in ["development", "testing"]:
        print(f"\n[CRITICAL ERROR] Script blocked in '{ENV}' environment.")
        sys.exit(1)

    with app.app_context():
        # Create table if not exists (usually handled by db.create_all but good to be safe)
        db.create_all()
        
        students = Student.query.all()
        count = 0
        skipped = 0
        
        print(f"Found {len(students)} students to check.")
        
        for s in students:
            # Check if record already exists for this year
            # Logic: If student.academic_year is set, use it. If not, maybe skip or default?
            # Existing data likely has academic_year populated.
            
            if not s.academic_year:
                # Fallback purely for safety, though production data should have it
                print(f"Student {s.admission_no} (ID: {s.student_id}) has no academic_year. Skipping.")
                continue
                
            existing = StudentAcademicRecord.query.filter_by(
                student_id=s.student_id,
                academic_year=s.academic_year
            ).first()
            
            if existing:
                skipped += 1
                continue
                
            new_record = StudentAcademicRecord(
                student_id=s.student_id,
                academic_year=s.academic_year,
                class_name=s.clazz,
                section=s.section,
                roll_number=s.Roll_Number,
                is_promoted=False, # Initial state
                promoted_date=None,
                created_at=datetime.now()
            )
            
            db.session.add(new_record)
            count += 1
            
            if count % 100 == 0:
                print(f"Processed {count}...")
                db.session.commit()
        
        db.session.commit()
        print(f"Migration Complete. Created {count} records. Skipped {skipped} existing records.")

if __name__ == "__main__":
    migrate_academic_records()
