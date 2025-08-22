#!/usr/bin/env python3
"""
Check database contents via API to see if activation function is populated
"""

import requests
import json

def check_model_data_via_api():
    """Check what model data is actually in the database via API"""
    print("=== Checking Database Contents via API ===")
    
    api_url = "http://localhost:8000"
    
    try:
        # Try to get model data for a specific model type and task type
        test_request = {
            "model_type": "llama",  # Based on CSV data we saw
            "task_type": "Training"  # or "Inference"
        }
        
        print(f"Requesting model data for: {test_request}")
        
        response = requests.post(
            f"{api_url}/api/model/get-model-data",
            json=test_request,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"API Response: {json.dumps(data, indent=2)}")
            
            # Check if activation function is in the response
            model_data = data.get('model_data', {})
            activation_function = model_data.get('activation_function')
            
            print(f"\nActivation function in response: {activation_function}")
            
            if activation_function:
                print("SUCCESS: Activation function is populated in database!")
            else:
                print("ISSUE: Activation function is NULL or missing!")
                print("All model data fields:")
                for key, value in model_data.items():
                    print(f"  {key}: {value}")
                    
        else:
            print(f"API Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to API. Is the server running on port 8000?")
    except Exception as e:
        print(f"ERROR: {e}")

def clear_and_repopulate():
    """Clear database and repopulate with CSV data"""
    print("\n=== Clearing and Repopulating Database ===")
    
    api_url = "http://localhost:8000"
    
    try:
        # First, clear the database
        print("Clearing database...")
        response = requests.post(f"{api_url}/api/model/clear-database")
        print(f"Clear response: {response.status_code} - {response.text}")
        
        # Read CSV data
        import csv
        
        training_csv = "../sample_data/Model_Info_Training.csv"
        all_data = []
        
        with open(training_csv, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            for row in csv_reader:
                # Convert empty strings to None
                for key, value in row.items():
                    if value == '':
                        row[key] = None
                all_data.append(row)
                break  # Just take first row for testing
        
        print(f"Repopulating with 1 test record...")
        print(f"Test record activation function: {all_data[0].get('Activation Function')}")
        
        response = requests.post(
            f"{api_url}/api/model/populate-database",
            json=all_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Populate response: {response.status_code} - {response.text}")
        
        # Now check again
        print("\nChecking after repopulation...")
        check_model_data_via_api()
        
    except Exception as e:
        print(f"ERROR in repopulation: {e}")

def main():
    # First check current state
    check_model_data_via_api()
    
    # If activation function is missing, try clearing and repopulating
    user_input = input("\nWould you like to clear and repopulate the database? (y/n): ")
    if user_input.lower() == 'y':
        clear_and_repopulate()

if __name__ == "__main__":
    main()