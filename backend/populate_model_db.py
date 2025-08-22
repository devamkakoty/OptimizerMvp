#!/usr/bin/env python3
"""
Script to populate the model database with data from CSV files
"""

import sys
import os
import csv
import requests
import json
from typing import List, Dict, Any

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def read_csv_file(file_path: str) -> List[Dict[str, Any]]:
    """Read CSV file and return list of dictionaries"""
    data = []
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            for row in csv_reader:
                # Convert empty strings to None for numeric fields
                for key, value in row.items():
                    if value == '':
                        row[key] = None
                data.append(row)
        print(f"[SUCCESS] Successfully read {len(data)} records from {file_path}")
        return data
    except Exception as e:
        print(f"[ERROR] Error reading {file_path}: {e}")
        return []

def populate_database(csv_data: List[Dict[str, Any]], api_url: str = "http://localhost:8000") -> bool:
    """Populate database using the API endpoint"""
    try:
        response = requests.post(
            f"{api_url}/api/model/populate-database",
            json=csv_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"[SUCCESS] Database populated successfully: {result.get('message', '')}")
            return True
        else:
            print(f"[ERROR] Failed to populate database: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"[ERROR] Error calling API: {e}")
        return False

def main():
    """Main function to populate database with both CSV files"""
    print("Starting model database population...\n")
    
    # Define CSV file paths
    training_csv = "../sample_data/Model_Info_Training.csv"
    inference_csv = "../sample_data/Model_Info_Inference.csv"
    
    # Check if files exist
    if not os.path.exists(training_csv):
        print(f"[ERROR] Training CSV file not found: {training_csv}")
        return False
    
    if not os.path.exists(inference_csv):
        print(f"[ERROR] Inference CSV file not found: {inference_csv}")
        return False
    
    # Read both CSV files
    print("Reading CSV files...")
    training_data = read_csv_file(training_csv)
    inference_data = read_csv_file(inference_csv)
    
    if not training_data and not inference_data:
        print("[ERROR] No data found in CSV files")
        return False
    
    # Combine data from both files
    all_data = training_data + inference_data
    print(f"\nTotal records to populate: {len(all_data)}")
    print(f"Training records: {len(training_data)}")
    print(f"Inference records: {len(inference_data)}")
    
    # Populate database
    print("\nPopulating database...")
    success = populate_database(all_data)
    
    if success:
        print("\n[SUCCESS] Database population completed successfully!")
        print(f"[SUCCESS] Populated {len(all_data)} model records")
        print("[SUCCESS] Training and inference data loaded")
    else:
        print("\n[ERROR] Database population failed!")
    
    return success

if __name__ == "__main__":
    main() 