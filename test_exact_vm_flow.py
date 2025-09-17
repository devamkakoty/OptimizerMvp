"""
Test the EXACT VM-level flow with the EXACT input from API
"""
import pickle
import pandas as pd
import numpy as np
import os
import sys
sys.path.append('backend')

def test_exact_vm_level_flow():
    """Test exactly what should happen with your API input"""
    print("=== Testing EXACT VM-Level Flow ===\n")
    
    # Load VM-level models (exactly as in controller)
    models_path = "Pickel Models"
    
    try:
        with open(os.path.join(models_path, "PostDeployement_model_vm_level.pkl"), 'rb') as f:
            vm_model = pickle.load(f)
        with open(os.path.join(models_path, "preprocessor_postDeployment_vm_level.pkl"), 'rb') as f:
            vm_preprocessor = pickle.load(f)
        with open(os.path.join(models_path, "label_encoder_postdeployment_vm_level.pkl"), 'rb') as f:
            vm_label_encoder = pickle.load(f)
        print("SUCCESS: All VM-level models loaded")
    except Exception as e:
        print(f"ERROR: Failed to load models: {e}")
        return
    
    # EXACT input from your API request (your console output)
    exact_api_input = {
        'Activation Function': 'silu',
        'Architecture type': 'efficientnet_b0', 
        'Framework': 'PyTorch',
        'Model Name': 'EFFICIENTNET-B0',
        'Model Size (MB)': 20.17,
        'Model Type': 'efficientnet_b0',
        'Precision': 'FP32',
        'Total Parameters (Millions)': 5.29,
        'Vocabulary Size': 1000,
        'cpu_memory_usage': 1.29,
        'cpu_utilization': 22,
        'current_hardware_id': 'A100 + Intel(R) Xeon',
        'deployment_type': 'vm-level',
        'disk_iops': 1625.6,
        'gpu_memory_usage': 22,
        'gpu_utilization': 44,
        'network_bandwidth': 5,
        'vm_gpu_count': 0,
        'vm_name': 'greenmatrix-vm2-Linux',
        'vm_ram_usage_percent': 3.200000047683716,
        'vm_total_ram_gb': '31.3GB',
        'vm_total_vram_gb': 'No GPU',
        'vm_vram_usage_percent': 0
    }
    
    print(f"Input deployment_type: {exact_api_input['deployment_type']}")
    print(f"Input has {len(exact_api_input)} fields")
    
    # Step 1: Test what VM preprocessor expects
    print("\n=== Step 1: VM Preprocessor Analysis ===")
    expected_features = vm_preprocessor.feature_names_in_
    print(f"VM preprocessor expects: {list(expected_features)}")
    
    # Step 2: Filter to only required features (like in my updated controller)
    print("\n=== Step 2: Filter to Required Features ===")
    vm_required_features = ['gpu_utilization', 'gpu_memory_usage', 'current_hardware_id']
    filtered_data = {}
    for feature in vm_required_features:
        if feature in exact_api_input:
            filtered_data[feature] = exact_api_input[feature]
            print(f"  {feature}: {exact_api_input[feature]}")
        else:
            print(f"  ERROR: {feature} NOT FOUND in input")
    
    # Step 3: Test preprocessing with filtered data
    print("\n=== Step 3: VM Preprocessing ===")
    df = pd.DataFrame([filtered_data])
    print(f"Filtered DataFrame: {df}")
    
    try:
        processed_features = vm_preprocessor.transform(df)
        print(f"SUCCESS: Preprocessing output shape: {processed_features.shape}")
        print(f"Processed values: {processed_features[0]}")
    except Exception as e:
        print(f"ERROR: Preprocessing failed: {e}")
        return
    
    # Step 4: VM Model prediction
    print("\n=== Step 4: VM Model Prediction ===")
    try:
        predictions = vm_model.predict(processed_features)
        print(f"Raw prediction: {predictions}")
        print(f"Prediction shape: {predictions.shape}")
        print(f"Prediction type: {type(predictions)}")
    except Exception as e:
        print(f"ERROR: Model prediction failed: {e}")
        return
    
    # Step 5: Label decoding
    print("\n=== Step 5: Label Decoding ===")
    try:
        prediction_value = int(predictions[0])
        decoded_prediction = vm_label_encoder.inverse_transform([prediction_value])
        print(f"Prediction value: {prediction_value}")
        print(f"Decoded prediction: {decoded_prediction[0]}")
        print(f"Available classes: {vm_label_encoder.classes_}")
    except Exception as e:
        print(f"ERROR: Label decoding failed: {e}")
        return
    
    # Step 6: Test VM-level optimizer (if exists)
    print("\n=== Step 6: VM-Level Optimizer Test ===")
    try:
        from controllers.vm_level_optimizer import VMLevelOptimizer
        
        vm_optimizer = VMLevelOptimizer()
        print("SUCCESS: VMLevelOptimizer loaded")
        
        # Test the comprehensive analysis
        vm_analysis = vm_optimizer.generate_comprehensive_vm_analysis(
            exact_api_input, decoded_prediction[0], 0.8
        )
        
        print(f"VM Analysis status: {vm_analysis.get('status', 'NO_STATUS')}")
        print(f"VM Analysis type: {vm_analysis.get('analysis_type', 'NO_TYPE')}")
        if vm_analysis.get('status') == 'success':
            recommendation = vm_analysis.get('recommendation', {})
            print(f"Primary recommendation: {recommendation.get('primary_recommendation', 'NO_RECOMMENDATION')}")
            print(f"Recommendation type: {recommendation.get('recommendation_type', 'NO_TYPE')}")
            print("SUCCESS: VM-level comprehensive analysis works!")
        else:
            print(f"ERROR: VM analysis failed: {vm_analysis.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"ERROR: VM-level optimizer failed: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_exact_vm_level_flow()