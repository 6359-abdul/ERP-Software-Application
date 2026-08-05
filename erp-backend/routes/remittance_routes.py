import os
import json
import uuid
from datetime import datetime, date
from decimal import Decimal
from flask import Blueprint, request, jsonify, current_app, send_file
from werkzeug.utils import secure_filename
from extensions import db, get_now, get_today
from models import (
    RemittanceMaster, RemittanceDenomination, RemittanceReceipt,
    FeePayment, Branch, User, Student
)
from helpers import token_required, require_academic_year, has_global_branch_access
from services.sequence_service import SequenceService

remittance_bp = Blueprint('remittance_bp', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_project_root():
    return os.path.abspath(os.path.join(current_app.root_path, '..'))

def get_remittance_media_base():
    return os.path.join(get_project_root(), 'Media', 'remittances')

def resolve_branch(branch_val):
    if not branch_val or branch_val == 'All' or branch_val == 'AllBranches':
        return None, None
    try:
        b_id = int(branch_val)
        branch_obj = Branch.query.get(b_id)
        return branch_obj.id if branch_obj else b_id, branch_obj.branch_name if branch_obj else str(b_id)
    except ValueError:
        branch_obj = Branch.query.filter_by(branch_name=branch_val).first()
        return (branch_obj.id, branch_obj.branch_name) if branch_obj else (None, branch_val)

def get_username_safe(user_id):
    if not user_id:
        return ""
    if str(user_id).isdigit():
        user = User.query.get(int(user_id))
        return user.username if user else str(user_id)
    return str(user_id)

def calculate_branch_cash_position(branch_id, branch_name, academic_year=None):
    """
    Calculates exact cash collection, remitted amount, and available cash in hand for a branch.
    """
    # 1. Total Cash collected in Fee Payments for this branch
    fee_query = FeePayment.query.filter(
        FeePayment.status == 'A',
        FeePayment.payment_mode.in_(['Cash', 'CASH', 'cash'])
    )
    if branch_name:
        fee_query = fee_query.filter(FeePayment.branch == branch_name)
    if academic_year and academic_year not in ('All', 'AllYears', ''):
        fee_query = fee_query.filter(FeePayment.academic_year == academic_year)
        
    all_cash_payments = fee_query.all()
    total_cash_collected = sum(Decimal(str(p.amount_paid or 0)) for p in all_cash_payments)
    
    # 2. Total Cash Remitted (both Approved and Pending remittances subtract from available hand cash)
    rem_query = RemittanceMaster.query.filter(
        RemittanceMaster.is_active == True,
        RemittanceMaster.status.in_(['Approved', 'Pending'])
    )
    if branch_id:
        rem_query = rem_query.filter(RemittanceMaster.branch_id == branch_id)
        
    active_remittances = rem_query.all()
    total_remitted = sum(Decimal(str(r.deposit_amount or 0)) for r in active_remittances)
    
    cash_in_hand = total_cash_collected - total_remitted
    if cash_in_hand < Decimal(0):
        cash_in_hand = Decimal(0)
        
    # 3. Find unremitted cash receipts
    remitted_rows = db.session.query(RemittanceReceipt.fee_receipt_id).join(
        RemittanceMaster, RemittanceReceipt.remittance_id == RemittanceMaster.id
    ).filter(
        RemittanceMaster.is_active == True,
        RemittanceMaster.status.in_(['Approved', 'Pending'])
    ).all()
    remitted_ids_set = {r[0] for r in remitted_rows}
    
    unremitted_payments = [p for p in all_cash_payments if p.id not in remitted_ids_set]
    
    receipts_data = []
    for p in unremitted_payments:
        student_name = "Unknown"
        if p.student:
            student_name = f"{p.student.first_name or ''} {p.student.last_name or ''}".strip()
        receipts_data.append({
            "payment_id": p.id,
            "receipt_no": p.receipt_no,
            "student_name": student_name or str(p.student_id),
            "class_name": p.class_name,
            "payment_mode": p.payment_mode,
            "payment_date": p.payment_date.strftime("%Y-%m-%d") if p.payment_date else "",
            "amount": float(p.amount_paid or 0)
        })
        
    return {
        "cash_in_hand": float(cash_in_hand),
        "total_cash_collected": float(total_cash_collected),
        "total_remitted": float(total_remitted),
        "unremitted_receipts": receipts_data
    }

@remittance_bp.route('/cash-position', methods=['GET'])
@token_required
def get_cash_position(current_user):
    """
    Returns real-time read-only cash position and unremitted cash receipts for cashier closing.
    """
    try:
        branch_val = request.args.get('branch_id') or request.args.get('branch') or request.headers.get('X-Branch') or current_user.branch
        if not has_global_branch_access(current_user):
            branch_val = current_user.branch
            
        branch_id, branch_name = resolve_branch(branch_val)
        if not branch_id and not branch_name:
            return jsonify({"error": "A specific Branch is required to calculate Cash in Hand"}), 400
            
        h_year = request.headers.get("X-Academic-Year", "2024-2025")
        
        position_data = calculate_branch_cash_position(branch_id, branch_name, h_year)
        position_data["branch_id"] = branch_id
        position_data["branch_name"] = branch_name
        
        return jsonify(position_data), 200
    except Exception as e:
        current_app.logger.error(f"Error getting cash position: {str(e)}")
        return jsonify({"error": str(e)}), 500

@remittance_bp.route('', methods=['POST'])
@token_required
def create_remittance(current_user):
    """
    Record a cash remittance deposit to Corporate Office with denomination verification.
    """
    try:
        is_multipart = request.content_type and request.content_type.startswith('multipart/form-data')
        if is_multipart:
            data = request.form
        else:
            data = request.json or {}
            
        branch_val = data.get('branch_id') or request.headers.get('X-Branch') or current_user.branch
        if not has_global_branch_access(current_user):
            branch_val = current_user.branch
            
        branch_id, branch_name = resolve_branch(branch_val)
        if not branch_id:
            return jsonify({"error": "Valid branch_id is required"}), 400
            
        business_date_str = data.get('business_date', get_today().strftime('%Y-%m-%d'))
        try:
            business_date = datetime.strptime(business_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid business_date format. Use YYYY-MM-DD"}), 400
            
        try:
            deposit_amount = Decimal(str(data.get('deposit_amount', 0)))
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid deposit_amount value"}), 400
            
        if deposit_amount <= Decimal(0):
            return jsonify({"error": "Deposit amount must be greater than zero"}), 400
            
        h_year = request.headers.get("X-Academic-Year", "2024-2025")
        position = calculate_branch_cash_position(branch_id, branch_name, h_year)
        system_cash_in_hand = Decimal(str(position["cash_in_hand"]))
        
        if deposit_amount > system_cash_in_hand:
            return jsonify({
                "error": f"Fraud Prevention Check Failed: Deposit amount (₹{deposit_amount:,.2f}) exceeds currently available system Cash in Hand (₹{system_cash_in_hand:,.2f})."
            }), 400
            
        remaining_cash = system_cash_in_hand - deposit_amount
        
        # Denomination validation
        raw_denoms = data.get('denominations', '[]')
        if isinstance(raw_denoms, str):
            try:
                denoms = json.loads(raw_denoms)
            except json.JSONDecodeError:
                denoms = []
        else:
            denoms = raw_denoms
            
        if not isinstance(denoms, list):
            denoms = []
            
        if denoms:
            denom_total = Decimal(0)
            for d in denoms:
                val = Decimal(str(d.get('denomination', 0)))
                qty = int(d.get('quantity', 0))
                denom_total += val * qty
            if abs(denom_total - deposit_amount) > Decimal('0.01'):
                return jsonify({
                    "error": f"Denomination mismatch: Sum of denominations (₹{denom_total:,.2f}) does not equal Deposit Amount (₹{deposit_amount:,.2f})."
                }), 400
                
        # File Attachment
        attachment_rel_path = None
        if is_multipart and 'attachment' in request.files:
            file = request.files['attachment']
            if file and file.filename != '' and allowed_file(file.filename):
                branch_dir = os.path.join(get_remittance_media_base(), str(branch_id))
                if not os.path.exists(branch_dir):
                    os.makedirs(branch_dir)
                orig_ext = file.filename.rsplit('.', 1)[1].lower()
                ts = get_now().strftime('%Y%m%d%H%M%S')
                uid = str(uuid.uuid4().hex)[:6]
                new_fname = f"SLIP_{ts}_{uid}.{orig_ext}"
                full_path = os.path.join(branch_dir, new_fname)
                file.save(full_path)
                attachment_rel_path = os.path.relpath(full_path, get_project_root())
                
        # Generate Remittance Number
        ay_id = SequenceService.resolve_academic_year_id(h_year) or 1
        remittance_no = SequenceService.generate_remittance_number(branch_id, ay_id)
        
        remittance = RemittanceMaster(
            remittance_no=remittance_no,
            branch_id=branch_id,
            business_date=business_date,
            cash_in_hand=system_cash_in_hand,
            deposit_amount=deposit_amount,
            remaining_cash=remaining_cash,
            attachment_path=attachment_rel_path,
            status='Pending',
            remarks=data.get('remarks', ''),
            created_by=current_user.user_id,
            updated_by=current_user.user_id,
            is_active=True
        )
        db.session.add(remittance)
        db.session.flush()
        
        # Save Denominations
        for d in denoms:
            val = int(d.get('denomination', 0))
            qty = int(d.get('quantity', 0))
            if qty > 0:
                d_row = RemittanceDenomination(
                    remittance_id=remittance.id,
                    denomination=val,
                    quantity=qty,
                    amount=Decimal(val) * Decimal(qty),
                    created_by=current_user.user_id,
                    updated_by=current_user.user_id
                )
                db.session.add(d_row)
                
        # Save Receipts
        raw_receipts = data.get('receipt_ids', '[]')
        if isinstance(raw_receipts, str):
            try:
                receipt_items = json.loads(raw_receipts)
            except json.JSONDecodeError:
                receipt_items = []
        else:
            receipt_items = raw_receipts
            
        for item in receipt_items:
            rec_id = item.get('fee_receipt_id') if isinstance(item, dict) else item
            rec_amount = Decimal(str(item.get('receipt_amount', 0))) if isinstance(item, dict) else Decimal(0)
            if not rec_amount and rec_id:
                p_obj = FeePayment.query.get(int(rec_id))
                if p_obj:
                    rec_amount = Decimal(str(p_obj.amount_paid or 0))
            if rec_id:
                r_row = RemittanceReceipt(
                    remittance_id=remittance.id,
                    fee_receipt_id=int(rec_id),
                    receipt_amount=rec_amount,
                    created_by=current_user.user_id,
                    updated_by=current_user.user_id
                )
                db.session.add(r_row)
                
        db.session.commit()
        return jsonify({
            "message": "Remittance deposit submitted successfully and pending Head Office approval.",
            "remittance_id": remittance.id,
            "remittance_no": remittance.remittance_no,
            "cash_in_hand": float(remittance.cash_in_hand),
            "deposit_amount": float(remittance.deposit_amount),
            "remaining_cash": float(remittance.remaining_cash),
            "status": remittance.status
        }), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating remittance: {str(e)}")
        return jsonify({"error": str(e)}), 500

@remittance_bp.route('', methods=['GET'])
@token_required
def list_remittances(current_user):
    """
    List cash remittances with filters for status, date, and branch.
    """
    try:
        query = RemittanceMaster.query.filter_by(is_active=True)
        
        branch_val = request.args.get('branch_id') or request.headers.get('X-Branch')
        if not has_global_branch_access(current_user):
            branch_val = current_user.branch
        if branch_val and branch_val not in ('All', 'AllBranches'):
            branch_id, _ = resolve_branch(branch_val)
            if branch_id:
                query = query.filter(RemittanceMaster.branch_id == branch_id)
                
        status_val = request.args.get('status', 'All')
        if status_val and status_val != 'All':
            query = query.filter(RemittanceMaster.status == status_val)
            
        start_date = request.args.get('start_date')
        if start_date:
            try:
                sd = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(RemittanceMaster.business_date >= sd)
            except ValueError:
                pass
                
        end_date = request.args.get('end_date')
        if end_date:
            try:
                ed = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(RemittanceMaster.business_date <= ed)
            except ValueError:
                pass
                
        remittances = query.order_by(RemittanceMaster.business_date.desc(), RemittanceMaster.id.desc()).all()
        
        result = []
        for r in remittances:
            denoms = [{
                "denomination": d.denomination,
                "quantity": d.quantity,
                "amount": float(d.amount)
            } for d in r.denominations]
            
            receipts = [{
                "fee_receipt_id": rc.fee_receipt_id,
                "receipt_no": rc.fee_payment.receipt_no if rc.fee_payment else str(rc.fee_receipt_id),
                "amount": float(rc.receipt_amount)
            } for rc in r.receipts]
            
            result.append({
                "id": r.id,
                "remittance_no": r.remittance_no,
                "branch_id": r.branch_id,
                "branch_name": r.branch.branch_name if r.branch else str(r.branch_id),
                "business_date": r.business_date.strftime('%Y-%m-%d') if r.business_date else "",
                "cash_in_hand": float(r.cash_in_hand),
                "deposit_amount": float(r.deposit_amount),
                "remaining_cash": float(r.remaining_cash),
                "attachment_path": r.attachment_path,
                "status": r.status,
                "remarks": r.remarks or "",
                "created_by": get_username_safe(r.created_by),
                "created_at": r.created_at.strftime('%Y-%m-%d %H:%M:%S') if r.created_at else "",
                "approved_by": get_username_safe(r.approved_by),
                "approved_at": r.approved_at.strftime('%Y-%m-%d %H:%M:%S') if r.approved_at else "",
                "denominations": denoms,
                "receipts": receipts
            })
            
        return jsonify(result), 200
    except Exception as e:
        current_app.logger.error(f"Error listing remittances: {str(e)}")
        return jsonify({"error": str(e)}), 500

@remittance_bp.route('/<int:remittance_id>/status', methods=['PATCH', 'POST'])
@token_required
def update_remittance_status(current_user, remittance_id):
    """
    Head Office admin review: Approve or Reject a remittance deposit.
    """
    try:
        data = request.json or {}
        new_status = data.get('status')
        if new_status not in ('Approved', 'Rejected'):
            return jsonify({"error": "Status must be Approved or Rejected"}), 400
            
        remittance = RemittanceMaster.query.get(remittance_id)
        if not remittance or not remittance.is_active:
            return jsonify({"error": "Remittance record not found"}), 404
            
        if remittance.status != 'Pending' and new_status == remittance.status:
            return jsonify({"message": f"Remittance is already {remittance.status}"}), 200
            
        remittance.status = new_status
        if 'remarks' in data and data['remarks']:
            remittance.remarks = data['remarks']
        remittance.approved_by = current_user.user_id
        remittance.approved_at = get_now()
        remittance.updated_by = current_user.user_id
        
        db.session.commit()
        return jsonify({
            "message": f"Remittance {remittance.remittance_no} marked as {new_status} successfully.",
            "id": remittance.id,
            "status": remittance.status
        }), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating remittance status: {str(e)}")
        return jsonify({"error": str(e)}), 500

@remittance_bp.route('/<int:remittance_id>/attachment', methods=['GET'])
@token_required
def get_remittance_attachment(current_user, remittance_id):
    """
    Serve the uploaded deposit slip image/PDF for audit review.
    """
    try:
        remittance = RemittanceMaster.query.get(remittance_id)
        if not remittance or not remittance.attachment_path:
            return jsonify({"error": "No attachment found for this remittance"}), 404
            
        file_full_path = os.path.join(get_project_root(), remittance.attachment_path)
        if not os.path.exists(file_full_path):
            return jsonify({"error": "Attachment file not found on server storage"}), 404
            
        return send_file(file_full_path)
    except Exception as e:
        current_app.logger.error(f"Error serving remittance attachment: {str(e)}")
        return jsonify({"error": str(e)}), 500
