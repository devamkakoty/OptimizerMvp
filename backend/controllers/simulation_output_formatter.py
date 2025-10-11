import pandas as pd
import numpy as np
import math
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session

def outputtable(prediction_output_latency, prediction_output_throughput, prediction_output_requests,
                intervals_latency, intervals_throughput, intervals_requests,
                user_input, available_HW, db: Session):
    """
    Format simulation results into a comprehensive table with hardware recommendations
    NEW: Uses 3 separate predictions (latency, throughput, requests) for inference
    Confidence score is calculated as the average of all 3 models' confidence intervals

    Args:
        prediction_output_latency: Latency predictions from the model
        prediction_output_throughput: Throughput predictions from the model
        prediction_output_requests: Requests/sec predictions from the model
        intervals_latency: Confidence intervals for latency
        intervals_throughput: Confidence intervals for throughput
        intervals_requests: Confidence intervals for requests
        user_input: User input data as dictionary
        available_HW: Available hardware dataframe
        db: Database session

    Returns:
        DataFrame with formatted results including recommendations
    """

    # Max possible widths for each prediction type (calibrated from training data)
    # These represent the maximum interval width we've observed for each metric
    max_width_latency = 1000.0  # Latency in ms
    max_width_throughput = 714401.21  # Throughput in tokens/sec (original value)
    max_width_requests = 10000.0  # Requests/sec

    confidence_percent = []

    # Calculate confidence score as AVERAGE of all 3 models' confidence intervals
    for i in range(len(prediction_output_throughput)):
        # Intervals structure is [[lower_bound], [upper_bound]]

        # Latency confidence
        interval_width_latency = intervals_latency[i][1][0] - intervals_latency[i][0][0]
        confidence_latency = (1 - (interval_width_latency / max_width_latency)) * 100

        # Throughput confidence
        interval_width_throughput = intervals_throughput[i][1][0] - intervals_throughput[i][0][0]
        confidence_throughput = (1 - (interval_width_throughput / max_width_throughput)) * 100

        # Requests confidence
        interval_width_requests = intervals_requests[i][1][0] - intervals_requests[i][0][0]
        confidence_requests = (1 - (interval_width_requests / max_width_requests)) * 100

        # Average of all 3 confidence scores
        avg_confidence = (confidence_latency + confidence_throughput + confidence_requests) / 3
        confidence_percent.append(avg_confidence)

    confidence_percent = np.array(confidence_percent)

    # Build final_table by concatenating all required columns
    # Apply abs() to convert negative predictions to positive
    prediction_output_latency_fixed = [abs(pred) for pred in prediction_output_latency]
    prediction_output_throughput_fixed = [abs(pred) for pred in prediction_output_throughput]
    prediction_output_requests_fixed = [abs(pred) for pred in prediction_output_requests]

    final_table = pd.concat([
        available_HW.reset_index(drop=True),  # Reset index to ensure proper concatenation
        pd.DataFrame(prediction_output_latency_fixed, columns=['Latency (ms)']),
        pd.DataFrame(prediction_output_throughput_fixed, columns=['Throughput (Tokens/secs)']),
        pd.DataFrame(prediction_output_requests_fixed, columns=['Requests/secs']),
        pd.DataFrame(np.abs(confidence_percent), columns=['Confidence Score'])
    ], axis=1)

    # Computing RAM, VRAM and Storage:
    def recommend_hw(size_gb):
        if size_gb <= 1:
            return 1
        exponent = math.ceil(math.log2(size_gb))
        return 2**exponent

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

    # Convert user_input dict to DataFrame for processing
    user_input_df = pd.DataFrame([user_input])

    # Assuming 'Precision' is a column in the user_input DataFrame
    bytes_per_param = bytes_per_param_dict[user_input_df['Precision'].iloc[0]]

    total_params = user_input_df['Total Parameters (Millions)'].iloc[0] * 1e6

    user_input_df['Estimated_VRAM (GB)'] = ((total_params * bytes_per_param) * 1.2) / 1e9
    user_input_df['Estimated_RAM (GB)'] = user_input_df['Estimated_VRAM (GB)'] * 1.5

    for index, rows in user_input_df.iterrows():
        user_input_df.loc[index, 'Recommended Storage'] = recommend_hw(user_input_df.loc[index, 'Model Size (MB)'] / 1024)
        user_input_df.loc[index, 'Recommended RAM'] = recommend_hw(user_input_df.loc[index, 'Estimated_RAM (GB)'])
        user_input_df.loc[index, 'Estimated_VRAM (GB)'] = recommend_hw(user_input_df.loc[index, 'Estimated_VRAM (GB)'])
        user_input_df.loc[index, 'Estimated_RAM (GB)'] = recommend_hw(user_input_df.loc[index, 'Estimated_RAM (GB)'])

    # Computing cost/1000 inference:
    def cost_compute(power_watts, latency_ms, cost_per_kwh=0.12, num_inferences=1000):
        total_time_seconds = (latency_ms / 1000) * num_inferences
        total_time_hours = total_time_seconds / 3600
        power_kw = power_watts / 1000
        total_cost = power_kw * total_time_hours * cost_per_kwh
        return total_cost

    # Calculate total power consumption from hardware columns (already in final_table from available_HW)
    final_table['Total power consumption'] = final_table['GPUPower Consumption'] + final_table['CPU Power Consumption']

    # Add recommended storage, RAM, and VRAM to ALL rows in final_table
    # (All hardware configs use the same model, so they all have the same requirements)
    # FIX: Don't use merge - it reduces rows! Just broadcast the values
    final_table['Recommended Storage'] = user_input_df['Recommended Storage'].iloc[0]
    final_table['Recommended RAM'] = user_input_df['Recommended RAM'].iloc[0]
    final_table['Estimated_VRAM (GB)'] = user_input_df['Estimated_VRAM (GB)'].iloc[0]
    final_table['Status'] = 'This model will run on this GPU'

    for index, rows in final_table.iterrows():
        final_table.at[index, 'Total Cost'] = cost_compute(rows['Total power consumption'], rows['Latency (ms)'])

    final_table = final_table.sort_values(by=['Total Cost'], ascending=[True])

    for index, row in final_table.iterrows():
        # Use Estimated_VRAM (GB) from the merged final_table for comparison
        # Convert GB to MB for comparison (Estimated_VRAM is in GB, GPU Memory is in MB)
        estimated_vram_mb = row['Estimated_VRAM (GB)'] * 1024
        gpu_vram_mb = row['GPU Memory Total - VRAM (MB)']

        if estimated_vram_mb > gpu_vram_mb:
            final_table.at[index, 'Status'] = 'This model wont run on this GPU'
            final_table.at[index, 'Latency (ms)'] = 'N/A'
            final_table.at[index, 'Throughput (Tokens/secs)'] = 'N/A'
            final_table.at[index, 'Requests/secs'] = 'N/A'
            final_table.at[index, 'Recommended Storage'] = 'N/A'
            final_table.at[index, 'Recommended RAM'] = 'N/A'
            final_table.at[index, 'Total power consumption'] = 'N/A'
            final_table.at[index, 'Total Cost'] = '0'  # Set cost to 0 for hardware that won't run the model

    final_table.reset_index(drop=True, inplace=True)

    final_table['Total Cost'] = pd.to_numeric(final_table['Total Cost'], errors='coerce').fillna(0)
    final_table['sorter'] = (final_table['Status'] == 'This model wont run on this GPU')
    final_table = final_table.sort_values(by=['sorter', 'Total Cost'], ascending=[True, True], kind='mergesort').drop('sorter', axis=1)

    # Calculate Concurrent Users for each row (handle 'N/A' values)
    concurrent_users = []
    for index, row in final_table.iterrows():
        if row['Requests/secs'] != 'N/A' and row['Latency (ms)'] != 'N/A':
            try:
                requests_val = float(row['Requests/secs'])
                latency_val = float(row['Latency (ms)'])
                concurrent = requests_val * (latency_val / 1000)
                concurrent_users.append(concurrent)
            except (ValueError, TypeError):
                concurrent_users.append('N/A')
        else:
            concurrent_users.append('N/A')

    final_table['Concurrent Users'] = concurrent_users

    # Set OutputSize for ALL hardware rows (all use same output size from model config)
    output_size = user_input_df['Output size (Number of output tokens)'].iloc[0]
    final_table['OutputSize'] = output_size

    # Calculate TTFT (Time To First Token) for each hardware configuration
    for index, row in final_table.iterrows():
        # Only calculate TTFT if the model will run on this hardware (not 'N/A')
        if row['Latency (ms)'] != 'N/A' and row['Throughput (Tokens/secs)'] != 'N/A':
            try:
                latency_val = float(row['Latency (ms)'])
                throughput_val = float(row['Throughput (Tokens/secs)'])
                output_size_val = float(row['OutputSize'])
                ttft = abs(latency_val - (((output_size_val - 1) / throughput_val) * 1000))
                final_table.at[index, 'TTFT (ms)'] = ttft
            except (ValueError, ZeroDivisionError, TypeError) as e:
                final_table.at[index, 'TTFT (ms)'] = 'N/A'
        else:
            final_table.at[index, 'TTFT (ms)'] = 'N/A'

    # Drop temporary OutputSize column
    final_table.drop(columns=['OutputSize'], inplace=True)

    return final_table

def outputtable_training(prediction_output_latency, prediction_output_throughput,
                         intervals_latency, intervals_throughput,
                         user_input, available_HW, db: Session):
    """
    Format simulation results for TRAINING task type into a comprehensive table
    NEW: Training uses 2 predictions (latency, throughput) instead of 3 like inference

    Args:
        prediction_output_latency: Latency predictions from the model
        prediction_output_throughput: Throughput predictions from the model
        intervals_latency: Confidence intervals for latency
        intervals_throughput: Confidence intervals for throughput (not used in confidence calculation)
        user_input: User input data as dictionary
        available_HW: Available hardware dataframe
        db: Database session

    Returns:
        DataFrame with formatted results including recommendations for training
    """

    # Max possible width for latency (calibrated from training data)
    max_possible_width = 84911.695

    confidence_percent = []
    for i in range(len(prediction_output_latency)):
        confidence_score = intervals_latency[i][1][0] - intervals_latency[i][0][0]
        confidence_percent.append((1 - (confidence_score / max_possible_width)) * 100)

    confidence_percent = np.array(confidence_percent)

    # Build final_table
    final_table = pd.concat([available_HW.reset_index(drop=True),
                            pd.DataFrame(prediction_output_latency, columns=['Latency (ms)'])], axis=1)
    final_table = pd.concat([final_table,
                            pd.DataFrame(prediction_output_throughput, columns=['Throughput (Tokens/secs)'])], axis=1)
    final_table = pd.concat([final_table,
                            pd.DataFrame(confidence_percent, columns=['Confidence Score'])], axis=1)

    # Convert user_input dict to DataFrame for processing
    user_input_df = pd.DataFrame([user_input])

    # Note: '# of GPU' already exists in final_table from available_HW, no need to set it again

    # Computing RAM, VRAM and Storage for TRAINING:
    def recommend_hw(size_gb):
        if size_gb <= 1:
            return 1
        exponent = math.ceil(math.log2(size_gb))
        return 2**exponent

    bytes_per_param_dict = {
        "FP32": 4, "FLOAT32": 4,
        "FP16": 2, "FLOAT16": 2,
        "BF16": 2, "BFLOAT16": 2,
        "INT8": 1,
    }

    total_params = user_input_df['Total Parameters (Millions)'].iloc[0] * 1e6
    bytes_per_param = bytes_per_param_dict.get(user_input_df['Precision'].iloc[0], 4)  # Default FP32
    batch_size = user_input_df['Batch Size'].iloc[0]
    seq_len = user_input_df['Input Size'].iloc[0]
    num_layers = user_input_df['Number of hidden Layers'].iloc[0]

    if 'Hidden Dimension' in user_input_df.columns and pd.notna(user_input_df['Hidden Dimension'].iloc[0]):
        hidden_dim = user_input_df['Hidden Dimension'].iloc[0]
    else:
        if num_layers > 0:
            hidden_dim = math.sqrt(total_params / (12 * num_layers))
        else:
            hidden_dim = 0

    param_mem = total_params * bytes_per_param
    grad_mem = total_params * bytes_per_param
    optimizer_mem = total_params * bytes_per_param * 2
    total_model_mem_gb = (param_mem + grad_mem + optimizer_mem) / 1e9

    activation_mem_gb = (batch_size * seq_len * hidden_dim * num_layers * 10) / 1e9
    framework_overhead_gb = 1.5
    estimated_vram_gb = total_model_mem_gb + activation_mem_gb + framework_overhead_gb
    estimated_ram_gb = estimated_vram_gb * 1.5

    user_input_df['Estimated_VRAM (GB)'] = estimated_vram_gb
    user_input_df['Estimated_RAM (GB)'] = estimated_ram_gb

    # Add RAM and VRAM for Training to all rows
    for index, rows in user_input_df.iterrows():
        final_table['RAM for Training'] = rows['Estimated_RAM (GB)']
        final_table['VRAM for Training'] = rows['Estimated_VRAM (GB)']

    # Calculate recommended storage and RAM
    for index, rows in user_input_df.iterrows():
        user_input_df['Recommended Storage'] = (user_input_df['Model Size (MB)'] / 1024).apply(recommend_hw)
        user_input_df['Recommended RAM'] = user_input_df['Estimated_RAM (GB)'].apply(recommend_hw)
        user_input_df['Estimated_VRAM (GB)'] = user_input_df['Estimated_VRAM (GB)'].apply(recommend_hw)

    def cost_compute(power_watts, latency_ms, cost_per_kwh=0.12, num_inferences=1000):
        total_time_seconds = (latency_ms / 1000) * num_inferences
        total_time_hours = total_time_seconds / 3600
        power_kw = power_watts / 1000
        total_cost = power_kw * total_time_hours * cost_per_kwh
        return total_cost

    # Calculate total power consumption from hardware columns (already in final_table from available_HW)
    final_table['Total power consumption'] = final_table['GPUPower Consumption'] + final_table['CPU Power Consumption']

    # Broadcast model-specific values to all hardware rows (don't use merge - it can cause issues)
    final_table['Recommended Storage'] = user_input_df['Recommended Storage'].iloc[0]
    final_table['Recommended RAM'] = user_input_df['Recommended RAM'].iloc[0]
    final_table['Estimated_VRAM (GB)'] = user_input_df['Estimated_VRAM (GB)'].iloc[0]
    final_table['Status'] = 'This model will run on this GPU'

    for index, rows in final_table.iterrows():
        final_table.at[index, 'Total Cost'] = cost_compute(rows['Total power consumption'], rows['Latency (ms)'])

    final_table = final_table.sort_values(by=['Total Cost'], ascending=[True])

    for index, row in final_table.iterrows():
        # Convert GB to MB for comparison (Estimated_VRAM is in GB, GPU Memory is in MB)
        estimated_vram_mb = row['Estimated_VRAM (GB)'] * 1024
        gpu_vram_mb = row['GPU Memory Total - VRAM (MB)']

        if estimated_vram_mb > gpu_vram_mb:
            final_table.at[index, 'Status'] = 'This model wont run on this GPU'
            final_table.at[index, 'Latency (ms)'] = 'N/A'
            final_table.at[index, 'Throughput (Tokens/secs)'] = 'N/A'
            final_table.at[index, 'Recommended Storage'] = 'N/A'
            final_table.at[index, 'Recommended RAM'] = 'N/A'
            final_table.at[index, 'Total power consumption'] = 'N/A'
            final_table.at[index, 'Total Cost'] = '0'

    final_table.reset_index(drop=True, inplace=True)
    final_table['sorter'] = (final_table == 'N/A').any(axis=1)
    final_table = final_table.sort_values(by='sorter', ascending=True, kind='mergesort').drop('sorter', axis=1)

    # Calculate concurrent jobs for each hardware configuration
    for index, row in final_table.iterrows():
        if row['Status'] == 'This model will run on this GPU':
            try:
                available_vram = float(row['GPU Memory Total - VRAM (MB)'])
                num_gpu = int(row['# of GPU'])
                vram_needed = float(row['VRAM for Training'])
                ram_available = float(row['Recommended RAM'])
                ram_needed = float(row['RAM for Training'])

                if num_gpu > 1:
                    final_table.at[index, 'Latency (ms)'] = float(row['Latency (ms)']) / num_gpu
                    final_table.at[index, 'Throughput (Tokens/secs)'] = float(row['Throughput (Tokens/secs)']) * num_gpu
                    final_table.at[index, 'Total Cost'] = float(row['Total Cost']) * num_gpu

                max_jobs_vram = math.floor((available_vram * num_gpu) / vram_needed)
                max_jobs_ram = math.floor(ram_available / ram_needed)
                max_jobs_gpu = num_gpu

                concurrent_jobs = min(max_jobs_vram, max_jobs_ram, max_jobs_gpu)
                final_table.at[index, 'Concurrent Jobs'] = concurrent_jobs

            except (ValueError, TypeError):
                final_table.at[index, 'Concurrent Jobs'] = 0
        else:
            final_table.at[index, 'Concurrent Jobs'] = 0

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