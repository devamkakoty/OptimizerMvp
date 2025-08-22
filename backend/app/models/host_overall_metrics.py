from sqlalchemy import Column, Integer, String, Float, DateTime, Text, TIMESTAMP, BigInteger
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class HostOverallMetric(Base):
    __tablename__ = "host_overall_metrics"
    
    timestamp = Column(TIMESTAMP(timezone=True), primary_key=True, nullable=False)
    host_cpu_usage_percent = Column(Float, nullable=True)
    host_ram_usage_percent = Column(Float, nullable=True)
    host_gpu_utilization_percent = Column(Float, nullable=True)
    host_gpu_memory_utilization_percent = Column(Float, nullable=True)
    host_gpu_temperature_celsius = Column(Float, nullable=True)
    host_gpu_power_draw_watts = Column(Float, nullable=True)
    
    def to_dict(self):
        return {
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "host_cpu_usage_percent": self.host_cpu_usage_percent,
            "host_ram_usage_percent": self.host_ram_usage_percent,
            "host_gpu_utilization_percent": self.host_gpu_utilization_percent,
            "host_gpu_memory_utilization_percent": self.host_gpu_memory_utilization_percent,
            "host_gpu_temperature_celsius": self.host_gpu_temperature_celsius,
            "host_gpu_power_draw_watts": self.host_gpu_power_draw_watts
        }
    
    def __repr__(self):
        return f"<HostOverallMetric(timestamp={self.timestamp}, ram_usage={self.host_ram_usage_percent}%, gpu_util={self.host_gpu_utilization_percent}%)>"