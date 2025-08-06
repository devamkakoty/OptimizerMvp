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
            print("✓ PostgreSQL is installed")
            return True
        else:
            print("✗ PostgreSQL is not installed")
            return False
    except FileNotFoundError:
        print("✗ PostgreSQL is not installed or not in PATH")
        return False

def create_databases():
    """Create the required databases"""
    try:
        # Create Model_Recommendation_DB
        result = subprocess.run([
            'psql', '-U', 'postgres', '-c', 'CREATE DATABASE "Model_Recommendation_DB";'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✓ Model_Recommendation_DB database created successfully")
        elif "already exists" in result.stderr:
            print("✓ Model_Recommendation_DB database already exists")
        else:
            print(f"✗ Failed to create Model_Recommendation_DB: {result.stderr}")
            return False
        
        # Create Metrics_db
        result = subprocess.run([
            'psql', '-U', 'postgres', '-c', 'CREATE DATABASE "Metrics_db";'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✓ Metrics_db database created successfully")
            return True
        elif "already exists" in result.stderr:
            print("✓ Metrics_db database already exists")
            return True
        else:
            print(f"✗ Failed to create Metrics_db: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Error creating databases: {e}")
        return False

def install_dependencies():
    """Install Python dependencies"""
    try:
        print("Installing Python dependencies...")
        result = subprocess.run([
            sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✓ Dependencies installed successfully")
            return True
        else:
            print(f"✗ Failed to install dependencies: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Error installing dependencies: {e}")
        return False

def populate_database():
    """Populate the database with model data"""
    try:
        print("Populating database with model data...")
        result = subprocess.run([
            sys.executable, 'populate_model_db.py'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✓ Database populated successfully")
            return True
        else:
            print(f"✗ Failed to populate database: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Error populating database: {e}")
        return False

def test_api():
    """Test the API endpoints"""
    try:
        print("Testing API endpoints...")
        result = subprocess.run([
            sys.executable, 'test_model_api.py'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✓ API tests passed")
            return True
        else:
            print(f"✗ API tests failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Error testing API: {e}")
        return False

def main():
    """Main setup function"""
    print("=" * 50)
    print("Model Optimization API Setup")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists('requirements.txt'):
        print("✗ Please run this script from the backend directory")
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
    
    # Step 4: Populate database
    print("\n4. Populating database...")
    if not populate_database():
        print("Please populate the database manually: python populate_model_db.py")
        return
    
    # Step 5: Test API
    print("\n5. Testing API...")
    if not test_api():
        print("Please test the API manually: python test_model_api.py")
        return
    
    print("\n" + "=" * 50)
    print("✓ Setup completed successfully!")
    print("You can now run the API with: python run.py")
    print("=" * 50)

if __name__ == "__main__":
    main() 