from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models import ModelInfo, HardwareInfo
from datetime import datetime
import json

class ModelController:
    def __init__(self):
        pass
    
    def get_available_model_types(self, db: Session) -> Dict[str, Any]:
        """Get all unique model types from the database"""
        try:
            # Query distinct model types
            model_types = db.query(ModelInfo.model_type).distinct().all()
            
            # Extract the values and sort them
            types = sorted([mt[0] for mt in model_types if mt[0]])
            
            return {
                "status": "success",
                "model_types": types
            }
        except Exception as e:
            return {"error": f"Failed to fetch model types: {str(e)}"}
    
    def get_available_task_types(self, db: Session) -> Dict[str, Any]:
        """Get all unique task types from the database"""
        try:
            # Query distinct task types
            task_types = db.query(ModelInfo.task_type).distinct().all()
            
            # Extract the values and sort them
            types = sorted([tt[0] for tt in task_types if tt[0]])
            
            return {
                "status": "success",
                "task_types": types
            }
        except Exception as e:
            return {"error": f"Failed to fetch task types: {str(e)}"}
    
    def get_model_by_type_and_task(self, db: Session, model_type: str, task_type: str) -> Dict[str, Any]:
        """Get model data based on model type and task type"""
        try:
            # Query the database for models matching the criteria
            models = db.query(ModelInfo).filter(
                and_(
                    ModelInfo.model_type == model_type,
                    ModelInfo.task_type == task_type
                    # For now, we'll return all models of the given type
                    # Task type filtering can be added based on specific requirements
                )
            ).all()
            
            if not models:
                return {"error": f"No models found for model_type: {model_type} and task_type: {task_type}"}
            
            # Return the first matching model (or you can return all if needed)
            model = models[0]
            
            return {
                "status": "success",
                "model_data": model.to_dict()
            }
        except Exception as e:
            return {"error": f"Failed to fetch model data: {str(e)}"}
    
    def simulate_performance(self, db: Session, user_input: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate performance and return top 3 performing hardware configurations"""
        try:
            # Extract model name from user input
            model_name = user_input.get('Model', '')
            
            # Get model from database
            model = db.query(ModelInfo).filter(ModelInfo.model_name == model_name).first()
            
            if not model:
                return {"error": f"Model {model_name} not found in database"}
            
            # Get all hardware configurations from database
            hardware_list = db.query(HardwareInfo).all()
            
            if not hardware_list:
                return {"error": "No hardware configurations found in database"}
            
            # Calculate performance metrics for each hardware configuration
            performance_results = []
            
            for hardware in hardware_list:
                # Calculate performance metrics for this hardware
                latency_ms = self._calculate_latency_for_hardware(user_input, hardware)
                throughput_qps = self._calculate_throughput_for_hardware(user_input, hardware)
                cost_per_1000 = self._calculate_cost_per_1000_for_hardware(user_input, hardware)
                memory_gb = self._calculate_memory_for_hardware(user_input, hardware)
                
                # Create hardware identifier and full name
                hardware_id = self._create_hardware_identifier(hardware)
                full_name = self._create_hardware_full_name(hardware)
                
                performance_results.append({
                    "hardware_id": hardware.id,
                    "hardware": hardware_id,
                    "full_name": full_name,
                    "latency_ms": latency_ms,
                    "throughput_qps": throughput_qps,
                    "cost_per_1000": cost_per_1000,
                    "memory_gb": memory_gb
                })
            
            # Sort by performance metrics (lower latency, higher throughput, lower cost, lower memory)
            # Priority: latency (ascending), throughput (descending), cost (ascending), memory (ascending)
            performance_results.sort(key=lambda x: (
                x["latency_ms"],           # Lower is better
                -x["throughput_qps"],      # Higher is better (negative for ascending sort)
                x["cost_per_1000"],        # Lower is better
                x["memory_gb"]             # Lower is better
            ))
            
            # Return top 3 performing hardware configurations
            top_3_hardware = performance_results[:3]
            
            return {
                "status": "success",
                "performance_results": top_3_hardware
            }
        except Exception as e:
            return {"error": f"Performance simulation failed: {str(e)}"}
    
    def _calculate_latency(self, user_input: Dict[str, Any]) -> float:
        """Placeholder function to calculate latency"""
        # This would use the model pickle to run actual inference
        # For now, return a placeholder value based on model parameters
        flops = user_input.get('FLOPs', 1000)
        model_size = user_input.get('Model Size (MB)', 1000)
        
        # Simple placeholder calculation
        base_latency = 100.0
        flops_factor = flops / 1000.0
        size_factor = model_size / 1000.0
        
        return base_latency * flops_factor * size_factor
    
    def _calculate_throughput(self, user_input: Dict[str, Any]) -> float:
        """Placeholder function to calculate throughput"""
        # This would use the model pickle to run actual inference
        # For now, return a placeholder value
        latency = self._calculate_latency(user_input)
        
        # Throughput is inversely proportional to latency
        return 1000.0 / latency if latency > 0 else 1.0
    
    def _calculate_cost_per_1000(self, user_input: Dict[str, Any]) -> float:
        """Placeholder function to calculate cost per 1000 inferences"""
        # This would calculate actual cost based on hardware pricing
        # For now, return a placeholder value
        model_size = user_input.get('Model Size (MB)', 1000)
        parameters = user_input.get('Total Parameters (Millions)', 1000)
        
        # Simple placeholder calculation
        base_cost = 0.1
        size_factor = model_size / 1000.0
        param_factor = parameters / 1000.0
        
        return base_cost * size_factor * param_factor
    
    def _calculate_memory(self, user_input: Dict[str, Any]) -> float:
        """Placeholder function to calculate memory requirements"""
        # This would calculate actual memory requirements
        # For now, return a placeholder value
        model_size = user_input.get('Model Size (MB)', 1000)
        parameters = user_input.get('Total Parameters (Millions)', 1000)
        
        # Simple placeholder calculation
        base_memory = 8.0  # GB
        size_factor = model_size / 1000.0
        param_factor = parameters / 1000.0
        
        return base_memory * size_factor * param_factor
    
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
            elif "L4" in hardware.gpu:
                gpu_factor = 0.4  # Good GPU
            else:
                gpu_factor = 0.8  # Default GPU factor
        
        # Use GPU factor if GPU is available, otherwise use CPU factor
        hardware_factor = gpu_factor if hardware.gpu else cpu_factor
        
        return base_latency * flops_factor * size_factor * hardware_factor
    
    def _calculate_throughput_for_hardware(self, user_input: Dict[str, Any], hardware: HardwareInfo) -> float:
        """Calculate throughput for specific hardware configuration"""
        latency = self._calculate_latency_for_hardware(user_input, hardware)
        
        # Throughput is inversely proportional to latency
        base_throughput = 1000.0 / latency if latency > 0 else 1.0
        
        # Hardware-specific throughput adjustments
        if hardware.gpu:
            if "A100" in hardware.gpu:
                return base_throughput * 25.0  # Much higher throughput
            elif "A10" in hardware.gpu:
                return base_throughput * 15.0  # High throughput
            elif "T4" in hardware.gpu:
                return base_throughput * 8.0   # Medium throughput
            elif "L4" in hardware.gpu:
                return base_throughput * 10.0  # Good throughput
            else:
                return base_throughput * 5.0   # Default GPU throughput
        else:
            return base_throughput * 0.5  # CPU throughput is lower
    
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
            elif "L4" in hardware.gpu:
                return base_cost * size_factor * param_factor * 0.12  # Good cost
            else:
                return base_cost * size_factor * param_factor * 0.15  # Default GPU cost
        else:
            return base_cost * size_factor * param_factor * 1.0  # CPU cost
    
    def _calculate_memory_for_hardware(self, user_input: Dict[str, Any], hardware: HardwareInfo) -> float:
        """Calculate memory requirements for specific hardware"""
        model_size = user_input.get('Model Size (MB)', 1000)
        parameters = user_input.get('Total Parameters (Millions)', 1000)
        
        # Base memory calculation
        base_memory = 8.0  # GB
        size_factor = model_size / 1000.0
        param_factor = parameters / 1000.0
        
        # Hardware-specific memory adjustments
        if hardware.gpu_memory_total_vram_mb:
            # Use actual GPU memory if available
            gpu_memory_gb = hardware.gpu_memory_total_vram_mb / 1024.0
            return max(base_memory * size_factor * param_factor, gpu_memory_gb)
        else:
            return base_memory * size_factor * param_factor
    
    def _create_hardware_identifier(self, hardware: HardwareInfo) -> str:
        """Create hardware identifier for display"""
        if hardware.gpu:
            if "A100" in hardware.gpu:
                return "A100"
            elif "A10" in hardware.gpu:
                return "A10"
            elif "T4" in hardware.gpu:
                return "T4"
            elif "L4" in hardware.gpu:
                return "L4"
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
            elif "L4" in hardware.gpu:
                return "NVIDIA L4 GPU"
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
    
    def populate_model_database(self, db: Session, csv_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Populate the model database with data from CSV"""
        try:
            for row in csv_data:
                # Check if model already exists
                existing_model = db.query(ModelInfo).filter(
                    ModelInfo.model_name == row['Model Name']
                ).first()
                
                if existing_model:
                    # Update existing model
                    existing_model.framework = row['Framework']
                    existing_model.total_parameters_millions = row['Total Parameters (Millions)']
                    existing_model.model_size_mb = row['Model Size (MB)']
                    existing_model.architecture_type = row['Architecture type']
                    existing_model.model_type = row['Model Type']
                    existing_model.number_of_hidden_layers = row.get('Number of hidden Layers')
                    existing_model.embedding_vector_dimension = row.get('Embedding Vector Dimension (Hidden Size)')
                    existing_model.precision = row.get('Precision')
                    existing_model.vocabulary_size = row.get('Vocabulary Size')
                    existing_model.ffn_dimension = row.get('FFN (MLP) Dimension')
                    existing_model.number_of_attention_layers = row.get('Number of Attention Layers')
                    existing_model.activation_function = row.get('Activation Function')
                    existing_model.updated_at = datetime.utcnow()
                    existing_model.task_type = row.get('Task Type')
                else:
                    # Create new model
                    new_model = ModelInfo(
                        model_name=row['Model Name'],
                        framework=row['Framework'],
                        total_parameters_millions=row['Total Parameters (Millions)'],
                        model_size_mb=row['Model Size (MB)'],
                        architecture_type=row['Architecture type'],
                        model_type=row['Model Type'],
                        number_of_hidden_layers=row.get('Number of hidden Layers'),
                        embedding_vector_dimension=row.get('Embedding Vector Dimension (Hidden Size)'),
                        precision=row.get('Precision'),
                        vocabulary_size=row.get('Vocabulary Size'),
                        ffn_dimension=row.get('FFN (MLP) Dimension'),
                        number_of_attention_layers=row.get('Number of Attention Layers'),
                        activation_function=row.get('Activation Function'),
                        task_type=row.get('Task Type')
                    )
                    db.add(new_model)
            
            db.commit()
            return {"status": "success", "message": f"Successfully populated database with {len(csv_data)} models"}
        except Exception as e:
            db.rollback()
            return {"error": f"Failed to populate database: {str(e)}"}
    
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
        Post-deployment workflow for hardware optimization.
        
        Analyzes current resource metrics and runtime parameters,
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
            
            # Calculate optimization scores for each hardware configuration
            optimization_results = []
            
            for hardware in hardware_list:
                # Calculate optimization scores based on current metrics
                memory_score = self._calculate_memory_optimization_score(
                    hardware, resource_metrics, runtime_parameters
                )
                latency_score = self._calculate_latency_optimization_score(
                    hardware, resource_metrics, runtime_parameters
                )
                fp16_score = self._calculate_fp16_optimization_score(
                    hardware, resource_metrics, runtime_parameters
                )
                
                # Calculate overall optimization score
                optimization_priority = runtime_parameters.get("optimization_priority", "balanced")
                overall_score = self._calculate_overall_optimization_score(
                    memory_score, latency_score, fp16_score, optimization_priority
                )
                
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
                    "optimization_priority": optimization_priority,
                    "current_performance_baseline": {
                        "latency_ms": runtime_parameters.get("current_latency_ms"),
                        "memory_gb": runtime_parameters.get("current_memory_gb"),
                        "cost_per_1000": runtime_parameters.get("current_cost_per_1000")
                    }
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
            elif "L4" in hardware.gpu:
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
            elif "L4" in hardware.gpu:
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
    
    def _calculate_projected_latency(self, hardware: HardwareInfo, runtime_parameters: Dict) -> float:
        """Calculate projected latency for hardware"""
        current_latency = runtime_parameters.get("current_latency_ms", 100)
        
        # Apply hardware-specific latency factors
        if hardware.gpu:
            if "A100" in hardware.gpu:
                return current_latency * 0.3  # 70% improvement
            elif "A10" in hardware.gpu:
                return current_latency * 0.5
            elif "T4" in hardware.gpu:
                return current_latency * 0.8
            elif "L4" in hardware.gpu:
                return current_latency * 0.6
            elif "RTX" in hardware.gpu:
                return current_latency * 0.4
            else:
                return current_latency * 0.7
        else:
            return current_latency * 0.9  # Minimal improvement for CPU
    
    def _calculate_projected_memory(self, hardware: HardwareInfo, runtime_parameters: Dict) -> float:
        """Calculate projected memory usage for hardware"""
        current_memory = runtime_parameters.get("current_memory_gb", 8.0)
        
        # Memory usage depends on available VRAM
        if hardware.gpu_memory_total_vram_mb:
            available_memory = hardware.gpu_memory_total_vram_mb / 1024.0
            return min(current_memory, available_memory * 0.8)  # Use 80% of available memory
        else:
            return current_memory * 0.9  # Minimal improvement for CPU
    
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
            elif "L4" in hardware.gpu:
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
            elif "L4" in hardware.gpu:
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
            elif "L4" in hardware.gpu:
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
            elif "L4" in hardware.gpu:
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
            elif "L4" in hardware.gpu:
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
            elif "L4" in hardware.gpu:
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