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
from controllers.hardware_info_controller import HardwareInfoController

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelInferenceController:
    def __init__(self):
        # Check for models in container path first, then fallback to relative path
        if os.path.exists("/app/models"):
            self.models_path = "/app/models/"
        elif os.path.exists("../Pickel Models/"):
            self.models_path = "../Pickel Models/"
        elif os.path.exists("../Pickel Models"):
            self.models_path = "../Pickel Models/"
        elif os.path.exists("./Pickel Models"):
            self.models_path = "./Pickel Models/"
        elif os.path.exists("./models"):
            self.models_path = "./models/"
        else:
            # Try absolute path for Windows
            abs_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Pickel Models")
            if os.path.exists(abs_path):
                self.models_path = abs_path + "/"
            else:
                self.models_path = "../Pickel Models/"
        
        logger.info(f"Using models path: {self.models_path}")
        logger.info(f"Models path exists: {os.path.exists(self.models_path)}")
        self.loaded_models = {}
        self._load_all_models()
    
    def _load_all_models(self):
        """Load all pickled models from the models directory"""
        try:
            if not os.path.exists(self.models_path):
                logger.error(f"Models directory not found: {self.models_path}")
                return
            
            # Load 3 separate inference simulation models (NEW APPROACH)
            inference_latency_path = os.path.join(self.models_path, "Inference_simulation_latency.pkl")
            if os.path.exists(inference_latency_path):
                with open(inference_latency_path, 'rb') as f:
                    self.loaded_models['inference_simulation_latency'] = pickle.load(f)
                logger.info("Loaded inference simulation latency model")

            inference_throughput_path = os.path.join(self.models_path, "Inference_simulation_throughput.pkl")
            if os.path.exists(inference_throughput_path):
                with open(inference_throughput_path, 'rb') as f:
                    self.loaded_models['inference_simulation_throughput'] = pickle.load(f)
                logger.info("Loaded inference simulation throughput model")

            inference_requests_path = os.path.join(self.models_path, "Inference_simulation_requests.pkl")
            if os.path.exists(inference_requests_path):
                with open(inference_requests_path, 'rb') as f:
                    self.loaded_models['inference_simulation_requests'] = pickle.load(f)
                logger.info("Loaded inference simulation requests model")
            
            # Load 2 separate training simulation models (NEW APPROACH)
            training_latency_path = os.path.join(self.models_path, "Training_simulation_latency.pkl")
            if os.path.exists(training_latency_path):
                with open(training_latency_path, 'rb') as f:
                    self.loaded_models['training_simulation_latency'] = pickle.load(f)
                logger.info("Loaded training simulation latency model")

            training_throughput_path = os.path.join(self.models_path, "Training_simulation_throughput.pkl")
            if os.path.exists(training_throughput_path):
                with open(training_throughput_path, 'rb') as f:
                    self.loaded_models['training_simulation_throughput'] = pickle.load(f)
                logger.info("Loaded training simulation throughput model")
            
            # Load optimizer model
            optimizer_model_path = os.path.join(self.models_path, "Optimizer_model.pkl")
            if os.path.exists(optimizer_model_path):
                with open(optimizer_model_path, 'rb') as f:
                    self.loaded_models['optimizer'] = pickle.load(f)
                logger.info("Loaded optimizer model")
            
            # Load post-deployment bare metal model
            post_deployment_model_path = os.path.join(self.models_path, "PostDeployment_model_baremetal.pkl")
            if os.path.exists(post_deployment_model_path):
                with open(post_deployment_model_path, 'rb') as f:
                    self.loaded_models['post_deployment'] = pickle.load(f)
                logger.info("Loaded post-deployment bare metal model")
            
            # Load post-deployment bare metal label encoder
            post_deployment_label_encoder_path = os.path.join(self.models_path, "label_encoder_postdeployment_baremetal.pkl")
            if os.path.exists(post_deployment_label_encoder_path):
                with open(post_deployment_label_encoder_path, 'rb') as f:
                    self.loaded_models['post_deployment_label_encoder'] = pickle.load(f)
                logger.info("Loaded post-deployment bare metal label encoder")
            
            # Load post-deployment VM-level model
            post_deployment_vm_model_path = os.path.join(self.models_path, "PostDeployement_model_vm_level.pkl")
            if os.path.exists(post_deployment_vm_model_path):
                with open(post_deployment_vm_model_path, 'rb') as f:
                    self.loaded_models['post_deployment_vm_level'] = pickle.load(f)
                logger.info("Loaded post-deployment VM-level model")
            
            # Load post-deployment VM-level label encoder
            post_deployment_vm_label_encoder_path = os.path.join(self.models_path, "label_encoder_postdeployment_vm_level.pkl")
            if os.path.exists(post_deployment_vm_label_encoder_path):
                with open(post_deployment_vm_label_encoder_path, 'rb') as f:
                    self.loaded_models['post_deployment_label_encoder_vm_level'] = pickle.load(f)
                logger.info("Loaded post-deployment VM-level label encoder")
            
            # Load preprocessors
            preprocessor_paths = {
                'inference_preprocessor': 'pipeline_inference_preprocessor_modeloptimizer.pkl',
                'simulation_inference_preprocessor': 'pipeline_inference_preprocessor_simulation.pkl',
                'simulation_training_preprocessor': 'pipeline_training_preprocessor_simulation.pkl',
                'training_preprocessor': 'pipeline_preprocessor_training.pkl',
                'post_deployment_preprocessor': 'preprocessor_postdeployment_baremetal.pkl',
                'post_deployment_preprocessor_vm_level': 'preprocessor_postDeployment_vm_level.pkl'
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
                         hardware_info: HardwareInfo = None, input_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Perform actual inference using the loaded models
        
        Args:
            db: Database session (can be None if using input_data directly)
            model_type: Type of model (can be None if using input_data directly)
            task_type: Type of task (e.g., 'inference', 'training')
            hardware_info: Hardware information object (optional)
            input_data: Complete input data for inference (contains all model + hardware info)
            
        Returns:
            Dictionary containing inference results
        """
        try:
            # Use input_data directly (it contains all model + hardware info from UI)
            logger.info("InputData: ", input_data)
            if not input_data:
                return {"error": "No input data provided for simulation"}
            
            logger.info(f"Running {task_type} simulation with input data keys: {list(input_data.keys())}")
            
            # Perform inference based on task type using input_data directly
            # No database lookup needed - all data comes from input_data
            if task_type.lower() == 'inference':
                results = self._run_inference_simulation(input_data)
            elif task_type.lower() == 'training':
                results = self._run_training_simulation(input_data)
            else:
                return {"error": f"Unsupported task type: {task_type}"}
            
            return results
            
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
                HardwareInfo.cpu.contains(hardware_type) |
                HardwareInfo.gpu.contains(hardware_type)
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
            'Total Parameters (Millions)': model_info.total_parameters_millions,
            'Model Size (MB)': model_info.model_size_mb,
            'Architecture type': model_info.architecture_type,
            'Model Type': model_info.model_type,
            'Embedding Vector Dimension (Hidden Size)': model_info.embedding_vector_dimension,
            'Precision': model_info.precision,
            'Vocabulary Size': model_info.vocabulary_size,
            'FFN (MLP) Dimension': model_info.ffn_dimension,
            'Activation Function': model_info.activation_function,
            'FLOPs': model_info.flops
        }
        
        # Add hardware features if available
        if hardware_info:
            features.update({
                'CPU': hardware_info.cpu,
                'GPU': hardware_info.gpu,
                '# of GPU': hardware_info.num_gpu,
                'GPU Memory Total - VRAM (MB)': hardware_info.gpu_memory_total_vram_mb,
                'GPU Graphics clock': hardware_info.gpu_graphics_clock,
                'GPU Memory clock': hardware_info.gpu_memory_clock,
                'GPU SM Cores': hardware_info.gpu_sm_cores,
                'GPU CUDA Cores': hardware_info.gpu_cuda_cores,
                'CPU Total cores (Including Logical cores)': hardware_info.cpu_total_cores,
                'CPU Threads per Core': hardware_info.cpu_threads_per_core,
                'CPU Base clock(GHz)': hardware_info.cpu_base_clock_ghz,
                'CPU Max Frequency(GHz)': hardware_info.cpu_max_frequency_ghz,
                'L1 Cache': hardware_info.l1_cache
            })
        
        # Add any additional input data
        if input_data:
            features.update(input_data)
        
        # Debug logging
        logger.info(f"Prepared features for hardware {hardware_info.gpu if hardware_info else 'None'}: {features}")
        
        return features
    
    def _run_inference_simulation(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Run inference simulation using 3 separate PKL models for latency, throughput, and requests"""
        try:
            # Check if all 3 inference models are loaded
            required_models = ['inference_simulation_latency', 'inference_simulation_throughput', 'inference_simulation_requests']
            for model_name in required_models:
                if model_name not in self.loaded_models:
                    return {"error": f"{model_name} model not loaded"}

            if 'simulation_inference_preprocessor' not in self.loaded_models:
                return {"error": "Simulation inference preprocessor not loaded"}

            # Convert input_data to DataFrame (it already contains model + hardware data combined)
            # This matches your sample: user_input_pre_df = pd.DataFrame(user_input_pre, index=[0])
            df = pd.DataFrame([input_data])

            logger.info(f"Input dataframe shape: {df.shape}")
            logger.info(f"Input dataframe columns: {list(df.columns)}")

            # DEBUG: Log all field values to identify None values
            logger.info("="*80)
            logger.info("DEBUG: Checking for None/NaN values in input data:")
            for col in df.columns:
                value = df[col].iloc[0]
                if pd.isna(value) or value is None:
                    logger.error(f"  NONE/NaN FOUND -> {col}: {value}")
                else:
                    logger.info(f"  OK -> {col}: {value} (type: {type(value).__name__})")
            logger.info("="*80)

            # Apply preprocessing pipeline (matches your sample: pipeline.transform(user_input_pre_df))
            try:
                preprocessor = self.loaded_models['simulation_inference_preprocessor']

                # Check if preprocessor has expected feature names
                if hasattr(preprocessor, 'feature_names_in_'):
                    expected_cols = set(preprocessor.feature_names_in_)
                    provided_cols = set(df.columns)
                    missing = expected_cols - provided_cols
                    extra = provided_cols - expected_cols

                    if missing:
                        logger.error(f"MISSING COLUMNS: {missing}")
                    if extra:
                        logger.warning(f"EXTRA COLUMNS: {extra}")

                processed_features = preprocessor.transform(df)
                logger.info(f"Processed features shape: {processed_features.shape}")
            except Exception as prep_error:
                logger.error(f"Simulation inference preprocessor failed: {prep_error}")
                logger.error(f"Input data keys: {list(input_data.keys())}")
                logger.error(f"Input data values: {input_data}")
                return {"error": f"Simulation inference preprocessor failed: {str(prep_error)}"}

            # Make predictions with 3 separate models (NEW APPROACH)
            # Model 1: Latency prediction
            try:
                model_latency = self.loaded_models['inference_simulation_latency']
                prediction_output_latency, intervals_latency = model_latency.predict(processed_features, alpha=0.20)
                logger.info(f"Latency prediction output: {prediction_output_latency}")
            except Exception as pred_error:
                logger.error(f"Latency model prediction failed: {pred_error}")
                return {"error": f"Latency model prediction failed: {str(pred_error)}"}

            # Model 2: Throughput prediction
            try:
                model_throughput = self.loaded_models['inference_simulation_throughput']
                prediction_output_throughput, intervals_throughput = model_throughput.predict(processed_features, alpha=0.20)
                logger.info(f"Throughput prediction output: {prediction_output_throughput}")
            except Exception as pred_error:
                logger.error(f"Throughput model prediction failed: {pred_error}")
                return {"error": f"Throughput model prediction failed: {str(pred_error)}"}

            # Model 3: Requests/sec prediction
            try:
                model_requests = self.loaded_models['inference_simulation_requests']
                prediction_output_requests, intervals_requests = model_requests.predict(processed_features, alpha=0.20)
                logger.info(f"Requests prediction output: {prediction_output_requests}")
            except Exception as pred_error:
                logger.error(f"Requests model prediction failed: {pred_error}")
                return {"error": f"Requests model prediction failed: {str(pred_error)}"}

            # Return all 3 predictions and their intervals for further processing
            logger.info(f"All 3 predictions completed successfully")

            return {
                "prediction_output_latency": prediction_output_latency.tolist() if hasattr(prediction_output_latency, 'tolist') else prediction_output_latency,
                "intervals_latency": intervals_latency.tolist() if intervals_latency is not None and hasattr(intervals_latency, 'tolist') else intervals_latency,
                "prediction_output_throughput": prediction_output_throughput.tolist() if hasattr(prediction_output_throughput, 'tolist') else prediction_output_throughput,
                "intervals_throughput": intervals_throughput.tolist() if intervals_throughput is not None and hasattr(intervals_throughput, 'tolist') else intervals_throughput,
                "prediction_output_requests": prediction_output_requests.tolist() if hasattr(prediction_output_requests, 'tolist') else prediction_output_requests,
                "intervals_requests": intervals_requests.tolist() if intervals_requests is not None and hasattr(intervals_requests, 'tolist') else intervals_requests,
                "task_type": "inference"
            }

        except Exception as e:
            logger.error(f"Error in inference simulation: {str(e)}")
            return {"error": f"Inference simulation failed: {str(e)}"}
    
    def _run_training_simulation(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Run training simulation using 2 separate PKL models for latency and throughput"""
        try:
            # Check if both training models are loaded
            required_models = ['training_simulation_latency', 'training_simulation_throughput']
            for model_name in required_models:
                if model_name not in self.loaded_models:
                    return {"error": f"{model_name} model not loaded"}

            if 'simulation_training_preprocessor' not in self.loaded_models:
                return {"error": "Simulation training preprocessor not loaded"}

            # Convert input_data to DataFrame (it already contains model + hardware data combined)
            df = pd.DataFrame([input_data])

            logger.info(f"Training input dataframe shape: {df.shape}")
            logger.info(f"Training input dataframe columns: {list(df.columns)}")

            # Apply preprocessing pipeline
            try:
                preprocessor = self.loaded_models['simulation_training_preprocessor']
                processed_features = preprocessor.transform(df)
                logger.info(f"Training processed features shape: {processed_features.shape}")
            except Exception as prep_error:
                logger.error(f"Training simulation preprocessor failed: {prep_error}")
                logger.error(f"Training input data keys: {list(input_data.keys())}")
                return {"error": f"Training simulation preprocessor failed: {str(prep_error)}"}

            # Make predictions with 2 separate models (NEW APPROACH)
            # Model 1: Latency prediction
            try:
                model_latency = self.loaded_models['training_simulation_latency']
                prediction_output_latency, intervals_latency = model_latency.predict(processed_features, alpha=0.20)
                logger.info(f"Training latency prediction output: {prediction_output_latency}")
            except Exception as pred_error:
                logger.error(f"Training latency model prediction failed: {pred_error}")
                return {"error": f"Training latency model prediction failed: {str(pred_error)}"}

            # Model 2: Throughput prediction
            try:
                model_throughput = self.loaded_models['training_simulation_throughput']
                prediction_output_throughput, intervals_throughput = model_throughput.predict(processed_features, alpha=0.20)
                logger.info(f"Training throughput prediction output: {prediction_output_throughput}")
            except Exception as pred_error:
                logger.error(f"Training throughput model prediction failed: {pred_error}")
                return {"error": f"Training throughput model prediction failed: {str(pred_error)}"}

            # Return both predictions and their intervals for further processing
            logger.info(f"Both training predictions completed successfully")

            return {
                "prediction_output_latency": prediction_output_latency.tolist() if hasattr(prediction_output_latency, 'tolist') else prediction_output_latency,
                "intervals_latency": intervals_latency.tolist() if intervals_latency is not None and hasattr(intervals_latency, 'tolist') else intervals_latency,
                "prediction_output_throughput": prediction_output_throughput.tolist() if hasattr(prediction_output_throughput, 'tolist') else prediction_output_throughput,
                "intervals_throughput": intervals_throughput.tolist() if intervals_throughput is not None and hasattr(intervals_throughput, 'tolist') else intervals_throughput,
                "task_type": "training"
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
            
            # Debug logging - log input data
            logger.info(f"Optimizer input data: {optimizer_input}")
            
            # Convert input to DataFrame
            df = pd.DataFrame([optimizer_input])
            logger.info(f"DataFrame shape: {df.shape}")
            logger.info(f"DataFrame columns: {list(df.columns)}")
            logger.info(f"DataFrame values: {df.iloc[0].to_dict()}")
            
            # Preprocess features if preprocessor is available
            if 'inference_preprocessor' in self.loaded_models:
                try:
                    preprocessor = self.loaded_models['inference_preprocessor']
                    processed_features = preprocessor.transform(df)
                    logger.info(f"Processed features shape: {processed_features.shape}")
                except Exception as prep_error:
                    logger.error(f"Preprocessor failed: {prep_error}")
                    return {"error": f"Preprocessor failed: {str(prep_error)}"}
            else:
                logger.error("Inference preprocessor not loaded")
                return {"error": "Inference preprocessor not loaded"}
            
            # Make prediction using optimizer model
            try:
                model = self.loaded_models['optimizer']
                predictions = model.predict(processed_features)
                logger.info(f"Raw predictions shape: {predictions.shape}")
                logger.info(f"Raw predictions: {predictions}")
            except Exception as pred_error:
                logger.error(f"Model prediction failed: {pred_error}")
                return {"error": f"Model prediction failed: {str(pred_error)}"}
            
            # Get predicted method and precision
            if len(predictions.shape) > 1 and predictions.shape[1] >= 2:
                method_prediction = predictions[0][0]
                precision_prediction = predictions[0][1]
                logger.info(f"Method prediction (raw): {method_prediction}")
                logger.info(f"Precision prediction (raw): {precision_prediction}")
            else:
                # Single prediction - assume it's method
                method_prediction = predictions[0]
                precision_prediction = 0.5  # Default precision value
                logger.info(f"Single prediction (raw): {method_prediction}")
            
            # Convert method prediction to string using label encoder if available
            recommended_method = str(method_prediction)
            if 'modeloptimizer_method' in self.loaded_models:
                try:
                    label_encoder = self.loaded_models['modeloptimizer_method']
                    # Inverse transform to get the actual method name
                    method_names = label_encoder.inverse_transform([int(method_prediction)])
                    recommended_method = method_names[0] if len(method_names) > 0 else str(method_prediction)
                    logger.info(f"Decoded method: {recommended_method}")
                except Exception as e:
                    logger.warning(f"Could not decode method prediction: {str(e)}")
                    recommended_method = str(method_prediction)
            else:
                logger.warning("Method label encoder not loaded")
            
            # Convert precision prediction to double value
            recommended_precision = float(precision_prediction)
            recommended_precision_name = str(precision_prediction)

            # Try to decode precision as well
            if 'modeloptimizer_precision' in self.loaded_models:
                try:
                    precision_encoder = self.loaded_models['modeloptimizer_precision']
                    precision_names = precision_encoder.inverse_transform([int(precision_prediction)])
                    recommended_precision_name = precision_names[0] if len(precision_names) > 0 else str(precision_prediction)
                    logger.info(f"Decoded precision: {recommended_precision_name}")
                except Exception as e:
                    logger.warning(f"Could not decode precision prediction: {str(e)}")
                    recommended_precision_name = str(precision_prediction)
            else:
                logger.warning("Precision label encoder not loaded")
                recommended_precision_name = str(precision_prediction)

            result = {
                "status": "success",
                "recommended_method": recommended_method,
                "recommended_precision": recommended_precision,
                "recommended_precision_name": recommended_precision_name
            }
            logger.info(f"Optimization recommendation completed successfully: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error in optimization recommendation: {str(e)}")
            return {"error": f"Optimization recommendation failed: {str(e)}"}
    
    def get_post_deployment_optimization(self, db: Session, optimization_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get post-deployment optimization predictions using ML models
        
        Args:
            db: Database session
            optimization_input: Dictionary containing post-deployment parameters
            
        Returns:
            Dictionary containing optimization scores and hardware recommendations
        """
        try:
            # Determine deployment type (bare-metal or vm-level)
            deployment_type = optimization_input.get('deployment_type', 'bare-metal')
            logger.info(f"DEBUG: Processing {deployment_type} post-deployment optimization")
            logger.info(f"DEBUG: deployment_type from input: {optimization_input.get('deployment_type')}")
            logger.info(f"DEBUG: All input keys: {list(optimization_input.keys())}")
            
            # Select appropriate model and preprocessor based on deployment type
            if deployment_type == 'vm-level':
                model_key = 'post_deployment_vm_level'
                preprocessor_key = 'post_deployment_preprocessor_vm_level'
                label_encoder_key = 'post_deployment_label_encoder_vm_level'
                logger.info("Using VM-level models for post-deployment optimization")
            else:
                model_key = 'post_deployment'
                preprocessor_key = 'post_deployment_preprocessor'
                label_encoder_key = 'post_deployment_label_encoder'
                logger.info("Using bare-metal models for post-deployment optimization")
            
            # Check if required models are loaded
            if model_key not in self.loaded_models:
                return {"error": f"Post-deployment model ({model_key}) not loaded"}
            
            # Extract GPU name from current_hardware_id if it's in combined CPU+GPU format
            current_hardware_id = optimization_input.get('current_hardware_id', '')
            
            # Parse GPU from combined format like "L40 + Intel(R) Xeon" or "Intel(R) Xeon + NVIDIA L40"
            if ' + ' in current_hardware_id:
                parts = [part.strip() for part in current_hardware_id.split(' + ')]
                # Find the part that contains GPU identifiers
                gpu_part = None
                for part in parts:
                    if any(gpu_indicator in part.upper() for gpu_indicator in ['NVIDIA', 'TESLA', 'GTX', 'RTX', 'A100', 'L40', 'H100', 'V100', 'T4']):
                        gpu_part = part
                        break
                
                if gpu_part:
                    logger.info(f"Extracted GPU '{gpu_part}' from combined hardware ID '{current_hardware_id}'")
                    # Map to exact names expected by pickle models
                    gpu_mapping = {
                        'A100': 'Nvidia A100',
                        'NVIDIA A100': 'Nvidia A100', 
                        'L4': 'Nvidia L4',
                        'NVIDIA L4': 'Nvidia L4',
                        'T4': 'Tesla T4',
                        'Tesla T4': 'Tesla T4',
                        'NVIDIA T4': 'Tesla T4'
                    }
                    
                    # Find the best match for the GPU name
                    mapped_gpu = None
                    gpu_upper = gpu_part.upper()
                    for pattern, mapped_name in gpu_mapping.items():
                        if pattern.upper() in gpu_upper or gpu_upper in pattern.upper():
                            mapped_gpu = mapped_name
                            break
                    
                    if mapped_gpu:
                        logger.info(f"Mapped GPU '{gpu_part}' to '{mapped_gpu}' for model compatibility")
                        optimization_input = optimization_input.copy()
                        optimization_input['current_hardware_id'] = mapped_gpu
                    else:
                        logger.warning(f"Could not map GPU '{gpu_part}' to known model categories. Available: {list(gpu_mapping.values())}")
                        # Use the original extracted part as fallback
                        optimization_input = optimization_input.copy()
                        optimization_input['current_hardware_id'] = gpu_part
                else:
                    logger.warning(f"Could not extract GPU from combined hardware ID '{current_hardware_id}'")
            else:
                # Handle single GPU name (not combined format)
                logger.info(f"Processing single GPU name: '{current_hardware_id}'")
                gpu_mapping = {
                    'A100': 'Nvidia A100',
                    'NVIDIA A100': 'Nvidia A100', 
                    'L4': 'Nvidia L4',
                    'NVIDIA L4': 'Nvidia L4',
                    'T4': 'Tesla T4',
                    'Tesla T4': 'Tesla T4',
                    'NVIDIA T4': 'Tesla T4'
                }
                
                # Try to map single GPU name
                mapped_gpu = None
                gpu_upper = current_hardware_id.upper()
                for pattern, mapped_name in gpu_mapping.items():
                    if pattern.upper() in gpu_upper or gpu_upper in pattern.upper():
                        mapped_gpu = mapped_name
                        break
                
                if mapped_gpu:
                    logger.info(f"Mapped single GPU '{current_hardware_id}' to '{mapped_gpu}' for model compatibility")
                    optimization_input = optimization_input.copy()
                    optimization_input['current_hardware_id'] = mapped_gpu
                else:
                    logger.info(f"Single GPU name '{current_hardware_id}' doesn't match known patterns. Available: {list(gpu_mapping.values())}")
            
            # Convert input to DataFrame
            df = pd.DataFrame([optimization_input])
            
            # Filter input features for VM-level preprocessing (VM preprocessor expects only 3 features)
            if deployment_type == 'vm-level':
                # VM-level preprocessor expects only: gpu_utilization, gpu_memory_usage, current_hardware_id
                vm_required_features = ['gpu_utilization', 'gpu_memory_usage', 'current_hardware_id']
                logger.info(f"Filtering input features for VM-level preprocessing: {vm_required_features}")
                
                # Create filtered DataFrame with only required features
                filtered_data = {}
                for feature in vm_required_features:
                    if feature in optimization_input:
                        filtered_data[feature] = optimization_input[feature]
                    else:
                        logger.warning(f"Required VM feature '{feature}' not found in input")
                        filtered_data[feature] = 0  # Default value
                
                df = pd.DataFrame([filtered_data])
                logger.info(f"VM-level input filtered to {len(filtered_data)} features: {list(filtered_data.keys())}")
            
            # Preprocess features if preprocessor is available
            if preprocessor_key in self.loaded_models:
                try:
                    preprocessor = self.loaded_models[preprocessor_key]
                    processed_features = preprocessor.transform(df)
                    logger.info(f"Successfully preprocessed features for {deployment_type}")
                except Exception as prep_error:
                    logger.error(f"Post-deployment preprocessor ({preprocessor_key}) failed: {prep_error}")
                    return {"error": f"Post-deployment preprocessor failed: {str(prep_error)}"}
            else:
                return {"error": f"Post-deployment preprocessor ({preprocessor_key}) not loaded"}
            
            # Make prediction using post-deployment model
            model = self.loaded_models[model_key]
            predictions = model.predict(processed_features)
            
            # Debug logging
            logger.info(f"Post-deployment raw predictions shape: {predictions.shape}")
            logger.info(f"Post-deployment raw predictions: {predictions}")
            
            # Check if post-deployment label encoder is loaded
            if label_encoder_key not in self.loaded_models:
                return {"error": f"Post-deployment label encoder ({label_encoder_key}) not loaded"}
            
            # Use label encoder to decode the prediction to hardware recommendation
            label_encoder = self.loaded_models[label_encoder_key]
            
            # Get the prediction value to decode
            if len(predictions.shape) > 1:
                # Multi-output prediction - use first output for hardware recommendation
                prediction_value = int(predictions[0][0])
            else:
                # Single prediction
                prediction_value = int(predictions[0])
            
            # Use label encoder to get the actual hardware recommendation
            hardware_recommendations = label_encoder.inverse_transform([prediction_value])
            recommended_hardware = hardware_recommendations[0]
            
            logger.info(f"Label encoder decoded prediction {prediction_value} to: {recommended_hardware}")
            
            # For VM-level optimization, use comprehensive analysis (NO DATABASE DEPENDENCY)
            if deployment_type == 'vm-level':
                logger.info("DEBUG: Entering VM-level optimization path")
                try:
                    from controllers.vm_level_optimizer import VMLevelOptimizer
                    
                    vm_optimizer = VMLevelOptimizer()
                    logger.info("DEBUG: VMLevelOptimizer created successfully")
                    
                    # Get ML confidence score if available
                    ml_confidence = 0.8  # Default confidence
                    try:
                        if hasattr(model, 'predict_proba'):
                            probabilities = model.predict_proba(processed_features)
                            ml_confidence = float(np.max(probabilities))
                        else:
                            # For non-probabilistic models, use prediction value as confidence indicator
                            raw_prediction = float(predictions[0]) if len(predictions) > 0 else 0.5
                            ml_confidence = min(1.0, max(0.1, raw_prediction if raw_prediction <= 1.0 else 0.8))
                    except Exception as e:
                        logger.warning(f"Could not extract ML confidence: {str(e)}")
                        ml_confidence = 0.8
                    
                    logger.info(f"DEBUG: VM-level optimization: ML prediction={recommended_hardware}, confidence={ml_confidence}")
                    
                    # Generate comprehensive VM analysis (completely independent of database)
                    logger.info("DEBUG: About to call vm_optimizer.generate_comprehensive_vm_analysis")
                    vm_analysis = vm_optimizer.generate_comprehensive_vm_analysis(
                        optimization_input, recommended_hardware, ml_confidence
                    )
                    logger.info(f"DEBUG: VM analysis returned: {vm_analysis.get('status', 'NO_STATUS')}")
                    
                    if vm_analysis["status"] == "success":
                        logger.info("DEBUG: VM-level optimization completed successfully - returning VM analysis")
                        return vm_analysis
                    else:
                        logger.error(f"DEBUG: VM analysis failed: {vm_analysis.get('error', 'Unknown error')}")
                        return {"error": vm_analysis.get("error", "VM analysis failed")}
                        
                except Exception as vm_error:
                    logger.error(f"DEBUG: Exception in VM-level path: {str(vm_error)}")
                    logger.error(f"DEBUG: VM-level path failed, falling back to bare-metal")
                    # Continue to bare-metal processing below
            
            # For bare metal, calculate basic metrics using hardware-based estimates
            numerical_metrics = self._calculate_bare_metal_metrics(recommended_hardware, optimization_input)
            
            # Determine recommendation type based on current vs recommended hardware
            current_gpu = optimization_input.get('current_hardware_id', 'Unknown')
            recommendation_type = "hardware_optimization"
            
            # Analyze if it's upgrade, downgrade, or maintain
            if "MAINTAIN" in recommended_hardware.upper():
                recommendation_type = "maintain"
            elif "DOWNGRADE" in recommended_hardware.lower():
                recommendation_type = "downgrade" 
            elif "UPGRADE" in recommended_hardware.lower():
                recommendation_type = "upgrade"
            elif "ALERT" in recommended_hardware.upper():
                recommendation_type = "alert"
            
            return {
                "status": "success",
                "recommendation": recommended_hardware,
                "recommendation_type": recommendation_type,
                "current_hardware": current_gpu,
                "raw_prediction": float(predictions[0]),
                "prediction_value": prediction_value,
                "metrics": {
                    "recommended_latency": numerical_metrics.get("recommended_latency", "Unable to calculate"),
                    "recommended_cost": numerical_metrics.get("recommended_cost", "Unable to calculate")
                },
                "analysis": {
                    "model_used": f"PostDeployment_model_{deployment_type.replace('-', '_')}",
                    "deployment_type": deployment_type,
                    "prediction_confidence": "high",
                    "features_processed": True,
                    "numerical_calculations": numerical_metrics.get("calculation_success", False)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in post-deployment optimization: {str(e)}")
            return {"error": f"Post-deployment optimization failed: {str(e)}"}

    def _calculate_bare_metal_metrics(self, recommended_hardware: str, optimization_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate latency and cost metrics for bare metal deployment using hardware-based estimates
        Similar to VMLevelOptimizer approach that works for VM-level calculations
        """
        try:
            # Extract model parameters
            total_params_millions = float(optimization_input.get('Total Parameters (Millions)', 0))
            precision = optimization_input.get('Precision', 'FP32')
            model_size_mb = float(optimization_input.get('Model Size (MB)', 0))

            # Bytes per parameter mapping (from VMLevelOptimizer)
            bytes_per_param_dict = {
                "FP64": 8, "FLOAT64": 8,
                "FP32": 4, "FLOAT32": 4,
                "FP16": 2, "FLOAT16": 2,
                "BF16": 2, "BFLOAT16": 2,
                "INT64": 8, "INT32": 4, "INT16": 2, "INT8": 1, "UINT8": 1,
                "QINT32": 4, "QINT8": 1, "QUINT8": 1,
                "COMPLEX128": 16, "COMPLEX64": 8,
                "BOOL": 1
            }

            bytes_per_param = bytes_per_param_dict.get(precision, 4)  # Default FP32
            total_params = total_params_millions * 1e6

            # Calculate VRAM requirements
            estimated_vram_gb = ((total_params * bytes_per_param) * 1.2) / 1e9  # 1.2x safety factor

            # Hardware-based latency estimation
            # Base latency depends on model size and hardware capability
            base_latency = 50.0  # Base latency in ms

            # Adjust based on model complexity
            if total_params_millions > 100:  # Large models
                latency_multiplier = 3.0
            elif total_params_millions > 10:  # Medium models
                latency_multiplier = 2.0
            else:  # Small models
                latency_multiplier = 1.0

            # Adjust based on precision
            if precision in ['FP16', 'BF16']:
                precision_multiplier = 0.7  # Faster inference
            elif precision in ['FP64']:
                precision_multiplier = 1.5  # Slower inference
            else:
                precision_multiplier = 1.0  # FP32 baseline

            estimated_latency_ms = base_latency * latency_multiplier * precision_multiplier

            # Hardware-based power consumption estimation
            # Estimate based on GPU type from recommended hardware
            gpu_power = 250  # Default GPU power in watts
            cpu_power = 185  # Default CPU power in watts

            # Adjust power based on recommended hardware
            if 'A100' in recommended_hardware:
                gpu_power = 400
            elif 'V100' in recommended_hardware:
                gpu_power = 300
            elif 'T4' in recommended_hardware:
                gpu_power = 70
            elif 'L4' in recommended_hardware:
                gpu_power = 72

            total_power = gpu_power + cpu_power

            # Cost calculation (similar to VMLevelOptimizer)
            def calculate_cost_per_1000_inferences(power_watts, latency_ms, cost_per_kwh=0.12, num_inferences=1000):
                total_time_seconds = (latency_ms / 1000) * num_inferences
                total_time_hours = total_time_seconds / 3600
                power_kw = power_watts / 1000
                total_cost = power_kw * total_time_hours * cost_per_kwh
                return total_cost

            estimated_cost_per_1000 = calculate_cost_per_1000_inferences(total_power, estimated_latency_ms)

            # Calculate efficiency metrics
            current_hardware = optimization_input.get('current_hardware_id', 'Unknown')
            efficiency_score = 0.85  # Default efficiency

            if 'MAINTAIN' in recommended_hardware.upper():
                efficiency_score = 0.95  # High efficiency for maintain recommendation
            elif 'UPGRADE' in recommended_hardware.upper():
                efficiency_score = 0.75  # Lower efficiency indicating need for upgrade

            return {
                "calculation_success": True,
                "latency_ms": round(estimated_latency_ms, 2),
                "cost_per_1000_inferences": round(estimated_cost_per_1000, 4),
                "estimated_vram_gb": round(estimated_vram_gb, 2),
                "power_consumption_watts": total_power,
                "efficiency_score": efficiency_score,
                "model_params_millions": total_params_millions,
                "precision": precision,
                "recommended_hardware": recommended_hardware,
                "calculation_method": "hardware_based_estimation"
            }

        except Exception as e:
            logger.error(f"Error calculating bare metal metrics: {str(e)}")
            return {
                "calculation_success": False,
                "latency_ms": 0,
                "cost_per_1000_inferences": 0,
                "error": str(e),
                "calculation_method": "failed"
            }