# ERP Workflow Guide - End User Documentation
## MS Hifz Academy ERP System - Complete User Journey

**Version:** 1.0  
**Last Updated:** January 13, 2026  
**Document Purpose:** Comprehensive guide for end-users covering all modules from login to academic grading

---

## Table of Contents

1. [System Overview](#system-overview)
2. [User Types & Roles](#user-types--roles)
3. [Login Workflow](#login-workflow)
4. [Branch & Location Management](#branch--location-management)
5. [Academic Management](#academic-management)
6. [Grade Scale Configuration](#grade-scale-configuration)
7. [Test Type & Class Test Management](#test-type--class-test-management)
8. [Academic Grading Workflow](#academic-grading-workflow)
9. [Student Management](#student-management)
10. [Fee Management](#fee-management)
11. [Attendance Management](#attendance-management)
12. [Reports & Analytics](#reports--analytics)
13. [Multi-Branch Operations](#multi-branch-operations)
14. [Troubleshooting](#troubleshooting)

---

## System Overview

### What is the MS Hifz Academy ERP?

The MS Hifz Academy ERP (Enterprise Resource Planning) is a comprehensive management system designed to handle all administrative and academic operations across multiple branches of an educational institution.

### Core Features

- **Multi-Branch Support:** Manage multiple school locations independently
- **Student Management:** Complete student information and enrollment tracking
- **Academic Management:** Subject assignment, test management, and grading
- **Fee Management:** Billing, payment tracking, and financial reports
- **Attendance Tracking:** Daily attendance and absence reporting
- **Grade Scales:** Customizable grading systems
- **Reporting:** Comprehensive reports for decision-making

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│           MS Hifz Academy ERP System                     │
├─────────────────────────────────────────────────────────┤
│  Frontend (React/TypeScript) → Backend (Flask/Python)   │
│  ├─ Authentication & Authorization                       │
│  ├─ Multi-Branch Management                              │
│  ├─ Academic Module (Subjects, Tests, Grades)            │
│  ├─ Student Module (Enrollment, Records)                 │
│  ├─ Fee Module (Billing, Payments, Concessions)          │
│  ├─ Attendance Module                                    │
│  └─ Reporting & Analytics                                │
└─────────────────────────────────────────────────────────┘
```

---

## User Types & Roles

### 1. **Admin User**
**Responsibilities:**
- System-wide access to all features
- User account management
- Branch access configuration
- Report generation and analysis
- System maintenance and setup

**Permissions:**
- Create/Edit/Delete users
- Manage branches and locations
- Configure academic year
- Access all modules
- View all reports

### 2. **Academic Coordinator**
**Responsibilities:**
- Subject management
- Test scheduling and configuration
- Grade scale setup
- Student test assignment
- Academic record maintenance

**Permissions:**
- Create/manage subjects (Hifz & Academic)
- Create/manage test types
- Assign tests to classes
- Configure grade scales
- View academic reports

### 3. **Finance Manager**
**Responsibilities:**
- Fee structure configuration
- Student billing management
- Payment collection and tracking
- Fee reports and reconciliation

**Permissions:**
- Manage fee types and structures
- Collect student payments
- Create/manage concessions
- View fee reports
- Generate financial statements

### 4. **Class Teacher**
**Responsibilities:**
- Student attendance marking
- Test score entry
- Class-level academic management
- Student progress monitoring

**Permissions:**
- Mark attendance
- Enter student test scores
- View class roster
- View student academic records

### 5. **Branch Administrator**
**Responsibilities:**
- Day-to-day branch operations
- User management at branch level
- Student administration
- Fee and attendance oversight

**Permissions:**
- Limited to assigned branch(es)
- Manage students in branch
- View branch reports
- Facilitate fee collection

---

## Login Workflow

### Step 1: Access the System

1. Open your web browser
2. Navigate to the ERP system URL
3. The **Login Page** will display with MS Hifz Academy branding

### Step 2: Enter Credentials

**Required Information:**
- **Username:** Your assigned user ID (e.g., `admin01`, `teacher_john`)
- **Password:** Your secure password

**Security Best Practices:**
- Never share your password
- Use strong passwords (8+ characters with mixed case and numbers)
- Change your password periodically
- Always logout when leaving the system

### Step 3: Login Process

```
User Input (Username & Password)
    ↓
[Backend Validation]
    ├─ Check username exists in database
    ├─ Verify password matches
    ├─ Validate user status (Active/Inactive)
    └─ Fetch authorized branches & locations
    ↓
[Token Generation]
    ├─ Create JWT security token
    ├─ Set 24-hour expiration
    └─ Store in local browser storage
    ↓
[Dashboard Access]
    ├─ Load user profile
    ├─ Display allowed modules
    └─ Navigate to main dashboard
```

### Step 4: Dashboard Access

After successful login, you'll see:
- **Header Bar:** User name, branch selector, logout option
- **Sidebar Navigation:** Accessible modules based on your role
- **Main Content Area:** Dashboard with quick links to frequently used features

### Login Response Structure

The system returns the following information after successful login:

```json
{
  "message": "login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": 101,
    "username": "admin01",
    "role": "Admin",
    "branch": "AllBranches",
    "location": "Hyderabad",
    "allowed_branches": [
      {
        "branch_id": 1,
        "branch_code": "HYD-MAIN",
        "branch_name": "Hyderabad Main Campus",
        "location_code": "HYD"
      },
      {
        "branch_id": 2,
        "branch_code": "HYD-BRANCH2",
        "branch_name": "Hyderabad Branch 2",
        "location_code": "HYD"
      }
    ]
  }
}
```

---

## Branch & Location Management

### Understanding Branch Structure

#### Location
- **Definition:** Geographic region or city (e.g., "Hyderabad", "Bangalore")
- **Scope:** Multiple branches can exist in one location
- **Example:** Hyderabad Main Campus, Hyderabad Branch 2 (both in Hyderabad)

#### Branch
- **Definition:** Individual school/campus within a location
- **Structure:** Each branch has unique code, name, and location assignment
- **Examples:**
  - HYD-MAIN: Hyderabad Main Campus
  - HYD-BRANCH2: Hyderabad Secondary Campus
  - BNG-MAIN: Bangalore Main Campus

#### Academic Year
- **Definition:** Academic session (e.g., "2024-2025", "2025-2026")
- **Scope:** All data is scoped to academic year
- **Usage:** Students, subjects, tests, grades all belong to specific academic year

### Branch Selection Workflow

```
Login → Fetch Allowed Branches
    ↓
User has access to multiple branches?
    ├─ YES: Show Branch Selector dropdown
    │   └─ User selects branch
    │       ├─ Update location based on branch
    │       ├─ Load branch-specific data
    │       └─ Apply branch filter to all queries
    │
    └─ NO: Auto-select single branch
        └─ Proceed with single branch
```

### Data Isolation by Branch

**Critical Principle:** All data is isolated by branch and location.

| Module | Isolation Scope |
|--------|-----------------|
| Students | Branch + Academic Year |
| Subjects | Academic Year (shared across branches in location) |
| Classes | Location-wide |
| Fee Types | Branch + Location + Academic Year |
| Grade Scales | Location + Academic Year |
| Tests | Branch + Location + Academic Year |
| Attendance | Branch + Location + Academic Year |

**Example:**
- Admin in "Hyderabad Main" branch cannot see students from "Bangalore Main" branch
- Grade scales created in HYD location apply to all HYD branches
- Each branch has independent fee structures

---

## Academic Management

### Academic Structure

#### 1. Subject Master (Subject Creation & Management)

**What is a Subject?**
- A course or topic taught at your institution
- Can be categorized as "Hifz" or "Academic"
- Scoped to specific academic year

**Subject Types:**
1. **Hifz Subjects:** Quranic memorization and Islamic studies
2. **Academic Subjects:** Regular school curriculum (Math, Science, English, etc.)

#### 2. Class Management

**What is a Class?**
- Grade level grouping (e.g., "Class 1", "Class 10", "Hifz-1")
- Has multiple sections (A, B, C, etc.)
- Students are enrolled in specific class and section
301: - Shared across all branches in a location
302: -> **Note:** Class visibility is configured per location. For example, "Delhi" location might show Classes 4-8, while "Hyderabad" shows Classes 6-8. This is system-configured.

**Class Data Structure:**
```
Class Master
├─ Class Name (e.g., "Class 10")
├─ Location (e.g., "Hyderabad")
├─ Branch (default: "All" = location-wide)
└─ Multiple Sections (A, B, C)
    └─ Students in Section
```

#### 3. Subject Assignment to Classes

**Workflow:**
```
1. Admin creates subjects (e.g., Mathematics, English, Quran)
   ├─ Subject Name
   ├─ Type (Hifz/Academic)
   └─ Academic Year
   
2. Academic Coordinator assigns subjects to classes
   ├─ Select Class (e.g., Class 10)
   ├─ Select Subjects to teach
   ├─ Define Academic Year
   ├─ Specify Location & Branch
   └─ Save Assignment
   
3. Result: Class now has assigned subjects
   └─ Teachers can enter grades for these subjects
```

**Example:**
- **Class 10** gets subjects: English, Mathematics, Science, Quran
- **Class 9** gets subjects: English, Mathematics, Science, Hifz, Islamic Studies
- Each class can have different subject combinations

### Step-by-Step: Create a Subject

**Navigation:** Academic → Academic Management → Subject Master

1. **Click "Create New Subject"**
2. **Fill Subject Form:**
   - Subject Name: `English Literature`
   - Subject Type: `Academic` (or `Hifz`)
   - Academic Year: `2025-2026`
   - Is Active: `✓ Checked`
3. **Click "Save"**
4. **Confirmation:** "Subject created successfully"

### Step-by-Step: Assign Subjects to Class

**Navigation:** Academic → Academic Management → Class Subject Assignment

1. **Select Academic Year:** `2025-2026`
2. **Select Location:** `Hyderabad`
3. **Select Branch:** `Hyderabad Main Campus`
4. **Select Class:** `Class 10`
5. **Select Subjects:**
   - ☑ English Literature
   - ☑ Mathematics
   - ☑ Science
   - ☑ Quran (Hifz)
6. **Click "Assign Subjects"**
7. **Confirmation:** "Subjects assigned successfully"

---

## Grade Scale Configuration

### What is a Grade Scale?

A grade scale defines how numerical marks are converted into letter grades.

**Example Grade Scales:**
```
Scale 1: Traditional (A-F)
├─ A: 90-100 marks
├─ B: 80-89 marks
├─ C: 70-79 marks
├─ D: 60-69 marks
├─ E: 50-59 marks
└─ F: 0-49 marks

Scale 2: Hifz Standard (Excellent-Poor)
├─ Excellent: 90-100 marks
├─ Very Good: 80-89 marks
├─ Good: 70-79 marks
├─ Satisfactory: 60-69 marks
├─ Needs Improvement: 50-59 marks
└─ Below Expected: 0-49 marks
```

### Grade Scale Scope & Isolation

**Location-Wide Scope:**
- Grade scales are created at **Location** level (e.g., "Hyderabad")
- Automatically apply to **all branches** in that location
394: ### Grade Scale Scope & Isolation
395: 
396: **Location-Wide Scope:**
397: - Grade scales are created at **Location** level (e.g., "Hyderabad")
398: - Automatically apply to **all branches** in that location
399: - **Not** branch-specific (even though API accepts branch parameter)
400: -> **Important:** Changes to a grade scale affect ALL branches in that location immediately. Ensure coordination between branches before modifying.

**Isolation Details:**
```
Grade Scale X (created in Hyderabad location)
├─ HYD-MAIN branch can use it
├─ HYD-BRANCH2 can use it
└─ Both branches use same scale
    (No duplication needed)
```

### Step-by-Step: Create a Grade Scale

**Navigation:** Academic → Academic Management → Grade Scale Manager

1. **Click "Create New Grade Scale"**

2. **Fill Master Information:**
   - Scale Name: `Traditional A-F Scale`
   - Location: `Hyderabad`
   - Branch: `All` (auto-filled for location-wide)
   - Academic Year: `2025-2026`
   - Description: `Standard grading system for all academic classes`

3. **Define Grade Details - Add Each Grade:**

   **Grade 1: A**
   - Grade: `A`
   - Min Marks: `90`
   - Max Marks: `100`
   - Description: `Excellent Performance`
   - Click `Add Grade`

   **Grade 2: B**
   - Grade: `B`
   - Min Marks: `80`
   - Max Marks: `89`
   - Description: `Good Performance`
   - Click `Add Grade`

   **Grade 3: C**
   - Grade: `C`
   - Min Marks: `70`
   - Max Marks: `79`
   - Description: `Average Performance`
   - Click `Add Grade`

   **Grade 4: D**
   - Grade: `D`
   - Min Marks: `60`
   - Max Marks: `69`
   - Description: `Below Average Performance`
   - Click `Add Grade`

   **Grade 5: E**
   - Grade: `E`
   - Min Marks: `50`
   - Max Marks: `59`
   - Description: `Needs Improvement`
   - Click `Add Grade`

   **Grade 6: F**
   - Grade: `F`
   - Min Marks: `0`
   - Max Marks: `49`
   - Description: `Fail - Re-evaluation Required`
   - Click `Add Grade`

4. **Review All Grades:**
   - Verify no overlapping ranges
   - Ensure all ranges are continuous
   - Check descriptions are clear

5. **Click "Save Grade Scale"**

6. **Confirmation:** "Grade Scale created successfully"

### Grade Scale Rules & Validation

**Rules:**
- ✅ Ranges must be continuous (no gaps)
- ✅ No overlapping mark ranges
- ✅ Unique scale names per location/year
- ✅ Minimum 2 grades required
- ✅ Max marks must be > min marks

**Invalid Examples:**
```
❌ A: 90-100, B: 85-89, C: 70-84
   Problem: 85-89 overlaps with 90-100

❌ A: 90-100, C: 70-79
   Problem: Gap between 79-90 (no B grade)

❌ A: 100-90
   Problem: Min should be lower than Max
```

**Valid Example:**
```
✅ A: 90-100, B: 80-89, C: 70-79, D: 60-69, E: 0-59
   All ranges continuous, no overlap, clearly defined
```

---

## Test Type & Class Test Management

### Test Type Management

#### What is a Test Type?

A test type defines a type of assessment with:
- **Name:** Unique identifier (e.g., "Monthly Test", "Final Exam", "Quiz")
- **Max Marks:** Total marks for this test
- **Academic Year:** Which academic year this test belongs to
- **Display Order:** Sequence in which tests appear

#### Step-by-Step: Create Test Type

**Navigation:** Academic → Academic Management → Test Type Manager

1. **Click "Create New Test Type"**

2. **Fill Test Type Form:**
   - Test Name: `Monthly Test - January`
   - Max Marks: `100`
   - Academic Year: `2025-2026`
   - Display Order: `1` (appears first)
   - Is Active: `✓ Checked`

3. **Click "Save"**

4. **Confirmation:** "Test Type created successfully"

**Common Test Types:**
- Monthly Tests (12 per year)
- Quarterly Exams (4 per year)
- Half-Yearly Exams (2 per year)
- Final Exams (1 per year)
- Unit Tests (varies)

### Class Test Management

#### What is a Class Test?

A class test is an **assignment of a test type to a specific class** with:
- Which class (e.g., Class 10)
- Which test type (e.g., Monthly Test - January)
- When it occurs (ordering)
- Which subjects it covers

#### Step-by-Step: Create Class Test

**Navigation:** Academic → Academic Management → Class Test Assignment

**Phase 1: Create Class Test**

1. **Select Context:**
   - Academic Year: `2025-2026`
   - Location: `Hyderabad`
   - Branch: `Hyderabad Main Campus`
   - Class: `Class 10`

2. **Click "Create Class Test"**

3. **Select Test Type:** `Monthly Test - January`

4. **Set Test Order:** `1` (first test for Class 10)

5. **Click "Create"**

**Phase 2: Assign Subjects to Class Test**

1. **The created Class Test appears in list**

2. **Click on test → "Manage Subjects"**

3. **Select Subjects to include in this test:**
   - English (Max Marks: 100)
   - Mathematics (Max Marks: 100)
   - Science (Max Marks: 100)
   - Quran (Max Marks: 50)

4. **Set Subject Order:** Determines exam schedule order

5. **Click "Save Subject Assignment"**

### Test Structure Visualization

```
Class 10 Testing Schedule (2025-2026)
├─ Monthly Test - January (Test Order: 1)
│  ├─ English (100 marks) - Subject Order 1
│  ├─ Mathematics (100 marks) - Subject Order 2
│  └─ Science (100 marks) - Subject Order 3
│
├─ Monthly Test - February (Test Order: 2)
│  ├─ English (100 marks)
│  ├─ Mathematics (100 marks)
│  ├─ Science (100 marks)
│  └─ Quran (50 marks)
│
└─ Final Exam (Test Order: 12)
   ├─ English (150 marks)
   ├─ Mathematics (150 marks)
   ├─ Science (150 marks)
   └─ Quran (100 marks)
```

---

## Academic Grading Workflow

### Complete Grading Flow

```
┌─────────────────────────────────────────────────────────┐
│ Academic Grading Workflow (Step-by-Step)                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 1. SETUP PHASE                                          │
│    ├─ Create Subjects                                   │
│    ├─ Assign Subjects to Classes                        │
│    ├─ Create Grade Scale                                │
│    ├─ Create Test Types                                 │
│    └─ Create & Configure Class Tests                    │
│                                                         │
│ 2. ASSIGNMENT PHASE                                     │
│    ├─ Assign Tests to Students                          │
│    └─ Verify Student-Test Mapping                       │
│                                                         │
│ 3. GRADING PHASE                                        │
│    ├─ Enter Student Marks                               │
│    ├─ System Auto-calculates Grades                     │
│    └─ Generate Grade Reports                            │
│                                                         │
│ 4. FINALIZATION PHASE                                   │
│    ├─ Review & Verify Grades                            │
│    ├─ Approve Final Grades                              │
│    └─ Publish Results                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Phase 1: Setup (Pre-Grading Requirements)

All items must be completed before grading can begin:

**Checklist:**
- [ ] Subjects created (Academic & Hifz)
- [ ] Subjects assigned to class
- [ ] Grade scale created
- [ ] Test types created
- [ ] Class tests created with subjects
- [ ] Student enrollment completed

### Phase 2: Student Test Assignment

#### What is Student Test Assignment?

Assigning specific class tests to individual students.

#### Why Required?

- Not all students take the same tests
- Different sections may have different test schedules
- Absent students might be excluded from a test
- Special arrangements for specific students

#### Step-by-Step: Assign Tests to Students

**Navigation:** Academic → Academic Management → Student Test Assignment

1. **Select Filters:**
   - Academic Year: `2025-2026`
   - Location: `Hyderabad`
   - Branch: `Hyderabad Main Campus`
   - Class: `Class 10`

2. **View Assignment Matrix:**
   ```
   Student Name     | Monthly Test-Jan | Monthly Test-Feb | Final Exam
   ─────────────────┼──────────────────┼──────────────────┼──────────
   Arjun (Roll 1)   | ☑ Assigned      | ☑ Assigned       | ☑ Assigned
   Priya (Roll 2)   | ☐ Not Assigned  | ☑ Assigned       | ☑ Assigned
   Rahul (Roll 3)   | ☑ Assigned      | ☑ Assigned       | ☑ Assigned
   ```

3. **Modify Assignments:**
   - Click checkbox to assign/unassign test to student
   - Bulk assign: Select all checkbox to assign test to entire class
   - Bulk unassign: Uncheck to remove all assignments

4. **Click "Save Assignments"**

5. **Confirmation:** "Test assignments updated successfully"

### Phase 3: Grading (Enter Student Marks)

#### What is Entering Marks?

Recording the numerical marks obtained by students in each test subject.

#### Step-by-Step: Enter Student Marks

**Navigation:** Academic → Academic Management → Student Grading

1. **Select Grading Context:**
   - Academic Year: `2025-2026`
   - Location: `Hyderabad`
   - Branch: `Hyderabad Main Campus`
   - Class: `Class 10`
   - Test: `Monthly Test - January`

2. **View Grading Grid:**
   ```
   Student Name       | Admission # | English | Math | Science | Quran
   ───────────────────┼─────────────┼─────────┼──────┼─────────┼──────
   Arjun Sharma       | ADM001      |   [85]  | [90] |  [88]   | [45]
   Priya Patel        | ADM002      |   [78]  | [82] |  [80]   | [38]
   Rahul Kumar        | ADM003      |   [ ]   | [ ]  |  [ ]    | [ ]
   Kavya Singh        | ADM004      |   [92]  | [88] |  [90]   | [48]
   ```

3. **Enter Marks:**
   - Click on mark cell (e.g., Arjun's English marks)
   - Type numerical value: `85`
   - Press Tab/Enter to move to next subject
   - Continue for all subjects

4. **Validation Rules:**
   - ✅ Marks must be ≤ max marks for subject (e.g., ≤100)
   - ✅ Marks must be ≥ 0
   - ✅ Only numbers allowed
   - ❌ Cannot enter marks > max marks
   - ❌ Cannot leave empty if student assigned to test

5. **Save Marks:**
   - System auto-saves after each entry
   - Or click "Save All Marks"

6. **Auto-Grade Calculation:**
   - System automatically calculates letter grades
   - Example: 85 marks → Grade "A" (based on grade scale)

**Mark Entry Example:**
```
English: 85 marks + Grade Scale (90-100 = A, 80-89 = B)
         → Student gets Grade B

Math: 92 marks + Grade Scale (90-100 = A)
         → Student gets Grade A

Science: 88 marks
         → Student gets Grade B

Quran: 45 marks (out of 50)
         → Marks: 90/100 scale
         → Grade: A (Excellent)
```

756: Quran: 45 marks (out of 50)
757:          → Marks: 90/100 scale
758:          → Grade: A (Excellent)
759: ```
760: 
761: ### Phase 3b: Marks Upload via Excel (Bulk Entry)
762: 
763: For faster data entry, especially for large classes, use the Excel Upload feature.
764: 
765: **Navigation:** Academic → Academic Management → Student Grading → "Upload Exam Marks"
766: 
767: 1.  **Download Template:**
768:     *   Select Class, Section, and Test.
769:     *   Click "Download Template".
770:     *   The Excel file will contain student names and columns for each subject.
771: 
772: 2.  **Fill Marks in Excel:**
773:     *   Enter numerical marks for each student.
774:     *   For absent students, enter `AB` (do not leave blank or enter 0 if they were absent).
775:     *   Save the file.
776: 
777: 3.  **Upload File:**
778:     *   Click "Upload Excel".
779:     *   Select your saved file.
780:     *   System validates marks (checks max marks, valid numbers).
781: 
782: 4.  **Verification:**
783:     *   Go back to the manual entry screen to verify marks have been populated correctly.
784: 
785: ### Phase 4: Finalization & Reporting

#### Step-by-Step: Generate Grade Report

**Navigation:** Academic → Reports → Academic Performance Report

1. **Select Report Parameters:**
   - Academic Year: `2025-2026`
   - Location: `Hyderabad`
   - Branch: `Hyderabad Main Campus`
   - Class: `Class 10` (optional)
   - Test: `Monthly Test - January` (optional)

2. **Choose Report Type:**
   - Class-wise Report (all students)
   - Individual Student Report
   - Subject-wise Report
   - Grade Distribution Report

3. **Click "Generate Report"**

4. **Report Contents:**
   - Student name and admission number
   - Marks obtained in each subject
   - Grade for each subject
   - Overall performance
   - Class rank/percentile

5. **Actions:**
   - View on screen
   - Export to PDF (for printing)
   - Export to Excel (for further analysis)

### Grading Logic & Calculations

**Mark to Grade Conversion:**
```
Student Marks (Numerical) 
    ↓
[Grade Scale Lookup]
    ├─ Check: Min Marks ≤ Student Marks ≤ Max Marks
    └─ Return: Corresponding Grade
    ↓
Letter Grade Assigned
    ├─ Display to student/parent
    ├─ Store in database
    └─ Include in reports
```

**Example Conversion:**

| Student | Marks | Grade Scale | Grade | Remarks |
|---------|-------|-------------|-------|---------|
| Arjun | 92 | A: 90-100 | A | Excellent |
| Priya | 78 | C: 70-79 | C | Average |
| Rahul | 65 | D: 60-69 | D | Below Average |
| Kavya | 45 | F: 0-49 | F | Needs Retest |

---

## Student Management

### Student Information Structure

Each student record contains:

#### Basic Information
- First Name, Middle Name, Last Name
- Gender
- Date of Birth
- Admission Number (unique ID)
- Admission Date
- Student Status (Active/Inactive)

#### Academic Information
- Class (Grade Level)
- Section
- Roll Number
- Academic Year
- Branch & Location
- Subjects Enrolled
- Previous School Information

#### Contact Information
- Personal Email & Phone
- Permanent Address
- City, State, PIN Code

#### Guardian Information
- Father's Name, Contact, Occupation
- Mother's Name, Contact, Occupation
- Guardian Information (if different)

#### Additional Information
- Blood Group
- Aadhar Number
- Caste, Religion
- Category
- Student Type (Regular, Special, etc.)
- Languages spoken

#### Financial Information
- Bank Account Details (for future fees)
- Income Information

### Step-by-Step: Create Student

**Navigation:** Administration → Student Administration → Create Student

1. **Select Academic Context:**
   - Academic Year: `2025-2026`
   - Location: `Hyderabad`
   - Branch: `Hyderabad Main Campus`
   - Class: `Class 10`
   - Section: `A`

2. **Fill Basic Information:**
   - First Name: `Arjun`
   - Middle Name: `Kumar`
   - Last Name: `Sharma`
   - Admission Number: `ADM-HYD-10A-001`
   - Date of Birth: `15-06-2010`
   - Gender: `Male`
   - Admission Date: `01-06-2025`
   - Roll Number: `1`

3. **Fill Contact Information:**
   - Personal Email: `arjun@example.com`
   - Personal Phone: `9876543210`
   - Permanent Address: `123 Main Street, Hyderabad`
   - City: `Hyderabad`
   - State: `Telangana`
   - PIN Code: `500001`

4. **Fill Parent Information:**

   **Father's Information:**
   - Name: `Sharma Vikram`
   - Phone: `9876543200`
   - Email: `vikram@example.com`
   - Occupation: `Business Owner`
   - Company: `Tech Solutions`

   **Mother's Information:**
   - Name: `Sharma Meera`
   - Phone: `9876543201`
   - Email: `meera@example.com`
   - Occupation: `Teacher`
   - Company: `City School`

5. **Fill Additional Information:**
   - Blood Group: `O+`
   - Religion: `Hindu`
   - Caste: `[As per institutional guidelines]`
   - Languages: `English, Hindi, Urdu`

6. **Upload Photo (Optional):**
   - Click "Upload Photo"
   - Select student photo (JPG/PNG)
   - System stores in `/uploads/Studentphotos/`

7. **Click "Create Student"**

8. **Confirmation:** "Student created successfully with ID: ADM-HYD-10A-001"

### Step-by-Step: Import Student Data (Bulk Upload)

**Navigation:** Administration → Student Administration → Import Student Data

**Supported Format:** CSV (Comma-Separated Values)

**CSV Template Columns:**
```
First Name, Middle Name, Last Name, Gender, DOB, Admission Number, 
Email, Phone, Father Name, Father Phone, Mother Name, Mother Phone,
Address, City, Class, Section, Roll Number, Status
```

**Example CSV:**
```csv
First Name,Middle Name,Last Name,Gender,DOB,Admission Number,Email,Phone,Class,Section,Roll Number
Arjun,Kumar,Sharma,Male,15-06-2010,ADM001,arjun@example.com,9876543210,Class 10,A,1
Priya,,Patel,Female,20-07-2010,ADM002,priya@example.com,9876543211,Class 10,A,2
Rahul,Singh,Kumar,Male,10-08-2010,ADM003,rahul@example.com,9876543212,Class 10,B,1
```

**Import Steps:**

1. **Click "Choose File"**
2. **Select CSV file from your computer**
3. **Click "Preview Import"**
   - System shows matching records
   - Highlights any validation errors
4. **Review Warnings:**
   - Missing required fields
   - Invalid date formats
   - Duplicate admission numbers
5. **Fix Errors (if any):**
   - Edit CSV file
   - Re-upload
6. **Click "Import Students"**
7. **Confirmation:** "X students imported successfully, Y warnings"

---

## Fee Management

### Fee Structure Overview

#### What is a Fee Type?

A fee type is a **category of fee** charged to students:
- **Tuition Fee:** Core academic instruction fee
- **Transport Fee:** School bus/transportation
- **Activity Fee:** Extracurricular activities
- **Library Fee:** Library usage
- **Exam Fee:** Test and exam charges
- **Uniform:** School uniform cost
- **Miscellaneous:** Other charges

#### What is Class Fee Structure?

An assignment of:
- Which fee types apply to a class
- Amount for each fee type
- Payment installments
- New student vs. continuing student rates

### Step-by-Step: Create Fee Type

**Navigation:** Fee Management → Fee Type Manager

1. **Click "Create Fee Type"**

2. **Fill Fee Type Form:**
   - Fee Type Name: `Tuition Fee`
   - Category: `Academic`
   - Fee Type Group: `Recurring`
   - Type: `Installment` (vs. One-time)
   - Display Name: `Tuition (Monthly)`
   - Is Refundable: `☐ Unchecked`
   - Description: `Monthly tuition charges for academic instruction`

3. **Click "Save"**

4. **Confirmation:** "Fee Type created successfully"

### Step-by-Step: Create Class Fee Structure

**Navigation:** Fee Management → Class Fee Structure

1. **Select Context:**
   - Academic Year: `2025-2026`
   - Location: `Hyderabad`
   - Branch: `Hyderabad Main Campus`
   - Class: `Class 10`

2. **Click "Create Fee Structure"**

3. **Add Fee Type 1: Tuition Fee**
   - Fee Type: `Tuition Fee`
   - Total Amount: `36000` (annual)
   - Monthly Amount: `3000`
   - Number of Installments: `12`
   - Is New Admission: `☑ Yes`
   - Admission Fee: `5000`

4. **Add Fee Type 2: Transport Fee**
   - Fee Type: `Transport Fee`
   - Total Amount: `12000` (annual)
   - Monthly Amount: `1000`
   - Number of Installments: `12`

5. **Add Fee Type 3: Activity Fee**
   - Fee Type: `Activity Fee`
   - Total Amount: `2400`
   - Monthly Amount: `200`
   - Number of Installments: `12`

6. **Summary:**
   ```
   Class 10 Fee Structure (2025-2026)
   ├─ Tuition Fee: ₹3000/month = ₹36000/year
   ├─ Transport Fee: ₹1000/month = ₹12000/year
   ├─ Activity Fee: ₹200/month = ₹2400/year
   ├─ New Student Admission Fee: ₹5000 (one-time)
   └─ Total Annual Fee: ₹50400 (+ ₹5000 for new students)
   ```

7. **Click "Save Fee Structure"**

8. **Confirmation:** "Fee Structure created successfully"

### Step-by-Step: Collect Student Fee

**Navigation:** Fee Management → Take Fee

1. **Select Context:**
   - Academic Year: `2025-2026`
   - Location: `Hyderabad`
   - Branch: `Hyderabad Main Campus`

2. **Click "Select Student"**

3. **Search & Select Student:**
   - Search by: Name / Admission Number / Roll Number
   - Example: `Arjun Sharma (ADM001)`

4. **View Fee Details:**
   ```
   Fee Summary for Arjun Sharma (Class 10-A)
   ┌──────────────────┬────────┬─────────┬──────────┐
   │ Fee Type         │ Total  │ Paid    │ Pending  │
   ├──────────────────┼────────┼─────────┼──────────┤
   │ Tuition Fee      │ 36000  │ 12000   │ 24000    │
   │ Transport Fee    │ 12000  │ 4000    │ 8000     │
   │ Activity Fee     │ 2400   │ 0       │ 2400     │
   │ Admission Fee    │ 5000   │ 5000    │ 0        │
   ├──────────────────┼────────┼─────────┼──────────┤
   │ TOTAL            │ 55400  │ 21000   │ 34400    │
   └──────────────────┴────────┴─────────┴──────────┘
   ```

5. **Select Fee Items to Collect:**
   - ☐ Tuition Fee (₹3000/month for January-April = ₹12000)
   - ☑ Transport Fee (₹1000/month for January = ₹1000)
   - ☑ Activity Fee (January = ₹200)
   - ☐ Admission Fee (Already paid)

6. **Add Concession (if applicable):**
   - Apply to: `Transport Fee`
   - Type: `Percentage`
   - Value: `50%` (sibling discount)
   - Calculate: ₹1000 × 50% = ₹500 concession
   - Net Payable: ₹500

7. **Calculate Total Due:**
   ```
   Tuition Fee:      ₹12000
   Transport Fee:    ₹500 (after 50% concession)
   Activity Fee:     ₹200
   ─────────────────────────
   TOTAL PAYABLE:    ₹12700
   ```

8. **Receive Payment:**
   - Payment Mode: `Cash` / `Check` / `Online Transfer` / `DD`
   - Amount Received: `₹12700`
   - Transaction Reference: `TXN12345` (for online)
   - Collected By: `Your Name`

9. **Click "Generate Receipt"**

10. **Receipt Generated:**
    ```
    ╔════════════════════════════════════════╗
    ║      MS HIFZ ACADEMY FEE RECEIPT        ║
    ║      Hyderabad Main Campus              ║
    ║───────────────────────────────────────│
    │ Receipt Number: RCP/2025/001/12700    │
    │ Date: 15-01-2026                       │
    │ Student: Arjun Sharma (ADM001)         │
    │ Class: 10-A                            │
    │───────────────────────────────────────│
    │ Items:                                  │
    │   1. Tuition Fee (Jan-Apr) ₹12000     │
    │   2. Transport Fee        ₹1000        │
    │      Less: Concession 50%  -₹500      │
    │   3. Activity Fee         ₹200         │
    │───────────────────────────────────────│
    │ Total Amount: ₹12700                   │
    │ Payment Mode: Cash                     │
    │ Collected By: Finance Manager          │
    │ Date: 15-01-2026                       │
    ╚════════════════════════════════════════╝
1115:     ```
1116:     ╔════════════════════════════════════════╗
1117:     ║      MS HIFZ ACADEMY FEE RECEIPT        ║
1118:     ║      Hyderabad Main Campus              ║
1119:     ║───────────────────────────────────────│
1120:     │ Receipt Number: RCP/2025/001/12700    │
1121:     │ Date: 15-01-2026                       │
1122:     │ Student: Arjun Sharma (ADM001)         │
1123:     │ Class: 10-A                            │
1124:     │───────────────────────────────────────│
1125:     │ Items:                                  │
1126:     │   1. Tuition Fee (Jan-Apr) ₹12000     │
1127:     │   2. Transport Fee        ₹1000        │
1128:     │      Less: Concession 50%  -₹500      │
1129:     │   3. Activity Fee         ₹200         │
1130:     │───────────────────────────────────────│
1131:     │ Total Amount: ₹12700                   │
1132:     │ Payment Mode: Cash                     │
1133:     │ Collected By: Finance Manager          │
1134:     │ Date: 15-01-2026                       │
1135:     ╚════════════════════════════════════════╝
1136:     ```
1137: 
1138:     **Note:** If multiple installments are paid together (e.g., Tuition Fee for Jan, Feb, Mar), the system consolidates them into a single line item on the receipt and reports to save space and simplify records.

11. **Receipt Actions:**
    - View on screen
    - Print receipt
    - Email to student/parent
    - Save as PDF

### Fee Payment Types & Concessions

#### Payment Modes
- **Cash:** Direct payment, instant confirmation
- **Check:** Cheque number recorded, date validation
- **Online Transfer:** Bank transfer, ref. number required
- **Demand Draft (DD):** DD details recorded
- **Card:** Credit/Debit card, transaction ID

#### Concession Types
- **Percentage:** e.g., 50% sibling discount
- **Flat Amount:** e.g., ₹1000 flat deduction
- **Free Admission:** Admission fee waived
- **Scholarship:** Percentage or amount reduction

---

## Attendance Management

### Attendance Overview

#### What is Attendance?

Daily record of student presence/absence in school.

**Attendance Status Options:**
- **Present:** Student attended school
- **Absent:** Student did not attend
- **Leave:** Student on approved leave
- **Holiday:** School holiday (no class)
- **Sunday/Weekoff:** Non-working day

### Step-by-Step: Mark Student Attendance

**Navigation:** Academics → Attendance Management → Student Attendance

1. **Select Context:**
   - Academic Year: `2025-2026`
   - Location: `Hyderabad`
   - Branch: `Hyderabad Main Campus`
   - Class: `Class 10`
   - Section: `A`
   - Attendance Date: `15-01-2026`

2. **View Attendance Grid:**
   ```
   Roll # | Student Name        | Status   | Remarks
   ───────┼─────────────────────┼──────────┼──────────────────
   1      | Arjun Sharma        | ☑ Present|
   2      | Priya Patel         | ○ Absent | Fever
   3      | Rahul Kumar         | ○ Leave  | Medical
   4      | Kavya Singh         | ☑ Present|
   5      | Amit Verma          | ○ Absent |
   ```

3. **Mark Attendance:**
   - Click on student row
   - Select status: Present / Absent / Leave / Holiday
   - Add remarks (optional): "Fever", "Dental appointment", etc.

4. **Bulk Actions (Optional):**
   - "Mark All Present" → Marks entire class present
   - "Mark All Absent" → Marks all absent
   - Then manually correct individual exceptions

5. **Save Attendance:**
   - Click "Save Attendance"
   - System confirms entries

6. **Attendance Summary:**
   - Total students: 35
   - Present: 32
   - Absent: 2 (Priya, Amit)
   - Leave: 1 (Rahul)
   - Attendance %: 91.4%

### Attendance Reports

#### Step-by-Step: Generate Attendance Report

**Navigation:** Academics → Reports → Attendance Report

1. **Select Report Parameters:**
   - Report Type: `Student Absent Report` / `Attendance Summary`
   - Academic Year: `2025-2026`
   - Location: `Hyderabad`
   - Branch: `Hyderabad Main Campus`
   - Class: `Class 10` (optional)
   - Date Range: `01-01-2026 to 31-01-2026`

2. **Choose Report View:**
   - By Student (each student's record)
   - By Class (class-wise summary)
   - By Date (daily attendance)

3. **Generate Report**

4. **Report Contents:**
   - Student attendance records
   - Number of working days
   - Number of present days
   - Number of absent days
   - Attendance percentage
   - Warnings for <75% attendance

**Example Report:**
```
Student Attendance Report - January 2026
Class 10-A | Location: Hyderabad | Branch: Main Campus

Working Days: 22 (excluding Sundays & Holidays)

Student          | Admission # | Present | Absent | Leave | Attendance %
─────────────────┼─────────────┼─────────┼────────┼───────┼──────────────
Arjun Sharma     | ADM001      | 20      | 2      | 0     | 90.9%
Priya Patel      | ADM002      | 19      | 2      | 1     | 86.4%
Rahul Kumar      | ADM003      | 21      | 1      | 0     | 95.5%
Kavya Singh      | ADM004      | 22      | 0      | 0     | 100%
[... more students]

⚠ Warning: Students with <75% attendance:
   - None
```

---

## Reports & Analytics

### Available Reports

#### Academic Reports
1. **Grade Report:** Student grades by class/test
2. **Academic Performance:** Subject-wise analysis
3. **Class Rank Report:** Student ranking by scores
4. **Grade Distribution:** How many A's, B's, C's, etc.

#### Attendance Reports
1. **Student Absent Report:** Absentee details
2. **Class Attendance Summary:** Class-wise statistics
3. **Date-wise Attendance:** Daily rollcalls

#### Fee Reports
1. **Fee Collection Report:** Payment status
2. **Outstanding Fee Report:** Pending fees
3. **Monthly Collection Report:** Month-wise collection
4. **Concession Report:** Applied concessions

#### Student Reports
1. **Student Master Report:** All student details
2. **Promotion Report:** Students promoted to next class
3. **Fee Status Report:** Student fee status

### Step-by-Step: Generate Reports

**General Report Generation Process:**

1. **Navigate to Reports Section**
   - Menu → Reports → [Select Report Type]

2. **Select Filters:**
   - Academic Year (required)
   - Location (required)
   - Branch (required for branch-level reports)
   - Class/Student (optional)
   - Date Range (for time-based reports)

3. **Choose Format:**
   - View on Screen (preview)
   - Export to PDF (for printing)
   - Export to Excel (for analysis)

4. **Click "Generate"**

5. **Report Downloads/Display**

1317: 5. **Report Downloads/Display**
1318: 
1319: ### Printing Best Practices
1320: 
1321: To ensure Report Cards and other documents print correctly without cutting off content or showing unwanted UI elements:
1322: 
1323: 1.  **Clean Print Mode:**
1324:     *   The system automatically hides sidebars, headers, and buttons when printing.
1325:     *   If you see "boxes" or UI elements, ensure you are using the official "Print" button, not the browser's generic print (`Ctrl+P`).
1326: 
1327: 2.  **Browser Settings:**
1328:     *   **Paper Size:** A4
1329:     *   **Margins:** Minimum or None (if content is cutting off)
1330:     *   **Scale:** Default (100%). If content spills to a second page unnecessarily, try reducing scale to 95% or 90%.
1331:     *   **Background Graphics:** Check this option to ensure charts and colored headers print correctly.
1332: 
1333: 3.  **Language Support:**
1334:     *   For charts containing Arabic/Urdu names, ensure your system has appropriate fonts installed to avoid empty boxes ("tofu" characters).
1335: 
1336: ---

## Multi-Branch Operations

### Understanding Multi-Branch Architecture

#### Single User, Multiple Branches

**Scenario:** You are Admin responsible for 3 branches.

**Login Process:**
1. Enter username & password
2. System fetches all branches you have access to:
   - Hyderabad Main Campus
   - Hyderabad Branch 2
   - Bangalore Main Campus

3. You select which branch to work with
4. All subsequent operations use selected branch

**Benefits:**
- One login account for multiple locations
- Easy switching between branches
- Consistent user experience across branches

### Branch-Specific Data

When you select Branch "Hyderabad Main Campus":

✅ **YOU CAN SEE:**
- Students enrolled in Hyderabad Main
- Fees collected from Hyderabad Main
- Attendance for Hyderabad Main
- Test grades for Hyderabad Main

❌ **YOU CANNOT SEE:**
- Students from Bangalore Main
- Fees from Hyderabad Branch 2
- Data from other branches

### Data Flow in Multi-Branch System

```
User Login
    ↓
System queries: UserBranchAccess table
    ├─ user_id = [your ID]
    ├─ is_active = TRUE
    ├─ start_date ≤ TODAY
    ├─ end_date >= TODAY (or NULL)
    └─ Fetch associated branches
    ↓
Display Branch Selector
    ├─ Hyderabad Main Campus
    ├─ Hyderabad Branch 2
    └─ Bangalore Main Campus
    ↓
User selects branch
    ↓
Apply branch filter to ALL queries
    ├─ SELECT * FROM students WHERE branch = 'Hyderabad Main'
    ├─ SELECT * FROM fee_payments WHERE branch = 'Hyderabad Main'
    ├─ SELECT * FROM attendance WHERE branch = 'Hyderabad Main'
    └─ And so on...
    ↓
Display branch-specific data only
```

### Branch Configuration & User Access

#### Step-by-Step: Configure User Branch Access

**Navigation:** Administration → User Management → User Branch Access

1. **Select User:** `teacher_john`

2. **Click "Manage Branch Access"**

3. **Current Access:**
   - Hyderabad Main (Start: 01-01-2025, End: 31-12-2025, Active: Yes)

4. **Add New Branch Access:**
   - Branch: `Hyderabad Branch 2`
   - Start Date: `01-01-2026`
   - End Date: `31-12-2026` (or leave blank for permanent)
   - Is Active: `☑ Yes`

5. **Remove Branch Access (Deactivate):**
   - Select Hyderabad Main
   - Click "Deactivate"
   - System marks as inactive but keeps history

6. **Click "Save"**

**Result:**
- `teacher_john` can now access both branches
- Can switch between them at login
- Access controlled by date ranges

---

## Troubleshooting

### Common Issues & Solutions

#### Issue 1: "Invalid Credentials" Error on Login

**Possible Causes:**
- Wrong username or password
- User account is inactive
- User account deleted

**Solution:**
1. Verify username is correct (case-sensitive in some systems)
2. Verify password is typed correctly
3. Check CAPS LOCK is off
4. Contact admin to verify account is active
5. If forgotten password, contact admin for reset

#### Issue 2: "No Branches Available" After Login

**Possible Cause:**
- User has no active UserBranchAccess records
- Branch access dates have expired
- Access has been deactivated

**Solution:**
1. Contact administrator
2. Ask admin to grant branch access
3. Verify start/end dates are valid
4. Ensure access is marked as Active

#### Issue 3: Cannot Create/Edit Grade Scale

**Possible Causes:**
- Missing required fields
- Duplicate grade scale name
- Grade ranges overlapping
- Insufficient permissions

**Solution:**
1. Check all required fields are filled:
   - Scale Name
   - Location
   - Academic Year
   - At least 2 grades with ranges
2. Ensure grade ranges don't overlap
3. Verify you're not duplicating existing scale
4. Check your role has Academic Coordinator permissions

#### Issue 4: Student Marks Not Showing

**Possible Causes:**
- Student not assigned to test
- Marks not yet entered
- Wrong academic year selected
- Wrong class/test selected

**Solution:**
1. Verify academic year and class filters
2. Check student is assigned to test (StudentTestAssignment)
3. Check if marks were saved
4. Reload page to refresh data

#### Issue 5: Fee Amount Incorrect After Collection

**Possible Cause:**
- Concession not applied correctly
- Multiple fee types incorrectly calculated

**Solution:**
1. Open fee collection receipt
2. Verify each fee type amount
3. Check concession calculation (% vs. flat)
4. Contact finance team if discrepancy found

#### Issue 6: Grade Not Calculated from Marks

**Possible Cause:**
- Grade scale not created for that location/year
- Student marks outside defined ranges (0-100)
- Grade scale ranges have gaps

**Solution:**
1. Verify grade scale exists for selected location & year
2. Check student marks are within valid range
3. Verify grade scale has no gaps in ranges
4. Ensure all marks 0-100 are covered by grade scales

#### Issue 7: Cannot Access Module/Feature

**Possible Cause:**
- Your role doesn't have permission
- Feature is inactive in system configuration

**Solution:**
1. Check your assigned role
2. Verify role has required permissions
3. Contact admin to update your role
4. Request permission if feature is restricted

---

## Appendix: Data Structures

### Key Data Models

#### User Model
```
User {
  user_id: Integer (Primary Key)
  username: String (Unique)
  password: String (Hashed)
  role: String (Admin, Coordinator, etc.)
  branch: String (Legacy, use UserBranchAccess)
  location: String (Legacy, use UserBranchAccess)
}
```

#### Student Model
```
Student {
  student_id: Integer (Primary Key)
  admission_no: String (Unique)
  first_name: String
  last_name: String
  gender: String
  dob: Date
  class: String
  section: String
  roll_number: Integer
  branch: String
  location: String
  academic_year: String
  status: Enum (Active/Inactive)
  photopath: String (to Studentphotos folder)
  [...many more fields...]
}
```

#### GradeScale Model
```
GradeScale {
  id: Integer (Primary Key)
  scale_name: String
  location: String (NOT branch - location-wide)
  branch: String (default "All")
  academic_year: String
  description: String
  is_active: Boolean
  created_at: DateTime
}

GradeScaleDetails {
  id: Integer (Primary Key)
  grade_scale_id: Integer (Foreign Key)
  grade: String (e.g., "A", "B", "C")
  min_marks: Integer
  max_marks: Integer
  description: String
}
```

#### ClassTest Model
```
ClassTest {
  id: Integer (Primary Key)
  academic_year: String
  branch: String
  location: String
  class_id: Integer
  test_id: Integer
  test_order: Integer
  status: Boolean
}

ClassTestSubject {
  id: Integer (Primary Key)
  class_test_id: Integer (Foreign Key)
  subject_id: Integer (Foreign Key)
  max_marks: Integer
  subject_order: Integer
}
```

#### StudentTestAssignment Model
```
StudentTestAssignment {
  id: Integer (Primary Key)
  student_id: Integer (Foreign Key)
  class_test_id: Integer (Foreign Key)
  academic_year: String
  branch: String
  location: String
  status: Boolean (True = Assigned, False = Unassigned)
}
```

---

## Best Practices

### Security
1. **Password Management:**
   - Use strong passwords (8+ chars, mixed case, numbers)
   - Never share your login credentials
   - Change password every 90 days
   - Logout when leaving desk

2. **Data Protection:**
   - Don't take screenshots of sensitive student data
   - Don't share reports via insecure channels
   - Always use official system reports

### Operational
1. **Daily Operations:**
   - Mark attendance on same day
   - Collect fees promptly
   - Review pending items daily
   - Generate daily reports

2. **Month-End:**
   - Reconcile all fee collections
   - Verify attendance totals
   - Close academic records
   - Generate monthly reports

3. **Academic Year-End:**
   - Finalize all student grades
   - Promote students to next class
   - Archive reports
   - Prepare next year setup

### Reporting
1. **Before generating reports:**
   - Verify all source data is entered
   - Check filters are correct
   - Review for anomalies
   - Test with sample data first

2. **Report Distribution:**
   - Distribute reports only to authorized users
   - Include date generated and preparer name
   - Keep records for audit trail
   - Archive old reports

---

## Support & Contact

### Getting Help

**For Technical Issues:**
- Contact IT Support
- Email: support@mshifzacademy.com
- Phone: [School Support Number]

**For Data Questions:**
- Contact Academic Coordinator
- Contact Finance Manager
- Contact Administration

**For Access Issues:**
- Contact System Administrator
- Provide username and requested access

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 13-Jan-2026 | Initial comprehensive documentation |

---

**Document Prepared By:** SHAIK KAREEMULLA SHA ABDUL LATHEEF       
**Last Reviewed:** January 23, 2026  
**Next Review:** June 2026 
 
---

**END OF DOCUMENT**
