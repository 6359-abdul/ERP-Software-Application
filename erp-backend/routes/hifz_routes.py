# pyrefly: ignore [missing-import]
from flask import Blueprint, request, jsonify, g
from models import db, HifzProgram, StudentHifzProgress, Student
import logging

hifz_bp = Blueprint('hifz_bp', __name__)
logger = logging.getLogger(__name__)

# --- Master Settings ---

@hifz_bp.route('/programs', methods=['GET'])
def get_programs():
    try:
        programs = HifzProgram.query.filter_by(is_active=True).all()
        return jsonify([
            {
                "id": p.id,
                "program_name": p.program_name,
                "total_months": p.total_months,
                "total_paras": p.total_paras
            } for p in programs
        ]), 200
    except Exception as e:
        logger.error(f"Error getting Hifz programs: {str(e)}")
        return jsonify({"message": "Error fetching programs"}), 500

@hifz_bp.route('/programs', methods=['POST'])
def create_program():
    try:
        data = request.json
        program = HifzProgram(
            program_name=data['program_name'],
            total_months=int(data['total_months']),
            total_paras=int(data['total_paras']),
            is_active=True
        )
        db.session.add(program)
        db.session.commit()
        return jsonify({"message": "Program created", "id": program.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500

@hifz_bp.route('/programs/<int:prog_id>', methods=['PUT'])
def update_program(prog_id):
    try:
        data = request.json
        program = HifzProgram.query.get_or_404(prog_id)
        program.program_name = data['program_name']
        program.total_months = int(data['total_months'])
        program.total_paras = int(data['total_paras'])
        db.session.commit()
        return jsonify({"message": "Program updated"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500

@hifz_bp.route('/programs/<int:prog_id>', methods=['DELETE'])
def delete_program(prog_id):
    try:
        program = HifzProgram.query.get_or_404(prog_id)
        program.is_active = False
        db.session.commit()
        return jsonify({"message": "Program deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500

# --- Bulk Entry API ---

@hifz_bp.route('/students', methods=['GET'])
def get_hifz_students():
    try:
        academic_year = request.headers.get("X-Academic-Year", "2024-2025")
        branch = request.args.get('branch')
        class_name = request.args.get('class_name')
        section = request.args.get('section')
        category = request.args.get('category')

        query = Student.query.filter_by(academic_year=academic_year, status="Active")
        if branch and branch != "All Branches":
            query = query.filter_by(branch_name=branch)
        if class_name:
            query = query.filter_by(class_name=class_name)
        if section:
            query = query.filter_by(section=section)
        if category:
            # Map frontend dropdown to database string
            cat_str = "Hifz+Nazira" if category == "Hifz + Nazira" else category
            query = query.filter_by(AdmissionCategory=cat_str)
            
        students = query.all()
        result = []
        for s in students:
            # Fetch latest progress
            latest_progress = StudentHifzProgress.query.filter_by(
                student_id=s.student_id, academic_year=academic_year
            ).order_by(StudentHifzProgress.completed_months.desc()).first()
            
            result.append({
                "student_id": s.student_id,
                "admission_no": s.admission_no,
                "student_name": s.student_name,
                "class_name": s.class_name,
                "section": s.section,
                "roll_number": s.Roll_Number,
                "category": s.AdmissionCategory,
                "completed_months": latest_progress.completed_months if latest_progress else "",
                "completed_paras": float(latest_progress.completed_paras) if latest_progress else ""
            })
            
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error fetching hifz students: {str(e)}")
        return jsonify({"message": "Error fetching students"}), 500

@hifz_bp.route('/bulk-progress', methods=['POST'])
def save_bulk_progress():
    try:
        data = request.json
        academic_year = request.headers.get("X-Academic-Year", "2024-2025")
        entries = data.get("entries", [])
        
        for entry in entries:
            student_id = entry.get("student_id")
            months = entry.get("completed_months")
            paras = entry.get("completed_paras")
            
            if months == "" or paras == "":
                continue
                
            months = int(months)
            paras = float(paras)
            
            # Update or insert
            progress = StudentHifzProgress.query.filter_by(
                student_id=student_id, completed_months=months
            ).first()
            
            if progress:
                progress.completed_paras = paras
            else:
                progress = StudentHifzProgress(
                    student_id=student_id,
                    academic_year=academic_year,
                    completed_months=months,
                    completed_paras=paras
                )
                db.session.add(progress)
                
        db.session.commit()
        return jsonify({"message": "Progress saved successfully!"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving bulk progress: {str(e)}")
        return jsonify({"message": str(e)}), 500

# --- Graph Data Generation ---

def get_graph_data_for_student(student_id):
    """
    Returns dict: { expected: [{month, paras}], actual: [{month, paras}] }
    Falls back to dynamically generating expected graph based on student's category.
    """
    student = Student.query.get(student_id)
    if not student:
        return {"expected": [], "actual": []}
        
    cat_str = "Hifz + Nazira" if student.AdmissionCategory == "Hifz+Nazira" else student.AdmissionCategory
    
    # Get program target
    program = HifzProgram.query.filter_by(program_name=cat_str, is_active=True).first()
    
    expected = []
    if program and program.total_months > 0:
        pace = program.total_paras / program.total_months
        for m in range(0, program.total_months + 1):
            expected.append({
                "month": m,
                "paras": min(round(pace * m, 1), program.total_paras)
            })
            
    # Get actual progress
    progress_records = StudentHifzProgress.query.filter_by(student_id=student_id).order_by(StudentHifzProgress.completed_months).all()
    actual = []
    if progress_records:
        actual.append({"month": 0, "paras": 0})
        for p in progress_records:
            actual.append({
                "month": p.completed_months,
                "paras": float(p.completed_paras)
            })
            
    return {
        "expected": expected,
        "actual": actual
    }
