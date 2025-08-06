#!/usr/bin/env python3
"""
Simple script to add the task_type column to Model_table
"""

import os
import sys

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def fix_schema():
    """Add task_type column to Model_table"""
    try:
        from app.database import ModelSessionLocal
        from sqlalchemy import text
        
        print("Connecting to database...")
        db = ModelSessionLocal()
        
        try:
            print("Adding task_type column to Model_table...")
            db.execute(text("ALTER TABLE \"Model_table\" ADD COLUMN IF NOT EXISTS task_type VARCHAR(100)"))
            db.commit()
            print("✓ task_type column added successfully")
            
            # Verify the column was added
            result = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'Model_table' AND column_name = 'task_type'"))
            if result.fetchone():
                print("✓ task_type column verified in database")
            else:
                print("✗ task_type column not found in database")
                
        except Exception as e:
            db.rollback()
            print(f"✗ Error updating database schema: {e}")
            return False
        finally:
            db.close()
            
        return True
        
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Database Schema Fix")
    print("=" * 50)
    
    if fix_schema():
        print("\n✓ Schema updated successfully!")
        print("You can now run: python populate_model_db.py")
    else:
        print("\n✗ Schema update failed!")
        print("Please check the error messages above.")
    
    print("=" * 50) 