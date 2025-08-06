# Model Optimization API

This is the backend API for the Model Optimization system, designed to handle model performance simulation and data retrieval.

## Database Setup

The system uses PostgreSQL with two databases:

1. **Model_Recommendation_DB** - Contains model and hardware specifications
   - `Model_table` - Stores model specifications from the CSV data
   - `Hardware_table` - Stores hardware configurations from the CSV data

2. **Metrics_db** - Contains monitoring and metrics data
   - `Hardware_Monitoring_table` - Stores real-time hardware monitoring data (TimescaleDB hypertable)

### Database Schema

#### Model_table
The `Model_table` includes the following fields:
- `id`: Primary key
- `model_name`: Model name (unique)
- `framework`: Framework used (PyTorch, TensorFlow, etc.)
- `total_parameters_millions`: Total parameters in millions
- `model_size_mb`: Model size in MB
- `architecture_type`: Architecture type
- `model_type`: Model type (bert, resnet, etc.)
- `number_of_hidden_layers`: Number of hidden layers
- `embedding_vector_dimension`: Embedding vector dimension
- `precision`: Precision (FP32, FP16, etc.)
- `vocabulary_size`: Vocabulary size
- `ffn_dimension`: FFN dimension
- `number_of_attention_layers`: Number of attention layers
- `activation_function`: Activation function
- `model_pickle`: Binary field for storing model pickles
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

#### Hardware_table
The `Hardware_table` includes the following fields:
- `id`: Primary key
- `cpu`: CPU model name
- `gpu`: GPU model name
- `num_gpu`: Number of GPUs
- `gpu_memory_total_vram_mb`: Total GPU VRAM in MB
- `gpu_graphics_clock`: GPU graphics clock speed
- `gpu_memory_clock`: GPU memory clock speed
- `gpu_sm_cores`: GPU SM cores
- `gpu_cuda_cores`: GPU CUDA cores
- `cpu_total_cores`: Total CPU cores
- `cpu_threads_per_core`: CPU threads per core
- `cpu_base_clock_ghz`: CPU base clock in GHz
- `cpu_max_frequency_ghz`: CPU max frequency in GHz
- `l1_cache`: L1 cache size
- `cpu_power_consumption`: CPU power consumption
- `gpu_power_consumption`: GPU power consumption
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

#### Hardware_Monitoring_table
The `Hardware_Monitoring_table` includes the following fields:
- `id`: Primary key
- `hardware_id`: Reference to hardware configuration
- `cpu_usage_percent`: CPU usage percentage
- `gpu_usage_percent`: GPU usage percentage
- `memory_usage_percent`: Memory usage percentage
- `temperature_cpu`: CPU temperature
- `temperature_gpu`: GPU temperature
- `power_consumption_watts`: Power consumption in watts
- `network_usage_mbps`: Network usage in Mbps
- `disk_usage_percent`: Disk usage percentage
- `additional_metrics`: Additional metrics in JSON format
- `timestamp`: Timestamp for time-series data

## API Endpoints

### Health Check
- **GET** `/health` - Check API health status
- **GET** `/api/status` - Get detailed API status

### Model Data Retrieval
- **POST** `/api/model/get-model-data` - Get model data based on model type and task type

**Request Body:**
```json
{
    "model_type": "bert",
    "task_type": "inference"
}
```

**Response:**
```json
{
    "status": "success",
    "model_data": {
        "id": 1,
        "model_name": "BERT",
        "framework": "PyTorch",
        "total_parameters_millions": 109.51,
        "model_size_mb": 840.09,
        "architecture_type": "BertForMaskedLM",
        "model_type": "bert",
        "number_of_hidden_layers": 12,
        "embedding_vector_dimension": 768,
        "precision": "FP32",
        "vocabulary_size": 30522,
        "ffn_dimension": 3072,
        "number_of_attention_layers": 12,
        "activation_function": "gelu",
        "model_pickle": true,
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00"
    }
}
```

### Performance Simulation
- **POST** `/api/model/simulate-performance` - Simulate performance and return 4 parameters

**Request Body:**
```json
{
    "Model": "BERT",
    "Framework": "PyTorch",
    "Total_Parameters_Millions": 109.51,
    "Model_Size_MB": 840.09,
    "Architecture_type": "BertForMaskedLM",
    "Model_Type": "bert",
    "Number_of_hidden_Layers": 12,
    "Precision": "FP32",
    "Vocabulary_Size": 30522,
    "Number_of_Attention_Layers": 12,
    "Activation_Function": "gelu",
    "FLOPs": 1024.0
}
```

**Response:**
```json
{
    "status": "success",
    "performance_results": [
        {
            "hardware_id": 1,
            "hardware": "A100",
            "full_name": "NVIDIA A100 Tensor Core GPU",
            "latency_ms": 40.35,
            "throughput_qps": 24.78,
            "cost_per_1000": 0.0230,
            "memory_gb": 40.0
        },
        {
            "hardware_id": 2,
            "hardware": "H100",
            "full_name": "NVIDIA H100 Tensor Core GPU",
            "latency_ms": 37.65,
            "throughput_qps": 26.56,
            "cost_per_1000": 0.0314,
            "memory_gb": 80.0
        },
        {
            "hardware_id": 3,
            "hardware": "A10",
            "full_name": "NVIDIA A10 GPU",
            "latency_ms": 403.15,
            "throughput_qps": 2.48,
            "cost_per_1000": 0.0844,
            "memory_gb": 24.0
        }
    ]
}
```

### Hardware Management
- **GET** `/api/hardware/` - Get all hardware configurations
- **GET** `/api/hardware/{hardware_id}` - Get hardware configuration by ID
- **POST** `/api/hardware/populate-database` - Populate hardware database with CSV data

### Monitoring & Metrics
- **POST** `/api/monitoring/push-metrics` - Push single metrics data point to buffer
- **POST** `/api/monitoring/push-metrics-batch` - Push multiple metrics data points to buffer
- **GET** `/api/monitoring/metrics` - Get metrics data with filtering capabilities
- **GET** `/api/monitoring/metrics-summary` - Get summary statistics for metrics data
- **POST** `/api/monitoring/force-process-batch` - Force process the current buffer immediately
- **GET** `/api/monitoring/buffer-status` - Get current buffer status

### Database Population
- **POST** `/api/model/populate-database` - Populate model database with CSV data

## Monitoring Endpoints Details

### Push Metrics Data
**POST** `/api/monitoring/push-metrics`

**Request Body:**
```json
{
    "hardware_id": 1,
    "cpu_usage_percent": 45.5,
    "gpu_usage_percent": 78.2,
    "memory_usage_percent": 62.3,
    "temperature_cpu": 65.0,
    "temperature_gpu": 72.5,
    "power_consumption_watts": 125.0,
    "network_usage_mbps": 15.5,
    "disk_usage_percent": 45.2,
    "additional_metrics": {
        "process_count": 156,
        "active_connections": 23
    },
    "timestamp": "2024-01-01T12:00:00Z"
}
```

**Response:**
```json
{
    "status": "success",
    "message": "Metrics data buffered. Buffer size: 1",
    "timestamp": "2024-01-01T12:00:00Z"
}
```

### Push Metrics Batch
**POST** `/api/monitoring/push-metrics-batch`

**Request Body:**
```json
{
    "metrics_data": [
        {
            "hardware_id": 1,
            "cpu_usage_percent": 45.5,
            "gpu_usage_percent": 78.2,
            "memory_usage_percent": 62.3,
            "timestamp": "2024-01-01T12:00:00Z"
        },
        {
            "hardware_id": 2,
            "cpu_usage_percent": 32.1,
            "gpu_usage_percent": 45.8,
            "memory_usage_percent": 58.9,
            "timestamp": "2024-01-01T12:00:00Z"
        }
    ]
}
```

### Get Metrics Data
**GET** `/api/monitoring/metrics`

**Query Parameters:**
- `start_time` (optional): ISO datetime string for start time
- `end_time` (optional): ISO datetime string for end time
- `hardware_id` (optional): Filter by hardware ID
- `limit` (optional): Maximum number of records to return (default: 1000)

**Example Request:**
```
GET /api/monitoring/metrics?start_time=2024-01-01T00:00:00Z&end_time=2024-01-01T23:59:59Z&limit=100
```

**Response:**
```json
{
    "status": "success",
    "metrics": [
        {
            "id": 1,
            "hardware_id": 1,
            "cpu_usage_percent": 45.5,
            "gpu_usage_percent": 78.2,
            "memory_usage_percent": 62.3,
            "temperature_cpu": 65.0,
            "temperature_gpu": 72.5,
            "power_consumption_watts": 125.0,
            "network_usage_mbps": 15.5,
            "disk_usage_percent": 45.2,
            "additional_metrics": {
                "process_count": 156,
                "active_connections": 23
            },
            "timestamp": "2024-01-01T12:00:00Z"
        }
    ],
    "count": 1,
    "filters": {
        "start_time": "2024-01-01T00:00:00Z",
        "end_time": "2024-01-01T23:59:59Z",
        "hardware_id": null,
        "limit": 100
    }
}
```

### Get Metrics Summary
**GET** `/api/monitoring/metrics-summary`

**Query Parameters:**
- `start_time` (optional): ISO datetime string for start time
- `end_time` (optional): ISO datetime string for end time
- `hardware_id` (optional): Filter by hardware ID

**Response:**
```json
{
    "status": "success",
    "summary": {
        "total_records": 1000,
        "avg_cpu_usage": 45.5,
        "avg_gpu_usage": 78.2,
        "avg_memory_usage": 62.3,
        "max_cpu_usage": 95.0,
        "max_gpu_usage": 100.0,
        "max_memory_usage": 85.0,
        "earliest_timestamp": "2024-01-01T00:00:00Z",
        "latest_timestamp": "2024-01-01T23:59:59Z"
    },
    "filters": {
        "start_time": "2024-01-01T00:00:00Z",
        "end_time": "2024-01-01T23:59:59Z",
        "hardware_id": null
    }
}
```

### Buffer Status
**GET** `/api/monitoring/buffer-status`

**Response:**
```json
{
    "status": "success",
    "buffer_size": 150,
    "buffer_capacity": 10000,
    "last_batch_time": 1704067200.0,
    "time_since_last_batch": 1800.0,
    "batch_interval": 3600
}
```

### Post-Deployment Optimization
**POST** `/api/deployment/post-deployment-optimization`

This endpoint analyzes current resource metrics and runtime parameters to recommend the top 3 hardware configurations optimized for memory, latency, and FP16 performance.

**Request Body:**
```json
{
    "cpu_usage_percent": 75.5,
    "gpu_usage_percent": 85.2,
    "memory_usage_percent": 68.3,
    "temperature_cpu": 65.0,
    "temperature_gpu": 78.5,
    "power_consumption_watts": 450.0,
    "network_usage_mbps": 125.5,
    "disk_usage_percent": 45.2,
    "current_latency_ms": 150.0,
    "current_throughput_qps": 25.5,
    "current_memory_gb": 12.5,
    "current_cost_per_1000": 2.5,
    "target_fp16_performance": true,
    "optimization_priority": "balanced"
}
```

**Response:**
```json
{
    "status": "success",
    "optimization_results": [
        {
            "hardware_id": 1,
            "hardware": "A100",
            "full_name": "NVIDIA A100 Tensor Core GPU",
            "optimization_scores": {
                "memory_score": 8.5,
                "latency_score": 9.5,
                "fp16_score": 10.0,
                "overall_score": 9.3
            },
            "projected_performance": {
                "latency_ms": 45.0,
                "memory_gb": 8.0,
                "cost_per_1000": 1.0,
                "fp16_support": true
            },
            "current_vs_projected": {
                "latency_improvement_percent": 70.0,
                "memory_improvement_percent": 36.0,
                "cost_improvement_percent": 60.0
            }
        }
    ],
    "analysis_summary": {
        "total_hardware_evaluated": 10,
        "optimization_priority": "balanced",
        "current_performance_baseline": {
            "latency_ms": 150.0,
            "memory_gb": 12.5,
            "cost_per_1000": 2.5
        }
    }
}
```

**Optimization Priority Options:**
- `"memory"` - Prioritize memory optimization
- `"latency"` - Prioritize latency optimization  
- `"fp16"` - Prioritize FP16 performance
- `"balanced"` - Balanced optimization (default)

### Unified Hardware Optimization
**POST** `/api/deployment/post-deployment-optimization`

This unified endpoint handles both pre-deployment and post-deployment hardware optimization workflows.

**Pre-Deployment Workflow:**
Uses workload parameters to recommend hardware configurations before deployment.

**Request Body (Pre-Deployment):**
```json
{
    "model_type": "bert",
    "framework": "PyTorch",
    "task_type": "inference",
    "model_size_mb": 840.09,
    "parameters_millions": 109.51,
    "flops_billions": 1024.0,
    "batch_size": 32,
    "latency_requirement_ms": 100.0,
    "throughput_requirement_qps": 50.0,
    "target_fp16_performance": true,
    "optimization_priority": "balanced"
}
```

**Response (Pre-Deployment):**
```json
{
    "status": "success",
    "workflow_type": "pre_deployment",
    "optimization_results": [
        {
            "hardware_id": 1,
            "hardware": "A100",
            "full_name": "NVIDIA A100 Tensor Core GPU",
            "optimization_scores": {
                "memory_score": 8.5,
                "latency_score": 9.5,
                "fp16_score": 10.0,
                "cost_score": 8.0,
                "overall_score": 9.0
            },
            "projected_performance": {
                "latency_ms": 30.7,
                "memory_gb": 0.8,
                "cost_per_1000": 1.0,
                "throughput_qps": 1041.7,
                "fp16_support": true
            },
            "requirements_met": {
                "latency_requirement": true,
                "throughput_requirement": true
            }
        }
    ],
    "analysis_summary": {
        "total_hardware_evaluated": 10,
        "optimization_priority": "balanced",
        "workload_requirements": {
            "model_type": "bert",
            "framework": "PyTorch",
            "task_type": "inference",
            "model_size_mb": 840.09,
            "parameters_millions": 109.51,
            "flops_billions": 1024.0,
            "batch_size": 32,
            "latency_requirement_ms": 100.0,
            "throughput_requirement_qps": 50.0
        }
    }
}
```

**Post-Deployment Workflow:**
Uses resource metrics and runtime parameters to optimize existing deployment.

**Request Body (Post-Deployment):**
```json
{
    "cpu_usage_percent": 75.5,
    "gpu_usage_percent": 85.2,
    "memory_usage_percent": 68.3,
    "temperature_cpu": 65.0,
    "temperature_gpu": 78.5,
    "power_consumption_watts": 450.0,
    "network_usage_mbps": 125.5,
    "disk_usage_percent": 45.2,
    "current_latency_ms": 150.0,
    "current_throughput_qps": 25.5,
    "current_memory_gb": 12.5,
    "current_cost_per_1000": 2.5,
    "target_fp16_performance": true,
    "optimization_priority": "balanced"
}
```

**Response (Post-Deployment):**
```json
{
    "status": "success",
    "workflow_type": "post_deployment",
    "optimization_results": [
        {
            "hardware_id": 1,
            "hardware": "A100",
            "full_name": "NVIDIA A100 Tensor Core GPU",
            "optimization_scores": {
                "memory_score": 8.5,
                "latency_score": 9.5,
                "fp16_score": 10.0,
                "overall_score": 9.3
            },
            "projected_performance": {
                "latency_ms": 45.0,
                "memory_gb": 8.0,
                "cost_per_1000": 1.0,
                "fp16_support": true
            },
            "current_vs_projected": {
                "latency_improvement_percent": 70.0,
                "memory_improvement_percent": 36.0,
                "cost_improvement_percent": 60.0
            }
        }
    ],
    "analysis_summary": {
        "total_hardware_evaluated": 10,
        "optimization_priority": "balanced",
        "current_performance_baseline": {
            "latency_ms": 150.0,
            "memory_gb": 12.5,
            "cost_per_1000": 2.5
        }
    }
}
```

**Workflow Detection:**
The endpoint automatically determines the workflow type based on provided parameters:
- **Pre-Deployment**: When only workload parameters are provided (model_type, framework, etc.)
- **Post-Deployment**: When resource metrics are provided (cpu_usage_percent, current_latency_ms, etc.)

**Optimization Priority Options:**
- `"memory"` - Prioritize memory optimization
- `"latency"` - Prioritize latency optimization  
- `"fp16"` - Prioritize FP16 performance
- `"cost"` - Prioritize cost optimization (pre-deployment only)
- `"balanced"` - Balanced optimization (default)

## VM Metrics Endpoints

### Push VM Metrics
**POST** `/api/vm-metrics/push`

Push a single VM metrics record to the database.

**Request Body:**
```json
{
    "timestamp": "2024-01-15T10:30:00Z",
    "VMName": "production-vm-1",
    "CPUUsage": 75,
    "AverageMemoryUsage": 8192
}
```

**Response:**
```json
{
    "success": true,
    "message": "VM metrics data pushed successfully",
    "data": {
        "id": 1,
        "vm_name": "production-vm-1",
        "timestamp": "2024-01-15T10:30:00Z"
    }
}
```

### Push VM Metrics Batch
**POST** `/api/vm-metrics/push-batch`

Push multiple VM metrics records to the database.

**Request Body:**
```json
{
    "vm_metrics": [
        {
            "timestamp": "2024-01-15T10:30:00Z",
            "VMName": "production-vm-1",
            "CPUUsage": 75,
            "AverageMemoryUsage": 8192
        },
        {
            "timestamp": "2024-01-15T10:30:00Z",
            "VMName": "production-vm-2",
            "CPUUsage": 60,
            "AverageMemoryUsage": 4096
        }
    ]
}
```

**Response:**
```json
{
    "success": true,
    "message": "Successfully pushed 2 VM metrics records",
    "count": 2
}
```

### Get VM Metrics
**GET** `/api/vm-metrics`

Retrieve VM metrics data with optional filters.

**Query Parameters:**
- `vm_name` (optional): Filter by VM name
- `start_time` (optional): Start time in ISO format (YYYY-MM-DDTHH:MM:SS)
- `end_time` (optional): End time in ISO format (YYYY-MM-DDTHH:MM:SS)
- `limit` (optional): Maximum number of records to return (default: 1000)

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "timestamp": "2024-01-15T10:30:00Z",
            "vm_name": "production-vm-1",
            "cpu_usage": 75,
            "average_memory_usage": 8192
        }
    ],
    "count": 1
}
```

### Get VM Metrics Summary
**GET** `/api/vm-metrics/summary`

Get summary statistics for VM metrics.

**Query Parameters:**
- `vm_name` (optional): Filter by VM name
- `start_time` (optional): Start time in ISO format
- `end_time` (optional): End time in ISO format

**Response:**
```json
{
    "success": true,
    "summary": {
        "total_records": 100,
        "vm_names": ["production-vm-1", "production-vm-2"],
        "avg_cpu_usage": 65.5,
        "avg_memory_usage": 6144.0
    }
}
```

## Host Process Metrics Endpoints

### Push Host Process Metrics
**POST** `/api/host-process-metrics/push`

Push a single host process metrics record to the database.

**Request Body:**
```json
{
    "timestamp": "2024-01-15T10:30:00Z",
    "process_name": "python.exe",
    "process_id": 1234,
    "username": "admin",
    "status": "running",
    "cpu_usage_percent": 25.5,
    "memory_usage_mb": 512.0,
    "gpu_memory_usage_mb": 1024.0,
    "gpu_utilization_percent": 45.2
}
```

**Response:**
```json
{
    "success": true,
    "message": "Host process metrics data pushed successfully",
    "data": {
        "id": 1,
        "process_name": "python.exe",
        "process_id": 1234,
        "timestamp": "2024-01-15T10:30:00Z"
    }
}
```

### Push Host Process Metrics Batch
**POST** `/api/host-process-metrics/push-batch`

Push multiple host process metrics records to the database.

**Request Body:**
```json
{
    "host_process_metrics": [
        {
            "timestamp": "2024-01-15T10:30:00Z",
            "process_name": "chrome.exe",
            "process_id": 5678,
            "username": "user1",
            "status": "running",
            "cpu_usage_percent": 15.3,
            "memory_usage_mb": 1024.0,
            "gpu_memory_usage_mb": 2048.0,
            "gpu_utilization_percent": 30.1
        },
        {
            "timestamp": "2024-01-15T10:30:00Z",
            "process_name": "firefox.exe",
            "process_id": 9012,
            "username": "user2",
            "status": "running",
            "cpu_usage_percent": 20.7,
            "memory_usage_mb": 768.0,
            "gpu_memory_usage_mb": 1536.0,
            "gpu_utilization_percent": 35.8
        }
    ]
}
```

**Response:**
```json
{
    "success": true,
    "message": "Successfully pushed 2 host process metrics records",
    "count": 2
}
```

### Get Host Process Metrics
**GET** `/api/host-process-metrics`

Retrieve host process metrics data with optional filters.

**Query Parameters:**
- `process_name` (optional): Filter by process name
- `process_id` (optional): Filter by process ID
- `username` (optional): Filter by username
- `start_time` (optional): Start time in ISO format (YYYY-MM-DDTHH:MM:SS)
- `end_time` (optional): End time in ISO format (YYYY-MM-DDTHH:MM:SS)
- `limit` (optional): Maximum number of records to return (default: 1000)

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "timestamp": "2024-01-15T10:30:00Z",
            "process_name": "python.exe",
            "process_id": 1234,
            "username": "admin",
            "status": "running",
            "cpu_usage_percent": 25.5,
            "memory_usage_mb": 512.0,
            "gpu_memory_usage_mb": 1024.0,
            "gpu_utilization_percent": 45.2
        }
    ],
    "count": 1
}
```

### Get Host Process Metrics Summary
**GET** `/api/host-process-metrics/summary`

Get summary statistics for host process metrics.

**Query Parameters:**
- `process_name` (optional): Filter by process name
- `username` (optional): Filter by username
- `start_time` (optional): Start time in ISO format
- `end_time` (optional): End time in ISO format

**Response:**
```json
{
    "success": true,
    "summary": {
        "total_records": 500,
        "process_names": ["python.exe", "chrome.exe", "firefox.exe"],
        "usernames": ["admin", "user1", "user2"],
        "avg_cpu_usage_percent": 20.3,
        "avg_memory_usage_mb": 768.5,
        "avg_gpu_memory_usage_mb": 1536.2,
        "avg_gpu_utilization_percent": 37.8
    }
}
```

## Setup Instructions

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up PostgreSQL Databases:**
   - Create a database named `Model_Recommendation_DB`
   - Create a database named `Metrics_db`
   - Update the database URLs in `app/database.py` if needed

3. **Populate Database:**
   ```bash
   python populate_model_db.py
   ```

4. **Run the API:**
   ```bash
   python run.py
   ```

5. **Test the API:**
   ```bash
   python test_model_api.py
   ```

## File Structure

```
backend/
├── app/
│   ├── database.py          # Database configuration
│   └── models/
│       ├── __init__.py
│       ├── model_info.py    # ModelInfo database model
│       └── ...
├── controllers/
│   ├── __init__.py
│   ├── model_controller.py  # Model-related business logic
│   └── ...
├── views/
│   ├── __init__.py
│   ├── model_api_routes.py  # API routes for model endpoints
│   └── ...
├── populate_model_db.py     # Script to populate database
├── test_model_api.py        # Test script for API endpoints
├── run.py                   # Main application entry point
└── requirements.txt         # Python dependencies
```

## Usage Flow

1. **User selects Model Type and Task Type** in the UI
2. **UI calls** `/api/model/get-model-data` with the selections
3. **Backend returns** model data to populate the form fields
4. **User clicks "Simulate Performance"** button
5. **UI calls** `/api/model/simulate-performance` with all form data
6. **Backend returns** top 3 performing hardware configurations with performance metrics
7. **UI displays** the results in a table format showing Hardware, Full Name, Latency, Throughput, Cost per 1000, and Memory

## Notes

- The system uses placeholder functions for performance calculations
- Model pickle files are stored as binary data in the database
- The API maintains the MVC structure with clear separation of concerns
- All unnecessary API routes have been removed as requested 