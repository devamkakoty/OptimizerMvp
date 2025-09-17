from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.models.model_info import ModelInfo
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ModelManagementController:
    """Controller for CRUD operations on AI Model Management"""
    
    def __init__(self):
        pass
    
    def get_all_models(self, db: Session) -> Dict[str, Any]:
        """Get all models from the Model_table"""
        try:
            models = db.query(ModelInfo).all()
            model_list = [model.to_dict() for model in models]
            
            return {
                "status": "success",
                "model_list": model_list,
                "total_count": len(model_list)
            }
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_all_models: {str(e)}")
            return {
                "status": "error",
                "message": f"Database error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Unexpected error in get_all_models: {str(e)}")
            return {
                "status": "error",
                "message": f"Unexpected error: {str(e)}"
            }
    
    def get_model_by_id(self, db: Session, model_id: int) -> Dict[str, Any]:
        """Get a specific model by ID"""
        try:
            model = db.query(ModelInfo).filter(ModelInfo.id == model_id).first()
            
            if not model:
                return {
                    "status": "error",
                    "message": f"Model with ID {model_id} not found"
                }
            
            return {
                "status": "success",
                "model_data": model.to_dict()
            }
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_model_by_id: {str(e)}")
            return {
                "status": "error",
                "message": f"Database error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Unexpected error in get_model_by_id: {str(e)}")
            return {
                "status": "error",
                "message": f"Unexpected error: {str(e)}"
            }
    
    def create_model(self, db: Session, model_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new model in the Model_table"""
        try:
            # Create new ModelInfo instance
            new_model = ModelInfo(
                model_name=model_data.get('model_name'),
                framework=model_data.get('framework'),
                task_type=model_data.get('task_type'),
                total_parameters_millions=model_data.get('total_parameters_millions'),
                model_size_mb=model_data.get('model_size_mb'),
                architecture_type=model_data.get('architecture_type'),
                model_type=model_data.get('model_type'),
                number_of_hidden_layers=model_data.get('number_of_hidden_layers'),
                embedding_vector_dimension=model_data.get('embedding_vector_dimension'),
                precision=model_data.get('precision'),
                vocabulary_size=model_data.get('vocabulary_size'),
                ffn_dimension=model_data.get('ffn_dimension'),
                activation_function=model_data.get('activation_function'),
                gflops_billions=model_data.get('gflops_billions'),
                number_of_attention_layers=model_data.get('number_of_attention_layers'),
                created_at=datetime.utcnow()
            )
            
            db.add(new_model)
            db.commit()
            db.refresh(new_model)
            
            return {
                "status": "success",
                "message": "Model created successfully",
                "model_data": new_model.to_dict()
            }
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error in create_model: {str(e)}")
            return {
                "status": "error",
                "message": f"Database error: {str(e)}"
            }
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error in create_model: {str(e)}")
            return {
                "status": "error",
                "message": f"Unexpected error: {str(e)}"
            }
    
    def update_model(self, db: Session, model_id: int, model_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing model in the Model_table"""
        try:
            model = db.query(ModelInfo).filter(ModelInfo.id == model_id).first()
            
            if not model:
                return {
                    "status": "error",
                    "message": f"Model with ID {model_id} not found"
                }
            
            # Update fields
            for field, value in model_data.items():
                if hasattr(model, field) and value is not None:
                    setattr(model, field, value)
            
            db.commit()
            db.refresh(model)
            
            return {
                "status": "success",
                "message": "Model updated successfully",
                "model_data": model.to_dict()
            }
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error in update_model: {str(e)}")
            return {
                "status": "error",
                "message": f"Database error: {str(e)}"
            }
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error in update_model: {str(e)}")
            return {
                "status": "error",
                "message": f"Unexpected error: {str(e)}"
            }
    
    def delete_model(self, db: Session, model_id: int) -> Dict[str, Any]:
        """Delete a model from the Model_table"""
        try:
            model = db.query(ModelInfo).filter(ModelInfo.id == model_id).first()
            
            if not model:
                return {
                    "status": "error",
                    "message": f"Model with ID {model_id} not found"
                }
            
            # Store model data before deletion for response
            model_data = model.to_dict()
            
            db.delete(model)
            db.commit()
            
            return {
                "status": "success",
                "message": "Model deleted successfully",
                "deleted_model": model_data
            }
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error in delete_model: {str(e)}")
            return {
                "status": "error",
                "message": f"Database error: {str(e)}"
            }
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error in delete_model: {str(e)}")
            return {
                "status": "error",
                "message": f"Unexpected error: {str(e)}"
            }
    
    def search_models(self, db: Session, search_query: str) -> Dict[str, Any]:
        """Search models by name, framework, or task type"""
        try:
            models = db.query(ModelInfo).filter(
                (ModelInfo.model_name.ilike(f'%{search_query}%')) |
                (ModelInfo.framework.ilike(f'%{search_query}%')) |
                (ModelInfo.task_type.ilike(f'%{search_query}%')) |
                (ModelInfo.architecture_type.ilike(f'%{search_query}%'))
            ).all()
            
            model_list = [model.to_dict() for model in models]
            
            return {
                "status": "success",
                "model_list": model_list,
                "total_count": len(model_list),
                "search_query": search_query
            }
        except SQLAlchemyError as e:
            logger.error(f"Database error in search_models: {str(e)}")
            return {
                "status": "error",
                "message": f"Database error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Unexpected error in search_models: {str(e)}")
            return {
                "status": "error",
                "message": f"Unexpected error: {str(e)}"
            }
    
    def get_model_statistics(self, db: Session) -> Dict[str, Any]:
        """Get statistics about the models in the database"""
        try:
            total_models = db.query(ModelInfo).count()
            
            # Get framework distribution
            framework_stats = db.query(ModelInfo.framework).distinct().all()
            frameworks = [row[0] for row in framework_stats]
            
            # Get task type distribution
            task_type_stats = db.query(ModelInfo.task_type).distinct().all()
            task_types = [row[0] for row in task_type_stats]
            
            # Get architecture type distribution
            arch_type_stats = db.query(ModelInfo.architecture_type).distinct().all()
            arch_types = [row[0] for row in arch_type_stats if row[0]]
            
            return {
                "status": "success",
                "statistics": {
                    "total_models": total_models,
                    "frameworks": frameworks,
                    "task_types": task_types,
                    "architecture_types": arch_types
                }
            }
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_model_statistics: {str(e)}")
            return {
                "status": "error",
                "message": f"Database error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Unexpected error in get_model_statistics: {str(e)}")
            return {
                "status": "error",
                "message": f"Unexpected error: {str(e)}"
            }