from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class HardwareInfo(Base):
    __tablename__ = "Hardware_table"
    
    id = Column(Integer, primary_key=True, index=True)
    cpu = Column(String(255), nullable=False)
    gpu = Column(String(255), nullable=True)
    num_gpu = Column(Integer, nullable=True)
    gpu_memory_total_vram_mb = Column(Integer, nullable=True)
    gpu_graphics_clock = Column(Float, nullable=True)
    gpu_memory_clock = Column(Float, nullable=True)
    gpu_sm_cores = Column(Integer, nullable=True)
    gpu_cuda_cores = Column(Integer, nullable=True)
    cpu_total_cores = Column(Integer, nullable=True)
    cpu_threads_per_core = Column(Integer, nullable=True)
    cpu_base_clock_ghz = Column(Float, nullable=True)
    cpu_max_frequency_ghz = Column(Float, nullable=True)
    l1_cache = Column(Integer, nullable=True)
    cpu_power_consumption = Column(Integer, nullable=True)
    gpu_power_consumption = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            "id": self.id,
            "cpu": self.cpu,
            "gpu": self.gpu,
            "num_gpu": self.num_gpu,
            "gpu_memory_total_vram_mb": self.gpu_memory_total_vram_mb,
            "gpu_graphics_clock": self.gpu_graphics_clock,
            "gpu_memory_clock": self.gpu_memory_clock,
            "gpu_sm_cores": self.gpu_sm_cores,
            "gpu_cuda_cores": self.gpu_cuda_cores,
            "cpu_total_cores": self.cpu_total_cores,
            "cpu_threads_per_core": self.cpu_threads_per_core,
            "cpu_base_clock_ghz": self.cpu_base_clock_ghz,
            "cpu_max_frequency_ghz": self.cpu_max_frequency_ghz,
            "l1_cache": self.l1_cache,
            "cpu_power_consumption": self.cpu_power_consumption,
            "gpu_power_consumption": self.gpu_power_consumption,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        } 