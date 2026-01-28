import pymysql
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306"))

print("=" * 70)
print("SETTING UP FRESH DATABASE")
print("=" * 70)

# SAFETY GUARD
ENV = os.getenv("FLASK_ENV", "development")
if ENV not in ["development", "testing"]:
    import sys
    print(f"\n[CRITICAL ERROR] Script blocked in '{ENV}' environment.")
    print("This script wipes the database. Use in development only.")
    sys.exit(1)


try:
    # Connect without database
    print("\n1. Connecting to MySQL server...")
    conn = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )
    cursor = conn.cursor()
    print("   ✓ Connected to MySQL")
    
    # Drop and create database
    print("\n2. Creating fresh database 'erp_school'...")
    cursor.execute("DROP DATABASE IF EXISTS erp_school")
    cursor.execute("CREATE DATABASE erp_school CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    cursor.execute("USE erp_school")
    print("   ✓ Database created")
    
    # Read and execute SQL file
    print("\n3. Executing schema from create_database.sql...")
    sql_path = os.path.join(os.path.dirname(__file__), '..', 'create_database.sql')
    with open(sql_path, "r", encoding="utf-8") as f:
        sql_content = f.read()
    
    # Split by semicolons and execute each statement
    statements = [s.strip() for s in sql_content.split(';') if s.strip() and not s.strip().startswith('--')]
    
    executed = 0
    for statement in statements:
        # Skip comments and empty statements
        if statement and not statement.startswith('--'):
            try:
                cursor.execute(statement)
                executed += 1
            except Exception as e:
                # Some statements like SELECT might not need execution
                if "SELECT" not in statement.upper():
                    print(f"   Warning: {str(e)[:100]}")
    
    conn.commit()
    print(f"   ✓ Executed {executed} SQL statements")
    
    # Verify tables
    print("\n4. Verifying tables...")
    cursor.execute("SHOW TABLES")
    tables = cursor.fetchall()
    print(f"   ✓ Created {len(tables)} tables:")
    for table in tables:
        print(f"      - {table[0]}")
    
    # Check sample data
    print("\n5. Checking sample data...")
    cursor.execute("SELECT COUNT(*) FROM students WHERE class = 'X'")
    student_count = cursor.fetchone()[0]
    print(f"   ✓ Found {student_count} students in Class X")
    
    cursor.execute("SELECT COUNT(*) FROM feetypes")
    fee_type_count = cursor.fetchone()[0]
    print(f"   ✓ Found {fee_type_count} fee types")
    
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 70)
    print("DATABASE SETUP COMPLETE!")
    print("=" * 70)
    print("\nYou can now:")
    print("1. Test the Class Fee Structure page in the frontend")
    print("2. Create fee structures for Class X")
    print("3. Verify student fees are auto-created")
    
except Exception as e:
    print(f"\n✗ Error: {e}")
    import traceback
    traceback.print_exc()
