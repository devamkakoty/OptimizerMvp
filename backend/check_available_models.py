#!/usr/bin/env python3
"""
Check what model types and task types are available via API
"""

import requests

def check_available_model_types():
    """Check available model types via API"""
    print("=== Checking Available Model Types ===")
    
    api_url = "http://localhost:8000"
    
    try:
        response = requests.get(f"{api_url}/api/model/types")
        print(f"Model types response: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Available model types: {data}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Error checking model types: {e}")

def check_available_task_types():
    """Check available task types via API"""
    print("\n=== Checking Available Task Types ===")
    
    api_url = "http://localhost:8000"
    
    try:
        response = requests.get(f"{api_url}/api/model/task-types")
        print(f"Task types response: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Available task types: {data}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Error checking task types: {e}")

def test_specific_model():
    """Test with specific known model from CSV"""
    print("\n=== Testing Specific Model ===")
    
    api_url = "http://localhost:8000"
    
    # Try different combinations
    test_cases = [
        {"model_type": "llama", "task_type": "Training"},
        {"model_type": "llama", "task_type": "Inference"}, 
        {"model_type": "qwen2", "task_type": "Training"},
        {"model_type": "phi3", "task_type": "Training"}
    ]
    
    for test_case in test_cases:
        try:
            print(f"\nTesting: {test_case}")
            response = requests.post(
                f"{api_url}/api/model/get-model-data",
                json=test_case,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                model_data = data.get('model_data', {})
                activation_func = model_data.get('activation_function')
                model_name = model_data.get('model_name')
                print(f"  SUCCESS: {model_name} - Activation: {activation_func}")
                
                if activation_func:
                    print(f"  FOUND ACTIVATION FUNCTION: {activation_func}")
                    return  # Found one with activation function
                    
            else:
                print(f"  No model found: {response.text}")
                
        except Exception as e:
            print(f"  Error: {e}")

if __name__ == "__main__":
    check_available_model_types()
    check_available_task_types()
    test_specific_model()