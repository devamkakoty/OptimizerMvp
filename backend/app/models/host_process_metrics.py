from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class HostProcessMetric(Base):
    __tablename__ = "Host_Process_Metrics_table"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    process_name = Column(String(255), nullable=True)
    process_id = Column(Integer, nullable=False)
    username = Column(String(255), nullable=True)
    status = Column(String(100), nullable=True)
    cpu_usage_percent = Column(Float, nullable=False)
    memory_usage_mb = Column(Float, nullable=False)
    gpu_memory_usage_mb = Column(Float, nullable=False)
    gpu_utilization_percent = Column(Float, nullable=False)
    
    def __repr__(self):
        return f"<HostProcessMetric(id={self.id}, process_name='{self.process_name}', process_id={self.process_id}, timestamp={self.timestamp})>" 