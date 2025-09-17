from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class HardwareSpecs(Base):
    """Hardware Specifications Database Model - Hardware_table compatible format"""
    __tablename__ = "hardware_specs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Operating System Information (additional fields, not in Hardware_table)
    os_name = Column(String(100), nullable=False)
    os_version = Column(String(100), nullable=False)
    os_architecture = Column(String(50), nullable=False)
    
    # Hardware_table compatible fields - Exact column names as expected by PKL models
    CPU = Column(String(255), nullable=False)  # Full CPU model name
    GPU = Column(String(255), nullable=True, default='No GPU')  # GPU model name
    num_gpu = Column(Integer, nullable=True, default=0)  # "# of GPU"
    gpu_memory_total_mb = Column(Float, nullable=True, default=0)  # "GPU Memory Total - VRAM (MB)"
    gpu_graphics_clock = Column(Float, nullable=True, default=0)  # "GPU Graphics clock"
    gpu_memory_clock = Column(Float, nullable=True, default=0)  # "GPU Memory clock"
    gpu_sm_cores = Column(Integer, nullable=True, default=0)  # "GPU SM Cores"
    gpu_cuda_cores = Column(Integer, nullable=True, default=0)  # "GPU CUDA Cores"
    cpu_total_cores = Column(Integer, nullable=False)  # "CPU Total cores (Including Logical cores)"
    cpu_threads_per_core = Column(Float, nullable=False)  # "CPU Threads per Core"
    cpu_base_clock_ghz = Column(Float, nullable=True, default=0)  # "CPU Base clock(GHz)"
    cpu_max_frequency_ghz = Column(Float, nullable=True, default=0)  # "CPU Max Frequency(GHz)"
    l1_cache = Column(Integer, nullable=True, default=0)  # "L1 Cache"
    cpu_power_consumption = Column(Integer, nullable=True, default=0)  # "CPU Power Consumption"
    gpu_power_consumption = Column(Integer, nullable=True, default=0)  # "GPUPower Consumption"
    
    # Additional fields for detailed info (not in Hardware_table but useful)
    cpu_brand = Column(String(100), nullable=True)
    cpu_family = Column(Integer, nullable=True)
    cpu_model_family = Column(Integer, nullable=True)
    cpu_physical_cores = Column(Integer, nullable=True)
    cpu_sockets = Column(Integer, nullable=True)
    cpu_cores_per_socket = Column(Integer, nullable=True)
    gpu_brand = Column(String(100), nullable=True)
    gpu_driver_version = Column(String(100), nullable=True)
    total_ram_gb = Column(Float, nullable=False)
    total_storage_gb = Column(Float, nullable=False)
    region = Column(String(100), nullable=True, default='US')
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<HardwareSpecs(id={self.id}, CPU='{self.CPU}', os_name='{self.os_name}')>"
    
    def to_dict(self):
        """Convert model instance to dictionary with Hardware_table compatible format"""
        return {
            "id": self.id,
            
            # Operating System Information
            "os_name": self.os_name,
            "os_version": self.os_version,
            "os_architecture": self.os_architecture,
            
            # Hardware_table compatible fields (exact names for PKL models)
            "CPU": self.CPU,
            "GPU": self.GPU,
            "# of GPU": self.num_gpu,
            "GPU Memory Total - VRAM (MB)": self.gpu_memory_total_mb,
            "GPU Graphics clock": self.gpu_graphics_clock,
            "GPU Memory clock": self.gpu_memory_clock,
            "GPU SM Cores": self.gpu_sm_cores,
            "GPU CUDA Cores": self.gpu_cuda_cores,
            "CPU Total cores (Including Logical cores)": self.cpu_total_cores,
            "CPU Threads per Core": self.cpu_threads_per_core,
            "CPU Base clock(GHz)": self.cpu_base_clock_ghz,
            "CPU Max Frequency(GHz)": self.cpu_max_frequency_ghz,
            "L1 Cache": self.l1_cache,
            "CPU Power Consumption": self.cpu_power_consumption,
            "GPUPower Consumption": self.gpu_power_consumption,
            
            # Additional detailed fields
            "cpu_brand": self.cpu_brand,
            "cpu_family": self.cpu_family,
            "cpu_model_family": self.cpu_model_family,
            "cpu_physical_cores": self.cpu_physical_cores,
            "cpu_sockets": self.cpu_sockets,
            "cpu_cores_per_socket": self.cpu_cores_per_socket,
            "gpu_brand": self.gpu_brand,
            "gpu_driver_version": self.gpu_driver_version,
            "total_ram_gb": self.total_ram_gb,
            "total_storage_gb": self.total_storage_gb,
            "region": self.region,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        } 