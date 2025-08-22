#!/usr/bin/env python3
"""
Check if activation function data exists in the database
"""

import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import ModelSessionLocal
from app.models import ModelInfo

def check_activation_function_in_db():
    """Check if activation function data exists in the database"""
    db = ModelSessionLocal()
    
    try:
        # Get total count of models
        total_models = db.query(ModelInfo).count()
        print(f"Total models in database: {total_models}")
        
        if total_models == 0:
            print("No models found in database. Database needs to be populated.")
            return
        
        # Check how many models have activation_function set
        models_with_activation = db.query(ModelInfo).filter(
            ModelInfo.activation_function.isnot(None)
        ).count()
        
        models_without_activation = total_models - models_with_activation
        
        print(f"Models with activation_function: {models_with_activation}")
        print(f"Models without activation_function: {models_without_activation}")
        
        # Show first 5 models and their activation function values
        print("\nFirst 5 models and their activation function values:")
        models = db.query(ModelInfo).limit(5).all()
        
        for i, model in enumerate(models, 1):
            activation_func = model.activation_function or "NULL"
            print(f"{i}. {model.model_name} ({model.task_type}): {activation_func}")
        
        # Show unique activation function values in database
        from sqlalchemy import distinct
        unique_activations = db.query(distinct(ModelInfo.activation_function)).filter(
            ModelInfo.activation_function.isnot(None)
        ).all()
        
        print(f"\nUnique activation functions in database: {[a[0] for a in unique_activations]}")
        
    except Exception as e:
        print(f"Error checking database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_activation_function_in_db()