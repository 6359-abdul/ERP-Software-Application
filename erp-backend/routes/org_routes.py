from flask import Blueprint, jsonify, request
from extensions import db
from models import Branch, OrgMaster, User, UserBranchAccess, ClassMaster
from helpers import token_required, require_academic_year, get_branch_query_filter
from datetime import date, datetime
from sqlalchemy import or_ 

bp = Blueprint('org_routes', __name__)

@bp.route("/api/branches", methods=["GET"])
@token_required
def get_all_branches(current_user):
    try:
        branches = Branch.query.filter_by(is_active=True).all()
      
        # Helper to get location map
        locations = OrgMaster.query.filter_by(master_type='LOCATION').all()
        loc_map = {loc.code: loc.display_name for loc in locations}

        return jsonify({
            "branches": [{
                "id": b.id,
                "branch_code": b.branch_code,
                "branch_name": b.branch_name,
                "location_code": b.location_code,
                "location_name": loc_map.get(b.location_code, b.location_code) or "Unknown Location"
            } for b in branches]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/api/org/locations", methods=["GET"])
def get_all_locations():
    """Fetch all available locations from OrgMaster"""
    try:
        locations = OrgMaster.query.filter_by(master_type='LOCATION', is_active=True).all()
        return jsonify({
            "locations": [{
                "code": loc.code,
                "name": loc.display_name
            } for loc in locations]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/api/org/academic-years", methods=["GET"])
def get_all_academic_years():
    """Fetch all available academic years from OrgMaster"""
    try:
        years = OrgMaster.query.filter_by(master_type='ACADEMIC_YEAR', is_active=True).all()
        # Sort years if needed? Assuming DB order or alphabetical is fine for now.
        return jsonify({
            "academic_years": [{
                "id": y.id,
                "code": y.code,
                "name": y.display_name
            } for y in years]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/api/setup/seed-branches", methods=["POST"])
def seed_branches():
    # ... (table creation and seeing logic) ...
    # Simplified for brevity as per instructions, but full logic should be here if needed for setup
    # Since this is a setup route, maybe keep it simple or remove if not needed for daily ops?
    # Keeping it as it was in app.py for compatibility
    
    # 1. Create Tables (Not needed if using migration but okay for manual setup)
    db.create_all()
    
    # 2. Seed OrgMaster (Locations)
    locations = ["Hyderabad", "Mumbai", "Bangalore", "Delhi", "Chennai"]
    seeded_info = []
    
    for loc in locations:
        code = loc[:3].upper()
        exists = OrgMaster.query.filter_by(master_type='LOCATION', code=code).first()
        if not exists:
            db.session.add(OrgMaster(master_type='LOCATION', code=code, display_name=loc))
            seeded_info.append(f"Added Location: {loc}")
            
    # 3. Seed Branches
    branches_data = [
        {"code": "HYD01", "name": "Main Branch", "loc": "HYD"},
        {"code": "MUM01", "name": "Mumbai Branch", "loc": "MUM"},
        {"code": "BLR01", "name": "Bangalore Branch", "loc": "BLR"}
    ]
    
    for b in branches_data:
        exists = Branch.query.filter_by(branch_code=b['code']).first()
        if not exists:
            db.session.add(Branch(branch_code=b['code'], branch_name=b['name'], location_code=b['loc']))
            seeded_info.append(f"Added Branch: {b['name']}")
    
    db.session.commit()
    
    # Assign Branches to Admin (find Admin)
    admins = User.query.filter_by(role="Admin").all()
    all_branches = Branch.query.all()
    
    for admin in admins:
        for br in all_branches:
            # Check access
            access = UserBranchAccess.query.filter_by(user_id=admin.user_id, branch_id=br.id).first()
            if not access:
                new_access = UserBranchAccess(
                    user_id=admin.user_id,
                    branch_id=br.id,
                    start_date=date(2024, 1, 1),
                    end_date=None, # Permanent
                    is_active=True
                )
                db.session.add(new_access)
                seeded_info.append(f"Assigned {br.branch_code} to Admin {admin.username}")
    
    db.session.commit()
    
    return jsonify({
        "message": "Seeding completed successfully",
        "details": seeded_info
    }), 201

@bp.route("/api/classes", methods=["GET"])
def get_classes():
    from sqlalchemy import and_
    
    # Filter by Branch (Query param has precedence over Header)
    h_branch = request.args.get("branch") or request.headers.get("X-Branch")
    
    query = ClassMaster.query
    
    # Strictly filter by branch and location logic
    if h_branch and h_branch != "All":
         # Resolve Branch Object to get Location
         branch_obj = None
         location_filter = "Global" # Default if not found

         if h_branch.isdigit():
             branch_obj = Branch.query.get(int(h_branch))
         else:
             branch_obj = Branch.query.filter_by(branch_name=h_branch).first()
             if not branch_obj:
                 branch_obj = Branch.query.filter_by(branch_code=h_branch).first()
        
         if branch_obj:
             # Resolve Location Name from OrgMaster
             # ClassMaster uses Display Names for columns (e.g. "Delhi", "Hyderabad") matches OrgMaster.display_name
             loc_obj = OrgMaster.query.filter_by(master_type='LOCATION', code=branch_obj.location_code).first()
             if loc_obj:
                 location_filter = loc_obj.display_name
         
         # Filter Logic:
         # 1. Specific Branch Match (Name or ID)
         # 2. Location Match (Branch='All' AND Location=ThisLocation)
         # 3. Global Match (Branch='All' AND Location='All')
         
         branch_specific_cond = (ClassMaster.branch == h_branch)
         if branch_obj:
             branch_specific_cond = or_(ClassMaster.branch == str(branch_obj.id), ClassMaster.branch == branch_obj.branch_name)

         query = query.filter(or_(
             branch_specific_cond,
             and_(ClassMaster.branch == 'All', ClassMaster.location == location_filter),
             and_(ClassMaster.branch == 'All', ClassMaster.location == 'All')
         ))

    classes = query.order_by(ClassMaster.id.asc()).all()
    
    return jsonify({
        "classes": [{"id": c.id, "class_name": c.class_name} for c in classes]
    }), 200
