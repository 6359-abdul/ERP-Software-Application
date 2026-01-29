from flask import Blueprint, jsonify, request
from extensions import db
from models import Student, Attendance, Branch, UserBranchAccess, StudentAcademicRecord
from helpers import token_required, require_academic_year, student_to_dict, get_default_location


from datetime import datetime, date
from sqlalchemy import or_

bp = Blueprint('attendance_routes', __name__)

@bp.route("/api/attendance", methods=["GET"])
@token_required
def get_attendance(current_user):
    try:
        class_name = request.args.get("class")
        section = request.args.get("section")
        date_str = request.args.get("date")
        student_id = request.args.get("student_id")
        month_str = request.args.get("month")
        year_str = request.args.get("year")
        
        h_branch = request.headers.get("X-Branch")
        h_year, err, code = require_academic_year()
        if err: return err, code
        
        # Branch Permissions Logic
        if current_user.role != 'Admin':
             # Enforce user's branch
             if current_user.branch and current_user.branch != 'All':
                  h_branch = current_user.branch
             else:
                  # If user has "All" (legacy) but really shouldn't see global
                  # We might need to check "allowed_branches" but for now stick to current_user.branch
                  h_branch = current_user.branch 
        
        elif not h_branch:
             h_branch = "All"
        
        # Base query joining Student and Academic Record
        # We need students who were in the requested class/section DURING the requested academic year
        q = db.session.query(Student, StudentAcademicRecord).join(
            StudentAcademicRecord, 
            Student.student_id == StudentAcademicRecord.student_id
        ).filter(
            StudentAcademicRecord.academic_year == h_year,
            Student.status == "Active"
        )
        
        # STRICT BRANCH SEGREGATION
        if current_user.role != 'Admin':
             if current_user.branch and current_user.branch != 'All':
                  q = q.filter(Student.branch == current_user.branch)
        else:
             branch_param = request.args.get("branch")
             if branch_param == "All" or branch_param == "All Branches":
                 pass
             elif branch_param:
                 q = q.filter(Student.branch == branch_param)
             elif h_branch and h_branch != "All":
                 q = q.filter(Student.branch == h_branch)
        
        if class_name:
            q = q.filter(StudentAcademicRecord.class_name == class_name)
        if section:
            q = q.filter(StudentAcademicRecord.section == section)
        if student_id:
            q = q.filter(Student.student_id == student_id)
            
        # If no filters provided
        if not (class_name or student_id or date_str):
             return jsonify({"error": "Please provide Class, Student ID, or Date"}), 400
        
        results = q.all()
        
        # Extract students and build list
        students = []
        student_ids = []
        
        for s, record in results:
            s_dict = student_to_dict(s)
            # OVERRIDE with Historical Data for key fields
            s_dict['class'] = record.class_name
            s_dict['section'] = record.section
            s_dict['Roll_Number'] = record.roll_number
            s_dict['rollNo'] = record.roll_number # Frontend expects this often
            students.append(s_dict)
            student_ids.append(s.student_id)
            
        if not student_ids:
             return jsonify({"students": [], "attendance": {}}), 200
        
        attendance_data = {}
        
        if date_str:
            # Daily View (Specific Date)
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            records = Attendance.query.filter(
                Attendance.student_id.in_(student_ids),
                Attendance.date == target_date,
                Attendance.academic_year == h_year
            ).all()
            
            # Map student_id -> status
            for r in records:
                attendance_data[r.student_id] = r.status
                
        elif month_str and year_str:
            # Monthly View
            records = Attendance.query.filter(
                Attendance.student_id.in_(student_ids),
                db.extract('year', Attendance.date) == int(year_str),
                db.extract('month', Attendance.date) == int(month_str),
                Attendance.academic_year == h_year
            ).all()
            
            # Map student_id -> { date: status }
            for r in records:
                if r.student_id not in attendance_data:
                    attendance_data[r.student_id] = {}
                attendance_data[r.student_id][r.date.isoformat()] = r.status
        
        # If student_id is provided, we might want all history if no date/month specified
        elif student_id:
             records = Attendance.query.filter(
                Attendance.student_id == student_id,
                Attendance.academic_year == h_year
            ).order_by(Attendance.date.desc()).all()
             
             if int(student_id) not in attendance_data:
                 attendance_data[int(student_id)] = {}
             for r in records:
                 attendance_data[int(student_id)][r.date.isoformat()] = r.status

        # Calculate stats for the response
        class_update_count = 0
        last_modified = None
        
        if date_str and 'records' in locals() and records:
             class_update_count = max((r.update_count for r in records if r.update_count is not None), default=0)
             last_mod_dt = max((r.updated_at for r in records if r.updated_at is not None), default=None)
             last_modified = last_mod_dt.isoformat() if last_mod_dt else None

        return jsonify({
            "students": students, # Already converted and patched above
            "attendance": attendance_data,
            "class_update_count": class_update_count,
            "last_modified": last_modified
        }), 200
    except Exception as e:
        print(f"Get Attendance Error: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/api/attendance", methods=["POST"])
@token_required
def save_attendance(current_user):
    try:
        data = request.json
        date_str = data.get("date")
        attendance_list = data.get("attendance") # List of {student_id, status}
        
        # Header Filtering for saving context
        h_branch = request.headers.get("X-Branch") or "Main"
        
        h_year, err, code = require_academic_year()
        if err:
            return err, code
        
        # STRICT BRANCH ENFORCEMENT
        if current_user.role != 'Admin':
             h_branch = current_user.branch
        
        if not date_str or not attendance_list:
            return jsonify({"error": "Date and attendance data required"}), 400
            
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        for item in attendance_list:
            student_id = item.get("student_id")
            status = item.get("status")
            
            if not student_id or not status:
                continue
                
            # Verify Student belongs to branch (Security Check)
            if current_user.role != 'Admin':
                student_check = Student.query.get(student_id)
                if not student_check or student_check.branch != current_user.branch:
                    continue 

            # Check if record exists
            record = Attendance.query.filter_by(
                student_id=student_id,
                date=target_date
            ).first()
            
            if record:
                record.status = status
                record.update_count = (record.update_count or 0) + 1
                record.updated_at = datetime.now()
            else:
                new_record = Attendance(
                    student_id=student_id,
                    date=target_date,
                    status=status,
                    update_count=0,
                    updated_at=datetime.now(),
                    branch=h_branch,
                    academic_year=h_year,
                    location=current_user.location if current_user.location else get_default_location()
                )
                db.session.add(new_record)
        
        db.session.commit()
        return jsonify({"message": "Attendance saved successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Save Attendance Error: {e}")
        return jsonify({"error": str(e)}), 500
