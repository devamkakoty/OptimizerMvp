#!/usr/bin/env python3
"""
Detailed debug script for activation function population issue
"""

import sys
import os
import csv
import requests
import json
from typing import List, Dict, Any

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def read_csv_with_debug(file_path: str) -> List[Dict[str, Any]]:
    """Read CSV file with detailed debugging"""
    print(f"\n=== Reading {file_path} ===")
    data = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            headers = csv_reader.fieldnames
            print(f"Headers found: {headers}")
            
            # Check for activation function header
            if 'Activation Function' not in headers:
                print("ERROR: 'Activation Function' header not found!")
                return []
            
            for i, row in enumerate(csv_reader):
                # Debug first few rows
                if i < 3:
                    activation_func = row.get('Activation Function', '')
                    print(f"Row {i+1}: Model='{row.get('Model Name', '')}', Activation='{activation_func}'")
                
                # Convert empty strings to None for numeric fields
                for key, value in row.items():
                    if value == '':
                        row[key] = None
                data.append(row)
                
        print(f"Total rows read: {len(data)}")
        
        # Check how many rows have activation function data
        activation_count = sum(1 for row in data if row.get('Activation Function'))
        print(f"Rows with activation function: {activation_count}")
        
        return data
        
    except Exception as e:
        print(f"ERROR reading {file_path}: {e}")
        return []

def test_direct_population():
    """Test population directly without API"""
    print("\n=== Testing Direct Database Population ===")
    
    try:
        from app.database import ModelSessionLocal
        from app.models import ModelInfo
        from controllers.model_controller import ModelController
        
        # Read CSV data
        training_csv = "../sample_data/Model_Info_Training.csv"
        inference_csv = "../sample_data/Model_Info_Inference.csv"
        
        training_data = read_csv_with_debug(training_csv)
        inference_data = read_csv_with_debug(inference_csv)
        
        if not training_data and not inference_data:
            print("No data to populate!")
            return
        
        # Combine data
        all_data = training_data + inference_data
        print(f"\nTotal records to populate: {len(all_data)}")
        
        # Test with first record
        test_record = all_data[0] if all_data else None
        if test_record:
            print(f"\nTesting with first record:")
            print(f"Model Name: {test_record.get('Model Name')}")
            print(f"Activation Function: {test_record.get('Activation Function')}")
            print(f"All fields: {test_record.keys()}")
        
        # Create database session
        db = ModelSessionLocal()
        controller = ModelController()
        
        try:
            # Clear existing data first
            print("\nClearing existing models...")
            db.query(ModelInfo).delete()
            db.commit()
            
            # Test population with just first record
            print("\nPopulating with first record only...")
            result = controller.populate_model_database(db, [test_record])
            print(f"Population result: {result}")
            
            # Check what was actually saved
            print("\nChecking saved data...")
            saved_model = db.query(ModelInfo).first()
            if saved_model:
                print(f"Saved model: {saved_model.model_name}")
                print(f"Saved activation function: {saved_model.activation_function}")
                print(f"All saved data: {saved_model.to_dict()}")
            else:
                print("No model was saved!")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"ERROR in direct population test: {e}")
        import traceback
        traceback.print_exc()

def test_api_population():
    """Test population via API endpoint"""
    print("\n=== Testing API Population ===")
    
    try:
        # Read just first record from training CSV
        training_csv = "../sample_data/Model_Info_Training.csv"
        
        with open(training_csv, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            first_row = next(csv_reader)
            
            # Convert empty strings to None
            for key, value in first_row.items():
                if value == '':
                    first_row[key] = None
        
        print(f"Testing API with record: {first_row.get('Model Name')}")
        print(f"Activation Function: {first_row.get('Activation Function')}")
        
        # Test API call
        api_url = "http://localhost:8000"
        response = requests.post(
            f"{api_url}/api/model/populate-database",
            json=[first_row],
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"API Response Status: {response.status_code}")
        print(f"API Response: {response.text}")
        
        if response.status_code == 200:
            print("API population successful!")
        else:
            print("API population failed!")
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to API. Is the server running?")
    except Exception as e:
        print(f"ERROR in API test: {e}")

def main():
    print("=== Debugging Activation Function Population Issue ===")
    
    # Test direct population first
    test_direct_population()
    
    # Test API population
    test_api_population()

if __name__ == "__main__":
    main()