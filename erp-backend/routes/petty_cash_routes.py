import logging
from flask import Blueprint, request, jsonify, g
from models import db, PettyCash, PettyCashLedger, User, Branch, PettyCashVoucherItem, PettyCashFundAllocation
from helpers import token_required
from datetime import datetime
from sqlalchemy import extract

petty_cash_bp = Blueprint('petty_cash_bp', __name__)
logger = logging.getLogger(__name__)

# -----------------------------
# LEDGERS
# -----------------------------

@petty_cash_bp.route('/ledgers', methods=['GET'])
@token_required
def get_ledgers(current_user):
    try:
        ledger_type = request.args.get('type')
        query = PettyCashLedger.query.filter_by(is_active=True)
        if ledger_type:
            query = query.filter_by(ledger_type=ledger_type)
        
        ledgers = query.all()
        return jsonify([
            {
                "id": l.id,
                "ledger_name": l.ledger_name,
                "ledger_type": l.ledger_type
            } for l in ledgers
        ]), 200
    except Exception as e:
        logger.error(f"Error getting petty cash ledgers: {str(e)}")
        return jsonify({"message": "Error fetching ledgers"}), 500

@petty_cash_bp.route('/ledgers', methods=['POST'])
@token_required
def create_ledger(current_user):
    try:
        data = request.json
        ledger_name = data.get('ledger_name', '').strip()
        
        if not ledger_name:
            return jsonify({"message": "Ledger name is required"}), 400
            
        existing = PettyCashLedger.query.filter(
            db.func.lower(PettyCashLedger.ledger_name) == ledger_name.lower()
        ).first()

        if existing:
            return jsonify({
                "message": "Ledger already exists"
            }), 400
            
        ledger_type = data.get('ledger_type')
        if ledger_type not in ('Direct', 'Indirect'):
            return jsonify({"message": "ledger_type must be 'Direct' or 'Indirect'"}), 400
            
        ledger = PettyCashLedger(
            ledger_name=ledger_name,
            ledger_type=ledger_type
        )
        db.session.add(ledger)
        db.session.commit()
        return jsonify({"message": "Ledger created successfully", "id": ledger.id}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating ledger: {str(e)}")
        return jsonify({"message": str(e)}), 500

@petty_cash_bp.route('/ledgers/<int:ledger_id>', methods=['PUT'])
@token_required
def update_ledger(current_user, ledger_id):
    try:
        data = request.json
        ledger = PettyCashLedger.query.get_or_404(ledger_id)
        
        if 'ledger_name' in data:
            ledger_name = data['ledger_name'].strip()
            existing = PettyCashLedger.query.filter(
                db.func.lower(PettyCashLedger.ledger_name) == ledger_name.lower(),
                PettyCashLedger.id != ledger_id
            ).first()

            if existing:
                return jsonify({
                    "message": "Another ledger with this name already exists"
                }), 400
            ledger.ledger_name = ledger_name
            
        if 'ledger_type' in data:
            if data['ledger_type'] not in ('Direct', 'Indirect'):
                return jsonify({"message": "ledger_type must be 'Direct' or 'Indirect'"}), 400
            ledger.ledger_type = data['ledger_type']
        if 'is_active' in data:
            ledger.is_active = data['is_active']
        
        db.session.commit()
        return jsonify({"message": "Ledger updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating ledger: {str(e)}")
        return jsonify({"message": str(e)}), 500

# -----------------------------
# PETTY CASH TRANSACTIONS
# -----------------------------

def resolve_branch_id(branch_val):
    if not branch_val or branch_val == 'All':
        return None
    try:
        return int(branch_val)
    except ValueError:
        b = Branch.query.filter_by(branch_name=branch_val).first()
        return b.id if b else None

@petty_cash_bp.route('', methods=['GET'])
@token_required
def get_transactions(current_user):
    try:
        academic_year = request.headers.get("X-Academic-Year", "2024-2025")
        month = request.args.get("month")
        year = request.args.get("year")
        
        # User branch enforcement
        # If normal user, force their branch
        if current_user.role != "Admin" and current_user.role != "Accountant":
            branch_id = resolve_branch_id(current_user.branch)
        else:
            # Frontend passes it via query or header
            branch_val = request.args.get('branch_id') or request.args.get('branch') or request.headers.get('X-Branch') or current_user.branch
            branch_id = resolve_branch_id(branch_val)
            
        if not branch_id:
            return jsonify([]), 200 # Return empty if 'All' branch selected

        query = PettyCash.query.filter_by(branch_id=branch_id, academic_year=academic_year, is_active=True)
        
        if month:
            query = query.filter(extract('month', PettyCash.transaction_date) == int(month))
        if year:
            query = query.filter(extract('year', PettyCash.transaction_date) == int(year))
        
        transactions = query.order_by(PettyCash.transaction_date.desc()).all()
        
        result = []
        for t in transactions:
            result.append({
                "id": t.id,
                "branch_id": t.branch_id,
                "transaction_date": t.transaction_date.isoformat(),
                "voucher_name": t.voucher_name,
                "voucher_type": t.voucher_type,
                "ledger_type": t.ledger.ledger_type if t.ledger else "", # Include for UI
                "ledger_id": t.ledger_id,
                "ledger_name": t.ledger.ledger_name if t.ledger else "",
                "paid_to": t.paid_to,
                "amount": float(t.amount),
                "payment_mode": t.payment_mode,
                "academic_year": t.academic_year,
                "description": t.description or "",
                "approved_by": t.approved_by or "",
                "created_by": User.query.get(t.created_by).username if t.created_by else "",
                "items": [{"item_name": item.item_name, "amount": float(item.amount)} for item in t.items]
            })
            
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error getting petty cash transactions: {str(e)}")
        return jsonify({"message": str(e)}), 500

@petty_cash_bp.route('/summary', methods=['GET'])
@token_required
def get_transactions_summary(current_user):
    try:
        academic_year = request.headers.get("X-Academic-Year", "2024-2025")
        month = request.args.get("month")
        year = request.args.get("year")
        
        # User branch enforcement
        if current_user.role != "Admin" and current_user.role != "Accountant":
            branch_id = resolve_branch_id(current_user.branch)
        else:
            branch_val = request.args.get('branch_id') or request.args.get('branch') or request.headers.get('X-Branch') or current_user.branch
            branch_id = resolve_branch_id(branch_val)
            
        if not branch_id:
            return jsonify({"total_payment": 0, "total_received": 0, "net_amount": 0}), 200

        query = PettyCash.query.filter_by(branch_id=branch_id, academic_year=academic_year, is_active=True)
        alloc_query = PettyCashFundAllocation.query.filter_by(branch_id=branch_id, academic_year=academic_year, is_active=True)
        
        if month:
            query = query.filter(extract('month', PettyCash.transaction_date) == int(month))
            alloc_query = alloc_query.filter(extract('month', PettyCashFundAllocation.allocation_date) == int(month))
        if year:
            query = query.filter(extract('year', PettyCash.transaction_date) == int(year))
            alloc_query = alloc_query.filter(extract('year', PettyCashFundAllocation.allocation_date) == int(year))
        
        transactions = query.all()
        allocations = alloc_query.all()
        
        total_payment = sum(float(t.amount) for t in transactions if t.voucher_type in ('Payment', 'Payments'))
        total_received = sum(float(t.amount) for t in transactions if t.voucher_type == 'Received')
        total_allocated = sum(float(a.amount) for a in allocations)
        
        # New logic: Cash in hand = Total Allocated - Total Expense
        # We also add total_received back just in case the UI wants to see old logic, but net_amount is now allocated - payment
        net_amount = total_allocated - total_payment
        
        return jsonify({
            "total_payment": total_payment,
            "total_received": total_received,
            "total_allocated": total_allocated,
            "net_amount": net_amount
        }), 200
    except Exception as e:
        logger.error(f"Error getting petty cash summary: {str(e)}")
        return jsonify({"message": str(e)}), 500

@petty_cash_bp.route('/<int:txn_id>', methods=['GET'])
@token_required
def get_transaction(current_user, txn_id):
    try:
        t = PettyCash.query.get_or_404(txn_id)
        if not t.is_active:
            return jsonify({"message": "Transaction not found"}), 404
            
        return jsonify({
            "id": t.id,
            "branch_id": t.branch_id,
            "transaction_date": t.transaction_date.isoformat(),
            "voucher_name": t.voucher_name,
            "voucher_type": t.voucher_type,
            "ledger_type": t.ledger.ledger_type if t.ledger else "",
            "ledger_id": t.ledger_id,
            "ledger_name": t.ledger.ledger_name if t.ledger else "",
            "paid_to": t.paid_to,
            "amount": float(t.amount),
            "payment_mode": t.payment_mode,
            "academic_year": t.academic_year,
            "description": t.description or "",
            "approved_by": t.approved_by or "",
            "created_by": User.query.get(t.created_by).username if t.created_by else "",
            "items": [{"item_name": item.item_name, "amount": float(item.amount)} for item in t.items]
        }), 200
    except Exception as e:
        logger.error(f"Error getting transaction: {str(e)}")
        return jsonify({"message": str(e)}), 500

@petty_cash_bp.route('', methods=['POST'])
@token_required
def create_transaction(current_user):
    try:
        data = request.json
        academic_year = request.headers.get("X-Academic-Year", "2024-2025")
        
        if current_user.role != "Admin" and current_user.role != "Accountant":
            branch_id = resolve_branch_id(current_user.branch)
        else:
            # We don't trust the body for branch anymore, checking headers or user object is better.
            # But Accountant might select a branch from dropdown which sets X-Branch header.
            branch_val = request.headers.get('X-Branch') or current_user.branch
            branch_id = resolve_branch_id(branch_val)
            
        if not branch_id:
            return jsonify({"message": "Valid Branch is required"}), 400
            
        ledger = PettyCashLedger.query.get(data.get('ledger_id'))
        if not ledger or not ledger.is_active:
            return jsonify({
                "message": "Invalid ledger"
            }), 400
            
        items_data = data.get('items', [])
        if not items_data or not isinstance(items_data, list):
            return jsonify({"message": "Items are required"}), 400
            
        try:
            total_amount = sum(float(item.get('amount', 0)) for item in items_data)
        except (ValueError, TypeError):
            return jsonify({"message": "Invalid item amount"}), 400

        if total_amount <= 0:
            return jsonify({
                "message": "Total amount must be greater than zero"
            }), 400
            
        transaction_date = datetime.strptime(
            data['transaction_date'],
            '%Y-%m-%d'
        ).date()
        voucher_type = data.get('voucher_type')
        if voucher_type not in ('Payment','Received'):
            return jsonify({"message":"Voucher type must be Payment or Received"}),400
            
        if voucher_type == 'Payment':
            total_allocated = db.session.query(db.func.sum(PettyCashFundAllocation.amount))\
                .filter_by(branch_id=branch_id, academic_year=academic_year, is_active=True).scalar() or 0
                
            total_spent = db.session.query(db.func.sum(PettyCash.amount))\
                .filter(PettyCash.branch_id == branch_id, PettyCash.academic_year == academic_year, PettyCash.voucher_type.in_(['Payment', 'Payments']), PettyCash.is_active == True).scalar() or 0
                
            cash_in_hand = float(total_allocated) - float(total_spent)
            
            if total_amount > cash_in_hand:
                return jsonify({"message": f"Insufficient petty cash balance. Available: {cash_in_hand:.2f}"}), 400

        payment_mode = data.get('payment_mode')
        if payment_mode not in ('Cash','UPI'):
            return jsonify({"message":"Payment mode must be Cash or UPI"}),400    
        voucher_name = data.get('voucher_name')
        if not voucher_name or not str(voucher_name).strip():
            return jsonify({"message": "Voucher Name is required"}), 400
            
        paid_to = data.get('paid_to')
        if not paid_to or not str(paid_to).strip():
            return jsonify({"message": "Paid To / Received From is required"}), 400
            
        description = data.get('description')
        if not description or not str(description).strip():
            return jsonify({"message": "Description is required"}), 400
            
        approved_by = data.get('approved_by')
        if not approved_by or not str(approved_by).strip():
            return jsonify({"message": "Approved By is required"}), 400

        txn = PettyCash(
            branch_id=branch_id,
            transaction_date=transaction_date,
            voucher_name=voucher_name,
            voucher_type=voucher_type,
            ledger_id=ledger.id,
            paid_to=paid_to,
            amount=total_amount,
            payment_mode=payment_mode,
            academic_year=academic_year,
            description=description,
            approved_by=approved_by
        )
        db.session.add(txn)
        db.session.flush()
        
        for item in items_data:
            item_name = item.get('item_name')
            item_amt = float(item.get('amount', 0))
            if not item_name or not str(item_name).strip():
                return jsonify({"message": "Item name is required for all items"}), 400
            
            v_item = PettyCashVoucherItem(
                petty_cash_id=txn.id,
                item_name=str(item_name).strip(),
                amount=item_amt
            )
            db.session.add(v_item)
            
        db.session.commit()
        return jsonify({"message": "Transaction created successfully", "id": txn.id}), 201
    except ValueError as ve:
        return jsonify({"message": f"Invalid data format: {str(ve)}"}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating petty cash transaction: {str(e)}")
        return jsonify({"message": str(e)}), 500

@petty_cash_bp.route('/<int:txn_id>', methods=['PUT'])
@token_required
def update_transaction(current_user, txn_id):
    try:
        data = request.json
        txn = PettyCash.query.get_or_404(txn_id)
        
        if not txn.is_active:
            return jsonify({"message": "Transaction not found"}), 404
        
        if 'transaction_date' in data:
            txn.transaction_date = datetime.strptime(
                data['transaction_date'],
                '%Y-%m-%d'
            ).date()
        if 'voucher_name' in data:
            if not data['voucher_name'] or not str(data['voucher_name']).strip():
                return jsonify({"message": "Voucher Name is required"}), 400
            txn.voucher_name = data['voucher_name']
        if 'voucher_type' in data:
            if data['voucher_type'] not in ('Payment', 'Received'):
                return jsonify({
                    "message": "Invalid voucher type"
                }), 400
            txn.voucher_type = data['voucher_type']
        if 'ledger_id' in data:
            ledger = PettyCashLedger.query.get(data['ledger_id'])
            if not ledger or not ledger.is_active:
                return jsonify({
                    "message": "Invalid ledger"
                }), 400
            txn.ledger_id = ledger.id
        if 'paid_to' in data:
            if not data['paid_to'] or not str(data['paid_to']).strip():
                return jsonify({"message": "Paid To is required"}), 400
            txn.paid_to = data['paid_to']
            
        if 'items' in data:
            items_data = data['items']
            if not items_data or not isinstance(items_data, list):
                return jsonify({"message": "Items are required"}), 400
                
            try:
                total_amount = sum(float(item.get('amount', 0)) for item in items_data)
            except (ValueError, TypeError):
                return jsonify({"message": "Invalid item amount"}), 400
                
            if total_amount <= 0:
                return jsonify({"message": "Total amount must be greater than zero"}), 400
                
            # Clear existing items
            for existing_item in txn.items:
                db.session.delete(existing_item)
            
            # Add new items
            for item in items_data:
                item_name = item.get('item_name')
                item_amt = float(item.get('amount', 0))
                if not item_name or not str(item_name).strip():
                    return jsonify({"message": "Item name is required for all items"}), 400
                
                v_item = PettyCashVoucherItem(
                    petty_cash_id=txn.id,
                    item_name=str(item_name).strip(),
                    amount=item_amt
                )
                db.session.add(v_item)
                
            # Validate against available cash if this is a payment
            current_voucher_type = data.get('voucher_type', txn.voucher_type)
            if current_voucher_type in ('Payment', 'Payments'):
                total_allocated = db.session.query(db.func.sum(PettyCashFundAllocation.amount))\
                    .filter_by(branch_id=txn.branch_id, academic_year=txn.academic_year, is_active=True).scalar() or 0
                    
                total_spent = db.session.query(db.func.sum(PettyCash.amount))\
                    .filter(PettyCash.branch_id == txn.branch_id, PettyCash.academic_year == txn.academic_year, PettyCash.voucher_type.in_(['Payment', 'Payments']), PettyCash.is_active == True, PettyCash.id != txn.id).scalar() or 0
                    
                cash_in_hand = float(total_allocated) - float(total_spent)
                
                if total_amount > cash_in_hand:
                    return jsonify({"message": f"Insufficient petty cash balance. Available: {cash_in_hand:.2f}"}), 400

            txn.amount = total_amount
        if 'payment_mode' in data:
            if data['payment_mode'] not in ('Cash','UPI'):
                return jsonify({"message":"Payment mode must be 'Cash' or 'UPI'"}),400
            txn.payment_mode = data['payment_mode']
        if 'description' in data:
            if not data['description'] or not str(data['description']).strip():
                return jsonify({"message": "Description is required"}), 400
            txn.description = data['description']
        if 'approved_by' in data:
            if not data['approved_by'] or not str(data['approved_by']).strip():
                return jsonify({"message": "Approved By is required"}), 400
            txn.approved_by = data['approved_by']
            
        db.session.commit()
        return jsonify({"message": "Transaction updated successfully"}), 200
    except ValueError as ve:
        return jsonify({"message": f"Invalid data format: {str(ve)}"}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating transaction: {str(e)}")
        return jsonify({"message": str(e)}), 500

@petty_cash_bp.route('/<int:txn_id>', methods=['DELETE'])
@token_required
def delete_transaction(current_user, txn_id):
    try:
        txn = PettyCash.query.get_or_404(txn_id)
        txn.is_active = False
        db.session.commit()
        return jsonify({"message": "Transaction deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting transaction: {str(e)}")
        return jsonify({"message": str(e)}), 500

# -----------------------------
# FUND ALLOCATIONS
# -----------------------------

@petty_cash_bp.route('/allocations', methods=['GET'])
@token_required
def get_allocations(current_user):
    try:
        academic_year = request.headers.get("X-Academic-Year", "2024-2025")
        
        # User branch enforcement
        if current_user.role != "Admin" and current_user.role != "Accountant":
            branch_id = resolve_branch_id(current_user.branch)
        else:
            branch_val = request.args.get('branch_id') or request.headers.get('X-Branch') or current_user.branch
            branch_id = resolve_branch_id(branch_val)
            
        if branch_id:
            query = PettyCashFundAllocation.query.filter_by(branch_id=branch_id, academic_year=academic_year, is_active=True)
        else:
            query = PettyCashFundAllocation.query.filter_by(academic_year=academic_year, is_active=True)
            
        allocations = query.order_by(PettyCashFundAllocation.allocation_date.desc()).all()
        
        result = []
        for a in allocations:
            result.append({
                "id": a.id,
                "branch_id": a.branch_id,
                "branch_name": a.branch.branch_name if a.branch else "",
                "allocation_date": a.allocation_date.isoformat(),
                "amount": float(a.amount),
                "remarks": a.remarks or "",
                "approved_by": a.approved_by or "",
                "academic_year": a.academic_year
            })
            
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error getting petty cash allocations: {str(e)}")
        return jsonify({"message": str(e)}), 500

@petty_cash_bp.route('/allocations', methods=['POST'])
@token_required
def create_allocation(current_user):
    try:
        data = request.json
        academic_year = request.headers.get("X-Academic-Year", "2024-2025")
        
        branch_id = data.get('branch_id')
        if not branch_id:
            return jsonify({"message": "Branch is required"}), 400
            
        allocation_date = datetime.strptime(data['allocation_date'], '%Y-%m-%d').date()
        
        try:
            amount = float(data.get('amount', 0))
        except (ValueError, TypeError):
            return jsonify({"message": "Invalid amount"}), 400

        if amount <= 0:
            return jsonify({"message": "Amount must be greater than zero"}), 400
            
        allocation = PettyCashFundAllocation(
            branch_id=branch_id,
            allocation_date=allocation_date,
            amount=amount,
            remarks=data.get('remarks'),
            approved_by=data.get('approved_by'),
            academic_year=academic_year
        )
        db.session.add(allocation)
        db.session.commit()
        return jsonify({"message": "Allocation created successfully", "id": allocation.id}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating petty cash allocation: {str(e)}")
        return jsonify({"message": str(e)}), 500
