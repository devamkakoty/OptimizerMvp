from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class HardwareSpecs(Base):
    """Hardware Specifications Database Model"""
    __tablename__ = "hardware_specs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Operating System Information
    os_name = Column(String(100), nullable=False)
    os_version = Column(String(100), nullable=False)
    os_architecture = Column(String(50), nullable=False)
    
    # CPU Information
    cpu_brand = Column(String(100), nullable=False)
    cpu_model = Column(String(200), nullable=False)
    cpu_family = Column(Integer, nullable=True)
    cpu_model_family = Column(Integer, nullable=True)
    cpu_physical_cores = Column(Integer, nullable=False)
    cpu_total_cores = Column(Integer, nullable=False)
    cpu_sockets = Column(Integer, nullable=False)
    cpu_cores_per_socket = Column(Integer, nullable=False)
    cpu_threads_per_core = Column(Float, nullable=False)
    
    # Memory and Storage
    total_ram_gb = Column(Float, nullable=False)
    total_storage_gb = Column(Float, nullable=False)
    
    # GPU Information
    gpu_cuda_cores = Column(String(50), nullable=True)
    gpu_brand = Column(String(100), nullable=True)
    gpu_model = Column(String(200), nullable=True)
    gpu_driver_version = Column(String(100), nullable=True)
    gpu_vram_total_mb = Column(Float, nullable=True)
    
    # Region Information
    region = Column(String(100), nullable=True, default='US')
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<HardwareSpecs(id={self.id}, cpu_model='{self.cpu_model}', os_name='{self.os_name}')>"
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            "id": self.id,
            "os_name": self.os_name,
            "os_version": self.os_version,
            "os_architecture": self.os_architecture,
            "cpu_brand": self.cpu_brand,
            "cpu_model": self.cpu_model,
            "cpu_family": self.cpu_family,
            "cpu_model_family": self.cpu_model_family,
            "cpu_physical_cores": self.cpu_physical_cores,
            "cpu_total_cores": self.cpu_total_cores,
            "cpu_sockets": self.cpu_sockets,
            "cpu_cores_per_socket": self.cpu_cores_per_socket,
            "cpu_threads_per_core": self.cpu_threads_per_core,
            "total_ram_gb": self.total_ram_gb,
            "total_storage_gb": self.total_storage_gb,
            "gpu_cuda_cores": self.gpu_cuda_cores,
            "gpu_brand": self.gpu_brand,
            "gpu_model": self.gpu_model,
            "gpu_driver_version": self.gpu_driver_version,
            "gpu_vram_total_mb": self.gpu_vram_total_mb,
            "region": self.region,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        } 