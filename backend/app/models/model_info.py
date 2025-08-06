from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class ModelInfo(Base):
    __tablename__ = "Model_table"
    
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(255), nullable=False)
    framework = Column(String(100), nullable=False)
    task_type = Column(String(100), nullable=False)
    total_parameters_millions = Column(Float, nullable=True)
    model_size_mb = Column(Float, nullable=True)
    architecture_type = Column(String(255), nullable=True)
    model_type = Column(String(100), nullable=True)
    embedding_vector_dimension = Column(Integer, nullable=True)  # Hidden Size
    precision = Column(String(50), nullable=True)
    vocabulary_size = Column(Integer, nullable=True)
    ffn_dimension = Column(Integer, nullable=True)  # FFN (MLP) Dimension
    activation_function = Column(String(100), nullable=True)
    flops = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<ModelInfo(id={self.id}, model_name='{self.model_name}', framework='{self.framework}', task_type='{self.task_type}')>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "model_name": self.model_name,
            "framework": self.framework,
            "task_type": self.task_type,
            "total_parameters_millions": self.total_parameters_millions,
            "model_size_mb": self.model_size_mb,
            "architecture_type": self.architecture_type,
            "model_type": self.model_type,
            "embedding_vector_dimension": self.embedding_vector_dimension,
            "precision": self.precision,
            "vocabulary_size": self.vocabulary_size,
            "ffn_dimension": self.ffn_dimension,
            "activation_function": self.activation_function,
            "flops": self.flops,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        } 