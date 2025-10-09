import logging
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models import ModelInfo, HardwareInfo
from datetime import datetime
import json
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelController:
    def __init__(self):
        pass
    
    def get_model_by_name_and_task(self, db: Session, model_name: str, task_type: str) -> Dict[str, Any]:
        """Get model data based on model name and task type"""
        try:
            # Query the database for models matching both model_name and task_type
            models = db.query(ModelInfo).filter(
                and_(
                    ModelInfo.model_name == model_name,
                    ModelInfo.task_type == task_type
                )
            ).all()
            
            if not models:
                return {"error": f"No models found for model_name: {model_name} and task_type: {task_type}"}
            
            # Return the first matching model (or you can return all if needed)
            model = models[0]
            
            return {
                "status": "success",
                "model_data": model.to_dict()
            }
        except Exception as e:
            return {"error": f"Failed to fetch model data: {str(e)}"}
    
    def simulate_performance(self, db: Session, user_input: Dict[str, Any], limit_results: Optional[int] = None) -> Dict[str, Any]:
        """Simulate performance using model_inference_controller
        
        Args:
            db: Database session
            user_input: Model and task configuration
            limit_results: Optional limit for number of results (None = all, 3 = top 3 for recommendations)
        """
        try:
            from app.models.hardware_specs import HardwareSpecs
            from controllers.model_inference_controller import ModelInferenceController
            
            # Extract task type to determine which pipeline to use
            task_type = user_input.get('Task Type', 'Inference').lower()
            
            # Hardware data is now handled by get_available_hardware() in outputtable function
            # No need to manually map hardware specs here
            
            # Prepare input data for preprocessing
            if task_type == 'inference':
                model_data = {
                    'Model': user_input.get('Model'),
                    'Framework': user_input.get('Framework'),
                    'Task Type': 'Inference',
                    'Total Parameters (Millions)': user_input.get('Total Parameters (Millions)'),
                    'Model Size (MB)': user_input.get('Model Size (MB)'),
                    'Architecture type': user_input.get('Architecture type'),
                    'Model Type': user_input.get('Model Type'),
                    'Precision': user_input.get('Precision'),
                    'Vocabulary Size': user_input.get('Vocabulary Size'),
                    'Activation Function': user_input.get('Activation Function'),
                    'GFLOPs (Billions)': user_input.get('GFLOPs (Billions)') or user_input.get('FLOPs'),
                    'Number of hidden Layers': user_input.get('Number of hidden Layers'),
                    'Number of Attention Layers': user_input.get('Number of Attention Layers'),
                    'Scenario': user_input.get('Scenario', 'Single Stream'),
                    # CRITICAL: Inference-specific fields required by preprocessor
                    'Input size (Number of input tokens)': user_input.get('Input_Size') or user_input.get('Input Size'),
                    'Output size (Number of output tokens)': user_input.get('Output_Size') or user_input.get('Output Size'),
                    'Batch Size': user_input.get('Batch_Size') or user_input.get('Batch Size')
                }
            else:  # training
                model_data = {
                    'Model': user_input.get('Model'),
                    'Batch Size': user_input.get('Batch Size'),
                    'Input Size': user_input.get('Input Size'),
                    'IsFullTraining': user_input.get('Full Training', 0),
                    'Framework': user_input.get('Framework'),
                    'Task Type': 'Training',
                    'Total Parameters (Millions)': user_input.get('Total Parameters (Millions)'),
                    'Model Size (MB)': user_input.get('Model Size (MB)'),
                    'Architecture type': user_input.get('Architecture type'),
                    'Model Type': user_input.get('Model Type'),
                    'Precision': user_input.get('Precision'),
                    'Vocabulary Size': user_input.get('Vocabulary Size'),
                    'Activation Function': user_input.get('Activation Function'),
                    'GFLOPs (Billions)': user_input.get('GFLOPs (Billions)') or user_input.get('FLOPs'),
                    'Number of hidden Layers': user_input.get('Number of hidden Layers'),
                    'Number of Attention Layers': user_input.get('Number of Attention Layers')
                }
            
            # Use model data - hardware data will be combined in outputtable function
            combined_features = model_data
            
            # Get available hardware configurations first
            from controllers.simulation_output_formatter import outputtable, get_available_hardware
            available_HW = get_available_hardware(db)
            
            if available_HW.empty:
                return {"error": "No hardware configurations found in Hardware Table"}
            
            # Initialize ModelInferenceController
            inference_controller = ModelInferenceController()

            # Collect predictions for all hardware configurations
            # For Training: single model
            all_predictions = []
            all_intervals = []
            # For Inference: 3 separate models
            all_predictions_latency = []
            all_predictions_throughput = []
            all_predictions_requests = []
            all_intervals_latency = []
            all_intervals_throughput = []
            all_intervals_requests = []

            # For each hardware configuration, combine with model data and run simulation
            for index, hardware_row in available_HW.iterrows():
                # Combine model data with current hardware configuration
                combined_features = {**model_data}  # Start with model data
                
                # Add hardware-specific data (exact field names expected by PKL)
                # Fixed field mapping: using correct DataFrame column names (Title Case)
                combined_features.update({
                    'CPU': hardware_row.get('CPU', 'Unknown CPU'),
                    'GPU': hardware_row.get('GPU', 'No GPU'),
                    '# of GPU': hardware_row.get('# of GPU', 0),
                    'GPU Memory Total - VRAM (MB)': hardware_row.get('GPU Memory Total - VRAM (MB)', 0),
                    'GPU Graphics clock': hardware_row.get('GPU Graphics clock', 0),
                    'GPU Memory clock': hardware_row.get('GPU Memory clock', 0),
                    'GPU SM Cores': hardware_row.get('GPU SM Cores', 0),
                    'GPU CUDA Cores': hardware_row.get('GPU CUDA Cores', 0),
                    'CPU Total cores (Including Logical cores)': hardware_row.get('CPU Total cores (Including Logical cores)', 1),
                    'CPU Threads per Core': hardware_row.get('CPU Threads per Core', 1),
                    'CPU Base clock(GHz)': hardware_row.get('CPU Base clock(GHz)', 2.0),
                    'CPU Max Frequency(GHz)': hardware_row.get('CPU Max Frequency(GHz)', 3.0),
                    'CPU Power Consumption': hardware_row.get('CPU Power Consumption', 185),
                    'GPUPower Consumption': hardware_row.get('GPUPower Consumption', 0)
                })
                
                # Run simulation for this specific hardware + model combination
                # Skip database model lookup - all data is in input_data
                results = inference_controller.perform_inference(
                    db=None,  # No database lookup needed
                    model_type=None,  # Skip model type lookup
                    task_type=task_type,
                    hardware_info=None,
                    input_data=combined_features
                )
                
                if "error" in results:
                    return {"error": f"Simulation failed for hardware config {index + 1}: {results['error']}"}

                # Check if this is Inference (3 separate models) or Training (single model)
                if task_type == 'inference':
                    # Collect predictions and intervals for all 3 Inference models
                    prediction_output_latency = results.get("prediction_output_latency")
                    intervals_latency = results.get("intervals_latency")
                    prediction_output_throughput = results.get("prediction_output_throughput")
                    intervals_throughput = results.get("intervals_throughput")
                    prediction_output_requests = results.get("prediction_output_requests")
                    intervals_requests = results.get("intervals_requests")

                    if not prediction_output_latency or not prediction_output_throughput or not prediction_output_requests:
                        return {"error": f"Invalid prediction output for hardware config {index + 1}"}

                    # Add to collections
                    if isinstance(prediction_output_latency, list):
                        all_predictions_latency.extend(prediction_output_latency)
                        all_predictions_throughput.extend(prediction_output_throughput)
                        all_predictions_requests.extend(prediction_output_requests)
                    else:
                        all_predictions_latency.append(prediction_output_latency)
                        all_predictions_throughput.append(prediction_output_throughput)
                        all_predictions_requests.append(prediction_output_requests)

                    # Add intervals
                    if intervals_latency:
                        if isinstance(intervals_latency, list) and len(intervals_latency) > 0 and isinstance(intervals_latency[0], list):
                            all_intervals_latency.extend(intervals_latency)
                        else:
                            all_intervals_latency.append(intervals_latency)
                    else:
                        all_intervals_latency.append([[0], [100]])

                    if intervals_throughput:
                        if isinstance(intervals_throughput, list) and len(intervals_throughput) > 0 and isinstance(intervals_throughput[0], list):
                            all_intervals_throughput.extend(intervals_throughput)
                        else:
                            all_intervals_throughput.append(intervals_throughput)
                    else:
                        all_intervals_throughput.append([[0], [100]])

                    if intervals_requests:
                        if isinstance(intervals_requests, list) and len(intervals_requests) > 0 and isinstance(intervals_requests[0], list):
                            all_intervals_requests.extend(intervals_requests)
                        else:
                            all_intervals_requests.append(intervals_requests)
                    else:
                        all_intervals_requests.append([[0], [100]])

                else:
                    # Training: single model
                    prediction_output = results.get("prediction_output")
                    intervals = results.get("intervals")

                    if not prediction_output:
                        return {"error": f"Invalid prediction output for hardware config {index + 1}"}

                    # Add to collections
                    if isinstance(prediction_output, list):
                        all_predictions.extend(prediction_output)
                    else:
                        all_predictions.append(prediction_output)

                    if intervals:
                        if isinstance(intervals, list):
                            all_intervals.extend(intervals)
                        else:
                            all_intervals.append(intervals)
                    else:
                        # Default interval if not available
                        all_intervals.append([[0], [100]])

            # Format the results using the outputtable function
            try:
                if task_type == 'inference':
                    # Inference: 3 separate models - call outputtable with all 3 predictions
                    final_table = outputtable(
                        prediction_output_latency=all_predictions_latency,
                        prediction_output_throughput=all_predictions_throughput,
                        prediction_output_requests=all_predictions_requests,
                        intervals_latency=all_intervals_latency,
                        intervals_throughput=all_intervals_throughput,
                        intervals_requests=all_intervals_requests,
                        user_input=model_data,
                        available_HW=available_HW,
                        db=db
                    )
                else:
                    # Training: single model - call outputtable with single prediction
                    prediction_output = all_predictions
                    intervals = all_intervals
                    final_table = outputtable(prediction_output, intervals, model_data, available_HW, db)
                
                # Convert DataFrame to list of dictionaries for JSON serialization
                performance_results = final_table.to_dict('records')
                
                # Apply result limiting if specified (for recommendations vs full simulation)
                limited_results = performance_results
                result_type = "all_results"
                
                if limit_results is not None and limit_results > 0:
                    limited_results = performance_results[:limit_results]
                    result_type = f"top_{limit_results}_recommendations"
                
                return {
                    "status": "success",
                    "performance_results": limited_results,
                    "total_available_configs": len(performance_results),
                    "returned_configs": len(limited_results),
                    "result_type": result_type,
                    "task_type": task_type,
                    "models_loaded": len(inference_controller.loaded_models)
                }
                
            except Exception as format_error:
                import traceback
                error_response = {
                    "error": f"Error formatting results: {str(format_error)}",
                    "traceback": traceback.format_exc()
                }
                # Only include raw data if available
                if task_type == 'inference':
                    error_response['raw_prediction_latency'] = all_predictions_latency if 'all_predictions_latency' in locals() else None
                    error_response['raw_prediction_throughput'] = all_predictions_throughput if 'all_predictions_throughput' in locals() else None
                    error_response['raw_prediction_requests'] = all_predictions_requests if 'all_predictions_requests' in locals() else None
                else:
                    error_response['raw_prediction'] = prediction_output if 'prediction_output' in locals() else None
                    error_response['raw_intervals'] = intervals if 'intervals' in locals() else None
                return error_response
            
        except Exception as e:
            import traceback
            return {"error": f"Performance simulation failed: {str(e)}", "traceback": traceback.format_exc()}
    
    
    def _calculate_latency_for_hardware(self, user_input: Dict[str, Any], hardware: HardwareInfo) -> float:
        """Calculate latency for specific hardware configuration"""
        flops = user_input.get('FLOPs', 1000)
        model_size = user_input.get('Model Size (MB)', 1000)
        
        # Base latency calculation
        base_latency = 100.0
        flops_factor = flops / 1000.0
        size_factor = model_size / 1000.0
        
        # Hardware-specific adjustments
        cpu_factor = 1.0
        gpu_factor = 1.0
        
        if hardware.cpu:
            if "Xeon" in hardware.cpu:
                cpu_factor = 0.8  # Better CPU performance
            elif "i7" in hardware.cpu:
                cpu_factor = 1.2  # Slower CPU performance
        
        if hardware.gpu:
            if "A100" in hardware.gpu:
                gpu_factor = 0.1  # Much faster GPU
            elif "A10" in hardware.gpu:
                gpu_factor = 0.3  # Fast GPU
            elif "T4" in hardware.gpu:
                gpu_factor = 0.5  # Medium GPU
            elif "L40" in hardware.gpu:
                gpu_factor = 0.4  # Good GPU
            else:
                gpu_factor = 0.8  # Default GPU factor
        
        # Use GPU factor if GPU is available, otherwise use CPU factor
        hardware_factor = gpu_factor if hardware.gpu else cpu_factor
        
        return base_latency * flops_factor * size_factor * hardware_factor
    
    
    def _calculate_cost_per_1000_for_hardware(self, user_input: Dict[str, Any], hardware: HardwareInfo) -> float:
        """Calculate cost per 1000 inferences for specific hardware"""
        model_size = user_input.get('Model Size (MB)', 1000)
        parameters = user_input.get('Total Parameters (Millions)', 1000)
        
        # Base cost calculation
        base_cost = 0.1
        size_factor = model_size / 1000.0
        param_factor = parameters / 1000.0
        
        # Hardware-specific cost adjustments
        if hardware.gpu:
            if "A100" in hardware.gpu:
                return base_cost * size_factor * param_factor * 0.02  # Very low cost
            elif "A10" in hardware.gpu:
                return base_cost * size_factor * param_factor * 0.08  # Low cost
            elif "T4" in hardware.gpu:
                return base_cost * size_factor * param_factor * 0.17  # Medium cost
            elif "L40" in hardware.gpu:
                return base_cost * size_factor * param_factor * 0.12  # Good cost
            else:
                return base_cost * size_factor * param_factor * 0.15  # Default GPU cost
        else:
            return base_cost * size_factor * param_factor * 1.0  # CPU cost
    
    
    def _create_hardware_identifier(self, hardware: HardwareInfo) -> str:
        """Create hardware identifier for display"""
        if hardware.gpu:
            if "A100" in hardware.gpu:
                return "A100"
            elif "A10" in hardware.gpu:
                return "A10"
            elif "T4" in hardware.gpu:
                return "T4"
            elif "L40" in hardware.gpu:
                return "L40"
            elif "RTX" in hardware.gpu:
                return "RTX_A5000"
            else:
                return hardware.gpu.replace(" ", "_").replace("(", "").replace(")", "")
        else:
            if "Xeon" in hardware.cpu:
                return "AMD_EPYC"
            elif "i7" in hardware.cpu:
                return "CPU_i7"
            else:
                return hardware.cpu.replace(" ", "_").replace("(", "").replace(")", "")
    
    def _create_hardware_full_name(self, hardware: HardwareInfo) -> str:
        """Create full hardware name for display"""
        if hardware.gpu:
            if "A100" in hardware.gpu:
                return "NVIDIA A100 Tensor Core GPU"
            elif "A10" in hardware.gpu:
                return "NVIDIA A10 GPU"
            elif "T4" in hardware.gpu:
                return "NVIDIA Tesla T4 GPU"
            elif "L40" in hardware.gpu:
                return "NVIDIA L40 GPU"
            elif "RTX" in hardware.gpu:
                return "NVIDIA RTX A5000"
            else:
                return hardware.gpu
        else:
            if "Xeon" in hardware.cpu:
                return "N/A"  # CPU full name not specified
            elif "i7" in hardware.cpu:
                return "N/A"  # CPU full name not specified
            else:
                return hardware.cpu
    
    def hardware_optimization(self, db: Session, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Unified hardware optimization for both pre-deployment and post-deployment workflows.
        
        Pre-deployment: Analyzes workload parameters to recommend hardware configurations
        Post-deployment: Analyzes current resource metrics and runtime parameters to optimize existing deployment
        """
        try:
            workflow_type = request_data.get("workflow_type")
            
            if workflow_type == "post_deployment":
                return self._post_deployment_optimization(db, request_data)
            elif workflow_type == "pre_deployment":
                return self._pre_deployment_optimization(db, request_data)
            else:
                return {"error": "Invalid workflow type"}
                
        except Exception as e:
            return {"error": f"Hardware optimization failed: {str(e)}"}
    
    def _pre_deployment_optimization(self, db: Session, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Pre-deployment workflow for hardware optimization.
        
        Analyzes workload parameters to recommend the top 3 hardware configurations
        optimized for the specified requirements.
        """
        try:
            workload_params = request_data.get("workload_parameters", {})
            
            # Get all hardware configurations from database
            hardware_list = db.query(HardwareInfo).all()
            
            if not hardware_list:
                return {"error": "No hardware configurations found in database"}
            
            # Calculate optimization scores for each hardware configuration
            optimization_results = []
            
            for hardware in hardware_list:
                # Calculate optimization scores based on workload requirements
                memory_score = self._calculate_memory_score_for_workload(hardware, workload_params)
                latency_score = self._calculate_latency_score_for_workload(hardware, workload_params)
                fp16_score = self._calculate_fp16_score_for_workload(hardware, workload_params)
                cost_score = self._calculate_cost_score_for_workload(hardware, workload_params)
                
                # Calculate overall optimization score
                optimization_priority = workload_params.get("optimization_priority", "balanced")
                overall_score = self._calculate_overall_workload_score(
                    memory_score, latency_score, fp16_score, cost_score, optimization_priority
                )
                
                # Create hardware identifier and full name
                hardware_id = self._create_hardware_identifier(hardware)
                full_name = self._create_hardware_full_name(hardware)
                
                # Calculate projected performance metrics
                projected_latency = self._calculate_projected_latency_for_workload(hardware, workload_params)
                projected_memory = self._calculate_projected_memory_for_workload(hardware, workload_params)
                projected_cost = self._calculate_projected_cost_for_workload(hardware, workload_params)
                projected_throughput = self._calculate_projected_throughput_for_workload(hardware, workload_params)
                fp16_support = self._check_fp16_support(hardware)
                
                # Check if hardware meets requirements
                meets_latency_req = self._check_latency_requirement(projected_latency, workload_params)
                meets_throughput_req = self._check_throughput_requirement(projected_throughput, workload_params)
                
                optimization_results.append({
                    "hardware_id": hardware.id,
                    "hardware": hardware_id,
                    "full_name": full_name,
                    "optimization_scores": {
                        "memory_score": memory_score,
                        "latency_score": latency_score,
                        "fp16_score": fp16_score,
                        "cost_score": cost_score,
                        "overall_score": overall_score
                    },
                    "projected_performance": {
                        "latency_ms": projected_latency,
                        "memory_gb": projected_memory,
                        "cost_per_1000": projected_cost,
                        "throughput_qps": projected_throughput,
                        "fp16_support": fp16_support
                    },
                    "requirements_met": {
                        "latency_requirement": meets_latency_req,
                        "throughput_requirement": meets_throughput_req
                    }
                })
            
            # Sort by overall optimization score (descending - higher is better)
            optimization_results.sort(key=lambda x: x["optimization_scores"]["overall_score"], reverse=True)
            
            # Return top 3 optimized hardware configurations
            top_3_hardware = optimization_results[:3]
            
            return {
                "status": "success",
                "workflow_type": "pre_deployment",
                "optimization_results": top_3_hardware,
                "analysis_summary": {
                    "total_hardware_evaluated": len(hardware_list),
                    "optimization_priority": optimization_priority,
                    "workload_requirements": {
                        "model_type": workload_params.get("model_type"),
                        "framework": workload_params.get("framework"),
                        "task_type": workload_params.get("task_type"),
                        "model_size_mb": workload_params.get("model_size_mb"),
                        "parameters_millions": workload_params.get("parameters_millions"),
                        "flops_billions": workload_params.get("flops_billions"),
                        "batch_size": workload_params.get("batch_size"),
                        "latency_requirement_ms": workload_params.get("latency_requirement_ms"),
                        "throughput_requirement_qps": workload_params.get("throughput_requirement_qps")
                    }
                }
            }
            
        except Exception as e:
            return {"error": f"Pre-deployment optimization failed: {str(e)}"}
    
    def _post_deployment_optimization(self, db: Session, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Post-deployment workflow for hardware optimization using ML models.
        
        Analyzes current resource metrics and runtime parameters using trained ML models,
        then returns top 3 hardware configurations optimized for:
        - Memory usage
        - Latency performance
        - FP16 performance
        """
        try:
            # Extract request data
            resource_metrics = request_data.get("resource_metrics", {})
            runtime_parameters = request_data.get("runtime_parameters", {})
            
            # Get all hardware configurations from database
            hardware_list = db.query(HardwareInfo).all()
            
            if not hardware_list:
                return {"error": "No hardware configurations found in database"}
            
            # Import the inference controller for ML model predictions
            from controllers.model_inference_controller import ModelInferenceController
            inference_controller = ModelInferenceController()
            
            # Extract data from the direct request (now contains exact pickle model format)
            # Since the API request body now matches pickle model format exactly, use it directly
            optimization_input = {
                'Model Name': request_data.get('model_name', 'Microsoft Phi-2'),
                'Framework': request_data.get('framework', 'PyTorch'),
                'Total Parameters (Millions)': float(request_data.get('parameters_millions', 2779.68)),
                'Model Size (MB)': float(request_data.get('model_size_mb', 10603.82)),
                'Architecture type': request_data.get('architecture_type', 'PhiForCausalLM'),
                'Model Type': request_data.get('model_type', 'phi'),
                'Precision': request_data.get('precision', 'FP16'),
                'Vocabulary Size': int(request_data.get('vocabulary_size', 51200)),
                'Activation Function': request_data.get('activation_function', 'gelu_new'),
                'gpu_memory_usage': float(request_data.get('gpu_memory_usage', 90)),
                'cpu_memory_usage': float(request_data.get('cpu_memory_usage', 90)),
                'cpu_utilization': float(request_data.get('cpu_utilization', 90)),
                'gpu_utilization': float(request_data.get('gpu_utilization', 90)),
                'disk_iops': float(request_data.get('disk_iops', 90)),
                'network_bandwidth': float(request_data.get('network_bandwidth', 90)),
                'current_hardware_id': request_data.get('current_hardware_id', 'NVIDIA L4')
            }
            
            # Use ML model to get hardware recommendation based on current hardware and metrics
            # The current_hardware_id in the request represents the hardware being analyzed
            ml_result = inference_controller.get_post_deployment_optimization(
                db=db,
                optimization_input=optimization_input
            )
            
            if "error" in ml_result:
                # Return error if ML model fails - no fallbacks
                return {"error": f"ML model prediction failed: {ml_result['error']}"}
            else:
                # Use ML model prediction - single hardware recommendation
                hardware_recommendation = ml_result.get("recommendation", "")
                
                # Return the single recommendation
                return {
                    "status": "success",
                    "workflow_type": "post_deployment",
                    "recommendation": hardware_recommendation,
                    "raw_prediction": ml_result.get("raw_prediction"),
                    "prediction_value": ml_result.get("prediction_value"),
                    "current_hardware": optimization_input['current_hardware_id'],
                    "analysis_summary": {
                        "ml_model_used": True,
                        "recommendation_type": "hardware_upgrade"
                    }
                }
                
                # Create hardware identifier and full name
                hardware_id = self._create_hardware_identifier(hardware)
                full_name = self._create_hardware_full_name(hardware)
                
                # Calculate projected performance metrics
                projected_latency = self._calculate_projected_latency(hardware, runtime_parameters)
                projected_memory = self._calculate_projected_memory(hardware, runtime_parameters)
                projected_cost = self._calculate_projected_cost(hardware, runtime_parameters)
                fp16_support = self._check_fp16_support(hardware)
                
                optimization_results.append({
                    "hardware_id": hardware.id,
                    "hardware": hardware_id,
                    "full_name": full_name,
                    "optimization_scores": {
                        "memory_score": memory_score,
                        "latency_score": latency_score,
                        "fp16_score": fp16_score,
                        "overall_score": overall_score
                    },
                    "projected_performance": {
                        "latency_ms": projected_latency,
                        "memory_gb": projected_memory,
                        "cost_per_1000": projected_cost,
                        "fp16_support": fp16_support
                    },
                    "current_vs_projected": {
                        "latency_improvement_percent": self._calculate_improvement_percentage(
                            runtime_parameters.get("current_latency_ms", 0), projected_latency
                        ),
                        "memory_improvement_percent": self._calculate_improvement_percentage(
                            runtime_parameters.get("current_memory_gb", 0), projected_memory
                        ),
                        "cost_improvement_percent": self._calculate_improvement_percentage(
                            runtime_parameters.get("current_cost_per_1000", 0), projected_cost
                        )
                    }
                })
            
            # Sort by overall optimization score (descending - higher is better)
            optimization_results.sort(key=lambda x: x["optimization_scores"]["overall_score"], reverse=True)
            
            # Return top 3 optimized hardware configurations
            top_3_hardware = optimization_results[:3]
            
            return {
                "status": "success",
                "workflow_type": "post_deployment",
                "optimization_results": top_3_hardware,
                "analysis_summary": {
                    "total_hardware_evaluated": len(hardware_list),
                    "optimization_priority": runtime_parameters.get("optimization_priority", "balanced"),
                    "current_performance_baseline": {
                        "latency_ms": runtime_parameters.get("current_latency_ms"),
                        "memory_gb": runtime_parameters.get("current_memory_gb"),
                        "cost_per_1000": runtime_parameters.get("current_cost_per_1000")
                    },
                    "ml_model_used": True
                }
            }
            
        except Exception as e:
            return {"error": f"Post-deployment optimization failed: {str(e)}"}
    
    def _calculate_memory_optimization_score(self, hardware: HardwareInfo, resource_metrics: Dict, runtime_parameters: Dict) -> float:
        """Calculate memory optimization score for hardware"""
        current_memory = runtime_parameters.get("current_memory_gb", 0)
        current_memory_usage = resource_metrics.get("memory_usage_percent", 0)
        
        # Base score on available memory vs current usage
        available_memory = hardware.gpu_memory_total_vram_mb / 1024.0 if hardware.gpu_memory_total_vram_mb else 0
        
        if available_memory > current_memory:
            # Higher score for hardware with more available memory
            memory_improvement = (available_memory - current_memory) / current_memory if current_memory > 0 else 1.0
            return min(memory_improvement * 10, 10.0)  # Cap at 10
        else:
            return 0.0
    
    def _calculate_latency_optimization_score(self, hardware: HardwareInfo, resource_metrics: Dict, runtime_parameters: Dict) -> float:
        """Calculate latency optimization score for hardware"""
        current_latency = runtime_parameters.get("current_latency_ms", 0)
        
        # Base score on GPU performance characteristics
        if hardware.gpu:
            if "A100" in hardware.gpu:
                # A100 is very fast
                return 9.5
            elif "A10" in hardware.gpu:
                return 8.0
            elif "T4" in hardware.gpu:
                return 6.0
            elif "L40" in hardware.gpu:
                return 7.0
            elif "RTX" in hardware.gpu:
                return 8.5
            else:
                return 5.0
        else:
            # CPU-only configurations
            return 3.0
    
    def _calculate_fp16_optimization_score(self, hardware: HardwareInfo, resource_metrics: Dict, runtime_parameters: Dict) -> float:
        """Calculate FP16 optimization score for hardware"""
        target_fp16 = runtime_parameters.get("target_fp16_performance", True)
        
        if not target_fp16:
            return 5.0  # Neutral score if FP16 not required
        
        # Check if hardware supports FP16
        if hardware.gpu:
            if "A100" in hardware.gpu:
                return 10.0  # Excellent FP16 support
            elif "A10" in hardware.gpu:
                return 9.0
            elif "T4" in hardware.gpu:
                return 7.0
            elif "L40" in hardware.gpu:
                return 8.0
            elif "RTX" in hardware.gpu:
                return 8.5
            else:
                return 6.0
        else:
            return 2.0  # Limited FP16 support on CPU
    
    def _calculate_overall_optimization_score(self, memory_score: float, latency_score: float, fp16_score: float, priority: str) -> float:
        """Calculate overall optimization score based on priority"""
        if priority == "memory":
            return memory_score * 0.5 + latency_score * 0.3 + fp16_score * 0.2
        elif priority == "latency":
            return memory_score * 0.2 + latency_score * 0.6 + fp16_score * 0.2
        elif priority == "fp16":
            return memory_score * 0.2 + latency_score * 0.2 + fp16_score * 0.6
        else:  # balanced
            return memory_score * 0.33 + latency_score * 0.34 + fp16_score * 0.33
    
    def _calculate_projected_cost(self, hardware: HardwareInfo, runtime_parameters: Dict) -> float:
        """Calculate projected cost for hardware"""
        current_cost = runtime_parameters.get("current_cost_per_1000", 1.0)
        
        # Cost factors based on hardware type
        if hardware.gpu:
            if "A100" in hardware.gpu:
                return current_cost * 0.4  # 60% cost reduction due to efficiency
            elif "A10" in hardware.gpu:
                return current_cost * 0.6
            elif "T4" in hardware.gpu:
                return current_cost * 0.8
            elif "L40" in hardware.gpu:
                return current_cost * 0.7
            elif "RTX" in hardware.gpu:
                return current_cost * 0.5
            else:
                return current_cost * 0.9
        else:
            return current_cost * 0.95  # Minimal cost improvement for CPU
    
    def _check_fp16_support(self, hardware: HardwareInfo) -> bool:
        """Check if hardware supports FP16"""
        if hardware.gpu:
            # Most modern GPUs support FP16
            return True
        else:
            return False  # Limited FP16 support on CPU
    
    def _calculate_improvement_percentage(self, current_value: float, projected_value: float) -> float:
        """Calculate improvement percentage"""
        if current_value == 0:
            return 0.0
        
        improvement = (current_value - projected_value) / current_value * 100
        return max(improvement, 0.0)  # Ensure non-negative
    
    # Pre-deployment optimization helper methods
    def _calculate_memory_score_for_workload(self, hardware: HardwareInfo, workload_params: Dict) -> float:
        """Calculate memory score for workload requirements"""
        model_size_mb = workload_params.get("model_size_mb", 0)
        parameters_millions = workload_params.get("parameters_millions", 0)
        
        # Base score on available memory vs model requirements
        available_memory = hardware.gpu_memory_total_vram_mb / 1024.0 if hardware.gpu_memory_total_vram_mb else 0
        
        if available_memory > 0:
            # Higher score for hardware with more available memory relative to model size
            memory_ratio = available_memory / (model_size_mb / 1024.0) if model_size_mb > 0 else 1.0
            return min(memory_ratio * 5, 10.0)  # Cap at 10
        else:
            return 2.0  # Low score for CPU-only configurations
    
    def _calculate_latency_score_for_workload(self, hardware: HardwareInfo, workload_params: Dict) -> float:
        """Calculate latency score for workload requirements"""
        flops_billions = workload_params.get("flops_billions", 0)
        latency_requirement = workload_params.get("latency_requirement_ms")
        
        # Base score on GPU performance characteristics
        if hardware.gpu:
            if "A100" in hardware.gpu:
                base_score = 9.5
            elif "A10" in hardware.gpu:
                base_score = 8.0
            elif "T4" in hardware.gpu:
                base_score = 6.0
            elif "L40" in hardware.gpu:
                base_score = 7.0
            elif "RTX" in hardware.gpu:
                base_score = 8.5
            else:
                base_score = 5.0
            
            # Adjust score based on FLOPs requirements
            if flops_billions > 1000:  # High FLOPs requirement
                return min(base_score + 0.5, 10.0)
            elif flops_billions > 100:  # Medium FLOPs requirement
                return base_score
            else:  # Low FLOPs requirement
                return max(base_score - 1.0, 1.0)
        else:
            return 3.0  # CPU-only configurations
    
    def _calculate_fp16_score_for_workload(self, hardware: HardwareInfo, workload_params: Dict) -> float:
        """Calculate FP16 score for workload requirements"""
        target_fp16 = workload_params.get("target_fp16_performance", True)
        
        if not target_fp16:
            return 5.0  # Neutral score if FP16 not required
        
        # Check if hardware supports FP16
        if hardware.gpu:
            if "A100" in hardware.gpu:
                return 10.0  # Excellent FP16 support
            elif "A10" in hardware.gpu:
                return 9.0
            elif "T4" in hardware.gpu:
                return 7.0
            elif "L40" in hardware.gpu:
                return 8.0
            elif "RTX" in hardware.gpu:
                return 8.5
            else:
                return 6.0
        else:
            return 2.0  # Limited FP16 support on CPU
    
    def _calculate_cost_score_for_workload(self, hardware: HardwareInfo, workload_params: Dict) -> float:
        """Calculate cost score for workload requirements"""
        # Base score on hardware cost efficiency
        if hardware.gpu:
            if "A100" in hardware.gpu:
                return 8.0  # High performance but expensive
            elif "A10" in hardware.gpu:
                return 9.0  # Good balance
            elif "T4" in hardware.gpu:
                return 7.0  # Cost-effective
            elif "L40" in hardware.gpu:
                return 8.5
            elif "RTX" in hardware.gpu:
                return 8.0
            else:
                return 6.0
        else:
            return 4.0  # CPU is cost-effective but slower
    
    def _calculate_overall_workload_score(self, memory_score: float, latency_score: float, fp16_score: float, cost_score: float, priority: str) -> float:
        """Calculate overall workload optimization score based on priority"""
        if priority == "memory":
            return memory_score * 0.4 + latency_score * 0.3 + fp16_score * 0.2 + cost_score * 0.1
        elif priority == "latency":
            return memory_score * 0.2 + latency_score * 0.5 + fp16_score * 0.2 + cost_score * 0.1
        elif priority == "fp16":
            return memory_score * 0.2 + latency_score * 0.2 + fp16_score * 0.5 + cost_score * 0.1
        elif priority == "cost":
            return memory_score * 0.2 + latency_score * 0.2 + fp16_score * 0.2 + cost_score * 0.4
        else:  # balanced
            return memory_score * 0.25 + latency_score * 0.25 + fp16_score * 0.25 + cost_score * 0.25
    
    def _calculate_projected_latency_for_workload(self, hardware: HardwareInfo, workload_params: Dict) -> float:
        """Calculate projected latency for workload"""
        flops_billions = workload_params.get("flops_billions", 100)
        batch_size = workload_params.get("batch_size", 1)
        
        # Base latency calculation
        base_latency = flops_billions * 0.1  # Base latency per billion FLOPs
        
        # Apply hardware-specific factors
        if hardware.gpu:
            if "A100" in hardware.gpu:
                return base_latency * 0.3 / batch_size
            elif "A10" in hardware.gpu:
                return base_latency * 0.5 / batch_size
            elif "T4" in hardware.gpu:
                return base_latency * 0.8 / batch_size
            elif "L40" in hardware.gpu:
                return base_latency * 0.6 / batch_size
            elif "RTX" in hardware.gpu:
                return base_latency * 0.4 / batch_size
            else:
                return base_latency * 0.7 / batch_size
        else:
            return base_latency * 2.0 / batch_size  # CPU is slower
    
    def _calculate_projected_memory_for_workload(self, hardware: HardwareInfo, workload_params: Dict) -> float:
        """Calculate projected memory usage for workload"""
        model_size_mb = workload_params.get("model_size_mb", 1000)
        batch_size = workload_params.get("batch_size", 1)
        
        # Convert to GB
        model_size_gb = model_size_mb / 1024.0
        
        # Add batch size overhead
        total_memory = model_size_gb * batch_size * 1.2  # 20% overhead
        
        # Check against available memory
        if hardware.gpu_memory_total_vram_mb:
            available_memory = hardware.gpu_memory_total_vram_mb / 1024.0
            return min(total_memory, available_memory * 0.8)  # Use 80% of available memory
        else:
            return total_memory * 1.5  # CPU memory usage is higher
    
    def _calculate_projected_cost_for_workload(self, hardware: HardwareInfo, workload_params: Dict) -> float:
        """Calculate projected cost for workload"""
        flops_billions = workload_params.get("flops_billions", 100)
        
        # Base cost calculation
        base_cost = flops_billions * 0.001  # Base cost per billion FLOPs
        
        # Apply hardware-specific cost factors
        if hardware.gpu:
            if "A100" in hardware.gpu:
                return base_cost * 0.4  # Efficient but expensive hardware
            elif "A10" in hardware.gpu:
                return base_cost * 0.6
            elif "T4" in hardware.gpu:
                return base_cost * 0.8
            elif "L40" in hardware.gpu:
                return base_cost * 0.7
            elif "RTX" in hardware.gpu:
                return base_cost * 0.5
            else:
                return base_cost * 0.9
        else:
            return base_cost * 0.95  # CPU is cost-effective but slower
    
    def _calculate_projected_throughput_for_workload(self, hardware: HardwareInfo, workload_params: Dict) -> float:
        """Calculate projected throughput for workload"""
        batch_size = workload_params.get("batch_size", 1)
        projected_latency = self._calculate_projected_latency_for_workload(hardware, workload_params)
        
        if projected_latency > 0:
            return (batch_size * 1000) / projected_latency  # QPS calculation
        else:
            return 0.0
    
    def _check_latency_requirement(self, projected_latency: float, workload_params: Dict) -> bool:
        """Check if projected latency meets requirement"""
        latency_requirement = workload_params.get("latency_requirement_ms")
        if latency_requirement is None:
            return True  # No requirement specified
        return projected_latency <= latency_requirement
    
    def _check_throughput_requirement(self, projected_throughput: float, workload_params: Dict) -> bool:
        """Check if projected throughput meets requirement"""
        throughput_requirement = workload_params.get("throughput_requirement_qps")
        if throughput_requirement is None:
            return True  # No requirement specified
        return projected_throughput >= throughput_requirement

    def apply_user_constraints_and_get_top_3(self, performance_results_df, user_constraints: Dict) -> Dict:
        """
        Apply user constraints to filter hardware recommendations and return top 3.

        Args:
            performance_results_df: DataFrame with all hardware simulation results
            user_constraints: Dict with user goals (Target_Latency, Target_Throughput, etc.)

        Returns:
            Dict with filtered results or error message
        """
        import pandas as pd
        import logging

        logger = logging.getLogger(__name__)
        logger.info("="*80)
        logger.info("APPLYING USER CONSTRAINTS TO GET TOP 3 RECOMMENDATIONS")
        logger.info(f"Total hardware configs to evaluate: {len(performance_results_df)}")
        logger.info(f"User constraints provided: {user_constraints}")

        # Extract constraints from dictionary
        target_latency = user_constraints.get('Target_Latency')
        target_throughput = user_constraints.get('Target_Throughput')
        target_concurrent_users = user_constraints.get('Target_Concurrent_Users')
        target_requests_per_sec = user_constraints.get('Target_Requests_Per_Second')
        target_cost = user_constraints.get('Target_Cost')
        target_ttft = user_constraints.get('Target_TTFT')
        num_gpus_constraint = user_constraints.get('Number_Of_GPUs')

        # Check if ANY constraints are provided
        has_constraints = any([
            target_latency is not None,
            target_throughput is not None,
            target_concurrent_users is not None,
            target_requests_per_sec is not None,
            target_cost is not None,
            target_ttft is not None,
            num_gpus_constraint is not None
        ])

        # If NO constraints provided, warn user and return top 3 by default sorting (cost)
        if not has_constraints:
            logger.warning("⚠️ No user constraints provided! Returning top 3 by default sorting (lowest cost)")

            # Filter out 'N/A' rows and sort by cost
            valid_results = performance_results_df[
                (performance_results_df['Latency (ms)'] != 'N/A') &
                (performance_results_df['Throughput (Tokens/secs)'] != 'N/A')
            ].copy()

            # Convert cost to numeric for sorting
            valid_results['Total Cost'] = pd.to_numeric(valid_results['Total Cost'], errors='coerce')
            valid_results = valid_results.sort_values('Total Cost', ascending=True)

            top_3 = valid_results.head(3)

            return {
                "status": "success",
                "warning": "No user constraints provided. Showing top 3 hardware configurations sorted by lowest cost.",
                "performance_results": top_3.to_dict('records'),
                "total_matching_configs": len(valid_results),
                "filters_applied": "None - default sorting by cost"
            }

        # Log which constraints are provided
        logger.info("Constraints provided:")
        if target_latency is not None:
            logger.info(f"  ✓ Target Latency: {target_latency} ms")
        if target_throughput is not None:
            logger.info(f"  ✓ Target Throughput: {target_throughput} tokens/sec")
        if target_concurrent_users is not None:
            logger.info(f"  ✓ Target Concurrent Users: {target_concurrent_users}")
        if target_requests_per_sec is not None:
            logger.info(f"  ✓ Target Requests/sec: {target_requests_per_sec}")
        if target_cost is not None:
            logger.info(f"  ✓ Target Cost: {target_cost} per 1000 inferences")
        if target_ttft is not None:
            logger.info(f"  ✓ Target TTFT: {target_ttft} ms")
        if num_gpus_constraint is not None:
            logger.info(f"  ✓ Number of GPUs: {num_gpus_constraint}")

        # Make a copy of the dataframe to avoid modifying original
        df = performance_results_df.copy()

        # Initial GPU scaling if user specified # GPUs > 1
        if num_gpus_constraint is not None and num_gpus_constraint > 1:
            logger.info(f"🔧 Applying initial GPU scaling for {num_gpus_constraint} GPUs")

            # Only scale rows that have valid metrics (not 'N/A')
            valid_mask = (df['Latency (ms)'] != 'N/A') & (df['Throughput (Tokens/secs)'] != 'N/A')

            # Scale metrics for valid rows
            df.loc[valid_mask, 'Latency (ms)'] = pd.to_numeric(df.loc[valid_mask, 'Latency (ms)']) / num_gpus_constraint
            df.loc[valid_mask, 'Throughput (Tokens/secs)'] = pd.to_numeric(df.loc[valid_mask, 'Throughput (Tokens/secs)']) * num_gpus_constraint
            df.loc[valid_mask, 'Requests/secs'] = pd.to_numeric(df.loc[valid_mask, 'Requests/secs']) * num_gpus_constraint
            df.loc[valid_mask, 'Concurrent Users'] = pd.to_numeric(df.loc[valid_mask, 'Concurrent Users']) * num_gpus_constraint
            df.loc[valid_mask, 'Total Cost'] = pd.to_numeric(df.loc[valid_mask, 'Total Cost']) * num_gpus_constraint

            # Scale TTFT if it's not 'N/A'
            ttft_valid_mask = valid_mask & (df['TTFT (ms)'] != 'N/A')
            df.loc[ttft_valid_mask, 'TTFT (ms)'] = pd.to_numeric(df.loc[ttft_valid_mask, 'TTFT (ms)']) / num_gpus_constraint

            # Add # of GPUs column
            df['# of GPUs'] = num_gpus_constraint

        # Try iterating through 1-4 GPUs to find configs that meet constraints
        for gpu_count in range(1, 5):
            logger.info(f"\n{'='*60}")
            logger.info(f"Trying with {gpu_count} GPU(s)")
            logger.info(f"{'='*60}")

            # Create a copy for this GPU count
            df_gpu = df.copy()

            # Scale metrics based on GPU count
            valid_mask = (df_gpu['Latency (ms)'] != 'N/A') & (df_gpu['Throughput (Tokens/secs)'] != 'N/A')

            df_gpu.loc[valid_mask, 'Latency (ms)'] = pd.to_numeric(df_gpu.loc[valid_mask, 'Latency (ms)']) / gpu_count
            df_gpu.loc[valid_mask, 'Throughput (Tokens/secs)'] = pd.to_numeric(df_gpu.loc[valid_mask, 'Throughput (Tokens/secs)']) * gpu_count
            df_gpu.loc[valid_mask, 'Requests/secs'] = pd.to_numeric(df_gpu.loc[valid_mask, 'Requests/secs']) * gpu_count
            df_gpu.loc[valid_mask, 'Concurrent Users'] = pd.to_numeric(df_gpu.loc[valid_mask, 'Concurrent Users']) * gpu_count
            df_gpu.loc[valid_mask, 'Total Cost'] = pd.to_numeric(df_gpu.loc[valid_mask, 'Total Cost']) * gpu_count

            # Scale TTFT if it's not 'N/A'
            ttft_valid_mask = valid_mask & (df_gpu['TTFT (ms)'] != 'N/A')
            df_gpu.loc[ttft_valid_mask, 'TTFT (ms)'] = pd.to_numeric(df_gpu.loc[ttft_valid_mask, 'TTFT (ms)']) / gpu_count

            # Add # of GPUs column
            df_gpu['# of GPUs'] = gpu_count

            # Filter out 'N/A' rows first
            filtered = df_gpu[valid_mask].copy()
            logger.info(f"Configs with valid metrics: {len(filtered)}")

            # Apply constraints dynamically (only filter by constraints that are provided)
            filters_applied = []

            if target_latency is not None:
                before_count = len(filtered)
                filtered = filtered[pd.to_numeric(filtered['Latency (ms)'], errors='coerce') <= target_latency]
                logger.info(f"  After Latency filter (<= {target_latency} ms): {len(filtered)} configs (removed {before_count - len(filtered)})")
                filters_applied.append(f"Latency <= {target_latency} ms")

            if target_throughput is not None:
                before_count = len(filtered)
                filtered = filtered[pd.to_numeric(filtered['Throughput (Tokens/secs)'], errors='coerce') >= target_throughput]
                logger.info(f"  After Throughput filter (>= {target_throughput} tokens/sec): {len(filtered)} configs (removed {before_count - len(filtered)})")
                filters_applied.append(f"Throughput >= {target_throughput} tokens/sec")

            if target_concurrent_users is not None:
                before_count = len(filtered)
                filtered = filtered[pd.to_numeric(filtered['Concurrent Users'], errors='coerce') >= target_concurrent_users]
                logger.info(f"  After Concurrent Users filter (>= {target_concurrent_users}): {len(filtered)} configs (removed {before_count - len(filtered)})")
                filters_applied.append(f"Concurrent Users >= {target_concurrent_users}")

            if target_requests_per_sec is not None:
                before_count = len(filtered)
                filtered = filtered[pd.to_numeric(filtered['Requests/secs'], errors='coerce') >= target_requests_per_sec]
                logger.info(f"  After Requests/sec filter (>= {target_requests_per_sec}): {len(filtered)} configs (removed {before_count - len(filtered)})")
                filters_applied.append(f"Requests/sec >= {target_requests_per_sec}")

            if target_cost is not None:
                before_count = len(filtered)
                filtered = filtered[pd.to_numeric(filtered['Total Cost'], errors='coerce') <= target_cost]
                logger.info(f"  After Cost filter (<= {target_cost}): {len(filtered)} configs (removed {before_count - len(filtered)})")
                filters_applied.append(f"Cost <= {target_cost}")

            if target_ttft is not None:
                before_count = len(filtered)
                # Only filter TTFT if it's not 'N/A'
                ttft_numeric = pd.to_numeric(filtered['TTFT (ms)'], errors='coerce')
                filtered = filtered[ttft_numeric <= target_ttft]
                logger.info(f"  After TTFT filter (<= {target_ttft} ms): {len(filtered)} configs (removed {before_count - len(filtered)})")
                filters_applied.append(f"TTFT <= {target_ttft} ms")

            # If we have matching configs, return top 3 sorted by cost
            if len(filtered) > 0:
                logger.info(f"✅ Found {len(filtered)} matching configs with {gpu_count} GPU(s)!")

                # Sort by Total Cost (ascending - cheapest first)
                filtered['Total Cost'] = pd.to_numeric(filtered['Total Cost'], errors='coerce')
                filtered = filtered.sort_values('Total Cost', ascending=True)

                top_3 = filtered.head(3)

                logger.info(f"Returning top 3 (sorted by lowest cost):")
                for idx, row in top_3.iterrows():
                    logger.info(f"  {row['Hardware Name']}: Cost=${row['Total Cost']:.2f}, Latency={row['Latency (ms)']:.2f}ms, Throughput={row['Throughput (Tokens/secs)']:.2f}")

                logger.info("="*80)

                return {
                    "status": "success",
                    "performance_results": top_3.to_dict('records'),
                    "total_matching_configs": len(filtered),
                    "gpu_count_used": gpu_count,
                    "filters_applied": ", ".join(filters_applied)
                }
            else:
                logger.info(f"❌ No configs meet all constraints with {gpu_count} GPU(s)")

        # If we exhausted all GPU counts (1-4) and found no matches
        logger.error("No hardware configurations meet the specified constraints even with up to 4 GPUs")
        logger.info("="*80)

        return {
            "error": "No hardware configurations meet all the specified constraints, even when scaling up to 4 GPUs. Please relax your constraints or consider different hardware options.",
            "filters_applied": ", ".join(filters_applied) if filters_applied else "None",
            "total_configs_evaluated": len(performance_results_df),
            "gpu_counts_tried": "1, 2, 3, 4"
        } 