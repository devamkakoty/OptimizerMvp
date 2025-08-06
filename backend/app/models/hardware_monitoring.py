from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class HardwareMonitoring(Base):
    __tablename__ = "Hardware_Monitoring_table"
    
    id = Column(Integer, primary_key=True, index=True)
    hardware_id = Column(Integer, nullable=False)
    cpu_usage_percent = Column(Float, nullable=True)
    gpu_usage_percent = Column(Float, nullable=True)
    memory_usage_percent = Column(Float, nullable=True)
    temperature_cpu = Column(Float, nullable=True)
    temperature_gpu = Column(Float, nullable=True)
    power_consumption_watts = Column(Float, nullable=True)
    network_usage_mbps = Column(Float, nullable=True)
    disk_usage_percent = Column(Float, nullable=True)
    additional_metrics = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            "id": self.id,
            "hardware_id": self.hardware_id,
            "cpu_usage_percent": self.cpu_usage_percent,
            "gpu_usage_percent": self.gpu_usage_percent,
            "memory_usage_percent": self.memory_usage_percent,
            "temperature_cpu": self.temperature_cpu,
            "temperature_gpu": self.temperature_gpu,
            "power_consumption_watts": self.power_consumption_watts,
            "network_usage_mbps": self.network_usage_mbps,
            "disk_usage_percent": self.disk_usage_percent,
            "additional_metrics": self.additional_metrics,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        } 