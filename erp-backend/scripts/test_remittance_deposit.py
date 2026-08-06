import sys
import os
from decimal import Decimal
from datetime import date

# Ensure erp-backend is in Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, '..'))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from app import create_app
from extensions import db
from models import RemittanceMaster, RemittanceDenomination, RemittanceReceipt, Branch, FeePayment
from services.sequence_service import SequenceService
from routes.remittance_routes import calculate_branch_cash_position

def run_remittance_tests():
    app = create_app()
    with app.app_context():
        print("=== Starting Remittance Module Backend Verification ===")
        
        # We use a database transaction and rollback at the end so we don't affect production data
        db.session.begin_nested()
        try:
            # 1. Test Sequence Generation
            print("1. Testing Sequence Number Generation...")
            branch_id = 1 # Fallback or first branch
            branch_obj = Branch.query.first()
            if branch_obj:
                branch_id = branch_obj.id
                
            rem_no = SequenceService.generate_remittance_number(branch_id, 1)
            print(f"   [OK] Generated Remittance Number: {rem_no}")
            assert rem_no.startswith("REM-"), f"Expected number starting with REM-, got {rem_no}"
            
            # 2. Test Model Creation & Relationships
            print("2. Testing Database Models & Relationships...")
            remittance = RemittanceMaster(
                remittance_no=rem_no,
                branch_id=branch_id,
                business_date=date.today(),
                cash_in_hand=Decimal("150000.00"),
                deposit_amount=Decimal("80000.00"),
                remaining_cash=Decimal("70000.00"),
                status="Pending",
                remarks="Automated Test Deposit",
                is_active=True
            )
            db.session.add(remittance)
            db.session.flush()
            
            denom1 = RemittanceDenomination(
                remittance_id=remittance.id,
                denomination=500,
                quantity=100,
                amount=Decimal("50000.00")
            )
            denom2 = RemittanceDenomination(
                remittance_id=remittance.id,
                denomination=200,
                quantity=150,
                amount=Decimal("30000.00")
            )
            db.session.add(denom1)
            db.session.add(denom2)
            db.session.flush()
            
            # Verify relationships
            assert len(remittance.denominations) == 2, "Expected 2 denominations linked to remittance"
            total_denom = sum(d.amount for d in remittance.denominations)
            assert total_denom == Decimal("80000.00"), "Denomination sum does not match deposit amount"
            print("   [OK] Models and relationships verified successfully!")
            
            # 3. Test Cash Position Calculation Logic
            print("3. Testing Cash Position Calculation...")
            branch_name = branch_obj.branch_name if branch_obj else "Test Branch"
            pos = calculate_branch_cash_position(branch_id, branch_name)
            print(f"   [OK] Current position for branch '{branch_name}':")
            print(f"     - Total Cash Collected: INR {pos['total_cash_collected']:,.2f}")
            print(f"     - Total Remitted/Pending: INR {pos['total_remitted']:,.2f}")
            print(f"     - Available Cash in Hand: INR {pos['cash_in_hand']:,.2f}")
            print(f"     - Unremitted Cash Receipts Count: {len(pos['unremitted_receipts'])}")
            
            print("=== All Backend Verification Tests Passed Successfully! ===")
            
        except Exception as e:
            print(f"[ERROR] Test Failed with Exception: {str(e)}")
            raise e
        finally:
            # Always rollback test data
            db.session.rollback()
            print("   [INFO] Test transaction rolled back cleanly.")

if __name__ == "__main__":
    run_remittance_tests()
