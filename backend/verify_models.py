#!/usr/bin/env python3
"""
Script to verify that the pickled models can be loaded correctly
"""

import os
import sys
import pickle
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_models_directory():
    """Verify that the models directory exists and contains expected files"""
    models_path = "Pickel Models/Models"
    
    print(f"Checking models directory: {models_path}")
    
    if not os.path.exists(models_path):
        print(f"❌ Models directory not found: {models_path}")
        return False
    
    print(f"✅ Models directory exists: {models_path}")
    
    # List all files in the directory
    files = os.listdir(models_path)
    print(f"📁 Files in directory: {files}")
    
    return True

def verify_model_file(filepath):
    """Verify that a specific model file can be loaded"""
    try:
        print(f"🔍 Testing model file: {filepath}")
        
        if not os.path.exists(filepath):
            print(f"❌ File not found: {filepath}")
            return False
        
        # Try to load the model
        with open(filepath, 'rb') as f:
            model = pickle.load(f)
        
        print(f"✅ Successfully loaded: {filepath}")
        print(f"   Model type: {type(model)}")
        
        # Try to get model attributes if available
        if hasattr(model, 'predict'):
            print(f"   Has predict method: ✅")
        if hasattr(model, 'fit'):
            print(f"   Has fit method: ✅")
        if hasattr(model, 'transform'):
            print(f"   Has transform method: ✅")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to load {filepath}: {str(e)}")
        return False

def main():
    """Main verification function"""
    print("🔍 Model Verification Script")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists("Pickel Models"):
        print("❌ 'Pickel Models' directory not found in current directory")
        print("   Please run this script from the backend directory")
        return False
    
    # Verify models directory
    if not verify_models_directory():
        return False
    
    models_path = "Pickel Models/Models"
    
    # List of expected model files
    expected_models = [
        "Inference_simulation_model.pkl",
        "Training_Simualtion_Model.pkl",
        "Optimizer_model.pkl",
        "PostDeployement_model.pkl",
        "pipeline_inference_preprocessor_modeloptimizer.pkl",
        "pipeline_inference_preprocessor_simulation.pkl",
        "pipeline_preprocessor_training.pkl",
        "preprocessor_postDeployment.pkl",
        "label_encoder_modeloptimizer_method.pkl",
        "label_encoder_modeloptimizer_precision.pkl",
        "label_encoder_postdeployment.pkl"
    ]
    
    print(f"\n🔍 Testing {len(expected_models)} model files...")
    
    success_count = 0
    total_count = len(expected_models)
    
    for model_file in expected_models:
        filepath = os.path.join(models_path, model_file)
        if verify_model_file(filepath):
            success_count += 1
        print()  # Empty line for readability
    
    print("=" * 50)
    print(f"📊 Verification Results: {success_count}/{total_count} models loaded successfully")
    
    if success_count == total_count:
        print("🎉 All models verified successfully!")
        return True
    else:
        print("⚠️  Some models failed to load. Check the errors above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 