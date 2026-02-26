from extensions import db
from datetime import datetime
from sqlalchemy import or_
 
class ClassMaster(db.Model):
    __tablename__ = "classes"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    class_name = db.Column(db.String(50), unique=True, nullable=False)
    location = db.Column(db.String(50), default="Hyderabad")
    branch = db.Column(db.String(50), default="All")


class ClassSection(db.Model):
    __tablename__ = "class_sections"

    id = db.Column(db.Integer, primary_key=True)

    # FK to ClassMaster
    class_id = db.Column(
        db.Integer,
        db.ForeignKey("classes.id", ondelete="RESTRICT"),
        nullable=False
    )

    # FK to Branch
    branch_id = db.Column(
        db.Integer,
        db.ForeignKey("branches.id", ondelete="RESTRICT"),
        nullable=False
    )

    academic_year = db.Column(db.String(20), nullable=False)

    section_name = db.Column(db.String(10), nullable=False)

    student_strength = db.Column(db.Integer, nullable=False)

    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, onupdate=db.func.now())

    __table_args__ = (
        db.UniqueConstraint(
            "class_id",
            "branch_id",
            "academic_year",
            "section_name",
            name="uq_class_branch_year_section"
        ),
        # Indexes for frequent lookup
        db.Index("idx_class_section_branch_year", "branch_id", "academic_year"),
        db.Index("idx_class_section_class", "class_id"),
    )



class User(db.Model):
    __tablename__ = "users"
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(20), default="Admin")
    branch = db.Column(db.String(50), default="AllBranches")
    location = db.Column(db.String(50), default="Hyderabad")


class Student(db.Model):
    __tablename__ = "students"
    student_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Basic Information
    admission_no = db.Column(db.String(50), unique=True)
    first_name = db.Column(db.String(100))
    StudentMiddleName = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    gender = db.Column(db.String(10))
    dob = db.Column(db.Date)
    Doa = db.Column(db.Date)
    BloodGroup = db.Column(db.String(10))
    Adharcardno = db.Column(db.String(50))
    Religion = db.Column(db.String(50))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    address = db.Column(db.Text)
    Category = db.Column(db.String(50))
    clazz = db.Column("class", db.String(20))
    section = db.Column(db.String(20))
    Roll_Number = db.Column(db.Integer)
    admission_date = db.Column(db.Date)
    status = db.Column(db.Enum("Active", "Inactive"), default="Active")
    MotherTongue = db.Column(db.String(50))
    Caste = db.Column(db.String(50))
    StudentType = db.Column(db.String(50))
    House = db.Column(db.String(50))
    photopath = db.Column(db.String(255))
    
    # Father Information
    Fatherfirstname = db.Column(db.String(100))
    FatherMiddleName = db.Column(db.String(100))
    FatherLastName = db.Column(db.String(100))
    FatherPhone = db.Column(db.String(20))
    SmsNo = db.Column(db.String(20))
    FatherEmail = db.Column(db.String(100))
    PrimaryQualification = db.Column(db.String(100))
    FatherOccuption = db.Column(db.String(100))
    FatherCompany = db.Column(db.String(100))
    FatherDesignation = db.Column(db.String(100))
    FatherAadhar = db.Column(db.String(50))
    FatherOrganizationId = db.Column(db.String(100))
    FatherOtherOrganization = db.Column(db.String(100))
    
    # Mother Information
    Motherfirstname = db.Column(db.String(100))
    MothermiddleName = db.Column(db.String(100))
    Motherlastname = db.Column(db.String(100))
    SecondaryPhone = db.Column(db.String(20))
    SecondaryEmail = db.Column(db.String(100))
    SecondaryQualification = db.Column(db.String(100))
    SecondaryOccupation = db.Column(db.String(100))
    SecondaryCompany = db.Column(db.String(100))
    SecondaryDesignation = db.Column(db.String(100))
    MotherAadhar = db.Column(db.String(50))
    MotherOrganizationId = db.Column(db.String(100))
    MotherOtherOrganization = db.Column(db.String(100))
    
    # Guardian Information
    GuardianName = db.Column(db.String(100))
    GuardianRelation = db.Column(db.String(50))
    GuardianQualification = db.Column(db.String(100))
    GuardianOccupation = db.Column(db.String(100))
    GuardianDesignation = db.Column(db.String(100))
    GuardianDepartment = db.Column(db.String(100))
    GuardianOfficeAddress = db.Column(db.Text)
    GuardianContactNo = db.Column(db.String(20))
    
    # Previous School Information
    SchoolName = db.Column(db.String(100))
    AdmissionNumber = db.Column(db.String(100))
    TCNumber = db.Column(db.String(20))
    PreviousSchoolClass = db.Column(db.String(15))
   
    
    # Additional Information
    AdmissionCategory = db.Column(db.String(50))
    AdmissionClass = db.Column(db.String(20))
    StudentHeight = db.Column(db.Numeric(5, 2))
    StudentWeight = db.Column(db.Numeric(5, 2))
    SamagraId = db.Column(db.String(50))
    ChildId = db.Column(db.String(50))
    PEN = db.Column(db.String(50))
    permanentCity = db.Column(db.String(100))
    previousSchoolName = db.Column(db.String(200))
    primaryIncomePerYear = db.Column(db.Numeric(12, 2))
    secondaryIncomePerYear = db.Column(db.Numeric(12, 2))
    primaryOfficeAddress = db.Column(db.Text)
    secondaryOfficeAddress = db.Column(db.Text)
    Hobbies = db.Column(db.Text)
    SecondLanguage = db.Column(db.String(50))
    ThirdLanguage = db.Column(db.String(50))
    GroupUniqueId = db.Column(db.String(50))
    serviceNumber = db.Column(db.String(50))
    EmploymentservingStatus = db.Column(db.String(50))
    inactivated_date = db.Column(db.DateTime, nullable=True)
    inactivate_reason = db.Column(db.String(255), nullable=True)
    inactivated_by = db.Column(db.Integer, nullable=True)
    ApaarId = db.Column(db.String(50))
    Stream = db.Column(db.String(50))
    EmploymentCategory = db.Column(db.String(50))
    
    # Branch and Year Segregation
    location = db.Column(db.String(50), default="Hyderabad")
    branch = db.Column(db.String(50))
    academic_year = db.Column(db.String(20))

    __table_args__ = (
        db.Index('idx_student_occupancy', 'class', 'section', 'branch', 'academic_year'),
    )


class FeeType(db.Model):
    __tablename__ = "feetypes"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    feetype = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50))
    feetypegroup = db.Column(db.String(50))
    type = db.Column(db.String(50), default="Installment")
    displayname = db.Column(db.String(100))
    isrefundable = db.Column(db.Boolean, default=False)
    description = db.Column(db.String(255))
    createdat = db.Column(db.DateTime, default=datetime.now)
    
    # Branch and Year Segregation
    branch = db.Column(db.String(50))
    location = db.Column(db.String(50), default="Hyderabad")
    academic_year = db.Column(db.String(20))


class StudentFee(db.Model):
    __tablename__ = "studentfees"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.student_id"))
    fee_id = db.Column(db.Integer, nullable=True)  # Added to match DB schema
    fee_type_id = db.Column(db.Integer, db.ForeignKey("feetypes.id"))
    academic_year = db.Column(db.String(20))
    month = db.Column(db.String(20))
    monthly_amount = db.Column(db.Numeric(10, 2)) # Added to match DB schema
    total_fee = db.Column(db.Numeric(10, 2))
    paid_amount = db.Column(db.Numeric(10, 2), default=0)
    due_amount = db.Column(db.Numeric(10, 2), default=0)
    concession = db.Column(db.Numeric(10, 2), default=0)
    status = db.Column(db.Enum("Pending", "Partial", "Paid"), default="Pending")
    due_date = db.Column(db.Date, nullable=True)  # Added to match DB schema
    is_active = db.Column(db.Boolean, nullable=False, default= True)
    deleted_at = db.Column(db.DateTime, nullable = True)
    deleted_by = db.Column(db.Integer,nullable = True)
    fee_type = db.relationship("FeeType")
    student = db.relationship("Student")


class ClassFeeStructure(db.Model):
    __tablename__ = "classfeestructure"
    id = db.Column(db.Integer, primary_key=True)
    clazz = db.Column("class", db.String(50))
    feetypeid = db.Column(db.Integer, db.ForeignKey("feetypes.id"))
    academicyear = db.Column(db.String(20))
    totalamount = db.Column(db.Numeric(10, 2))
    monthly_amount = db.Column(db.Numeric(10, 2))
    installments_count = db.Column(db.Integer, default=0)
    isnewadmission = db.Column(db.Boolean, default=False)
    feegroup = db.Column(db.String(50))
    createdat = db.Column(db.DateTime, default=datetime.now)
    feetype = db.relationship("FeeType")

    # Branch and Year Segregation
    branch = db.Column(db.String(50))
    location = db.Column(db.String(50), default="Hyderabad")
    academic_year = db.Column(db.String(20))


class Concession(db.Model):
    __tablename__ = "concessions"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100)) # e.g., "Sibling Discount"
    description = db.Column(db.String(255))
    location = db.Column(db.String(50), default="Hyderabad")
    branch = db.Column(db.String(50))
    academic_year = db.Column(db.String(20))
    fee_type_id = db.Column(db.Integer, db.ForeignKey("feetypes.id"))
    percentage = db.Column(db.Numeric(5, 2)) # The value, e.g., 50.00
    is_percentage = db.Column(db.Boolean, default=True) # Flag: True=%, False=Flat Amount
    show_in_payment = db.Column(db.Boolean, default=False) # Flag: Show in Fee Payment dropdown
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    fee_type = db.relationship("FeeType")


class FeeInstallment(db.Model):
    __tablename__ = "fee_installments"
    id = db.Column(db.Integer, primary_key=True)
    installment_no = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(100), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    last_pay_date = db.Column(db.Date, nullable=False)
    is_admission = db.Column(db.Boolean, default=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)
    fee_type_id = db.Column(db.Integer, db.ForeignKey("feetypes.id"), nullable=True)
    location = db.Column(db.String(50), default="Hyderabad")
    branch = db.Column(db.String(50))
    academic_year = db.Column(db.String(20))
    
    fee_type = db.relationship("FeeType")


class FeePayment(db.Model):
    # STEP 2: FINAL fee_payments TABLE
    __tablename__ = "fee_payments"
    id = db.Column("payment_id", db.Integer, primary_key=True, autoincrement=True)

    # Receipt - Not strict unique to allow line items per receipt (One receipt = Multiple Fee Rows)
    receipt_no = db.Column(db.String(50), nullable=False, index=True) 

    # Organization scope - Snapshot
    branch = db.Column(db.String(50), nullable=False) # Storing Name as ID is not available/consistent
    location = db.Column(db.String(50), nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)

    # Student snapshot
    student_id = db.Column(db.Integer, db.ForeignKey("students.student_id"), nullable=False)
    class_name = db.Column("class", db.String(50), nullable=False) # Snapshot of class
    section = db.Column(db.String(20)) # Snapshot of section

    # Installment / Fee Type
    installment_id = db.Column(db.Integer) # derived from FeeInstallment if possible
    installment_name = db.Column(db.String(100)) # e.g. "June Fee"
    fee_type = db.Column(db.String(100))   # Tuition, Transport, etc.

    # Amounts (VERY IMPORTANT)
    gross_amount = db.Column(db.Numeric(10, 2))   # total fee for this item
    concession_amount = db.Column(db.Numeric(10, 2))
    net_payable = db.Column(db.Numeric(10, 2)) # gross - concession
    amount_paid = db.Column(db.Numeric(10, 2)) # Amount paying NOW
    due_amount = db.Column(db.Numeric(10, 2)) # Remaining due after this payment

    # Payment info
    payment_mode = db.Column(db.String(50))
    transaction_ref = db.Column(db.String(100))
    payment_date = db.Column(db.Date)
    payment_month = db.Column(db.Integer) # Monthly Collection Report
    payment_year = db.Column(db.Integer) 

    note = db.Column(db.String(25))
    TransactionDetails=db.Column(db.String(100))
    collected_by = db.Column(db.Integer) # User ID
    collected_by_name = db.Column(db.String(100)) # User Name (Added per request)
    created_at = db.Column(db.DateTime, default=datetime.now)

    status = db.Column(db.Enum("A", "I"), default="A") # A=Active, I=Inactive (Cancelled)
    cancel_reason = db.Column(db.String(255)) # Reason for cancellation

    student = db.relationship("Student")



# ----------------------------------------------------------
# BRANCH & ORGANIZATION MANAGEMENT (PHASE 1)
# ----------------------------------------------------------

class OrgMaster(db.Model):
    __tablename__ = "org_master"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    master_type = db.Column(db.Enum('LOCATION', 'ACADEMIC_YEAR'), nullable=False)
    code = db.Column(db.String(50), nullable=False)
    display_name = db.Column(db.String(100), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    __table_args__ = (db.UniqueConstraint('master_type', 'code', name='_master_type_code_uc'),)

class Branch(db.Model):
    __tablename__ = "branches"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    branch_code = db.Column(db.String(50), unique=True, nullable=False)
    branch_name = db.Column(db.String(100), nullable=False)
    location_code = db.Column(db.String(50)) # refers to org_master.code
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

class UserBranchAccess(db.Model):
    __tablename__ = "user_branch_access"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True) # NULL = Permanent
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'branch_id', 'start_date', name='_user_branch_start_uc'),)
    
    branch = db.relationship("Branch")
    user = db.relationship("User")


class BranchYearSequence(db.Model):
    __tablename__ = "enrollment_sequences"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("branches.id"), nullable=False)
    academic_year_id = db.Column(db.Integer, db.ForeignKey("org_master.id"), nullable=False)
    
    admission_prefix = db.Column(db.String(20), nullable=False)
    last_admission_no = db.Column(db.Integer, default=0, nullable=False)
    
    receipt_prefix = db.Column(db.String(20), nullable=False)
    last_receipt_no = db.Column(db.Integer, default=0, nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    created_by = db.Column(db.Integer) # User ID
    updated_by = db.Column(db.Integer) # User ID

    __table_args__ = (
        db.UniqueConstraint('branch_id', 'academic_year_id', name='uq_branch_year_sequence'),
        db.CheckConstraint('last_admission_no >= 0', name='chk_admission_no_positive'),
        db.CheckConstraint('last_receipt_no >= 0', name='chk_receipt_no_positive'),
    )


class StudentAcademicRecord(db.Model):
    __tablename__ = "student_academic_records"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.student_id"), nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)
    class_name = db.Column("class", db.String(20))
    section = db.Column(db.String(20))
    roll_number = db.Column(db.Integer)
    is_promoted = db.Column(db.Boolean, default=False)
    promoted_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    student = db.relationship("Student", backref=db.backref("academic_records", lazy=True))



# ----------------------------------------------------------
# ATTENDANCE MODEL
# ----------------------------------------------------------

class Attendance(db.Model):
    __tablename__ = "attendance"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.student_id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.Enum("Present", "Absent", name="attendance_status"), default="Present")
    remarks = db.Column(db.String(255))
    update_count = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=datetime.now)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    student = db.relationship("Student")
    
    # Branch and Year Segregation
    branch = db.Column(db.String(50))
    location = db.Column(db.String(50), default="Hyderabad")
    academic_year = db.Column(db.String(20))

    __table_args__ = (db.UniqueConstraint('student_id', 'date', name='_student_date_uc'),)


# ----------------------------------------------------------
# WEEKLY OFF & HOLIDAY CALENDAR
# ----------------------------------------------------------

class WeeklyOffRule(db.Model):
    __tablename__ = "weekly_off_rule"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id', ondelete='RESTRICT'), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='RESTRICT'), nullable=True)  # NULL = applies to all classes

    weekday = db.Column(db.Integer, nullable=False)      # 0=Monday … 6=Sunday
    week_number = db.Column(db.Integer, nullable=True)   # NULL=Every, 1-5=specific week of month

    academic_year = db.Column(db.String(20), nullable=False)

    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    __table_args__ = (
        db.UniqueConstraint('branch_id', 'class_id', 'weekday', 'week_number', 'academic_year',
                            name='uq_weekoff_rule'),
        db.CheckConstraint('weekday >= 0 AND weekday <= 6', name='chk_weekoff_weekday'),
        db.CheckConstraint('week_number IS NULL OR (week_number >= 1 AND week_number <= 5)', name='chk_weekoff_week_number'),
    )


class HolidayCalendar(db.Model):
    __tablename__ = "holiday_calendar"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id', ondelete='RESTRICT'), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='RESTRICT'), nullable=True)  # NULL = applies to all classes

    title = db.Column(db.String(150), nullable=False)

    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)

    holiday_for = db.Column(
        db.Enum("StudentOnly", "StaffOnly", "All", name="holiday_scope"),
        nullable=False,
        default="All"
    )

    description = db.Column(db.Text)
    display_order = db.Column(db.Integer)

    academic_year = db.Column(db.String(20), nullable=False)

    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    __table_args__ = (
        db.CheckConstraint('start_date <= end_date', name='chk_holiday_date_range'),
        db.Index('idx_holiday_dates', 'branch_id', 'start_date', 'end_date'),
    )


# ----------------------------------------------------------
#  Subject Master Model
# ----------------------------------------------------------
class SubjectMaster(db.Model):
    __tablename__ = "subjectmaster"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    subject_name = db.Column(db.String(100), nullable=False)
    subject_type = db.Column(db.Enum('Hifz', 'Academic'), default='Academic')
    academic_year = db.Column(db.String(20)) # New: Scope to year
    is_active = db.Column(db.Boolean, default=True) # New: Active Status

class ClassSubjectAssignment(db.Model):
    __tablename__ = "classsubjectassignment"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    class_id = db.Column(db.Integer, nullable=False) # Maps to classid
    subject_id = db.Column(db.Integer, nullable=False) # Maps to subjectid
    academic_year = db.Column(db.String(50), nullable=False) 
    location_name = db.Column(db.String(50), nullable=False)
    branch_name = db.Column(db.String(50), nullable=False) 

    __table_args__ = (
        db.UniqueConstraint('class_id', 'subject_id', 'academic_year', 'location_name', 'branch_name', name='uq_classsubject_context'),
    )

class StudentSubjectAssignment(db.Model):
    __tablename__ = "studentsubjectassignment"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.student_id"), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjectmaster.id"), nullable=False)
    academic_year = db.Column(db.String(50), nullable=False)
    branch = db.Column(db.String(50))
    status = db.Column(db.Boolean, default=True) # 1=Assigned, 0=Removed

    __table_args__ = (
        db.UniqueConstraint('student_id', 'subject_id', 'academic_year', name='uq_student_subject_assign'),
    )


class TestType(db.Model):
    __tablename__ = "testtype"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    test_name = db.Column(db.String(100), nullable=False)
    max_marks = db.Column(db.Integer, nullable=False)

    display_order = db.Column(db.Integer, nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)

    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    created_by = db.Column(db.Integer)
    updated_by = db.Column(db.Integer)



class TestAttendanceMonth(db.Model):
    __tablename__ = "test_attendance_months"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    test_id = db.Column(db.Integer, db.ForeignKey("testtype.id"), nullable=False)
    
    # Context
    branch = db.Column(db.String(50), nullable=False)
    class_id = db.Column(db.Integer, nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)
    
    month = db.Column(db.Integer, nullable=False) # 1-12
    year = db.Column(db.Integer, nullable=False)
    
    # Relationship
    test_type = db.relationship("TestType")

    __table_args__ = (
        db.UniqueConstraint('test_id', 'branch', 'class_id', 'academic_year', 'month', 'year', name='uq_test_context_month'),
    )


class ClassTest(db.Model):
    __tablename__ = "class_test"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    academic_year = db.Column(db.String(50), nullable=False)
    branch = db.Column(db.String(50), nullable=False)
    location = db.Column(db.String(50), nullable=False)
    
    class_id = db.Column(db.Integer, nullable=False)
    test_id = db.Column(db.Integer, nullable=False)

    test_order = db.Column(db.Integer, nullable=False)

    status = db.Column(db.Boolean, default=True)

    created_by = db.Column(db.Integer, nullable=False)
    updated_by = db.Column(db.Integer, default=None)

    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    updated_at = db.Column(db.TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('academic_year', 'branch', 'class_id', 'test_id', name='uniq_class_test'),
        db.UniqueConstraint('academic_year', 'branch', 'class_id', 'test_order', name='uniq_test_order')
    )

class ClassTestSubject(db.Model):
    __tablename__ = "class_test_subjects"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    class_test_id = db.Column(db.Integer, db.ForeignKey("class_test.id"), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjectmaster.id"), nullable=False)
    max_marks = db.Column(db.Integer, nullable=False)
    subject_order = db.Column(db.Integer, nullable=False)
    
    created_by = db.Column(db.Integer, nullable=False)
    updated_by = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    __table_args__ = (
        db.UniqueConstraint('class_test_id', 'subject_id', name='uniq_class_test_subject'),
        db.UniqueConstraint('class_test_id', 'subject_order', name='uniq_subject_order_per_test')
    )

class StudentTestAssignment(db.Model):
    __tablename__ = "student_test_assignments"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.student_id"), nullable=False)
    class_test_id = db.Column(db.Integer, db.ForeignKey("class_test.id"), nullable=False)
    
    academic_year = db.Column(db.String(50), nullable=False)
    branch = db.Column(db.String(50))
    location = db.Column(db.String(50), default="Hyderabad")
    
    status = db.Column(db.Boolean, default=True) # True=Assigned, False=Unassigned

    created_by = db.Column(db.Integer)
    updated_by = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    __table_args__ = (
        db.UniqueConstraint('student_id', 'class_test_id', name='uniq_student_test_assign'),
    )


class GradeScale(db.Model):
    __tablename__ = "grade_scales"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    scale_name = db.Column(db.String(100), nullable=False)
    scale_description = db.Column(db.String(255))

    # Context scope
    location = db.Column(db.String(50), nullable=False)
    branch = db.Column(db.String(50), default="All") # Default to All for location-wide
    academic_year = db.Column(db.String(50), nullable=False)
    
    total_marks = db.Column(db.Integer, nullable=False, default=100) # Added default for migration safety, though should be explicit

    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    __table_args__ = (
        db.UniqueConstraint('scale_name', 'academic_year', 'branch', 'total_marks', name='uq_grade_scale_context'),
    )

class GradeScaleDetails(db.Model):
    __tablename__ = "grade_scale_details"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    grade_scale_id = db.Column(db.Integer, db.ForeignKey('grade_scales.id', ondelete="CASCADE"), nullable=False)

    grade = db.Column(db.String(5), nullable=False)
    min_marks = db.Column(db.Integer, nullable=False)
    max_marks = db.Column(db.Integer, nullable=False)
    description = db.Column(db.String(255)) # Added per user request

    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    grade_scale = db.relationship("GradeScale", backref=db.backref("details", cascade="all, delete-orphan"))


    __table_args__ = (
        db.UniqueConstraint('grade_scale_id', 'min_marks', 'max_marks', name='uq_grade_range'),
    )


class StudentMarks(db.Model):
    __tablename__ = "student_marks"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    student_id = db.Column(db.Integer, db.ForeignKey("students.student_id"), nullable=False)
    class_test_id = db.Column(db.Integer, db.ForeignKey("class_test.id"), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjectmaster.id"), nullable=False)

    marks_obtained = db.Column(db.Numeric(5, 2), default=None)
    is_absent = db.Column(db.Boolean, nullable=False, default=False)

    # Context snapshot for reporting/history
    academic_year = db.Column(db.String(20), nullable=False)
    branch = db.Column(db.String(100), nullable=False)
    class_id = db.Column(db.Integer, nullable=False)
    section = db.Column(db.String(20))

    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    updated_at = db.Column(db.TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by = db.Column(db.Integer)
    updated_by = db.Column(db.Integer)

    # Relationships
    student = db.relationship("Student")
    class_test = db.relationship("ClassTest")
    subject = db.relationship("SubjectMaster")

    __table_args__ = (
        db.UniqueConstraint('student_id', 'class_test_id', 'subject_id', name='uq_student_test_subject'),
        db.Index('idx_student_marks_test', 'class_test_id'),
        db.Index('idx_student_marks_student', 'student_id'),
    )


class DocumentType(db.Model):
    __tablename__ = "document_types"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)


class StudentDocument(db.Model):
    __tablename__ = "student_documents"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.student_id', ondelete='CASCADE'), nullable=False)
    document_type_id = db.Column(db.Integer, db.ForeignKey('document_types.id', ondelete='RESTRICT'), nullable=False)
    document_no = db.Column(db.String(100))
    issued_by = db.Column(db.String(100))
    issue_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    file_name = db.Column(db.String(255))
    file_path = db.Column(db.String(500))
    file_size = db.Column(db.Integer)
    mime_type = db.Column(db.String(100))
    uploaded_at = db.Column(db.DateTime, default=datetime.now)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='SET NULL'))
    is_verified = db.Column(db.Boolean, default=False)
    verified_by = db.Column(db.Integer)
    verified_at = db.Column(db.DateTime)
    document_type = db.relationship("DocumentType")
    student = db.relationship("Student")
    uploader = db.relationship("User", foreign_keys=[uploaded_by])

    __table_args__ = (
        db.UniqueConstraint('student_id', 'document_type_id', name='uq_student_doc_type'),
    )
