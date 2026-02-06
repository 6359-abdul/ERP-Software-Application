from extensions import db
from models import BranchYearSequence, Branch, OrgMaster , FeePayment
from datetime import datetime

class SequenceService:
    
    @staticmethod
    def resolve_branch_id(branch_identifier):
        """
        Resolves a branch identifier (name or code) to its DB ID.
        Returns ID or None.
        """
        if isinstance(branch_identifier, int):
            return branch_identifier
            
        branch = Branch.query.filter(
            (Branch.branch_code == branch_identifier) | 
            (Branch.branch_name == branch_identifier)
        ).first()
        
        return branch.id if branch else None

    @staticmethod
    def resolve_academic_year_id(year_code):
        """
        Resolves an academic year code (e.g. '2025-2026') to its OrgMaster ID.
        Returns ID or None.
        """
        if isinstance(year_code, int):
            return year_code
            
        ay = OrgMaster.query.filter_by(
            master_type='ACADEMIC_YEAR',
            code=year_code
        ).first()
        
        return ay.id if ay else None

    @staticmethod
    def get_or_create_sequence(branch_id, academic_year_id, user_id=None):
        """
        Ensures a sequence row exists for the given Branch/Year.
        If not, creates it with default prefixes.
        THIS IS NOT LOCKED. Use inside transaction or careful context.
        """
        seq = BranchYearSequence.query.filter_by(
            branch_id=branch_id, 
            academic_year_id=academic_year_id
        ).first()
        
        if not seq:
            # Need to fetch branch and year to generate prefixes
            branch = Branch.query.get(branch_id)
            # Default prefix logic: H + BranchCode (e.g., HATC)
            # Receipt prefix: BranchCode (e.g. TC) - User requested Ex: TC01
            # User Ex: HATC0152 -> Prefix HATC. Receipt TC01 -> Prefix TC.
            # It seems Admission Prefix = 'H' + BranchCode
            # Receipt Prefix = BranchCode (but example TC vs HATC implies TC is code? let's check branch codes)
            
            # If Branch Code is ATC. HATC = H + ATC. TC01 = ?? Maybe slightly different.
            # User Example: "if it is HATC generate TC01 ... VN01"
            # It seems HATC is the branch code? Or Branch is named HATC?
            # Let's assume Admission Prefix = BranchCode (e.g. HATC)
            # And Receipt Prefix = Suffix of BranchCode? Or user defined?
            # "Ex : In auto_enrollment_table Last Admission no is 0151 for HATC ... one student joining his admission_no should be HATC0152"
            # This implies Admission Prefix is "HATC" (the branch code itself).
            
            # "same with fee receipt if it is HATC generate TC01, TC02"
            # This implies Receipt Prefix for HATC is "TC". 
            # This logic is tricky to auto-deduce. 
            # I will use BranchCode as default for BOTH for now, but allow Override.
            # Or better, for HATC -> Admission: HATC, Receipt: TC?
            # I will use Admission Prefix = BranchCode. Receipt Prefix = BranchCode (abbreviated if needed, but standardizing on BranchCode is safer unless mapped).
            # Wait, if Branch is "HAVN", receipt is "VN".
            # It seems like it takes the last 2 chars? 
            # Let's stick to using BranchCode for Admission Prefix.
            # For Receipt Prefix, I will use BranchCode as well to be safe, unless user provides mapping.
            # Actually, I can use the Branch Code directly.
            
            adm_prefix = branch.branch_code if branch else "GEN"
            rec_prefix = branch.branch_code if branch else "REC"
            
            # Correction based on user prompt "if it is HATC... generate TC01". 
            # Maybe HATC is the branch code. TC is a sub-part.
            # Given I cannot guess the custom logic "TC" from "HATC" (maybe it's Hafiz Academy TC?), 
            # I will use BranchCode for both. The user can update the table manually if they want custom prefixes
            # OR I can try to carry over "TC" if it exists in some other context. 
            # For now: AdmissionPrefix = branch_code, ReceiptPrefix = branch_code.
            
            seq = BranchYearSequence(
                branch_id=branch_id,
                academic_year_id=academic_year_id,
                admission_prefix=adm_prefix,
                receipt_prefix=rec_prefix,
                last_admission_no=0,
                last_receipt_no=0,
                created_by=user_id,
                updated_by=user_id
            )
            db.session.add(seq)
            db.session.flush()
            
        return seq

    @staticmethod
    def _get_locked_sequence(branch_id, academic_year_id):
        """
        Fetches the sequence row with ROW-LEVEL LOCKING.
        Must be called inside an active transaction.
        """
        return db.session.query(BranchYearSequence).with_for_update().filter_by(
            branch_id=branch_id, 
            academic_year_id=academic_year_id
        ).first()

    @staticmethod
    def generate_admission_number(branch_id, academic_year_id):
        """
        Generates next Admission Number: {Prefix}{0000} (e.g. HATC0152)
        """
        seq = SequenceService._get_locked_sequence(branch_id, academic_year_id)
        
        if not seq:
            # Fallback: Create if not exists (though ideally should exist)
            # CAUTION: get_or_create_sequence does FLUSH. 
            # If we are in existing transaction, this is fine.
            # But we can't lock what doesn't exist.
            # So we create, then lock? Or just use the new one (which is implicitly locked by insert in this txn).
            seq = SequenceService.get_or_create_sequence(branch_id, academic_year_id)
        
        seq.last_admission_no += 1
        return f"{seq.admission_prefix}{seq.last_admission_no:04d}"

    @staticmethod
    def generate_receipt_number(branch_id, academic_year_id):
        """
        Generates next Fee Receipt Number: {Prefix}{00} (e.g. TC01)
        """
        seq = SequenceService._get_locked_sequence(branch_id, academic_year_id)
        
        if not seq:
            seq = SequenceService.get_or_create_sequence(branch_id, academic_year_id)
        
        seq.last_receipt_no += 1
        return f"{seq.receipt_prefix}{seq.last_receipt_no:02d}"

    @staticmethod
    def recalculate_receipt_sequence_after_delete(branch, academic_year, deleted_receipt_no):
        """
        Recalculates the receipt sequence after a payment deletion.
        Finds the maximum receipt number still in use and updates the sequence.
        
        Args:
            branch: Branch name/code (string)
            academic_year: Academic year code (string like '2025-2026')
            deleted_receipt_no: The receipt number that was deleted (string like '07' or 'TC07')
        """
        from models import FeePayment
        
        # Resolve IDs
        branch_id = SequenceService.resolve_branch_id(branch)
        ay_id = SequenceService.resolve_academic_year_id(academic_year)
        
        if not branch_id or not ay_id:
            print(f"DEBUG: Could not resolve branch_id ({branch}) or ay_id ({academic_year})")
            return
        
        # Get the sequence record (with lock)
        seq = SequenceService._get_locked_sequence(branch_id, ay_id)
        
        if not seq:
            print(f"DEBUG: No sequence found for branch_id={branch_id}, ay_id={ay_id}")
            return
        
        # Find all REMAINING receipt numbers for this branch/year
        # IMPORTANT: This runs AFTER db.session.delete() and flush()
        remaining_receipts = db.session.query(FeePayment.receipt_no).filter(
            FeePayment.branch == branch,
            FeePayment.academic_year == academic_year,
            FeePayment.receipt_no.isnot(None)
        ).distinct().all()
        
        print(f"DEBUG: Remaining receipts for {branch}/{academic_year}: {remaining_receipts}")
        
        # Extract numeric part from receipt numbers
        max_number = 0
        prefix = seq.receipt_prefix or ""
        
        for (receipt_no,) in remaining_receipts:
            if not receipt_no:
                continue
            
            # Skip if this is the deleted one (safety check)
            if receipt_no == deleted_receipt_no:
                continue
                
            numeric_part = receipt_no.strip()
            
            # Remove prefix if present
            if prefix and numeric_part.startswith(prefix):
                numeric_part = numeric_part[len(prefix):]
            
            # Try to convert to int
            try:
                num = int(numeric_part)
                print(f"DEBUG: Parsed receipt '{receipt_no}' -> number {num}")
                max_number = max(max_number, num)
            except ValueError:
                print(f"DEBUG: Could not parse receipt '{receipt_no}', numeric_part='{numeric_part}'")
                continue
        
        print(f"DEBUG: Max receipt number found: {max_number}, updating sequence from {seq.last_receipt_no}")
        
        # Update sequence to the maximum found
        seq.last_receipt_no = max_number
        seq.updated_at = datetime.now()
