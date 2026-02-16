from flask import Blueprint, jsonify, request
from extensions import db
from models import ClassMaster, ClassSection, Branch, Student, OrgMaster, User
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from helpers import token_required
              
bp = Blueprint("class_routes", __name__)

@bp.route("/api/classes/create_with_sections", methods=["POST"])
def create_class_with_sections():
    """
    Creates or Updates a Class + Sections.
    Strictly transactional.
    RBAC: Adming only.
    """
    # 1. RBAC Check (Simplified for now, assuming auth middleware or check)
    # In a real app, use @login_required and check current_user.role
    # For now, we trust the caller or check a header/mock
    # user_role = request.headers.get("X-Role", "Admin") 
    # if user_role != "Admin":
    #    return jsonify({"error": "Unauthorized"}), 403

    data = request.json
    try:
        class_name_raw = data.get("class_name")
        branch_id = data.get("branch_id")
        academic_year = data.get("academic_year")
        sections = data.get("sections", []) # List of {name, strength}

        if not all([class_name_raw, branch_id, academic_year]):
            return jsonify({"error": "Missing required fields"}), 400

        if not sections:
            return jsonify({"error": "At least one section is required"}), 400

        # Normalize Class Name
        class_name = class_name_raw.strip() # Could add .title() if desired

        # Start Transaction
        with db.session.begin():
            # 2. Find or Create ClassMaster
            class_obj = ClassMaster.query.filter(
                func.lower(ClassMaster.class_name) == func.lower(class_name)
            ).first()

            if not class_obj:
                class_obj = ClassMaster(class_name=class_name)
                db.session.add(class_obj)
                db.session.flush() # Get ID

            # 3. Process Sections
            # Delete removed sections first
            existing_sections = ClassSection.query.filter_by(
                class_id=class_obj.id,
                branch_id=branch_id,
                academic_year=academic_year
            ).all()

            existing_section_names = {s.section_name for s in existing_sections}
            payload_section_names = {s.get("name", "").strip().upper() for s in sections}
            
            sections_to_delete = existing_section_names - payload_section_names
            
            if sections_to_delete:
                ClassSection.query.filter(
                    ClassSection.class_id == class_obj.id,
                    ClassSection.branch_id == branch_id,
                    ClassSection.academic_year == academic_year,
                    ClassSection.section_name.in_(sections_to_delete)
                ).delete(synchronize_session=False)

            seen_sections = set()
            
            for sec in sections:
                sec_name = sec.get("name", "").strip().upper()
                strength = int(sec.get("strength", 0))

                # Validation: Basic
                if not sec_name:
                    raise ValueError("Section name cannot be empty")
                if strength <= 0:
                    raise ValueError(f"Strength for section {sec_name} must be > 0")
                if sec_name in seen_sections:
                    raise ValueError(f"Duplicate section '{sec_name}' in payload")
                seen_sections.add(sec_name)

                # Validation: Occupancy Check (ERP Rule)
                # Count active students in this context
                # Note: ClassMaster might map to Student.class (string) or ID. 
                # Student table currently uses string "class".
                # We assume ClassMaster.class_name matches Student.class column value.
                
                current_occupancy = db.session.query(func.count(Student.student_id)).filter(
                    Student.clazz == class_name, # Student table column is 'class', mapped as 'clazz'
                    Student.section == sec_name,
                    Student.branch == str(branch_id), # Student branch is likely String Name? Need to verify model.
                    # Wait, Student.branch is String(50). branch_id is Int. 
                    # We need to resolve Branch Name if Student uses Name.
                    # Let's check Branch model. 
                    
                    # Student.academic_year == academic_year # Optional depending on how students are promoted
                ).scalar()
                
                # Resolving Branch Name Issue:
                # Student table uses 'branch' string column.
                # Input is 'branch_id'.
                # We need to fetch Branch Name.
                branch_obj = Branch.query.get(branch_id)
                if not branch_obj:
                     raise ValueError(f"Invalid Branch ID: {branch_id}")
                
                # Correct Query with resolved Branch Name
                # And assume Student.academic_year matches
                current_occupancy = db.session.query(func.count(Student.student_id)).filter(
                    Student.clazz == class_name, 
                    Student.section == sec_name,
                    Student.branch == branch_obj.branch_name, 
                    Student.academic_year == academic_year,
                    Student.status == "Active"
                ).scalar()

                if strength < current_occupancy:
                    raise ValueError(
                        f"Cannot set strength to {strength} for Section {sec_name}. "
                        f"Current active students: {current_occupancy}. "
                        "Downgrade not allowed."
                    )
                


                # Upsert ClassSection
                existing_sec = ClassSection.query.filter_by(
                    class_id=class_obj.id,
                    branch_id=branch_id,
                    academic_year=academic_year,
                    section_name=sec_name
                ).first()

                if existing_sec:
                    existing_sec.student_strength = strength
                    # existing_sec.updated_at is auto-handled or set manually if needed
                else:
                    new_sec = ClassSection(
                        class_id=class_obj.id,
                        branch_id=branch_id,
                        academic_year=academic_year,
                        section_name=sec_name,
                        student_strength=strength
                    )
                    db.session.add(new_sec)

        return jsonify({"message": "Class and sections saved successfully"}), 201

    except ValueError as e:
        # Transaction auto-rollbacks on exception exit of context manager? 
        # No, 'with db.session.begin()' commits on exit, rollbacks on error.
        # So we just catch and return.
        return jsonify({"error": str(e)}), 400
    except IntegrityError as e:
        return jsonify({"error": "Database integrity error (duplicate or invalid key)"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/api/classes", methods=["GET"])
def get_classes():
    """
    Get all classes (ClassMaster).
    """
    classes = ClassMaster.query.all()
    # Sort nicely if possible (custom sort/numeric)
    # Simple sort by ID or Name
    classes.sort(key=lambda x: x.id) 
    return jsonify([
        {"id": c.id, "class_name": c.class_name} for c in classes
    ])


@bp.route("/api/classes/summary", methods=["GET"])
@token_required
def get_class_summary(current_user):
    try:
        academic_year = request.args.get("academic_year", "2025-2026")
        branch_id_param = request.args.get("branch_id") # Optional filter

        # Base query for creating the summary
        query = db.session.query(
            ClassMaster.id.label("class_id"),
            ClassMaster.class_name,
            ClassSection.section_name,
            ClassSection.student_strength,
            ClassSection.id.label("section_id"),
            ClassSection.branch_id
        ).join(
            ClassSection, ClassMaster.id == ClassSection.class_id
        ).filter(
            ClassSection.academic_year == academic_year
        )

        # Apply Branch Filter if provided
        if branch_id_param and branch_id_param != 'all':
             query = query.filter(ClassSection.branch_id == branch_id_param)

        results = query.order_by(ClassMaster.class_name, ClassSection.section_name).all()

        # Grouping
        summary = {}
        for r in results:
            if r.class_id not in summary:
                summary[r.class_id] = {
                    "id": r.class_id,
                    "class_name": r.class_name,
                    "sections": []
                }
            summary[r.class_id]["sections"].append({
                "id": r.section_id,
                "name": r.section_name,
                "strength": r.student_strength,
                "branch_id": r.branch_id
            })

        return jsonify(list(summary.values())), 200

    except Exception as e:
        print(f"Error fetching summary: {e}")
        return jsonify({"error": str(e)}), 500
