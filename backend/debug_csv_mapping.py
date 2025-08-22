#!/usr/bin/env python3
"""
Debug script to check CSV field mapping
"""

import csv
from pathlib import Path

def check_csv_headers_and_data():
    """Check CSV headers and first few rows to debug field mapping"""
    training_csv = "../sample_data/Model_Info_Training.csv"
    inference_csv = "../sample_data/Model_Info_Inference.csv"
    
    for csv_file in [training_csv, inference_csv]:
        print(f"\n=== Checking {csv_file} ===")
        
        if not Path(csv_file).exists():
            print(f"File not found: {csv_file}")
            continue
            
        with open(csv_file, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            headers = csv_reader.fieldnames
            print(f"Headers: {headers}")
            
            # Check if 'Activation Function' header exists
            if 'Activation Function' in headers:
                print("SUCCESS: 'Activation Function' header found")
            else:
                print("ERROR: 'Activation Function' header NOT found")
                print("Available headers:", [h for h in headers if 'activation' in h.lower() or 'function' in h.lower()])
            
            # Read first 3 rows to check activation function values
            print("\nFirst 3 rows - Activation Function values:")
            count = 0
            for row in csv_reader:
                if count >= 3:
                    break
                activation_func = row.get('Activation Function', 'NOT_FOUND')
                print(f"Row {count + 1}: Model='{row.get('Model Name', 'N/A')}', Activation Function='{activation_func}'")
                count += 1

if __name__ == "__main__":
    check_csv_headers_and_data()