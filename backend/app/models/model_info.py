from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class ModelInfo(Base):
    __tablename__ = "Model_table"
    
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column("Model Name", String(255), nullable=False)
    framework = Column("Framework", String(100), nullable=False)
    task_type = Column("Task Type", String(100), nullable=False)
    total_parameters_millions = Column("Total Parameters (Millions)", Float, nullable=True)
    model_size_mb = Column("Model Size (MB)", Float, nullable=True)
    architecture_type = Column("Architecture type", String(255), nullable=True)
    model_type = Column("Model Type", String(100), nullable=True)
    number_of_hidden_layers = Column("Number of hidden Layers", Integer, nullable=True)
    embedding_vector_dimension = Column("Embedding Vector Dimension (Hidden Size)", Integer, nullable=True)
    precision = Column("Precision", String(50), nullable=True)
    vocabulary_size = Column("Vocabulary Size", Integer, nullable=True)
    ffn_dimension = Column("FFN (MLP) Dimension", Integer, nullable=True)
    activation_function = Column("Activation Function", String(100), nullable=True)
    gflops_billions = Column("GFLOPs (Billions)", Float, nullable=True)
    number_of_attention_layers = Column("Number of Attention Layers", Integer, nullable=True)
    created_at = Column("created_at", DateTime, default=datetime.utcnow)
    
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
            "number_of_hidden_layers": self.number_of_hidden_layers,
            "embedding_vector_dimension": self.embedding_vector_dimension,
            "precision": self.precision,
            "vocabulary_size": self.vocabulary_size,
            "ffn_dimension": self.ffn_dimension,
            "activation_function": self.activation_function,
            "gflops_billions": self.gflops_billions,
            "number_of_attention_layers": self.number_of_attention_layers,
            "created_at": self.created_at.isoformat() if self.created_at else None
        } 