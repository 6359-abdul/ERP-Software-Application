import requests
import json
import random
import time

BASE_URL = "http://127.0.0.1:5001/api"
ADMIN_USER = "admin"
ADMIN_PASS = "temp123"

# Global token variable
TOKEN = None
HEADERS = {}

def log(message, status="INFO"):
    log_msg = f"[{status}] {message}"
    print(log_msg)
    with open("qa_log.txt", "a") as f:
        f.write(log_msg + "\n")

def check(condition, message):
    if condition:
        log(message, "PASS")
        return True
    else:
        log(message, "FAIL")
        return False

# ------------------------------------------------------------------------------
# 1. Authentication
# ------------------------------------------------------------------------------
def test_login():
    global TOKEN, HEADERS
    log("Testing Admin Login...")
    payload = {"username": ADMIN_USER, "password": ADMIN_PASS}
    
    try:
        response = requests.post(f"{BASE_URL}/users/login", json=payload)
        
        # If default fails, try alternate (removed hardcoded "password" fallback)
        if response.status_code != 200:
             log(f"Login failed with status {response.status_code}: {response.text}", "FAIL")

        if check(response.status_code == 200, "Login Request"):
            data = response.json()
            TOKEN = data.get("token")
            if check(TOKEN is not None, "Token Received"):
                HEADERS = {"Authorization": f"Bearer {TOKEN}"}
                return True
    except Exception as e:
        log(f"Login Exception: {e}", "FAIL")
    return False

# ------------------------------------------------------------------------------
# 2. Student Management
# ------------------------------------------------------------------------------
def test_create_student():
    log("Testing Create Student...")
    
    # Generate random admission number to avoid conflict
    adm_no = f"QA-{random.randint(1000, 9999)}"
    
    payload = {
        "admission_no": adm_no,
        "first_name": "QA",
        "last_name": "TestStudent",
        "class": "10",
        "section": "A",
        "branch": "Main Branch", # Adjust valid branch
        "status": "Active",
        "dob": "2010-01-01",
        "Doa": "2024-06-01"
    }
    
    # Needs valid context headers usually?
    headers = HEADERS.copy()
    headers['X-Academic-Year'] = '2025-2026' 
    
    try:
        response = requests.post(f"{BASE_URL}/students", json=payload, headers=headers)
        if check(response.status_code == 201, f"Create Student {adm_no}"):
            return response.json().get("student_id")
    except Exception as e:
        log(f"Create Student Error: {e}", "FAIL")
    return None

def test_get_student(student_id):
    log(f"Testing Get Student {student_id}...")
    try:
        # Get query might need params
        response = requests.get(f"{BASE_URL}/students", params={"search": "QA-"}, headers=HEADERS)
        if check(response.status_code == 200, "Get Students List"):
            students = response.json().get("students", [])
            # Find our student
            found = next((s for s in students if s['student_id'] == student_id), None)
            return check(found is not None, f"Student {student_id} found in list")
    except Exception as e:
        log(f"Get Student Error: {e}", "FAIL")
    return False

def test_bulk_promote(student_id):
    log(f"Testing Bulk Promote for Student {student_id}...")
    
    payload = {
        "student_ids": [student_id],
        "target_year": "2026-2027",
        "target_class": "11",
        "target_section": "A"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/students/promote-bulk", json=payload, headers=HEADERS)
        if check(response.status_code == 200, "Bulk Promote Request"):
            # Verify promotion
            # We can check history
            hist_res = requests.get(f"{BASE_URL}/students/{student_id}/history", headers=HEADERS)
            if hist_res.status_code == 200:
                history = hist_res.json().get("history", [])
                promoted_record = next((h for h in history if h['academic_year'] == '2026-2027'), None)
                check(promoted_record is not None, "Promotion Record Found in History")
            else:
                log("Failed to fetch history", "FAIL")

            # Verify idempotency (Double promote check)
            res2 = requests.post(f"{BASE_URL}/students/promote-bulk", json=payload, headers=HEADERS)
            # Should probably still be 200 but with errors in body, OR 400? 
            # Based on code: returns 200 with error list if partial/full failure handled?
            # Actually code returns 200 always unless exception crashes.
            # Let's check response text for errors.
            log(f"Idempotency Check Response: {res2.json()}", "INFO")
            
    except Exception as e:
        log(f"Bulk Promote Error: {e}", "FAIL")


def test_soft_delete(student_id):
    log(f"Testing Soft Delete (Inactive) for Student {student_id}...")
    try:
        response = requests.delete(f"{BASE_URL}/students/{student_id}", headers=HEADERS)
        check(response.status_code == 200, "Delete Request")
        
        # Verify status
        # We need to fetch with include_inactive=true if we filtered them out
        # But wait, GET /students/{id} isn't a direct route? Oh, only GET /students list.
        # We can use the list search again.
        
    except Exception as e:
        log(f"Soft Delete Error: {e}", "FAIL")

# ------------------------------------------------------------------------------
# MAIN Execution
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    print("=== QA AUTOMATION STARTED ===")
    
    if test_login():
        sid = test_create_student()
        if sid:
            test_get_student(sid)
            test_bulk_promote(sid)
            test_soft_delete(sid)
    
    print("=== QA AUTOMATION FINISHED ===")
