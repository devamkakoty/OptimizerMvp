#!/usr/bin/env python3
"""
Test the simulate-performance API endpoint
"""

import requests
import json

def test_simulate_api():
    """Test the simulate-performance API with known good data"""
    api_url = "http://localhost:8000"
    
    # Test with the exact same data that was failing
    test_payload = {
        "Model": "LLaMA 2 13B",
        "Framework": "PyTorch",
        "Task_Type": "Training",
        "Total_Parameters_Millions": 13015.86,
        "Model_Size_MB": 49651.75,
        "Architecture_type": "LlamaForCausalLM",
        "Model_Type": "llama",
        "Embedding_Vector_Dimension": 5120,  # Use the actual value from CSV
        "Precision": "FP16",  # Use the actual precision from CSV
        "Vocabulary_Size": 32000,
        "FFN_Dimension": 13824,  # Use the actual FFN dimension from CSV
        "Activation_Function": "silu",
        "FLOPs": 442.3824  # Use the actual FLOPs from training CSV
    }
    
    print("Testing simulate-performance API...")
    print(f"Payload: {json.dumps(test_payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{api_url}/api/model/simulate-performance",
            json=test_payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            print("SUCCESS!")
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
        else:
            print("FAILED!")
            print(f"Error: {response.text}")
            
            # Try to parse error details
            try:
                error_data = response.json()
                print(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                pass
                
    except Exception as e:
        print(f"Exception: {e}")

def test_with_minimal_payload():
    """Test with minimal required fields only"""
    api_url = "http://localhost:8000"
    
    minimal_payload = {
        "Model": "LLaMA 2 13B",
        "Framework": "PyTorch", 
        "Task_Type": "Training",
        "Total_Parameters_Millions": 13015.86,
        "Model_Size_MB": 49651.75,
        "Architecture_type": "LlamaForCausalLM",
        "Model_Type": "llama",
        "Embedding_Vector_Dimension": 5120,
        "Precision": "FP16",
        "Vocabulary_Size": 32000,
        "FFN_Dimension": 13824,
        "Activation_Function": "silu",
        "FLOPs": 442.3824
    }
    
    print("\n" + "="*50)
    print("Testing with minimal payload...")
    print(f"Payload: {json.dumps(minimal_payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{api_url}/api/model/simulate-performance",
            json=minimal_payload
        )
        
        print(f"Response Status: {response.status_code}")
        print(f"Response: {response.text}")
        
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_simulate_api()
    test_with_minimal_payload()