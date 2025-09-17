from sqlalchemy import Column, Integer, String, Float, DateTime, Text, TIMESTAMP, BigInteger
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class HostOverallMetric(Base):
    __tablename__ = "host_overall_metrics"
    __table_args__ = {'schema': 'public'}  # TimescaleDB schema
    
    timestamp = Column(TIMESTAMP(timezone=True), primary_key=True, nullable=False)
    host_cpu_usage_percent = Column(Float, nullable=True)
    host_ram_usage_percent = Column(Float, nullable=True)
    host_gpu_utilization_percent = Column(Float, nullable=True)
    host_gpu_memory_utilization_percent = Column(Float, nullable=True)
    host_gpu_temperature_celsius = Column(Float, nullable=True)
    host_gpu_power_draw_watts = Column(Float, nullable=True)
    host_network_bytes_sent = Column(BigInteger, nullable=True)
    host_network_bytes_received = Column(BigInteger, nullable=True)
    host_network_packets_sent = Column(BigInteger, nullable=True)
    host_network_packets_received = Column(BigInteger, nullable=True)
    host_disk_read_bytes = Column(BigInteger, nullable=True)
    host_disk_write_bytes = Column(BigInteger, nullable=True)
    host_disk_read_count = Column(BigInteger, nullable=True)
    host_disk_write_count = Column(BigInteger, nullable=True)
    
    def to_dict(self):
        return {
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "host_cpu_usage_percent": self.host_cpu_usage_percent,
            "host_ram_usage_percent": self.host_ram_usage_percent,
            "host_gpu_utilization_percent": self.host_gpu_utilization_percent,
            "host_gpu_memory_utilization_percent": self.host_gpu_memory_utilization_percent,
            "host_gpu_temperature_celsius": self.host_gpu_temperature_celsius,
            "host_gpu_power_draw_watts": self.host_gpu_power_draw_watts,
            "host_network_bytes_sent": self.host_network_bytes_sent,
            "host_network_bytes_received": self.host_network_bytes_received,
            "host_network_packets_sent": self.host_network_packets_sent,
            "host_network_packets_received": self.host_network_packets_received,
            "host_disk_read_bytes": self.host_disk_read_bytes,
            "host_disk_write_bytes": self.host_disk_write_bytes,
            "host_disk_read_count": self.host_disk_read_count,
            "host_disk_write_count": self.host_disk_write_count
        }
    
    def __repr__(self):
        return f"<HostOverallMetric(timestamp={self.timestamp}, ram_usage={self.host_ram_usage_percent}%, gpu_util={self.host_gpu_utilization_percent}%)>"