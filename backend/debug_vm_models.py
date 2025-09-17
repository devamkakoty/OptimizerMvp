"""
Debug script to test VM-level model loading and prediction
Run this to see if VM-level models work correctly
"""

import sys
import os
sys.path.append('.')

from controllers.model_inference_controller import ModelInferenceController
import pandas as pd

def test_vm_models_in_controller():
    """Test if VM-level models are loaded and working in the controller"""
    print("=== Testing VM-Level Models in Controller ===\n")
    
    # Initialize controller (same as in the API)
    controller = ModelInferenceController()
    
    # Check if VM-level models are loaded
    print("Checking loaded models:")
    for key, model in controller.loaded_models.items():
        if 'vm_level' in key:
            print(f"SUCCESS {key}: {type(model)}")
    
    print(f"\nTotal models loaded: {len(controller.loaded_models)}")
    
    # Check specific VM-level models
    vm_models = [
        'post_deployment_vm_level',
        'post_deployment_preprocessor_vm_level', 
        'post_deployment_label_encoder_vm_level'
    ]
    
    missing_models = []
    for model_key in vm_models:
        if model_key not in controller.loaded_models:
            missing_models.append(model_key)
            print(f"ERROR MISSING: {model_key}")
        else:
            print(f"SUCCESS LOADED: {model_key}")
    
    if missing_models:
        print(f"\nERROR: VM-level models are missing: {missing_models}")
        print("This explains why you're getting bare-metal responses!")
        return False
    
    print("\nSUCCESS: All VM-level models are loaded")
    
    # Test VM-level preprocessing and prediction
    print("\n=== Testing VM-Level Prediction ===")
    
    test_input = {
        'deployment_type': 'vm-level',
        'gpu_utilization': 44,
        'gpu_memory_usage': 22,
        'current_hardware_id': 'A100'
    }
    
    try:
        # Simulate the filtering logic
        vm_required_features = ['gpu_utilization', 'gpu_memory_usage', 'current_hardware_id']
        filtered_data = {}
        for feature in vm_required_features:
            if feature in test_input:
                filtered_data[feature] = test_input[feature]
        
        df = pd.DataFrame([filtered_data])
        print(f"Filtered input: {filtered_data}")
        
        # Test preprocessing
        preprocessor = controller.loaded_models['post_deployment_preprocessor_vm_level']
        processed_features = preprocessor.transform(df)
        print(f"SUCCESS: Preprocessing successful: {processed_features.shape}")
        
        # Test prediction
        model = controller.loaded_models['post_deployment_vm_level']
        predictions = model.predict(processed_features)
        print(f"SUCCESS: Model prediction: {predictions}")
        
        # Test label decoding
        label_encoder = controller.loaded_models['post_deployment_label_encoder_vm_level']
        decoded = label_encoder.inverse_transform(predictions)
        print(f"SUCCESS: Decoded prediction: {decoded[0]}")
        
        print(f"\nSUCCESS: VM-level models work correctly!")
        print(f"The issue must be in the API request handling or error catching.")
        
    except Exception as e:
        print(f"ERROR: VM-level models failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = test_vm_models_in_controller()
    if success:
        print("\nSUCCESS: VM-level models are working. The issue is likely in the API flow.")
    else:
        print("\nERROR: VM-level models have issues that need to be fixed.")