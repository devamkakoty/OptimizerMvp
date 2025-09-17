import pandas as pd
import numpy as np
import math
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session

def outputtable(prediction_output, intervals, user_input, available_HW, db: Session):
    """
    Format simulation results into a comprehensive table with hardware recommendations
    
    Args:
        prediction_output: Raw predictions from the model
        intervals: Confidence intervals from the model
        user_input: User input data as dictionary
        available_HW: Available hardware dataframe
        db: Database session
        
    Returns:
        DataFrame with formatted results including recommendations
    """
    
    max_possible_width = 714401.21
    confidence_percent = []
    
    # Calculate confidence scores
    for i in range(len(prediction_output)):
        confidence_score = intervals[i][1][0] - intervals[i][0][0]
        confidence_percent.append((1 - (confidence_score / max_possible_width)) * 100)

    confidence_percent = np.array(confidence_percent)
    
    # Create final table with predictions and confidence scores
    # Apply absolute value fix for negative latency predictions
    prediction_output_fixed = [abs(pred) for pred in prediction_output]
    final_table = pd.concat([available_HW, pd.DataFrame(prediction_output_fixed, columns=['Latency (ms)'])], axis=1)
    final_table = pd.concat([final_table, pd.DataFrame(confidence_percent, columns=['Confidence Score'])], axis=1)
    
    # Computing RAM, VRAM and Storage recommendations
    def recommend_hw(size_gb):
        if size_gb <= 1:
            return 1
        exponent = math.ceil(math.log2(size_gb))
        return 2**exponent

    # Bytes per parameter for different precision types
    bytes_per_param_dict = {
        # Floating Point Types
        "FP64": 8,        # 64-bit float
        "FLOAT64": 8,
        "FP32": 4,        # 32-bit float
        "FLOAT32": 4,
        "FP16": 2,        # 16-bit float
        "FLOAT16": 2,
        "BF16": 2,        # 16-bit bfloat
        "BFLOAT16": 2,

        # Integer Types
        "INT64": 8,       # 64-bit integer
        "INT32": 4,       # 32-bit integer
        "INT16": 2,       # 16-bit integer
        "INT8": 1,        # 8-bit integer
        "UINT8": 1,       # 8-bit unsigned integer

        # Quantized Integer Types
        "QINT32": 4,      # 32-bit quantized integer
        "QINT8": 1,       # 8-bit quantized integer
        "QUINT8": 1,      # 8-bit quantized unsigned integer

        # Complex Types
        "COMPLEX128": 16, # Two 64-bit floats (real + imaginary)
        "COMPLEX64": 8,   # Two 32-bit floats (real + imaginary)

        # Boolean Type
        "BOOL": 1         # Boolean (typically stored as 1 byte)
    }

    # Get precision from user input
    precision = user_input.get('Precision', 'FP32')
    bytes_per_param = bytes_per_param_dict.get(precision, 4)  # Default to FP32

    # Calculate memory requirements
    total_params = float(user_input.get('Total Parameters (Millions)', 0)) * 1e6
    
    estimated_vram_gb = ((total_params * bytes_per_param) * 1.2) / 1e9
    estimated_ram_gb = estimated_vram_gb * 1.5
    
    user_input_df = pd.DataFrame([user_input])
    user_input_df['Estimated_VRAM (GB)'] = estimated_vram_gb
    user_input_df['Estimated_RAM (GB)'] = estimated_ram_gb
    
    # Calculate recommendations
    model_size_gb = float(user_input.get('Model Size (MB)', 0)) / 1024
    
    recommended_storage = recommend_hw(model_size_gb)
    recommended_ram = recommend_hw(estimated_ram_gb)
    estimated_vram_recommended = recommend_hw(estimated_vram_gb)
    estimated_ram_recommended = recommend_hw(estimated_ram_gb)
    
    # Add power consumption calculation
    gpu_power = user_input.get('GPU Power Consumption', 300)
    cpu_power = user_input.get('CPU Power Consumption', 185)
    total_power = gpu_power + cpu_power
    
    # Use the reusable cost computation function (defined at the bottom of this file)
    
    # Remove duplicates
    final_table.drop_duplicates(inplace=True)
    
    # Add recommendations to final table
    final_table['Recommended Storage'] = recommended_storage
    final_table['Recommended RAM'] = recommended_ram
    final_table['Estimated_VRAM (GB)'] = estimated_vram_recommended
    final_table['Estimated_RAM (GB)'] = estimated_ram_recommended
    final_table['Total power consumption'] = total_power
    final_table['Status'] = 'This model will run on this GPU'
    
    # Calculate total cost for each hardware configuration
    for index, rows in final_table.iterrows():
        if pd.notna(rows['Latency (ms)']) and rows['Latency (ms)'] != 'N/A':
            final_table.at[index, 'Total Cost'] = cost_compute(total_power, float(rows['Latency (ms)']))
        else:
            final_table.at[index, 'Total Cost'] = 0
    
    # Sort by total cost
    final_table = final_table.sort_values(by=['Total Cost'], ascending=[True])
    
    # Check if model will fit on GPU VRAM
    for index, row in final_table.iterrows():
        gpu_memory_mb = row.get('GPU Memory Total - VRAM (MB)', 0)
        if gpu_memory_mb > 0:  # Only check for GPUs
            estimated_vram_gb_row = row.get('Estimated_VRAM (GB)', estimated_vram_gb)
            estimated_vram_mb = estimated_vram_gb_row * 1024
            if estimated_vram_mb > gpu_memory_mb:
                final_table.at[index, 'Status'] = 'This model wont run on this GPU'
                final_table.at[index, 'Latency (ms)'] = 'N/A'
                final_table.at[index, 'Recommended Storage'] = 'N/A'
                final_table.at[index, 'Recommended RAM'] = 'N/A'
                final_table.at[index, 'Estimated_VRAM (GB)'] = 'N/A'
                final_table.at[index, 'Estimated_RAM (GB)'] = 'N/A'
                final_table.at[index, 'Total power consumption'] = 'N/A'
                final_table.at[index, 'Total Cost'] = '0'

    # Reset index and sort by performance (lowest latency first, then compatibility)
    final_table.reset_index(drop=True, inplace=True)
    
    # Primary sort: by latency (performance) - lower is better
    # Secondary sort: by compatibility (compatible configurations first)
    final_table['compatibility_sorter'] = (final_table == 'N/A').any(axis=1)
    final_table = final_table.sort_values(
        by=['Latency (ms)', 'compatibility_sorter'], 
        ascending=[True, True],  # Lower latency first, compatible first
        kind='mergesort'
    ).drop('compatibility_sorter', axis=1)

    return final_table

def get_available_hardware(db: Session) -> pd.DataFrame:
    """Get ALL available hardware configurations from the Hardware_table"""
    try:
        from controllers.hardware_info_controller import HardwareInfoController
        
        hardware_controller = HardwareInfoController()
        hardware_response = hardware_controller.get_all_hardware(db)
        
        if not hardware_response.get("status") == "success" or not hardware_response.get("hardware_list"):
            # Return default hardware if none found
            return pd.DataFrame({
                'Hardware Name': ['Default System'],
                'CPU': ['Unknown CPU'],
                'GPU': ['No GPU'],
                '# of GPU': [0],
                'GPU Memory Total - VRAM (MB)': [0],
                'GPU Graphics clock': [0],
                'GPU Memory clock': [0],
                'GPU SM Cores': [0],
                'GPU CUDA Cores': [0],
                'CPU Total cores (Including Logical cores)': [1],
                'CPU Threads per Core': [1],
                'CPU Base clock(GHz)': [2.0],
                'CPU Max Frequency(GHz)': [3.0],
                'L1 Cache': [64],
                'CPU Power Consumption': [185],
                'GPUPower Consumption': [0]
            })
        
        hardware_list = hardware_response["hardware_list"]
        
        # Convert ALL hardware configurations to DataFrame format expected by PKL models
        hw_data = []
        for i, hardware in enumerate(hardware_list):
            hw_config = {
                'Hardware Name': f"Config {i+1}: {hardware.get('cpu', 'Unknown')} + {hardware.get('gpu', 'No GPU')}",
                'CPU': hardware.get('cpu', 'Unknown CPU'),
                'GPU': hardware.get('gpu', 'No GPU'),
                '# of GPU': hardware.get('num_gpu', 0) or 0,
                'GPU Memory Total - VRAM (MB)': hardware.get('gpu_memory_total_vram_mb', 0) or 0,
                'GPU Graphics clock': hardware.get('gpu_graphics_clock', 0) or 0,
                'GPU Memory clock': hardware.get('gpu_memory_clock', 0) or 0,
                'GPU SM Cores': hardware.get('gpu_sm_cores', 0) or 0,
                'GPU CUDA Cores': hardware.get('gpu_cuda_cores', 0) or 0,
                'CPU Total cores (Including Logical cores)': hardware.get('cpu_total_cores', 1) or 1,
                'CPU Threads per Core': hardware.get('cpu_threads_per_core', 1) or 1,
                'CPU Base clock(GHz)': hardware.get('cpu_base_clock_ghz', 2.0) or 2.0,
                'CPU Max Frequency(GHz)': hardware.get('cpu_max_frequency_ghz', 3.0) or 3.0,
                'L1 Cache': hardware.get('l1_cache', 64) or 64,
                'CPU Power Consumption': hardware.get('cpu_power_consumption', 185) or 185,
                'GPUPower Consumption': hardware.get('gpu_power_consumption', 0) or 0
            }
            hw_data.append(hw_config)
        
        hw_df = pd.DataFrame(hw_data)
        
        return hw_df
        
    except Exception as e:
        # Return default hardware on error
        return pd.DataFrame({
            'Hardware Name': ['Default System'],
            'CPU': ['Unknown CPU'],
            'GPU': ['No GPU'],
            '# of GPU': [0],
            'GPU Memory Total - VRAM (MB)': [0],
            'GPU Graphics clock': [0],
            'GPU Memory clock': [0],
            'GPU SM Cores': [0],
            'GPU CUDA Cores': [0],
            'CPU Total cores (Including Logical cores)': [1],
            'CPU Threads per Core': [1],
            'CPU Base clock(GHz)': [2.0],
            'CPU Max Frequency(GHz)': [3.0],
            'L1 Cache': [64],
            'CPU Power Consumption': [185],
            'GPUPower Consumption': [0]
        })

def calculate_post_deployment_metrics(
    recommended_hardware_name: str,
    current_hardware_name: str,
    model_params: Dict[str, Any],
    resource_metrics: Dict[str, Any],
    db: Session,
    simulation_model=None,
    simulation_preprocessor=None
) -> Dict[str, str]:
    """
    Calculate numerical latency and cost metrics for recommended hardware in post-deployment optimization
    using the same logic as simulation results for consistency.
    
    Args:
        recommended_hardware_name: Name of recommended hardware (e.g., "NVIDIA A100")
        current_hardware_name: Name of current hardware (unused, kept for compatibility)
        model_params: Model parameters (same format as simulation input)
        resource_metrics: Resource utilization metrics (unused, kept for compatibility)
        db: Database session
        simulation_model: Loaded simulation ML model for latency prediction
        simulation_preprocessor: Preprocessor for simulation model
        
    Returns:
        Dictionary with calculated metrics for recommended hardware only
    """
    try:
        from controllers.hardware_info_controller import HardwareInfoController
        
        # Get all available hardware configurations (bypass database issue)
        try:
            hardware_controller = HardwareInfoController()
            hardware_response = hardware_controller.get_all_hardware(db)
            
            if hardware_response.get("status") == "success" and hardware_response.get("hardware_list"):
                hardware_list = hardware_response["hardware_list"]
            else:
                # Fallback: Load from CSV directly (bypass database)
                import pandas as pd
                import os
                csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_data", "Available_HardwareHPE.csv")
                if os.path.exists(csv_path):
                    hardware_df = pd.read_csv(csv_path)
                    hardware_list = []
                    for _, row in hardware_df.iterrows():
                        hardware_list.append({
                            'cpu': row['CPU'],
                            'gpu': row['GPU'], 
                            'num_gpu': row['# of GPU'],
                            'gpu_memory_total_vram_mb': row['GPU Memory Total - VRAM (MB)'],
                            'gpu_graphics_clock': row['GPU Graphics clock'],
                            'gpu_memory_clock': row['GPU Memory clock'], 
                            'gpu_sm_cores': row['GPU SM Cores'],
                            'gpu_cuda_cores': row['GPU CUDA Cores'],
                            'cpu_total_cores': row['CPU Total cores (Including Logical cores)'],
                            'cpu_threads_per_core': row['CPU Threads per Core'],
                            'cpu_base_clock_ghz': row['CPU Base clock(GHz)'],
                            'cpu_max_frequency_ghz': row['CPU Max Frequency(GHz)'],
                            'cpu_power_consumption': row['CPU Power Consumption'],
                            'gpu_power_consumption': row['GPUPower Consumption']
                        })
                else:
                    return {
                        "recommended_latency": "Hardware data not available",
                        "recommended_cost": "Hardware data not available"
                    }
        except Exception as e:
            return {
                "recommended_latency": f"Hardware lookup failed: {str(e)}",
                "recommended_cost": f"Hardware lookup failed: {str(e)}"
            }
        
        # Find matching hardware configurations
        recommended_hw = None
        
        for hw in hardware_list:
            hw_gpu = hw.get('gpu', '').upper()
            hw_cpu = hw.get('cpu', '').upper()
            
            # Match recommended hardware by GPU name
            if any(term in recommended_hardware_name.upper() for term in hw_gpu.split() if term and len(term) > 2):
                recommended_hw = hw
                break  # Found the match, exit loop
        
        # Default values
        recommended_latency = "Unable to calculate"
        recommended_cost = "Unable to calculate"
        
        # Calculate recommended hardware metrics
        if recommended_hw and simulation_model and simulation_preprocessor:
            try:
                # Create hardware configuration DataFrame
                hw_config = {
                    'Hardware Name': f"Config 1: {recommended_hw.get('cpu', 'Unknown')} + {recommended_hw.get('gpu', 'Unknown')}",
                    'CPU': recommended_hw.get('cpu', 'Unknown CPU'),
                    'GPU': recommended_hw.get('gpu', 'Unknown GPU'), 
                    '# of GPU': recommended_hw.get('num_gpu', 1) or 1,
                    'GPU Memory Total - VRAM (MB)': recommended_hw.get('gpu_memory_total_vram_mb', 0) or 0,
                    'GPU Graphics clock': recommended_hw.get('gpu_graphics_clock', 0) or 0,
                    'GPU Memory clock': recommended_hw.get('gpu_memory_clock', 0) or 0,
                    'GPU SM Cores': recommended_hw.get('gpu_sm_cores', 0) or 0,
                    'GPU CUDA Cores': recommended_hw.get('gpu_cuda_cores', 0) or 0,
                    'CPU Total cores (Including Logical cores)': recommended_hw.get('cpu_total_cores', 1) or 1,
                    'CPU Threads per Core': recommended_hw.get('cpu_threads_per_core', 1) or 1,
                    'CPU Base clock(GHz)': recommended_hw.get('cpu_base_clock_ghz', 2.0) or 2.0,
                    'CPU Max Frequency(GHz)': recommended_hw.get('cpu_max_frequency_ghz', 3.0) or 3.0,
                    'L1 Cache': recommended_hw.get('l1_cache', 64) or 64,
                    'CPU Power Consumption': recommended_hw.get('cpu_power_consumption', 185) or 185,
                    'GPUPower Consumption': recommended_hw.get('gpu_power_consumption', 300) or 300
                }
                
                # Combine model parameters with hardware configuration
                combined_features = {**model_params, **hw_config}
                
                # Convert to DataFrame and predict latency
                prediction_df = pd.DataFrame([combined_features])
                processed_features = simulation_preprocessor.transform(prediction_df)
                latency_prediction = simulation_model.predict(processed_features)
                
                # Calculate latency (absolute value to handle negative predictions)
                predicted_latency = abs(float(latency_prediction[0]))
                recommended_latency = f"{predicted_latency:.1f} ms"
                
                # Calculate cost using the same formula as simulation
                gpu_power = recommended_hw.get('gpu_power_consumption', 300) or 300
                cpu_power = recommended_hw.get('cpu_power_consumption', 185) or 185
                total_power = gpu_power + cpu_power
                
                calculated_cost = cost_compute(total_power, predicted_latency)
                recommended_cost = f"${calculated_cost:.4f}"
                
            except Exception as calc_error:
                print(f"Error calculating recommended hardware metrics: {calc_error}")
                recommended_latency = "Calculation error"
                recommended_cost = "Calculation error"
        
        return {
            "recommended_latency": recommended_latency,
            "recommended_cost": recommended_cost,
            "calculation_success": recommended_latency.endswith(" ms")
        }
        
    except Exception as e:
        print(f"Error in calculate_post_deployment_metrics: {e}")
        return {
            "recommended_latency": "Error",
            "recommended_cost": "Error"
        }

def cost_compute(power_watts: float, latency_ms: float, cost_per_kwh: float = 0.12, num_inferences: int = 1000) -> float:
    """
    Calculate cost per 1000 inferences based on power consumption and latency
    (Extracted from outputtable function for reuse)
    """
    total_time_seconds = (latency_ms / 1000) * num_inferences
    total_time_hours = total_time_seconds / 3600
    power_kw = power_watts / 1000
    total_cost = power_kw * total_time_hours * cost_per_kwh
    return total_cost