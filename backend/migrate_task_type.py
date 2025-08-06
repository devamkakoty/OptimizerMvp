#!/usr/bin/env python3
"""
Migration script to add task_type column to existing Model_table
This script checks if the task_type column exists and adds it if missing.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text, Column, String
from app.database import model_engine, ModelSessionLocal
from app.models.model_info import ModelInfo

def check_column_exists(engine, table_name, column_name):
    """Check if a column exists in the table"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '{table_name}' 
                AND column_name = '{column_name}'
            """))
            return result.fetchone() is not None
    except Exception as e:
        print(f"Error checking column existence: {e}")
        return False

def add_task_type_column():
    """Add task_type column to Model_table if it doesn't exist"""
    try:
        table_name = "Model_table"
        column_name = "task_type"
        
        # Check if column already exists
        if check_column_exists(model_engine, table_name, column_name):
            print(f"✓ Column '{column_name}' already exists in '{table_name}'")
            return True
        
        print(f"Adding '{column_name}' column to '{table_name}' table...")
        
        # Add the column
        with model_engine.connect() as conn:
            conn.execute(text(f"""
                ALTER TABLE "{table_name}" 
                ADD COLUMN {column_name} VARCHAR(255) DEFAULT 'Inference'
            """))
            conn.commit()
            print(f"✓ Column '{column_name}' added successfully")
            
        # Update the column to be NOT NULL after setting default values
        with model_engine.connect() as conn:
            conn.execute(text(f"""
                ALTER TABLE "{table_name}" 
                ALTER COLUMN {column_name} SET NOT NULL
            """))
            conn.commit()
            print(f"✓ Column '{column_name}' set to NOT NULL")
            
        return True
        
    except Exception as e:
        print(f"✗ Error adding task_type column: {e}")
        return False

def verify_table_schema():
    """Verify the current table schema"""
    try:
        with model_engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'Model_table'
                ORDER BY ordinal_position
            """))
            
            print("\nCurrent Model_table schema:")
            print("-" * 80)
            print(f"{'Column Name':<35} {'Data Type':<15} {'Nullable':<10} {'Default'}")
            print("-" * 80)
            
            for row in result:
                column_name, data_type, is_nullable, column_default = row
                default_str = str(column_default) if column_default else "None"
                print(f"{column_name:<35} {data_type:<15} {is_nullable:<10} {default_str}")
            
        return True
        
    except Exception as e:
        print(f"✗ Error verifying table schema: {e}")
        return False

def main():
    """Main migration function"""
    print("=" * 60)
    print("Model Table Migration: Adding task_type column")
    print("=" * 60)
    
    # Step 1: Verify current schema
    print("\n1. Checking current table schema...")
    if not verify_table_schema():
        return
    
    # Step 2: Add task_type column if missing
    print("\n2. Adding missing task_type column...")
    if not add_task_type_column():
        return
    
    # Step 3: Verify updated schema
    print("\n3. Verifying updated table schema...")
    if not verify_table_schema():
        return
    
    print("\n" + "=" * 60)
    print("✓ Migration completed successfully!")
    print("You can now run: python populate_model_db.py")
    print("=" * 60)

if __name__ == "__main__":
    main()