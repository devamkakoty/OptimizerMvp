from sqlalchemy import Column, Integer, String, Float, DateTime, Text, TIMESTAMP, BigInteger
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class VMProcessMetric(Base):
    __tablename__ = "vm_process_metrics"
    
    # Composite primary key including vm_name for proper partitioning
    timestamp = Column(TIMESTAMP(timezone=True), primary_key=True, nullable=False)
    process_id = Column(Integer, primary_key=True, nullable=False)
    vm_name = Column(String(255), primary_key=True, nullable=False)  # Additional column for VM identification
    
    # Process metadata - same as host_process_metrics
    process_name = Column(String(255), nullable=True)
    username = Column(String(255), nullable=True)
    status = Column(String(50), nullable=True)
    start_time = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # Resource usage metrics - same as host_process_metrics
    cpu_usage_percent = Column(Float, nullable=True)
    memory_usage_mb = Column(Float, nullable=True)
    memory_usage_percent = Column(Float, nullable=True)
    
    # I/O metrics - same as host_process_metrics
    read_bytes = Column(BigInteger, nullable=True)
    write_bytes = Column(BigInteger, nullable=True)
    iops = Column(Float, nullable=True)
    open_files = Column(Integer, nullable=True)
    
    # GPU metrics - same as host_process_metrics
    gpu_memory_usage_mb = Column(Float, nullable=True)
    gpu_utilization_percent = Column(Float, nullable=True)
    
    # Power estimation - same as host_process_metrics
    estimated_power_watts = Column(Float, nullable=True)
    
    def to_dict(self):
        return {
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "process_id": self.process_id,
            "vm_name": self.vm_name,
            "process_name": self.process_name,
            "username": self.username,
            "status": self.status,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "cpu_usage_percent": self.cpu_usage_percent,
            "memory_usage_mb": self.memory_usage_mb,
            "memory_usage_percent": self.memory_usage_percent,
            "read_bytes": self.read_bytes,
            "write_bytes": self.write_bytes,
            "iops": self.iops,
            "open_files": self.open_files,
            "gpu_memory_usage_mb": self.gpu_memory_usage_mb,
            "gpu_utilization_percent": self.gpu_utilization_percent,
            "estimated_power_watts": self.estimated_power_watts
        }
    
    def __repr__(self):
        return f"<VMProcessMetric(vm_name='{self.vm_name}', timestamp={self.timestamp}, process_name='{self.process_name}', process_id={self.process_id})>"