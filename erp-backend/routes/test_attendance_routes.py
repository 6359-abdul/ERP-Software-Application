from flask import Blueprint, request, jsonify
from extensions import db
from models import TestAttendanceMonth
import datetime

test_attendance_bp = Blueprint('test_attendance_bp', __name__)

@test_attendance_bp.route('/api/test-attendance', methods=['GET'])
def get_test_attendance():
    test_id = request.args.get('test_id')
    academic_year = request.args.get('academic_year')
    branch = request.args.get('branch')
    class_id = request.args.get('class_id')  
    
    if not test_id or not academic_year or not branch or not class_id:
        return jsonify({'error': 'test_id, academic_year, branch, and class_id are required'}), 400
        
    mappings = TestAttendanceMonth.query.filter_by( 
        test_id=test_id, 
        academic_year=academic_year,
        branch=branch,
        class_id=class_id
    ).all()
    
    return jsonify([{
        'month': m.month,
        'year': m.year
    } for m in mappings])

@test_attendance_bp.route('/api/test-attendance', methods=['POST'])
def save_test_attendance():
    data = request.get_json()
    test_id = data.get('test_id')
    academic_year = data.get('academic_year')
    branch = data.get('branch')
    class_id = data.get('class_id')
    months = data.get('months') # List of {month: int, year: int}
    
    if not test_id or not academic_year or not branch or not class_id:
        return jsonify({'error': 'Missing required fields (test_id, academic_year, branch, class_id)'}), 400
        
    try:
        # Clear existing for this specific context
        TestAttendanceMonth.query.filter_by(
            test_id=test_id, 
            academic_year=academic_year,
            branch=branch,
            class_id=class_id
        ).delete()
        
        # Add new
        if months:
            for m in months:
                new_mapping = TestAttendanceMonth(
                    test_id=test_id,
                    month=m['month'],
                    year=m['year'],
                    academic_year=academic_year,
                    branch=branch,
                    class_id=class_id
                )
                db.session.add(new_mapping)
            
        db.session.commit()
        return jsonify({'message': 'Attendance mapping saved successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
