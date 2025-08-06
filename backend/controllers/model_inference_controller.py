import os
import pickle
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models import ModelInfo, HardwareInfo
from datetime import datetime
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelInferenceController:
    def __init__(self):
        self.models_path = "Pickel Models/Models"
        self.loaded_models = {}
        self._load_all_models()
    
    def _load_all_models(self):
        """Load all pickled models from the models directory"""
        try:
            if not os.path.exists(self.models_path):
                logger.error(f"Models directory not found: {self.models_path}")
                return
            
            # Load inference simulation model
            inference_model_path = os.path.join(self.models_path, "Inference_simulation_model.pkl")
            if os.path.exists(inference_model_path):
                with open(inference_model_path, 'rb') as f:
                    self.loaded_models['inference_simulation'] = pickle.load(f)
                logger.info("Loaded inference simulation model")
            
            # Load training simulation model
            training_model_path = os.path.join(self.models_path, "Training_Simualtion_Model.pkl")
            if os.path.exists(training_model_path):
                with open(training_model_path, 'rb') as f:
                    self.loaded_models['training_simulation'] = pickle.load(f)
                logger.info("Loaded training simulation model")
            
            # Load optimizer model
            optimizer_model_path = os.path.join(self.models_path, "Optimizer_model.pkl")
            if os.path.exists(optimizer_model_path):
                with open(optimizer_model_path, 'rb') as f:
                    self.loaded_models['optimizer'] = pickle.load(f)
                logger.info("Loaded optimizer model")
            
            # Load post-deployment model
            post_deployment_model_path = os.path.join(self.models_path, "PostDeployement_model.pkl")
            if os.path.exists(post_deployment_model_path):
                with open(post_deployment_model_path, 'rb') as f:
                    self.loaded_models['post_deployment'] = pickle.load(f)
                logger.info("Loaded post-deployment model")
            
            # Load preprocessors
            preprocessor_paths = {
                'inference_preprocessor': 'pipeline_inference_preprocessor_modeloptimizer.pkl',
                'simulation_preprocessor': 'pipeline_inference_preprocessor_simulation.pkl',
                'training_preprocessor': 'pipeline_preprocessor_training.pkl',
                'post_deployment_preprocessor': 'preprocessor_postDeployment.pkl'
            }
            
            for name, filename in preprocessor_paths.items():
                filepath = os.path.join(self.models_path, filename)
                if os.path.exists(filepath):
                    with open(filepath, 'rb') as f:
                        self.loaded_models[name] = pickle.load(f)
                    logger.info(f"Loaded {name}")
            
            # Load label encoders
            label_encoder_paths = {
                'modeloptimizer_method': 'label_encoder_modeloptimizer_method.pkl',
                'modeloptimizer_precision': 'label_encoder_modeloptimizer_precision.pkl',
                'postdeployment': 'label_encoder_postdeployment.pkl'
            }
            
            for name, filename in label_encoder_paths.items():
                filepath = os.path.join(self.models_path, filename)
                if os.path.exists(filepath):
                    with open(filepath, 'rb') as f:
                        self.loaded_models[name] = pickle.load(f)
                    logger.info(f"Loaded {name}")
                    
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
    
    def perform_inference(self, db: Session, model_type: str, task_type: str, 
                         hardware_type: str = None, input_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Perform actual inference using the loaded models
        
        Args:
            db: Database session
            model_type: Type of model (e.g., 'bert', 'llama', 'resnet50')
            task_type: Type of task (e.g., 'inference', 'training')
            hardware_type: Type of hardware (optional)
            input_data: Additional input data for inference
            
        Returns:
            Dictionary containing inference results
        """
        try:
            # Get model info from database
            model_info = self._get_model_info(db, model_type, task_type)
            if not model_info:
                return {"error": f"No model found for type: {model_type} and task: {task_type}"}
            
            # Get hardware info if specified
            hardware_info = None
            if hardware_type:
                hardware_info = self._get_hardware_info(db, hardware_type)
            
            # Prepare input features for the model
            features = self._prepare_inference_features(model_info, hardware_info, input_data)
            
            # Perform inference based on task type
            if task_type.lower() == 'inference':
                results = self._run_inference_simulation(features)
            elif task_type.lower() == 'training':
                results = self._run_training_simulation(features)
            else:
                return {"error": f"Unsupported task type: {task_type}"}
            
            return {
                "status": "success",
                "model_type": model_type,
                "task_type": task_type,
                "hardware_type": hardware_type,
                "results": results,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error performing inference: {str(e)}")
            return {"error": f"Inference failed: {str(e)}"}
    
    def _get_model_info(self, db: Session, model_type: str, task_type: str) -> Optional[ModelInfo]:
        """Get model information from database"""
        try:
            model = db.query(ModelInfo).filter(
                and_(
                    ModelInfo.model_type == model_type,
                    ModelInfo.task_type == task_type
                )
            ).first()
            return model
        except Exception as e:
            logger.error(f"Error getting model info: {str(e)}")
            return None
    
    def _get_hardware_info(self, db: Session, hardware_type: str) -> Optional[HardwareInfo]:
        """Get hardware information from database"""
        try:
            # This is a simplified version - you might want to implement more sophisticated
            # hardware type matching based on your specific requirements
            hardware = db.query(HardwareInfo).filter(
                HardwareInfo.cpu_brand.contains(hardware_type) |
                HardwareInfo.gpu_brand.contains(hardware_type)
            ).first()
            return hardware
        except Exception as e:
            logger.error(f"Error getting hardware info: {str(e)}")
            return None
    
    def _prepare_inference_features(self, model_info: ModelInfo, 
                                  hardware_info: Optional[HardwareInfo], 
                                  input_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Prepare features for model inference"""
        features = {
            'Model': model_info.model_name,
            'Framework': model_info.framework,
            'Task Type': model_info.task_type,
            'Total Parameters (Millions)': model_info.total_parameters_millions or 0,
            'Model Size (MB)': model_info.model_size_mb or 0,
            'Architecture type': model_info.architecture_type or 'Unknown',
            'Model Type': model_info.model_type or 'Unknown',
            'Embedding Vector Dimension (Hidden Size)': model_info.embedding_vector_dimension or 0,
            'Precision': model_info.precision or 'FP32',
            'Vocabulary Size': model_info.vocabulary_size or 0,
            'FFN (MLP) Dimension': model_info.ffn_dimension or 0,
            'Activation Function': model_info.activation_function or 'ReLU',
            'FLOPs': model_info.flops or 0
        }
        
        # Add hardware features if available
        if hardware_info:
            features.update({
                'CPU': hardware_info.cpu_brand or 'Unknown',
                'GPU': hardware_info.gpu_brand or 'Unknown',
                '# of GPU': 1,  # Default value
                'GPU Memory Total - VRAM (MB)': hardware_info.gpu_memory_total_mb or 0,
                'GPU SM Cores': 0,  # Default value
                'GPU CUDA Cores': 0,  # Default value
                'GPU Graphics clock': 0,  # Default value
                'GPU Memory clock': 0,  # Default value
                'CPU Total cores (Including Logical cores)': hardware_info.cpu_total_cores or 0,
                'CPU Base clock(GHz)': hardware_info.cpu_base_clock_ghz or 0,
                'CPU Max Frequency(GHz)': hardware_info.cpu_max_frequency_ghz or 0,
                'CPU Threads per Core': hardware_info.cpu_threads_per_core or 0,
                'L1 Cache': hardware_info.l1_cache or 0
            })
        
        # Add any additional input data
        if input_data:
            features.update(input_data)
        
        return features
    
    def _run_inference_simulation(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Run inference simulation using the loaded model"""
        try:
            if 'inference_simulation' not in self.loaded_models:
                return {"error": "Inference simulation model not loaded"}
            
            # Convert features to DataFrame
            df = pd.DataFrame([features])
            
            # Preprocess features if preprocessor is available
            if 'inference_preprocessor' in self.loaded_models:
                preprocessor = self.loaded_models['inference_preprocessor']
                processed_features = preprocessor.transform(df)
            else:
                processed_features = df.values
            
            # Make prediction
            model = self.loaded_models['inference_simulation']
            predictions = model.predict(processed_features)
            
            # Extract results (assuming the model predicts throughput and latency)
            if len(predictions.shape) > 1 and predictions.shape[1] >= 2:
                throughput = predictions[0][0] if predictions[0][0] > 0 else 0
                latency = predictions[0][1] if predictions[0][1] > 0 else 0
            else:
                # Single prediction - assume it's throughput
                throughput = predictions[0] if predictions[0] > 0 else 0
                latency = 1000 / throughput if throughput > 0 else 0
            
            return {
                "throughput_tokens_per_sec": float(throughput),
                "latency_ms": float(latency)
            }
            
        except Exception as e:
            logger.error(f"Error in inference simulation: {str(e)}")
            return {"error": f"Inference simulation failed: {str(e)}"}
    
    def _run_training_simulation(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Run training simulation using the loaded model"""
        try:
            if 'training_simulation' not in self.loaded_models:
                return {"error": "Training simulation model not loaded"}
            
            # Convert features to DataFrame
            df = pd.DataFrame([features])
            
            # Preprocess features if preprocessor is available
            if 'training_preprocessor' in self.loaded_models:
                preprocessor = self.loaded_models['training_preprocessor']
                processed_features = preprocessor.transform(df)
            else:
                processed_features = df.values
            
            # Make prediction
            model = self.loaded_models['training_simulation']
            predictions = model.predict(processed_features)
            
            # Extract results (assuming the model predicts training time and memory usage)
            if len(predictions.shape) > 1 and predictions.shape[1] >= 2:
                training_time = predictions[0][0] if predictions[0][0] > 0 else 0
                memory_usage = predictions[0][1] if predictions[0][1] > 0 else 0
            else:
                # Single prediction - assume it's training time
                training_time = predictions[0] if predictions[0] > 0 else 0
                memory_usage = features.get('Model Size (MB)', 0) * 2  # Estimate
            
            return {
                "training_time_hours": float(training_time),
                "memory_usage_gb": float(memory_usage)
            }
            
        except Exception as e:
            logger.error(f"Error in training simulation: {str(e)}")
            return {"error": f"Training simulation failed: {str(e)}"}
    
    def get_available_models(self) -> Dict[str, Any]:
        """Get information about available loaded models"""
        return {
            "loaded_models": list(self.loaded_models.keys()),
            "models_path": self.models_path,
            "total_models": len(self.loaded_models)
        }
    
    def reload_models(self) -> Dict[str, Any]:
        """Reload all models from disk"""
        try:
            self.loaded_models.clear()
            self._load_all_models()
            return {
                "status": "success",
                "message": "Models reloaded successfully",
                "loaded_models": list(self.loaded_models.keys())
            }
        except Exception as e:
            return {"error": f"Failed to reload models: {str(e)}"}
    
    def get_optimization_recommendation(self, db: Session, optimizer_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get model optimization recommendations for method and precision
        
        Args:
            db: Database session
            optimizer_input: Dictionary containing model parameters for optimization
            
        Returns:
            Dictionary containing recommended method and precision
        """
        try:
            # Check if optimizer model is loaded
            if 'optimizer' not in self.loaded_models:
                return {"error": "Optimizer model not loaded"}
            
            # Convert input to DataFrame
            df = pd.DataFrame([optimizer_input])
            
            # Preprocess features if preprocessor is available
            if 'inference_preprocessor' in self.loaded_models:
                preprocessor = self.loaded_models['inference_preprocessor']
                processed_features = preprocessor.transform(df)
            else:
                processed_features = df.values
            
            # Make prediction using optimizer model
            model = self.loaded_models['optimizer']
            predictions = model.predict(processed_features)
            
            # Get predicted method and precision
            if len(predictions.shape) > 1 and predictions.shape[1] >= 2:
                method_prediction = predictions[0][0]
                precision_prediction = predictions[0][1]
            else:
                # Single prediction - assume it's method
                method_prediction = predictions[0]
                precision_prediction = 0.5  # Default precision value
            
            # Convert method prediction to string using label encoder if available
            recommended_method = str(method_prediction)
            if 'modeloptimizer_method' in self.loaded_models:
                try:
                    label_encoder = self.loaded_models['modeloptimizer_method']
                    # Inverse transform to get the actual method name
                    method_names = label_encoder.inverse_transform([int(method_prediction)])
                    recommended_method = method_names[0] if len(method_names) > 0 else str(method_prediction)
                except Exception as e:
                    logger.warning(f"Could not decode method prediction: {str(e)}")
                    recommended_method = str(method_prediction)
            
            # Convert precision prediction to double value
            recommended_precision = float(precision_prediction)
            
            return {
                "status": "success",
                "recommended_method": recommended_method,
                "recommended_precision": recommended_precision
            }
            
        except Exception as e:
            logger.error(f"Error in optimization recommendation: {str(e)}")
            return {"error": f"Optimization recommendation failed: {str(e)}"} 