import math
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

class VMLevelOptimizer:
    """VM-Level Resource Optimization Engine following your intended design"""
    
    def __init__(self):
        # Bytes per parameter for different precisions (from your code)
        self.bytes_per_param_dict = {
            # Floating Point Types
            "FP64": 8, "FLOAT64": 8,
            "FP32": 4, "FLOAT32": 4, 
            "FP16": 2, "FLOAT16": 2,
            "BF16": 2, "BFLOAT16": 2,
            # Integer Types
            "INT64": 8, "INT32": 4, "INT16": 2, "INT8": 1, "UINT8": 1,
            # Quantized Types
            "QINT32": 4, "QINT8": 1, "QUINT8": 1,
            # Complex Types
            "COMPLEX128": 16, "COMPLEX64": 8,
            # Boolean
            "BOOL": 1
        }
    
    def estimate_model_vram_requirements(self, model_params: Dict[str, Any]) -> Dict[str, float]:
        """Calculate model VRAM requirements based on parameters"""
        try:
            precision = model_params.get('Precision', 'FP32')
            total_params_millions = float(model_params.get('Total Parameters (Millions)', 0))
            
            # Get bytes per parameter
            bytes_per_param = self.bytes_per_param_dict.get(precision, 4)  # Default FP32
            
            # Calculate total parameters
            total_params = total_params_millions * 1e6
            
            # Calculate VRAM requirements (with 1.2x safety factor from your code)
            estimated_vram_gb = ((total_params * bytes_per_param) * 1.2) / 1e9
            estimated_ram_gb = estimated_vram_gb * 1.5  # RAM is 1.5x VRAM
            
            # Round up to next power of 2 (hardware sizing logic from your code)
            def recommend_hw(size_gb):
                if size_gb <= 1:
                    return 1
                exponent = math.ceil(math.log2(size_gb))
                return 2**exponent
            
            recommended_vram = recommend_hw(estimated_vram_gb)
            recommended_ram = recommend_hw(estimated_ram_gb)
            
            return {
                "estimated_vram_gb": estimated_vram_gb,
                "estimated_ram_gb": estimated_ram_gb,
                "recommended_vram_gb": recommended_vram,
                "recommended_ram_gb": recommended_ram,
                "precision": precision,
                "bytes_per_param": bytes_per_param
            }
            
        except Exception as e:
            logger.error(f"Error calculating VRAM requirements: {str(e)}")
            return {
                "estimated_vram_gb": 0,
                "estimated_ram_gb": 0,
                "recommended_vram_gb": 0,
                "recommended_ram_gb": 0,
                "precision": "FP32",
                "bytes_per_param": 4
            }
    
    def determine_scaling_type(self, vram_requirements: Dict[str, float], 
                              vm_config: Dict[str, Any]) -> Dict[str, Any]:
        """Determine if vertical or horizontal scaling is needed"""
        try:
            estimated_vram = vram_requirements["estimated_vram_gb"]
            
            # Handle 'No GPU' and other non-numeric values
            vm_vram_raw = vm_config.get('vm_total_vram_gb', 0)
            if isinstance(vm_vram_raw, str) and ('No GPU' in vm_vram_raw or 'N/A' in vm_vram_raw):
                current_vm_vram = 0.0
            else:
                try:
                    # Extract numeric value from strings like "31.3GB"
                    if isinstance(vm_vram_raw, str):
                        current_vm_vram = float(''.join(filter(lambda x: x.isdigit() or x == '.', vm_vram_raw)))
                    else:
                        current_vm_vram = float(vm_vram_raw)
                except (ValueError, TypeError):
                    current_vm_vram = 0.0
            
            # Vertical scaling check (from your code logic)
            needs_vertical_scaling = estimated_vram > current_vm_vram
            
            scaling_info = {
                "needs_vertical_scaling": needs_vertical_scaling,
                "current_vm_vram_gb": current_vm_vram,
                "required_model_vram_gb": estimated_vram,
                "vram_shortage_gb": max(0, estimated_vram - current_vm_vram)
            }
            
            if needs_vertical_scaling:
                scaling_info.update({
                    "scaling_type": "vertical",
                    "action_required": f"Increase VM VRAM allocation from {current_vm_vram} GB to at least {estimated_vram:.1f} GB",
                    "recommendation_override": "Vertical Scaling"
                })
            else:
                scaling_info.update({
                    "scaling_type": "horizontal_evaluation",  # Will be determined by ML model
                    "action_required": "Evaluate horizontal scaling based on utilization patterns"
                })
            
            return scaling_info
            
        except Exception as e:
            logger.error(f"Error determining scaling type: {str(e)}")
            return {
                "needs_vertical_scaling": False,
                "scaling_type": "unknown",
                "current_vm_vram_gb": 0,
                "required_model_vram_gb": 0,
                "vram_shortage_gb": 0
            }
    
    def calculate_vm_cost_metrics(self, vram_requirements: Dict[str, float],
                                 vm_config: Dict[str, Any], 
                                 simulation_result: Optional[Dict] = None) -> Dict[str, Any]:
        """Calculate VM-specific cost metrics using simulation results"""
        try:
            # Base hardware cost estimation (you can integrate with actual simulation API)
            if simulation_result and 'latency_ms' in simulation_result:
                latency_ms = float(simulation_result['latency_ms'])
            else:
                # Fallback estimation
                latency_ms = 150.0  # Default estimation
            
            # Power consumption estimation (from your logic)
            gpu_power = 250  # Watts (default for modern GPU)
            cpu_power = 185  # Watts (default for modern CPU)
            total_power = gpu_power + cpu_power
            
            # Cost calculation (from your cost_compute function)
            def calculate_cost_per_1000_inferences(power_watts, latency_ms, cost_per_kwh=0.12, num_inferences=1000):
                total_time_seconds = (latency_ms / 1000) * num_inferences
                total_time_hours = total_time_seconds / 3600
                power_kw = power_watts / 1000
                total_cost = power_kw * total_time_hours * cost_per_kwh
                return total_cost
            
            base_cost_per_1000 = calculate_cost_per_1000_inferences(total_power, latency_ms)
            
            # VM proportional cost calculation (from your logic)  
            vm_vram_raw = vm_config.get('vm_total_vram_gb', 40)
            if isinstance(vm_vram_raw, str) and ('No GPU' in vm_vram_raw or 'N/A' in vm_vram_raw):
                current_vm_vram = 40.0  # Default assumption
            else:
                try:
                    if isinstance(vm_vram_raw, str):
                        current_vm_vram = float(''.join(filter(lambda x: x.isdigit() or x == '.', vm_vram_raw)))
                    else:
                        current_vm_vram = float(vm_vram_raw)
                except (ValueError, TypeError):
                    current_vm_vram = 40.0  # Default fallback
            
            total_gpu_vram = 80  # Assume A100 base (you can make this dynamic)
            
            vm_cost_per_1000 = (current_vm_vram * base_cost_per_1000) / total_gpu_vram
            
            # Optimized cost if scaling is needed
            required_vram = vram_requirements["estimated_vram_gb"]
            optimized_vram = max(current_vm_vram, required_vram)
            optimized_cost_per_1000 = (optimized_vram * base_cost_per_1000) / total_gpu_vram
            
            return {
                "current_vm_cost_per_1000": round(vm_cost_per_1000, 4),
                "optimized_cost_per_1000": round(optimized_cost_per_1000, 4),
                "latency_ms": round(latency_ms, 2),
                "power_consumption_watts": total_power,
                "cost_increase_factor": round(optimized_cost_per_1000 / vm_cost_per_1000, 2) if vm_cost_per_1000 > 0 else 1.0,
                "efficiency_score": round((current_vm_vram / required_vram), 2) if required_vram > 0 else 1.0
            }
            
        except Exception as e:
            logger.error(f"Error calculating cost metrics: {str(e)}")
            return {
                "current_vm_cost_per_1000": 0.05,
                "optimized_cost_per_1000": 0.05,
                "latency_ms": 150.0,
                "power_consumption_watts": 435,
                "cost_increase_factor": 1.0,
                "efficiency_score": 1.0
            }
    
    def interpret_ml_recommendation(self, ml_prediction: str, scaling_info: Dict[str, Any],
                                  cost_metrics: Dict[str, Any], vm_config: Dict[str, Any]) -> Dict[str, Any]:
        """Interpret ML model prediction with your business logic"""
        try:
            current_vm_vram = scaling_info["current_vm_vram_gb"]
            required_vram = scaling_info["required_model_vram_gb"]
            
            # Override with vertical scaling if needed (from your code)
            if scaling_info["needs_vertical_scaling"]:
                return {
                    "final_recommendation": "Vertical Scaling",
                    "recommendation_type": "vertical_scaling",
                    "action_required": scaling_info["action_required"],
                    "reason": f"Model requires {required_vram:.1f} GB VRAM but VM only has {current_vm_vram} GB allocated",
                    "vram_adjustment_needed": scaling_info["vram_shortage_gb"],
                    "priority": "critical"
                }
            
            # Interpret ML prediction for horizontal scaling
            if ml_prediction == 'SCALE_OUT':
                return {
                    "final_recommendation": "Scale Out (Horizontal)",
                    "recommendation_type": "horizontal_scale_out", 
                    "action_required": f"Assign an additional VM instance with {current_vm_vram} GB VRAM",
                    "reason": "Model workload requires horizontal scaling for optimal performance",
                    "additional_vram_needed": current_vm_vram,
                    "total_recommended_vram": current_vm_vram * 2,
                    "priority": "high"
                }
                
            elif ml_prediction == 'SCALE_IN':
                min_required = required_vram
                return {
                    "final_recommendation": "Scale In (Optimize)",
                    "recommendation_type": "horizontal_scale_in",
                    "action_required": f"VM is over-provisioned. Reduce VRAM allocation to {min_required:.1f} GB",
                    "reason": "Current VM allocation exceeds model requirements - cost optimization opportunity",
                    "vram_reduction_possible": current_vm_vram - min_required,
                    "cost_savings_potential": cost_metrics["current_vm_cost_per_1000"] - cost_metrics["optimized_cost_per_1000"],
                    "priority": "medium"
                }
                
            elif ml_prediction == 'MAINTAIN':
                return {
                    "final_recommendation": "Maintain Current Configuration", 
                    "recommendation_type": "maintain",
                    "action_required": "No scaling required - current VM configuration is optimal",
                    "reason": "VM resource allocation matches model requirements efficiently",
                    "efficiency_score": cost_metrics["efficiency_score"],
                    "priority": "low"
                }
            
            else:
                return {
                    "final_recommendation": ml_prediction,
                    "recommendation_type": "custom",
                    "action_required": "Review ML model recommendation",
                    "reason": f"ML model returned: {ml_prediction}",
                    "priority": "medium"
                }
                
        except Exception as e:
            logger.error(f"Error interpreting ML recommendation: {str(e)}")
            return {
                "final_recommendation": "Unable to determine recommendation",
                "recommendation_type": "error",
                "action_required": "Please review input parameters",
                "reason": f"Analysis failed: {str(e)}",
                "priority": "high"
            }
    
    def generate_comprehensive_vm_analysis(self, optimization_input: Dict[str, Any],
                                         ml_prediction: str, ml_confidence: float) -> Dict[str, Any]:
        """Generate comprehensive VM-level analysis following your design"""
        try:
            # Extract model parameters
            model_params = {
                'Model Name': optimization_input.get('Model Name', ''),
                'Precision': optimization_input.get('Precision', 'FP32'),
                'Total Parameters (Millions)': optimization_input.get('Total Parameters (Millions)', 0),
                'Model Size (MB)': optimization_input.get('Model Size (MB)', 0)
            }
            
            # Extract VM configuration with safe parsing
            def safe_parse_vram(value, default=40):
                if isinstance(value, str) and ('No GPU' in value or 'N/A' in value):
                    return 0.0 if 'No GPU' in value else default
                try:
                    if isinstance(value, str):
                        return float(''.join(filter(lambda x: x.isdigit() or x == '.', value)))
                    return float(value)
                except (ValueError, TypeError):
                    return default
            
            vm_config = {
                'vm_name': optimization_input.get('vm_name', 'unknown'),
                'vm_total_vram_gb': safe_parse_vram(optimization_input.get('vm_total_vram_gb', 40)),
                'vm_total_ram_gb': safe_parse_vram(optimization_input.get('vm_total_ram_gb', 64), 64),
                'vm_gpu_count': optimization_input.get('vm_gpu_count', 1),
                'current_hardware_id': optimization_input.get('current_hardware_id', 'Unknown')
            }
            
            # Step 1: Calculate VRAM requirements
            vram_requirements = self.estimate_model_vram_requirements(model_params)
            
            # Step 2: Determine scaling type
            scaling_info = self.determine_scaling_type(vram_requirements, vm_config)
            
            # Step 3: Calculate cost metrics (you can integrate with simulation API here)
            cost_metrics = self.calculate_vm_cost_metrics(vram_requirements, vm_config)
            
            # Step 4: Interpret ML recommendation
            recommendation_analysis = self.interpret_ml_recommendation(
                ml_prediction, scaling_info, cost_metrics, vm_config
            )
            
            # Step 5: Generate comprehensive response
            return {
                "status": "success",
                "analysis_type": "vm_level_optimization",
                "vm_configuration": {
                    "vm_name": vm_config['vm_name'],
                    "current_vram_gb": vm_config['vm_total_vram_gb'],
                    "current_ram_gb": vm_config['vm_total_ram_gb'],
                    "gpu_count": vm_config['vm_gpu_count'],
                    "host_hardware": vm_config['current_hardware_id']
                },
                "model_requirements": {
                    "model_name": model_params['Model Name'],
                    "precision": model_params['Precision'],
                    "estimated_vram_gb": vram_requirements["estimated_vram_gb"],
                    "recommended_vram_gb": vram_requirements["recommended_vram_gb"],
                    "estimated_ram_gb": vram_requirements["estimated_ram_gb"]
                },
                "scaling_analysis": {
                    "scaling_type": scaling_info["scaling_type"],
                    "needs_vertical_scaling": scaling_info["needs_vertical_scaling"],
                    "vram_shortage_gb": scaling_info.get("vram_shortage_gb", 0),
                    "current_efficiency": round((vm_config['vm_total_vram_gb'] / vram_requirements["estimated_vram_gb"]), 2) if vram_requirements["estimated_vram_gb"] > 0 else 1.0
                },
                "cost_analysis": cost_metrics,
                "recommendation": {
                    "primary_recommendation": recommendation_analysis["final_recommendation"],
                    "recommendation_type": recommendation_analysis["recommendation_type"],
                    "action_required": recommendation_analysis["action_required"],
                    "reason": recommendation_analysis["reason"],
                    "priority": recommendation_analysis["priority"],
                    "ml_prediction": ml_prediction,
                    "ml_confidence": round(ml_confidence, 3)
                },
                "optimization_summary": {
                    "current_cost_per_1000_inferences": cost_metrics["current_vm_cost_per_1000"],
                    "optimized_cost_per_1000_inferences": cost_metrics["optimized_cost_per_1000"],
                    "cost_impact_factor": cost_metrics["cost_increase_factor"],
                    "expected_latency_ms": cost_metrics["latency_ms"],
                    "resource_efficiency_score": cost_metrics["efficiency_score"]
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating VM analysis: {str(e)}")
            return {
                "status": "error",
                "error": f"VM analysis failed: {str(e)}",
                "analysis_type": "vm_level_optimization"
            }