from sqlalchemy import Column, Integer, String, Float, DateTime, Text, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class ModelInfo(Base):
    __tablename__ = "Model_table"
    
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(255), nullable=False, unique=True)
    framework = Column(String(100), nullable=False)
    total_parameters_millions = Column(Float, nullable=False)
    model_size_mb = Column(Float, nullable=False)
    architecture_type = Column(String(255), nullable=False)
    model_type = Column(String(100), nullable=False)
    number_of_hidden_layers = Column(Integer, nullable=True)
    embedding_vector_dimension = Column(Integer, nullable=True)
    precision = Column(String(50), nullable=True)
    vocabulary_size = Column(Integer, nullable=True)
    ffn_dimension = Column(Integer, nullable=True)
    number_of_attention_layers = Column(Integer, nullable=True)
    activation_function = Column(String(100), nullable=True)
    model_pickle = Column(LargeBinary, nullable=True)  # For storing model binaries
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    task_type = Column(String(255), nullable=False)
    
    def to_dict(self):
        return {
            "id": self.id,
            "model_name": self.model_name,
            "framework": self.framework,
            "total_parameters_millions": self.total_parameters_millions,
            "model_size_mb": self.model_size_mb,
            "architecture_type": self.architecture_type,
            "model_type": self.model_type,
            "number_of_hidden_layers": self.number_of_hidden_layers,
            "embedding_vector_dimension": self.embedding_vector_dimension,
            "precision": self.precision,
            "vocabulary_size": self.vocabulary_size,
            "ffn_dimension": self.ffn_dimension,
            "number_of_attention_layers": self.number_of_attention_layers,
            "activation_function": self.activation_function,
            "model_pickle": self.model_pickle is not None,  # Return boolean indicating if pickle exists
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "task_type": self.task_type
        } 