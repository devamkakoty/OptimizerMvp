from sqlalchemy import Column, Integer, String, Float, DateTime, Text, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class CostModel(Base):
    """Cost Models Database Model for multi-region pricing"""
    __tablename__ = "cost_models"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Resource Information
    resource_name = Column(String(100), nullable=False, index=True)  # e.g., 'ELECTRICITY_KWH', 'CPU_HOUR', 'GPU_HOUR'
    cost_per_unit = Column(Float, nullable=False)  # Cost per unit of resource
    currency = Column(String(10), nullable=False, default='USD')  # Currency code (USD, EUR, INR, etc.)
    region = Column(String(100), nullable=False, index=True)  # Region identifier
    
    # Additional metadata
    description = Column(Text, nullable=True)  # Optional description of the cost model
    effective_date = Column(DateTime, nullable=True)  # When this pricing becomes effective
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Ensure uniqueness of resource_name + region combination
    __table_args__ = (
        UniqueConstraint('resource_name', 'region', name='uq_resource_region'),
    )
    
    def __repr__(self):
        return f"<CostModel(id={self.id}, resource='{self.resource_name}', region='{self.region}', cost={self.cost_per_unit} {self.currency})>"
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            "id": self.id,
            "resource_name": self.resource_name,
            "cost_per_unit": self.cost_per_unit,
            "currency": self.currency,
            "region": self.region,
            "description": self.description,
            "effective_date": self.effective_date.isoformat() if self.effective_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }