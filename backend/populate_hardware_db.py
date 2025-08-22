#!/usr/bin/env python3
"""
Populate hardware database with data from Available_HardwareHPE.csv
"""

import csv
import requests
import json
from typing import List, Dict, Any

def read_hardware_csv(file_path: str) -> List[Dict[str, Any]]:
    """Read hardware CSV file and return list of dictionaries"""
    data = []
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            for row in csv_reader:
                # Convert empty strings to None for numeric fields
                for key, value in row.items():
                    if value == '':
                        row[key] = None
                    elif value and key != 'CPU' and key != 'GPU':  # Try to convert numeric fields
                        try:
                            # Try to convert to float first, then int if it's a whole number
                            float_val = float(value)
                            if float_val.is_integer():
                                row[key] = int(float_val)
                            else:
                                row[key] = float_val
                        except ValueError:
                            # Keep as string if not numeric
                            pass
                data.append(row)
        print(f"[SUCCESS] Successfully read {len(data)} hardware records from {file_path}")
        return data
    except Exception as e:
        print(f"[ERROR] Error reading {file_path}: {e}")
        return []

def populate_hardware_database(csv_data: List[Dict[str, Any]], api_url: str = "http://localhost:8000") -> bool:
    """Populate hardware database using the API endpoint"""
    try:
        response = requests.post(
            f"{api_url}/api/hardware/populate-database",
            json=csv_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"[SUCCESS] Hardware database populated successfully: {result.get('message', '')}")
            return True
        else:
            print(f"[ERROR] Failed to populate hardware database: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"[ERROR] Error calling hardware API: {e}")
        return False

def main():
    """Main function to populate hardware database"""
    print("Starting hardware database population...\n")
    
    # Define CSV file path
    hardware_csv = "../sample_data/Available_HardwareHPE.csv"
    
    # Read CSV file
    print("Reading hardware CSV file...")
    hardware_data = read_hardware_csv(hardware_csv)
    
    if not hardware_data:
        print("[ERROR] No hardware data found in CSV file")
        return False
    
    print(f"\nTotal hardware records to populate: {len(hardware_data)}")
    
    # Show first record for verification
    if hardware_data:
        print("\nFirst record preview:")
        print(json.dumps(hardware_data[0], indent=2))
    
    # Populate database
    print("\nPopulating hardware database...")
    success = populate_hardware_database(hardware_data)
    
    if success:
        print("\n[SUCCESS] Hardware database population completed successfully!")
        print(f"[SUCCESS] Populated {len(hardware_data)} hardware configurations")
    else:
        print("\n[ERROR] Hardware database population failed!")
    
    return success

if __name__ == "__main__":
    main()