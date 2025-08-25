from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
import json

from app.database import get_db, get_metrics_db, get_timescaledb, init_db, get_db_stats, check_db_connection
from controllers.model_controller import ModelController
from controllers.hardware_info_controller import HardwareInfoController
from controllers.monitoring_controller import MonitoringController
from controllers.vm_metrics_controller import VMMetricsController
from controllers.host_process_metrics_controller import HostProcessMetricsController
from controllers.hardware_specs_controller import HardwareSpecsController
from controllers.host_overall_metrics_controller import HostOverallMetricsController
from controllers.model_inference_controller import ModelInferenceController
from controllers.cost_models_controller import CostModelsController
from controllers.cost_calculation_engine import CostCalculationEngine
from controllers.recommendation_engine import RecommendationEngine
from controllers.vm_process_metrics_controller import VMProcessMetricsController

# Pydantic models for request/response validation
class ModelTypeTaskRequest(BaseModel):
    model_type: str
    task_type: str

class SimulationRequest(BaseModel):
    Model: str
    Framework: str
    Task_Type: str
    Total_Parameters_Millions: float
    Model_Size_MB: float
    Architecture_type: str
    Model_Type: str
    Embedding_Vector_Dimension: int
    Precision: str
    Vocabulary_Size: int
    FFN_Dimension: int
    Activation_Function: str
    FLOPs: float

class PostDeploymentRequest(BaseModel):
    # Model characteristics - exact field names as required by pickle model
    model_name: str = Field(..., alias="Model Name")
    framework: str = Field(..., alias="Framework") 
    parameters_millions: float = Field(..., alias="Total Parameters (Millions)")
    model_size_mb: float = Field(..., alias="Model Size (MB)")
    architecture_type: str = Field(..., alias="Architecture type")
    model_type: str = Field(..., alias="Model Type")
    precision: str = Field(..., alias="Precision")
    vocabulary_size: int = Field(..., alias="Vocabulary Size")
    activation_function: str = Field(..., alias="Activation Function")
    
    # Resource metrics - exact field names as required by pickle model  
    gpu_memory_usage: float
    cpu_memory_usage: float
    cpu_utilization: float
    gpu_utilization: float
    disk_iops: float
    network_bandwidth: float
    current_hardware_id: str
    
    class Config:
        allow_population_by_field_name = True

class MetricsDataRequest(BaseModel):
    hardware_id: int
    cpu_usage_percent: float
    gpu_usage_percent: Optional[float] = None
    memory_usage_percent: float
    temperature_cpu: Optional[float] = None
    temperature_gpu: Optional[float] = None
    power_consumption_watts: Optional[float] = None
    network_usage_mbps: Optional[float] = None
    disk_usage_percent: Optional[float] = None
    additional_metrics: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None

class MetricsBatchRequest(BaseModel):
    metrics_data: List[MetricsDataRequest]

# New Pydantic models for VM and Host Process metrics
class VMMetricsRequest(BaseModel):
    timestamp: Optional[datetime] = None
    VMName: str
    CPUUsage: Optional[int] = None
    AverageMemoryUsage: Optional[int] = None

class VMMetricsBatchRequest(BaseModel):
    vm_metrics: List[VMMetricsRequest]

class HostProcessMetricsRequest(BaseModel):
    timestamp: Optional[datetime] = None
    process_name: Optional[str] = None
    process_id: int
    username: Optional[str] = None
    status: Optional[str] = None
    cpu_usage_percent: float
    memory_usage_mb: float
    gpu_memory_usage_mb: float
    gpu_utilization_percent: float

class HostProcessMetricsBatchRequest(BaseModel):
    host_process_metrics: List[HostProcessMetricsRequest]

# Hardware Specifications Pydantic models
class HardwareSpecsRequest(BaseModel):
    timestamp: Optional[datetime] = None
    os_name: str
    os_version: str
    os_architecture: str
    cpu_brand: str
    cpu_model: str
    cpu_family: Optional[int] = None
    cpu_model_family: Optional[int] = None
    cpu_physical_cores: int
    cpu_total_cores: int
    cpu_sockets: int
    cpu_cores_per_socket: int
    cpu_threads_per_core: float
    total_ram_gb: float
    total_storage_gb: float
    gpu_cuda_cores: Optional[str] = None
    gpu_brand: Optional[str] = None
    gpu_model: Optional[str] = None
    gpu_driver_version: Optional[str] = None
    gpu_vram_total_mb: Optional[float] = None
    region: Optional[str] = 'US'

class HardwareSpecsBatchRequest(BaseModel):
    hardware_specs: List[HardwareSpecsRequest]

class OverallHostMetricsRequest(BaseModel):
    host_cpu_usage_percent: Optional[float] = 0
    host_ram_usage_percent: float
    host_gpu_utilization_percent: Optional[float] = 0
    host_gpu_memory_utilization_percent: Optional[float] = 0
    host_gpu_temperature_celsius: Optional[float] = 0
    host_gpu_power_draw_watts: Optional[float] = 0

class HostProcessRequest(BaseModel):
    timestamp: str
    process_name: str
    process_id: int
    username: Optional[str] = None
    status: Optional[str] = None
    start_time: Optional[str] = None
    cpu_usage_percent: float
    memory_usage_mb: float
    memory_usage_percent: float
    read_bytes: int
    write_bytes: int
    iops: float
    open_files: int
    gpu_memory_usage_mb: float
    gpu_utilization_percent: float
    estimated_power_watts: Optional[float] = 0

class VMMetricsSnapshotRequest(BaseModel):
    timestamp: str
    VMName: str
    CPUUsage: Optional[float] = 0
    AverageMemoryUsage: Optional[float] = 0

class MetricsSnapshotRequest(BaseModel):
    timestamp: str
    overall_host_metrics: OverallHostMetricsRequest
    host_processes: List[HostProcessRequest]
    vm_metrics: List[VMMetricsSnapshotRequest]

class ModelInferenceRequest(BaseModel):
    model_type: str
    task_type: str
    hardware_type: Optional[str] = None
    input_data: Optional[Dict[str, Any]] = None

class ModelTrainingRequest(BaseModel):
    model_type: str
    hardware_type: Optional[str] = None
    training_parameters: Optional[Dict[str, Any]] = None

class ModelOptimizationRequest(BaseModel):
    Model_Name: str
    Framework: str
    Total_Parameters_Millions: float
    Model_Size_MB: float
    Architecture_type: str
    Model_Type: str
    Number_of_hidden_Layers: int
    Precision: str
    Vocabulary_Size: int
    Number_of_Attention_Layers: int
    Activation_Function: str

# Cost Management Pydantic models
class CostModelRequest(BaseModel):
    resource_name: str
    cost_per_unit: float
    currency: Optional[str] = 'USD'
    region: str
    description: Optional[str] = None
    effective_date: Optional[str] = None

class CostModelUpdateRequest(BaseModel):
    resource_name: Optional[str] = None
    cost_per_unit: Optional[float] = None
    currency: Optional[str] = None
    region: Optional[str] = None
    description: Optional[str] = None
    effective_date: Optional[str] = None

class CostModelBatchRequest(BaseModel):
    cost_models: List[CostModelRequest]

# VM Snapshot Pydantic models
class VMProcessMetricRequest(BaseModel):
    timestamp: str
    process_name: Optional[str] = None
    process_id: int
    username: Optional[str] = None
    status: Optional[str] = None
    start_time: Optional[str] = None
    cpu_usage_percent: float
    memory_usage_mb: float
    memory_usage_percent: float
    read_bytes: int
    write_bytes: int
    iops: float
    open_files: int
    gpu_memory_usage_mb: float
    gpu_utilization_percent: float
    estimated_power_watts: Optional[float] = 0
    vm_name: str

class VMSnapshotRequest(BaseModel):
    timestamp: str
    vm_name: str
    process_metrics: List[VMProcessMetricRequest]
    agent_version: Optional[str] = None
    platform: Optional[str] = None
    metrics_count: Optional[int] = None

# Initialize FastAPI app
app = FastAPI(
    title="Model Optimization API",
    description="FastAPI backend for model performance simulation",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize controllers
model_controller = ModelController()
hardware_controller = HardwareInfoController()
monitoring_controller = MonitoringController()
vm_metrics_controller = VMMetricsController()
host_process_metrics_controller = HostProcessMetricsController()
hardware_specs_controller = HardwareSpecsController()
host_overall_metrics_controller = HostOverallMetricsController()
model_inference_controller = ModelInferenceController()
cost_models_controller = CostModelsController()
cost_calculation_engine = CostCalculationEngine()
recommendation_engine = RecommendationEngine()
vm_process_metrics_controller = VMProcessMetricsController()

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize database and services on startup"""
    try:
        init_db()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization failed: {e}")

# Health check endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Model Optimization API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    db_status = check_db_connection()
    
    return {
        "status": "healthy" if db_status else "unhealthy",
        "database": "connected" if db_status else "disconnected",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/status")
async def api_status():
    """Detailed API status"""
    db_stats = get_db_stats()
    
    return {
        "api_status": "running",
        "database": db_stats,
        "timestamp": datetime.utcnow().isoformat()
    }

# Model endpoints
@app.post("/api/model/get-model-data", response_model=Dict[str, Any])
async def get_model_data(
    request: ModelTypeTaskRequest,
    db: Session = Depends(get_db)
):
    """Get model data based on model type and task type"""
    result = model_controller.get_model_by_type_and_task(
        db, 
        request.model_type, 
        request.task_type
    )
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result

@app.post("/api/model/simulate-performance", response_model=Dict[str, Any])
async def simulate_performance(
    request: SimulationRequest,
    db: Session = Depends(get_db)
):
    """Simulate performance and return top 3 performing hardware configurations"""
    # Convert Pydantic model to dict for the controller
    user_input = {
        'Model': request.Model,
        'Framework': request.Framework,
        'Task Type': request.Task_Type,
        'Total Parameters (Millions)': request.Total_Parameters_Millions,
        'Model Size (MB)': request.Model_Size_MB,
        'Architecture type': request.Architecture_type,
        'Model Type': request.Model_Type,
        'Embedding Vector Dimension (Hidden Size)': request.Embedding_Vector_Dimension,
        'Precision': request.Precision,
        'Vocabulary Size': request.Vocabulary_Size,
        'FFN (MLP) Dimension': request.FFN_Dimension,
        'Activation Function': request.Activation_Function,
        'FLOPs': request.FLOPs
    }
    
    result = model_controller.simulate_performance(db, user_input)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

# Model inference endpoints
@app.post("/api/model/inference", response_model=Dict[str, Any])
async def perform_model_inference(
    request: ModelInferenceRequest,
    db: Session = Depends(get_db)
):
    """Perform actual model inference using loaded pickled models"""
    result = model_inference_controller.perform_inference(
        db=db,
        model_type=request.model_type,
        task_type=request.task_type,
        hardware_type=request.hardware_type,
        input_data=request.input_data
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@app.post("/api/model/training", response_model=Dict[str, Any])
async def perform_model_training(
    request: ModelTrainingRequest,
    db: Session = Depends(get_db)
):
    """Perform actual model training simulation using loaded pickled models"""
    result = model_inference_controller.perform_inference(
        db=db,
        model_type=request.model_type,
        task_type="training",
        hardware_type=request.hardware_type,
        input_data=request.training_parameters
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@app.get("/api/model/available-models", response_model=Dict[str, Any])
async def get_available_models():
    """Get information about available loaded models"""
    result = model_inference_controller.get_available_models()
    return result

@app.post("/api/model/reload-models", response_model=Dict[str, Any])
async def reload_models():
    """Reload all models from disk"""
    result = model_inference_controller.reload_models()
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@app.post("/api/model/optimization-recommendation", response_model=Dict[str, Any])
async def get_model_optimization_recommendation(
    request: ModelOptimizationRequest,
    db: Session = Depends(get_db)
):
    """Get model optimization recommendations for method and precision"""
    try:
        # Convert request to the format expected by the inference controller
        optimizer_input = {
            'Model Name': request.Model_Name,
            'Framework': request.Framework,
            'Total Parameters (Millions)': request.Total_Parameters_Millions,
            'Model Size (MB)': request.Model_Size_MB,
            'Architecture type': request.Architecture_type,
            'Model Type': request.Model_Type,
            'Number of hidden Layers': request.Number_of_hidden_Layers,
            'Precision': request.Precision,
            'Vocabulary Size': request.Vocabulary_Size,
            'Number of Attention Layers': request.Number_of_Attention_Layers,
            'Activation Function': request.Activation_Function
        }
        
        # Use the inference controller to get optimization recommendations
        result = model_inference_controller.get_optimization_recommendation(
            db=db,
            optimizer_input=optimizer_input
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization recommendation failed: {str(e)}")

@app.post("/api/model/populate-database", response_model=Dict[str, Any])
async def populate_model_database(
    csv_data: List[Dict[str, Any]] = Body(...),
    db: Session = Depends(get_db)
):
    """Populate the model database with data from CSV"""
    result = model_controller.populate_model_database(db, csv_data)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@app.post("/api/model/clear-database", response_model=Dict[str, Any])
async def clear_model_database(db: Session = Depends(get_db)):
    """Clear all model data from the database"""
    try:
        from app.models import ModelInfo
        # Delete all records from the Model_table
        db.query(ModelInfo).delete()
        db.commit()
        return {"status": "success", "message": "Database cleared successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear database: {str(e)}")

# Hardware endpoints
@app.get("/api/hardware/", response_model=Dict[str, Any])
async def get_all_hardware(db: Session = Depends(get_db)):
    """Get all hardware configurations"""
    result = hardware_controller.get_all_hardware(db)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@app.get("/api/hardware/{hardware_id}", response_model=Dict[str, Any])
async def get_hardware_by_id(hardware_id: int, db: Session = Depends(get_db)):
    """Get hardware configuration by ID"""
    result = hardware_controller.get_hardware_by_id(db, hardware_id)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result

@app.post("/api/hardware/populate-database", response_model=Dict[str, Any])
async def populate_hardware_database(
    csv_data: List[Dict[str, Any]] = Body(...),
    db: Session = Depends(get_db)
):
    """Populate the hardware database with data from CSV"""
    result = hardware_controller.populate_hardware_database(db, csv_data)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

# Monitoring endpoints
@app.post("/api/monitoring/push-metrics", response_model=Dict[str, Any])
async def push_metrics_data(
    request: MetricsDataRequest,
    db: Session = Depends(get_metrics_db)
):
    """Push single metrics data point to buffer for batch processing"""
    # Convert Pydantic model to dict
    metrics_data = {
        'hardware_id': request.hardware_id,
        'cpu_usage_percent': request.cpu_usage_percent,
        'gpu_usage_percent': request.gpu_usage_percent,
        'memory_usage_percent': request.memory_usage_percent,
        'temperature_cpu': request.temperature_cpu,
        'temperature_gpu': request.temperature_gpu,
        'power_consumption_watts': request.power_consumption_watts,
        'network_usage_mbps': request.network_usage_mbps,
        'disk_usage_percent': request.disk_usage_percent,
        'additional_metrics': request.additional_metrics,
        'timestamp': request.timestamp
    }
    
    result = monitoring_controller.push_metrics_data(db, metrics_data)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@app.post("/api/monitoring/push-metrics-batch", response_model=Dict[str, Any])
async def push_metrics_batch(
    request: MetricsBatchRequest,
    db: Session = Depends(get_metrics_db)
):
    """Push multiple metrics data points to buffer for batch processing"""
    # Convert Pydantic models to dicts
    metrics_batch = []
    for metrics_data in request.metrics_data:
        metrics_batch.append({
            'hardware_id': metrics_data.hardware_id,
            'cpu_usage_percent': metrics_data.cpu_usage_percent,
            'gpu_usage_percent': metrics_data.gpu_usage_percent,
            'memory_usage_percent': metrics_data.memory_usage_percent,
            'temperature_cpu': metrics_data.temperature_cpu,
            'temperature_gpu': metrics_data.temperature_gpu,
            'power_consumption_watts': metrics_data.power_consumption_watts,
            'network_usage_mbps': metrics_data.network_usage_mbps,
            'disk_usage_percent': metrics_data.disk_usage_percent,
            'additional_metrics': metrics_data.additional_metrics,
            'timestamp': metrics_data.timestamp
        })
    
    result = monitoring_controller.push_metrics_batch(db, metrics_batch)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@app.get("/api/monitoring/metrics", response_model=Dict[str, Any])
async def get_metrics_data(
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    hardware_id: Optional[int] = None,
    time_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    start_time_str: Optional[str] = None,
    end_time_str: Optional[str] = None,
    limit: int = 1000,
    db: Session = Depends(get_metrics_db)
):
    """Get metrics data with filtering capabilities, time-based filtering, and date range filtering"""
    # Parse datetime strings
    start_dt = None
    end_dt = None
    
    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_time format. Use ISO format.")
    
    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_time format. Use ISO format.")
    
    result = monitoring_controller.get_metrics_data(
        db, start_dt, end_dt, hardware_id, time_filter, 
        start_date, end_date, start_time_str, end_time_str, limit
    )
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@app.get("/api/monitoring/metrics-summary", response_model=Dict[str, Any])
async def get_metrics_summary(
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    hardware_id: Optional[int] = None,
    time_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    start_time_str: Optional[str] = None,
    end_time_str: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get summary statistics for metrics data with time-based filtering and date range filtering"""
    # Parse datetime strings
    start_dt = None
    end_dt = None
    
    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_time format. Use ISO format.")
    
    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_time format. Use ISO format.")
    
    result = monitoring_controller.get_metrics_summary(
        db, start_dt, end_dt, hardware_id, time_filter,
        start_date, end_date, start_time_str, end_time_str
    )
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@app.post("/api/monitoring/force-process-batch", response_model=Dict[str, Any])
async def force_process_batch(db: Session = Depends(get_metrics_db)):
    """Force process the current buffer immediately"""
    result = monitoring_controller.force_process_batch(db)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@app.get("/api/monitoring/buffer-status", response_model=Dict[str, Any])
async def get_buffer_status():
    """Get current buffer status"""
    result = monitoring_controller.get_buffer_status()
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@app.post("/api/deployment/post-deployment-optimization", response_model=Dict[str, Any])
async def post_deployment_optimization(
    request: PostDeploymentRequest,
    db: Session = Depends(get_db)
):
    """
    Unified endpoint for both pre-deployment and post-deployment hardware optimization.
    
    Pre-deployment: Uses workload parameters to recommend hardware configurations
    Post-deployment: Uses resource metrics and runtime parameters to optimize existing deployment
    
    Determines workflow type based on provided parameters:
    - If resource metrics are provided: Post-deployment optimization
    - If only workload parameters are provided: Pre-deployment optimization
    """
    try:
        # Determine if this is post-deployment (always true now since we have the required fields)
        is_post_deployment = True
        
        if is_post_deployment:
            # Post-deployment workflow - pass the request data directly to the controller
            request_data = {
                "workflow_type": "post_deployment",
                # Pass all the new fields directly as they match the pickle model format
                "model_name": request.model_name,
                "framework": request.framework,
                "parameters_millions": request.parameters_millions,
                "model_size_mb": request.model_size_mb,
                "architecture_type": request.architecture_type,
                "model_type": request.model_type,
                "precision": request.precision,
                "vocabulary_size": request.vocabulary_size,
                "activation_function": request.activation_function,
                "gpu_memory_usage": request.gpu_memory_usage,
                "cpu_memory_usage": request.cpu_memory_usage,
                "cpu_utilization": request.cpu_utilization,
                "gpu_utilization": request.gpu_utilization,
                "disk_iops": request.disk_iops,
                "network_bandwidth": request.network_bandwidth,
                "current_hardware_id": request.current_hardware_id
            }
        else:
            # Pre-deployment workflow
            request_data = {
                "workflow_type": "pre_deployment",
                "workload_parameters": {
                    "model_type": request.model_type,
                    "framework": request.framework,
                    "task_type": request.task_type,
                    "model_size_mb": request.model_size_mb,
                    "parameters_millions": request.parameters_millions,
                    "flops_billions": request.flops_billions,
                    "batch_size": request.batch_size,
                    "latency_requirement_ms": request.latency_requirement_ms,
                    "throughput_requirement_qps": request.throughput_requirement_qps,
                    "target_fp16_performance": request.target_fp16_performance,
                    "optimization_priority": request.optimization_priority
                }
            }
        
        result = model_controller.hardware_optimization(db, request_data)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hardware optimization failed: {str(e)}") 

# VM Metrics endpoints
@app.post("/api/vm-metrics/push")
def push_vm_metrics(vm_metrics: VMMetricsRequest, db: Session = Depends(get_metrics_db)):
    """Push VM metrics data to database"""
    return vm_metrics_controller.push_vm_metrics(db, vm_metrics.dict())

@app.post("/api/vm-metrics/push-batch")
def push_vm_metrics_batch(vm_metrics_batch: VMMetricsBatchRequest, db: Session = Depends(get_metrics_db)):
    """Push a batch of VM metrics data to database"""
    vm_metrics_list = [metrics.dict() for metrics in vm_metrics_batch.vm_metrics]
    return vm_metrics_controller.push_vm_metrics_batch(db, vm_metrics_list)

@app.get("/api/vm-metrics")
def get_vm_metrics(
    vm_name: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    time_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    start_time_str: Optional[str] = None,
    end_time_str: Optional[str] = None,
    limit: int = 1000,
    db: Session = Depends(get_metrics_db)
):
    """Get VM metrics data with optional filters, time-based filtering, and date range filtering"""
    # Parse datetime strings
    start_dt = None
    end_dt = None
    
    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        except ValueError:
            return {"error": "Invalid start_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}
    
    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            return {"error": "Invalid end_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}
    
    return vm_metrics_controller.get_vm_metrics(
        db, vm_name=vm_name, start_time=start_dt, end_time=end_dt, time_filter=time_filter,
        start_date=start_date, end_date=end_date, start_time_str=start_time_str, end_time_str=end_time_str, limit=limit
    )

@app.get("/api/vm-metrics/summary")
def get_vm_metrics_summary(
    vm_name: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    time_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    start_time_str: Optional[str] = None,
    end_time_str: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get summary statistics for VM metrics with time-based filtering and date range filtering"""
    # Parse datetime strings
    start_dt = None
    end_dt = None
    
    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        except ValueError:
            return {"error": "Invalid start_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}
    
    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            return {"error": "Invalid end_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}
    
    return vm_metrics_controller.get_vm_metrics_summary(
        db, vm_name=vm_name, start_time=start_dt, end_time=end_dt, time_filter=time_filter,
        start_date=start_date, end_date=end_date, start_time_str=start_time_str, end_time_str=end_time_str
    )

# Host Process Metrics endpoints
@app.post("/api/host-process-metrics/push")
def push_host_process_metrics(host_process_metrics: HostProcessMetricsRequest, db: Session = Depends(get_metrics_db)):
    """Push host process metrics data to database"""
    return host_process_metrics_controller.push_host_process_metrics(db, host_process_metrics.dict())

@app.post("/api/host-process-metrics/push-batch")
def push_host_process_metrics_batch(host_process_metrics_batch: HostProcessMetricsBatchRequest, db: Session = Depends(get_metrics_db)):
    """Push a batch of host process metrics data to database"""
    host_process_metrics_list = [metrics.dict() for metrics in host_process_metrics_batch.host_process_metrics]
    return host_process_metrics_controller.push_host_process_metrics_batch(db, host_process_metrics_list)

@app.get("/api/host-process-metrics")
def get_host_process_metrics(
    process_name: Optional[str] = None,
    process_id: Optional[int] = None,
    username: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    time_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    start_time_str: Optional[str] = None,
    end_time_str: Optional[str] = None,
    limit: int = 1000,
    db: Session = Depends(get_metrics_db)
):
    """Get host process metrics data with optional filters, time-based filtering, and date range filtering"""
    # Parse datetime strings
    start_dt = None
    end_dt = None
    
    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        except ValueError:
            return {"error": "Invalid start_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}
    
    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            return {"error": "Invalid end_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}
    
    return host_process_metrics_controller.get_host_process_metrics(
        db, process_name=process_name, process_id=process_id, username=username,
        start_time=start_dt, end_time=end_dt, time_filter=time_filter,
        start_date=start_date, end_date=end_date, start_time_str=start_time_str, end_time_str=end_time_str, limit=limit
    )

@app.get("/api/host-process-metrics/summary")
def get_host_process_metrics_summary(
    process_name: Optional[str] = None,
    username: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    time_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    start_time_str: Optional[str] = None,
    end_time_str: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get summary statistics for host process metrics with time-based filtering and date range filtering"""
    # Parse datetime strings
    start_dt = None
    end_dt = None
    
    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        except ValueError:
            return {"error": "Invalid start_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}
    
    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            return {"error": "Invalid end_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}
    
    return host_process_metrics_controller.get_host_process_metrics_summary(
        db, process_name=process_name, username=username, 
        start_time=start_dt, end_time=end_dt, time_filter=time_filter,
        start_date=start_date, end_date=end_date, start_time_str=start_time_str, end_time_str=end_time_str
    )

@app.get("/api/host-process-metrics/available-dates")
def get_host_process_metrics_available_dates(
    days_back: int = 30,
    db: Session = Depends(get_metrics_db)
):
    """Get dates that have data entries in the host process metrics table"""
    return host_process_metrics_controller.get_available_dates(db, days_back=days_back)

# Time-filtered aggregated endpoints
@app.get("/api/monitoring/metrics-by-time-filter")
async def get_metrics_by_time_filter(
    time_filter: str = 'daily',
    hardware_id: Optional[int] = None,
    group_by_hardware: bool = True,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    start_time_str: Optional[str] = None,
    end_time_str: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get metrics aggregated by time filter (daily, weekly, monthly) or date range"""
    result = monitoring_controller.get_metrics_by_time_filter(
        db, time_filter=time_filter, hardware_id=hardware_id, group_by_hardware=group_by_hardware,
        start_date=start_date, end_date=end_date, start_time_str=start_time_str, end_time_str=end_time_str
    )
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@app.get("/api/vm-metrics/by-time-filter")
def get_vm_metrics_by_time_filter(
    time_filter: str = 'daily',
    vm_name: Optional[str] = None,
    group_by_vm: bool = True,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    start_time_str: Optional[str] = None,
    end_time_str: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get VM metrics aggregated by time filter (daily, weekly, monthly) or date range"""
    result = vm_metrics_controller.get_vm_metrics_by_time_filter(
        db, time_filter=time_filter, vm_name=vm_name, group_by_vm=group_by_vm,
        start_date=start_date, end_date=end_date, start_time_str=start_time_str, end_time_str=end_time_str
    )
    
    if not result.get("success", False):
        raise HTTPException(status_code=500, detail=result.get("message", "Unknown error"))
    
    return result

@app.get("/api/host-process-metrics/by-time-filter")
def get_host_process_metrics_by_time_filter(
    time_filter: str = 'daily',
    process_name: Optional[str] = None,
    username: Optional[str] = None,
    group_by_process: bool = True,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    start_time_str: Optional[str] = None,
    end_time_str: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get host process metrics aggregated by time filter (daily, weekly, monthly) or date range"""
    result = host_process_metrics_controller.get_host_process_metrics_by_time_filter(
        db, time_filter=time_filter, process_name=process_name, 
        username=username, group_by_process=group_by_process,
        start_date=start_date, end_date=end_date, start_time_str=start_time_str, end_time_str=end_time_str
    )
    
    if not result.get("success", False):
        raise HTTPException(status_code=500, detail=result.get("message", "Unknown error"))
    
        return result

# Hardware Specifications endpoints
@app.post("/api/hardware-specs")
def push_hardware_specs_simple(hardware_specs: HardwareSpecsRequest, db: Session = Depends(get_metrics_db)):
    """Push hardware specifications data to database (simple endpoint for collect_hardware_specs.py)"""
    return hardware_specs_controller.push_hardware_specs(db, hardware_specs.dict())

@app.post("/api/hardware-specs/push")
def push_hardware_specs(hardware_specs: HardwareSpecsRequest, db: Session = Depends(get_metrics_db)):
    """Push hardware specifications data to database"""
    return hardware_specs_controller.push_hardware_specs(db, hardware_specs.dict())

@app.post("/api/hardware-specs/push-batch")
def push_hardware_specs_batch(hardware_specs_batch: HardwareSpecsBatchRequest, db: Session = Depends(get_metrics_db)):
    """Push a batch of hardware specifications data to database"""
    hardware_specs_list = [specs.dict() for specs in hardware_specs_batch.hardware_specs]
    return hardware_specs_controller.push_hardware_specs_batch(db, hardware_specs_list)

@app.get("/api/hardware-specs")
def get_hardware_specs(
    hardware_id: Optional[int] = None,
    cpu_brand: Optional[str] = None,
    gpu_brand: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    time_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    start_time_str: Optional[str] = None,
    end_time_str: Optional[str] = None,
    limit: int = 1000,
    db: Session = Depends(get_metrics_db)
):
    """Get hardware specifications data with optional filters, time-based filtering, and date range filtering"""
    # Parse datetime strings
    start_dt = None
    end_dt = None
    
    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        except ValueError:
            return {"error": "Invalid start_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}
    
    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            return {"error": "Invalid end_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}
    
    return hardware_specs_controller.get_hardware_specs(
        db, hardware_id=hardware_id, cpu_brand=cpu_brand, gpu_brand=gpu_brand,
        start_time=start_dt, end_time=end_dt, time_filter=time_filter,
        start_date=start_date, end_date=end_date, start_time_str=start_time_str, end_time_str=end_time_str, limit=limit
    )

@app.get("/api/hardware-specs/summary")
def get_hardware_specs_summary(
    cpu_brand: Optional[str] = None,
    gpu_brand: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    time_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    start_time_str: Optional[str] = None,
    end_time_str: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get summary statistics for hardware specifications with time-based filtering and date range filtering"""
    # Parse datetime strings
    start_dt = None
    end_dt = None
    
    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        except ValueError:
            return {"error": "Invalid start_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}
    
    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            return {"error": "Invalid end_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}
    
    return hardware_specs_controller.get_hardware_specs_summary(
        db, cpu_brand=cpu_brand, gpu_brand=gpu_brand,
        start_time=start_dt, end_time=end_dt, time_filter=time_filter,
        start_date=start_date, end_date=end_date, start_time_str=start_time_str, end_time_str=end_time_str
    )

@app.get("/api/hardware-specs/latest")
def get_latest_hardware_specs(
    hardware_id: Optional[int] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get the latest hardware specifications for a specific hardware or all"""
    return hardware_specs_controller.get_latest_hardware_specs(db, hardware_id=hardware_id)

@app.get("/api/hardware-specs/by-time-filter")
def get_hardware_specs_by_time_filter(
    time_filter: str = 'daily',
    cpu_brand: Optional[str] = None,
    gpu_brand: Optional[str] = None,
    group_by_cpu: bool = True,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    start_time_str: Optional[str] = None,
    end_time_str: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get hardware specifications aggregated by time filter (daily, weekly, monthly) or date range"""
    result = hardware_specs_controller.get_hardware_specs_by_time_filter(
        db, time_filter=time_filter, cpu_brand=cpu_brand, gpu_brand=gpu_brand, group_by_cpu=group_by_cpu,
        start_date=start_date, end_date=end_date, start_time_str=start_time_str, end_time_str=end_time_str
    )
    
    if not result.get("success", False):
        raise HTTPException(status_code=500, detail=result.get("message", "Unknown error"))
    
    return result

# Metrics Snapshot endpoint for collect_all_metrics.py
@app.post("/api/metrics/snapshot")
def push_metrics_snapshot(snapshot: MetricsSnapshotRequest, db: Session = Depends(get_metrics_db)):
    """Push comprehensive metrics snapshot data to appropriate tables"""
    try:
        # Push overall host metrics to host_overall_metrics table  
        overall_metrics_data = {
            "timestamp": snapshot.timestamp,
            "host_cpu_usage_percent": snapshot.overall_host_metrics.host_cpu_usage_percent,
            "host_ram_usage_percent": snapshot.overall_host_metrics.host_ram_usage_percent,
            "host_gpu_utilization_percent": snapshot.overall_host_metrics.host_gpu_utilization_percent,
            "host_gpu_memory_utilization_percent": snapshot.overall_host_metrics.host_gpu_memory_utilization_percent,
            "host_gpu_temperature_celsius": snapshot.overall_host_metrics.host_gpu_temperature_celsius,
            "host_gpu_power_draw_watts": snapshot.overall_host_metrics.host_gpu_power_draw_watts
        }
        
        overall_metrics_result = host_overall_metrics_controller.push_host_overall_metrics(db, overall_metrics_data)
        
        # Push host processes data to host_process_metrics table
        host_processes_data = [process.dict() for process in snapshot.host_processes]
        host_process_result = host_process_metrics_controller.push_host_process_metrics_batch(db, host_processes_data)
        
        # Push VM metrics data to vm_metrics table
        vm_metrics_data = [vm.dict() for vm in snapshot.vm_metrics]
        if vm_metrics_data:
            vm_result = vm_metrics_controller.push_vm_metrics_batch(db, vm_metrics_data)
        else:
            vm_result = {"success": True, "message": "No VM metrics to process"}
        
        return {
            "success": True,
            "message": "Metrics snapshot processed successfully",
            "results": {
                "overall_host_metrics": overall_metrics_result,
                "host_processes": host_process_result,
                "vm_metrics": vm_result
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to process metrics snapshot: {str(e)}"
        }

# Date range utility endpoints
@app.get("/api/date-range-options")
async def get_date_range_options():
    """Get predefined date range options for UI calendar"""
    from controllers.time_filter_utils import TimeFilterUtils
    return TimeFilterUtils.get_date_range_options()

@app.get("/api/validate-date-range")
async def validate_date_range(
    start_date: str,
    end_date: str
):
    """Validate date range format and logic"""
    from controllers.time_filter_utils import TimeFilterUtils
    is_valid = TimeFilterUtils.validate_date_range(start_date, end_date)
    return {
        "valid": is_valid,
        "start_date": start_date,
        "end_date": end_date,
        "message": "Date range is valid" if is_valid else "Invalid date range. Start date must be before or equal to end date, and dates cannot be in the future."
    }

# =============================================================================
# COST MANAGEMENT AND FINOPS API ENDPOINTS
# =============================================================================

# Cost Models Management endpoints
@app.post("/api/cost-models", response_model=Dict[str, Any])
async def create_cost_model(
    request: CostModelRequest,
    db: Session = Depends(get_metrics_db)
):
    """Create a new cost model"""
    result = cost_models_controller.create_cost_model(db, request.dict())
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    
    return result

@app.get("/api/cost-models", response_model=Dict[str, Any])
async def get_cost_models(
    resource_name: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get cost models with optional filtering"""
    result = cost_models_controller.get_cost_models(db, resource_name, region)
    
    if not result['success']:
        raise HTTPException(status_code=500, detail=result['error'])
    
    return result

@app.get("/api/cost-models/{cost_model_id}", response_model=Dict[str, Any])
async def get_cost_model_by_id(
    cost_model_id: int,
    db: Session = Depends(get_metrics_db)
):
    """Get a specific cost model by ID"""
    result = cost_models_controller.get_cost_model_by_id(db, cost_model_id)
    
    if not result['success']:
        raise HTTPException(status_code=404, detail=result['error'])
    
    return result

@app.put("/api/cost-models/{cost_model_id}", response_model=Dict[str, Any])
async def update_cost_model(
    cost_model_id: int,
    request: CostModelUpdateRequest,
    db: Session = Depends(get_metrics_db)
):
    """Update an existing cost model"""
    # Filter out None values from the request
    update_data = {k: v for k, v in request.dict().items() if v is not None}
    
    result = cost_models_controller.update_cost_model(db, cost_model_id, update_data)
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    
    return result

@app.delete("/api/cost-models/{cost_model_id}", response_model=Dict[str, Any])
async def delete_cost_model(
    cost_model_id: int,
    db: Session = Depends(get_metrics_db)
):
    """Delete a cost model"""
    result = cost_models_controller.delete_cost_model(db, cost_model_id)
    
    if not result['success']:
        raise HTTPException(status_code=404, detail=result['error'])
    
    return result

@app.post("/api/cost-models/bulk", response_model=Dict[str, Any])
async def bulk_create_cost_models(
    request: CostModelBatchRequest,
    db: Session = Depends(get_metrics_db)
):
    """Create multiple cost models at once"""
    cost_models_data = [model.dict() for model in request.cost_models]
    result = cost_models_controller.bulk_create_cost_models(db, cost_models_data)
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    
    return result

@app.get("/api/cost-models/meta/regions", response_model=Dict[str, Any])
async def get_regions(db: Session = Depends(get_metrics_db)):
    """Get all unique regions from cost models"""
    result = cost_models_controller.get_regions(db)
    
    if not result['success']:
        raise HTTPException(status_code=500, detail=result['error'])
    
    return result

@app.get("/api/cost-models/meta/resources", response_model=Dict[str, Any])
async def get_resources(db: Session = Depends(get_metrics_db)):
    """Get all unique resource types from cost models"""
    result = cost_models_controller.get_resources(db)
    
    if not result['success']:
        raise HTTPException(status_code=500, detail=result['error'])
    
    return result

# Cost Calculation and Analysis endpoints
@app.get("/api/costs/process-summary", response_model=Dict[str, Any])
async def get_process_cost_summary(
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    region: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_metrics_db)
):
    """Get cost summary for all processes over a time period"""
    # Parse datetime strings
    start_dt = None
    end_dt = None
    
    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_time format. Use ISO format.")
    
    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_time format. Use ISO format.")
    
    result = cost_calculation_engine.get_process_cost_summary(db, start_dt, end_dt, region, limit)
    
    if not result['success']:
        raise HTTPException(status_code=500, detail=result['error'])
    
    return result

@app.get("/api/costs/process/{process_name}", response_model=Dict[str, Any])
async def get_process_cost(
    process_name: str,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get cost details for a specific process"""
    # Parse datetime strings
    start_dt = None
    end_dt = None
    
    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_time format. Use ISO format.")
    
    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_time format. Use ISO format.")
    
    result = cost_calculation_engine.calculate_process_cost_over_time(
        db, process_name=process_name, start_time=start_dt, end_time=end_dt, region=region
    )
    
    if not result['success']:
        raise HTTPException(status_code=500, detail=result['error'])
    
    return result

@app.get("/api/costs/trends", response_model=Dict[str, Any])
async def get_energy_cost_trends(
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    interval: str = "hour",
    region: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get energy consumption and cost trends over time"""
    # Parse datetime strings
    start_dt = None
    end_dt = None
    
    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_time format. Use ISO format.")
    
    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_time format. Use ISO format.")
    
    # Validate interval
    if interval not in ['hour', 'day', 'week']:
        raise HTTPException(status_code=400, detail="Invalid interval. Must be 'hour', 'day', or 'week'.")
    
    result = cost_calculation_engine.get_energy_trend_over_time(db, start_dt, end_dt, interval, region)
    
    if not result['success']:
        raise HTTPException(status_code=500, detail=result['error'])
    
    return result

# =============================================================================
# RECOMMENDATION ENGINE API ENDPOINTS
# =============================================================================

@app.get("/api/recommendations/cross-region", response_model=Dict[str, Any])
async def get_cross_region_recommendations(
    process_name: Optional[str] = None,
    username: Optional[str] = None,
    time_range_days: int = 7,
    projection_days: int = 30,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get cross-region cost optimization recommendations for workloads"""
    # Build workload filter
    workload_filter = {}
    if process_name:
        workload_filter['process_name'] = process_name
    if username:
        workload_filter['username'] = username
    
    # If no filter provided, analyze all workloads
    if not workload_filter:
        workload_filter = None
    
    result = recommendation_engine.generate_migration_recommendations(
        db, workload_filter, time_range_days, projection_days, start_date, end_date
    )
    
    if not result['success']:
        raise HTTPException(status_code=500, detail=result['error'])
    
    return result

@app.get("/api/recommendations/top-energy-processes", response_model=Dict[str, Any])
async def get_top_energy_processes(
    time_range_days: int = 7,
    limit: int = 10,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get top energy-consuming processes for optimization recommendations"""
    result = recommendation_engine.get_top_energy_consuming_processes(db, time_range_days, limit, start_date, end_date)
    
    if not result['success']:
        raise HTTPException(status_code=500, detail=result['error'])
    
    return result

@app.get("/api/recommendations/workload-analysis", response_model=Dict[str, Any])
async def analyze_workload(
    process_name: Optional[str] = None,
    username: Optional[str] = None,
    time_range_days: int = 7,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Analyze resource consumption patterns for a specific workload"""
    # Build workload filter
    workload_filter = {}
    if process_name:
        workload_filter['process_name'] = process_name
    if username:
        workload_filter['username'] = username
    
    if not workload_filter:
        raise HTTPException(status_code=400, detail="Must specify either process_name or username")
    
    result = recommendation_engine.analyze_workload_resource_consumption(
        db, workload_filter, time_range_days, start_date, end_date
    )
    
    if not result['success']:
        raise HTTPException(status_code=500, detail=result['error'])
    
    return result

@app.get("/api/recommendations/regional-pricing", response_model=Dict[str, Any])
async def get_regional_pricing(
    db: Session = Depends(get_metrics_db)
):
    """Get pricing information across all available regions"""
    try:
        regions = recommendation_engine.get_all_regions_with_pricing(db)
        
        return {
            "success": True,
            "regions": regions,
            "region_count": len(regions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get regional pricing: {str(e)}")

# VM-SPECIFIC RECOMMENDATION ENDPOINTS

@app.get("/api/recommendations/vm/{vm_name}", response_model=Dict[str, Any])
async def get_vm_recommendations(
    vm_name: str,
    time_range_days: int = 7,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get performance and cost optimization recommendations for a specific VM"""
    try:
        result = recommendation_engine.generate_vm_recommendations(db, vm_name, time_range_days, start_date, end_date)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate VM recommendations: {str(e)}")

@app.get("/api/recommendations/vm/{vm_name}/analysis", response_model=Dict[str, Any])
async def get_vm_analysis(
    vm_name: str,
    time_range_days: int = 7,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_metrics_db)
):
    """Get detailed resource consumption analysis for a specific VM"""
    try:
        result = recommendation_engine.analyze_vm_resource_consumption(db, vm_name, time_range_days, start_date, end_date)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze VM: {str(e)}")

# =============================================================================
# VM MONITORING API ENDPOINTS
# =============================================================================

@app.post("/api/v1/metrics/vm-snapshot", response_model=Dict[str, Any])
async def receive_vm_snapshot(
    request: VMSnapshotRequest,
    db: Session = Depends(get_timescaledb)
):
    """
    Receive VM process metrics snapshot from vm_agent.py
    
    This endpoint receives detailed process-level metrics from VMs and stores them
    in the TimescaleDB for time-series analysis and monitoring.
    
    Args:
        request: VM snapshot containing process metrics
        db: TimescaleDB session
        
    Returns:
        Success/failure status with processing details
    """
    try:
        # Validate the request
        if not request.process_metrics:
            return {
                "success": False,
                "error": "No process metrics provided in snapshot"
            }
        
        # Log the incoming snapshot
        logger.info(
            f"Received VM snapshot from '{request.vm_name}' "
            f"with {len(request.process_metrics)} processes"
        )
        
        # Convert process metrics to the format expected by the controller
        metrics_batch = []
        for process_metric in request.process_metrics:
            metric_data = process_metric.dict()
            # Ensure vm_name is set correctly
            metric_data['vm_name'] = request.vm_name
            metrics_batch.append(metric_data)
        
        # Store metrics in TimescaleDB
        result = vm_process_metrics_controller.push_vm_process_metrics_batch(
            db, metrics_batch
        )
        
        if result['success']:
            logger.info(
                f"Successfully stored {result['processed_count']} VM process metrics "
                f"from '{request.vm_name}'"
            )
            
            return {
                "success": True,
                "message": "VM snapshot processed successfully",
                "vm_name": request.vm_name,
                "timestamp": request.timestamp,
                "processed_count": result['processed_count'],
                "failed_count": result.get('failed_count', 0),
                "agent_version": request.agent_version,
                "platform": request.platform
            }
        else:
            logger.error(f"Failed to store VM metrics: {result.get('error', 'Unknown error')}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to store VM metrics: {result.get('error', 'Unknown error')}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing VM snapshot: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error processing VM snapshot: {str(e)}"
        )

@app.get("/api/v1/metrics/vm/{vm_name}/health", response_model=Dict[str, Any])
async def get_vm_health(
    vm_name: str,
    db: Session = Depends(get_timescaledb)
):
    """Get health status for a specific VM"""
    try:
        result = vm_process_metrics_controller.get_vm_health_status(db, vm_name)
        
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=404, detail=result.get('error', 'VM not found'))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting VM health status: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting VM health: {str(e)}")

@app.get("/api/v1/metrics/vms/active", response_model=Dict[str, Any])
async def get_active_vms(
    db: Session = Depends(get_timescaledb)
):
    """Get list of all active VMs that have sent data recently"""
    try:
        result = vm_process_metrics_controller.get_active_vms(db)
        
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get('error', 'Failed to get active VMs'))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting active VMs: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting active VMs: {str(e)}")

@app.get("/api/v1/metrics/vm/{vm_name}/summary", response_model=Dict[str, Any])
async def get_vm_summary(
    vm_name: str,
    hours: int = 24,
    db: Session = Depends(get_timescaledb)
):
    """Get summary metrics for a VM over a specified time period"""
    try:
        result = vm_process_metrics_controller.get_vm_summary_metrics(db, vm_name, hours)
        
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=404, detail=result.get('error', 'VM data not found'))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting VM summary: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting VM summary: {str(e)}")

@app.get("/api/v1/metrics/vm/{vm_name}/processes", response_model=Dict[str, Any])
async def get_vm_processes(
    vm_name: str,
    process_name: Optional[str] = None,
    username: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    limit: int = 1000,
    db: Session = Depends(get_timescaledb)
):
    """Get process metrics for a specific VM with optional filtering"""
    try:
        # Parse datetime strings
        start_dt = None
        end_dt = None
        
        if start_time:
            try:
                start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_time format. Use ISO format.")
        
        if end_time:
            try:
                end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_time format. Use ISO format.")
        
        result = vm_process_metrics_controller.get_vm_process_metrics(
            db=db,
            vm_name=vm_name,
            process_name=process_name,
            username=username,
            start_time=start_dt,
            end_time=end_dt,
            limit=limit
        )
        
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get('error', 'Failed to get VM processes'))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting VM processes: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting VM processes: {str(e)}")

# Host Overall Metrics endpoints
@app.get("/api/host-overall-metrics")
def get_host_overall_metrics(
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    time_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    start_time_str: Optional[str] = None,
    end_time_str: Optional[str] = None,
    limit: int = 1000,
    db: Session = Depends(get_metrics_db)
):
    """Get host overall metrics data with optional filters, time-based filtering, and date range filtering"""
    # Parse datetime strings
    start_dt = None
    end_dt = None
    
    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        except ValueError:
            return {"error": "Invalid start_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}
    
    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            return {"error": "Invalid end_time format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}
    
    return host_overall_metrics_controller.get_host_overall_metrics(
        db, start_time=start_dt, end_time=end_dt, time_filter=time_filter,
        start_date=start_date, end_date=end_date, start_time_str=start_time_str, end_time_str=end_time_str, limit=limit
    ) # Force reload comment
