#!/usr/bin/env python3
"""
Debug script to check model population issues
"""

import csv
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import ModelSessionLocal, model_engine
from app.models.model_info import ModelInfo
from controllers.model_controller import ModelController

def check_table_exists():
    """Check if Model_table exists"""
    try:
        with model_engine.connect() as conn:
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'Model_table'
                );
            """))
            exists = result.fetchone()[0]
            print(f"Model_table exists: {exists}")
            return exists
    except Exception as e:
        print(f"Error checking table existence: {e}")
        return False

def check_table_schema():
    """Check Model_table schema"""
    try:
        with model_engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'Model_table'
                ORDER BY ordinal_position
            """))
            
            print("\nModel_table schema:")
            for row in result:
                print(f"  {row[0]}: {row[1]} (nullable: {row[2]})")
            return True
    except Exception as e:
        print(f"Error checking schema: {e}")
        return False

def check_existing_data():
    """Check existing data in Model_table"""
    try:
        db = ModelSessionLocal()
        count = db.query(ModelInfo).count()
        print(f"\nExisting records in Model_table: {count}")
        
        if count > 0:
            models = db.query(ModelInfo).limit(5).all()
            print("Sample records:")
            for model in models:
                print(f"  {model.model_name} - {model.task_type}")
        
        db.close()
        return True
    except Exception as e:
        print(f"Error checking existing data: {e}")
        return False

def test_csv_reading():
    """Test reading the CSV file"""
    try:
        csv_file_path = "../sample_data/Model_Info.csv"
        
        if not os.path.exists(csv_file_path):
            print(f"CSV file not found: {csv_file_path}")
            return False
        
        data = []
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            headers = csv_reader.fieldnames
            print(f"\nCSV headers: {headers}")
            
            for i, row in enumerate(csv_reader):
                if i < 3:  # Show first 3 rows
                    print(f"Row {i+1}: {row['Model Name']} - Task Type: {row.get('Task Type', 'MISSING')}")
                data.append(row)
        
        print(f"Total CSV rows: {len(data)}")
        return data
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return []

def test_model_insertion(csv_data):
    """Test inserting one model record"""
    if not csv_data:
        return False
    
    try:
        db = ModelSessionLocal()
        controller = ModelController()
        
        # Test with just the first row
        test_data = [csv_data[0]]
        print(f"\nTesting insertion of: {test_data[0]['Model Name']}")
        
        result = controller.populate_model_database(db, test_data)
        print(f"Result: {result}")
        
        db.close()
        return "error" not in result
    except Exception as e:
        print(f"Error testing insertion: {e}")
        return False

def main():
    """Main debug function"""
    print("=" * 60)
    print("Debug: Model Population Issues")
    print("=" * 60)
    
    print("\n1. Checking if Model_table exists...")
    if not check_table_exists():
        print("❌ Model_table doesn't exist!")
        return
    
    print("\n2. Checking table schema...")
    check_table_schema()
    
    print("\n3. Checking existing data...")
    check_existing_data()
    
    print("\n4. Testing CSV file reading...")
    csv_data = test_csv_reading()
    
    if csv_data:
        print("\n5. Testing model insertion...")
        test_model_insertion(csv_data)
    
    print("\n" + "=" * 60)
    print("Debug completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()