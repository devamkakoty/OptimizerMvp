#!/usr/bin/env python3
"""
Setup script for Model_db database
This script helps initialize the database and populate it with model data.
"""

import os
import sys
import subprocess
from pathlib import Path

def check_postgresql():
    """Check if PostgreSQL is installed and running"""
    try:
        result = subprocess.run(['psql', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("[SUCCESS] PostgreSQL is installed")
            return True
        else:
            print("[ERROR] PostgreSQL is not installed")
            return False
    except FileNotFoundError:
        print("[ERROR] PostgreSQL is not installed or not in PATH")
        return False

def create_databases():
    """Create the required databases"""
    try:
        # Try to connect to PostgreSQL without password first
        print("Attempting to connect to PostgreSQL...")
        
        # Test connection
        test_result = subprocess.run([
            'psql', '-U', 'postgres', '-h', 'localhost', '-p', '5432', '-c', 'SELECT 1;'
        ], capture_output=True, text=True)
        
        if test_result.returncode == 0:
            print("[SUCCESS] PostgreSQL connection successful")
            # Create Model_Recommendation_DB
            result = subprocess.run([
                'psql', '-U', 'postgres', '-h', 'localhost', '-p', '5432', '-c', 'CREATE DATABASE "Model_Recommendation_DB";'
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                print("[SUCCESS] Model_Recommendation_DB database created successfully")
            elif "already exists" in result.stderr:
                print("[SUCCESS] Model_Recommendation_DB database already exists")
            else:
                print(f"[ERROR] Failed to create Model_Recommendation_DB: {result.stderr}")
                return False
            
            # Create Metrics_db
            result = subprocess.run([
                'psql', '-U', 'postgres', '-h', 'localhost', '-p', '5432', '-c', 'CREATE DATABASE "Metrics_db";'
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                print("[SUCCESS] Metrics_db database created successfully")
                return True
            elif "already exists" in result.stderr:
                print("[SUCCESS] Metrics_db database already exists")
                return True
            else:
                print(f"[ERROR] Failed to create Metrics_db: {result.stderr}")
                return False
        else:
            print(f"[ERROR] PostgreSQL connection failed: {test_result.stderr}")
            print("Please ensure PostgreSQL is running and accessible")
            return False
            
    except Exception as e:
        print(f"[ERROR] Error creating databases: {e}")
        return False

def update_database_schema():
    """Update database schema to add missing columns"""
    try:
        print("Updating database schema...")
        
        # Import here to avoid issues if dependencies aren't installed
        from app.database import ModelSessionLocal
        from sqlalchemy import text
        
        # Create database session
        db = ModelSessionLocal()
        
        try:
            # Add the task_type column if it doesn't exist
            db.execute(text("ALTER TABLE \"Model_table\" ADD COLUMN IF NOT EXISTS task_type VARCHAR(100)"))
            db.commit()
            print("[SUCCESS] task_type column added successfully")
            
            # Verify the column was added
            result = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'Model_table' AND column_name = 'task_type'"))
            if result.fetchone():
                print("[SUCCESS] task_type column verified in database")
            else:
                print("[ERROR] task_type column not found in database")
                
        except Exception as e:
            db.rollback()
            print(f"[ERROR] Error updating database schema: {e}")
            return False
        finally:
            db.close()
            
        return True
        
    except Exception as e:
        print(f"[ERROR] Error updating database schema: {e}")
        return False

def install_dependencies():
    """Install Python dependencies"""
    try:
        print("Installing Python dependencies...")
        result = subprocess.run([
            sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("[SUCCESS] Dependencies installed successfully")
            return True
        else:
            print(f"[ERROR] Failed to install dependencies: {result.stderr}")
            return False
    except Exception as e:
        print(f"[ERROR] Error installing dependencies: {e}")
        return False

def populate_database():
    """Populate the database with model data"""
    try:
        print("Populating database with model data...")
        result = subprocess.run([
            sys.executable, 'populate_model_db.py'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("[SUCCESS] Database populated successfully")
            return True
        else:
            print(f"[ERROR] Failed to populate database: {result.stderr}")
            return False
    except Exception as e:
        print(f"[ERROR] Error populating database: {e}")
        return False

def test_api():
    """Test the API endpoints"""
    try:
        print("Testing API endpoints...")
        result = subprocess.run([
            sys.executable, 'test_model_api.py'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("[SUCCESS] API tests passed")
            return True
        else:
            print(f"[ERROR] API tests failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"[ERROR] Error testing API: {e}")
        return False

def main():
    """Main setup function"""
    print("=" * 50)
    print("Model Optimization API Setup")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists('requirements.txt'):
        print("[ERROR] Please run this script from the backend directory")
        return
    
    # Step 1: Check PostgreSQL
    print("\n1. Checking PostgreSQL...")
    if not check_postgresql():
        print("Please install PostgreSQL and ensure it's running")
        return
    
    # Step 2: Create databases
    print("\n2. Creating databases...")
    if not create_databases():
        print("Please create the databases manually")
        return
    
    # # Step 3: Install dependencies
    # print("\n3. Installing dependencies...")
    # if not install_dependencies():
    #     print("Please install dependencies manually: pip install -r requirements.txt")
    #     return
    
    # Step 4: Update database schema
    print("\n4. Updating database schema...")
    if not update_database_schema():
        print("Please update the database schema manually")
        return
    
    # Step 5: Populate database
    print("\n5. Populating database...")
    if not populate_database():
        print("Please populate the database manually: python populate_model_db.py")
        return
    
    # # Step 6: Test API
    # print("\n6. Testing API...")
    # if not test_api():
    #     print("Please test the API manually: python test_model_api.py")
    #     return
    
    print("\n" + "=" * 50)
    print("[SUCCESS] Setup completed successfully!")
    print("You can now run the API with: python run.py")
    print("=" * 50)

if __name__ == "__main__":
    main() 