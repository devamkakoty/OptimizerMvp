from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class VMMetric(Base):
    __tablename__ = "VM_Metrics_table"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    vm_name = Column(String(255), nullable=False)
    cpu_usage = Column(Integer, nullable=True)
    average_memory_usage = Column(Integer, nullable=True)
    
    def __repr__(self):
        return f"<VMMetric(id={self.id}, vm_name='{self.vm_name}', timestamp={self.timestamp})>" 