from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.cost_models import CostModel
from datetime import datetime
from typing import Optional, Dict, Any, List

class CostModelsController:
    """Controller for managing cost models and pricing data"""
    
    def create_cost_model(self, db: Session, cost_model_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new cost model"""
        try:
            # Check if cost model already exists for this resource and region
            existing = db.query(CostModel).filter(
                and_(
                    CostModel.resource_name == cost_model_data['resource_name'],
                    CostModel.region == cost_model_data['region']
                )
            ).first()
            
            if existing:
                return {
                    "success": False,
                    "error": f"Cost model already exists for {cost_model_data['resource_name']} in {cost_model_data['region']}"
                }
            
            # Create new cost model
            new_cost_model = CostModel(
                resource_name=cost_model_data['resource_name'],
                cost_per_unit=cost_model_data['cost_per_unit'],
                currency=cost_model_data.get('currency', 'USD'),
                region=cost_model_data['region'],
                description=cost_model_data.get('description'),
                effective_date=datetime.fromisoformat(cost_model_data['effective_date']) if cost_model_data.get('effective_date') else None
            )
            
            db.add(new_cost_model)
            db.commit()
            db.refresh(new_cost_model)
            
            return {
                "success": True,
                "message": "Cost model created successfully",
                "cost_model": new_cost_model.to_dict()
            }
            
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "error": f"Failed to create cost model: {str(e)}"
            }
    
    def update_cost_model(self, db: Session, cost_model_id: int, cost_model_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing cost model"""
        try:
            cost_model = db.query(CostModel).filter(CostModel.id == cost_model_id).first()
            
            if not cost_model:
                return {
                    "success": False,
                    "error": f"Cost model with ID {cost_model_id} not found"
                }
            
            # Update fields
            for field, value in cost_model_data.items():
                if hasattr(cost_model, field) and field not in ['id', 'created_at']:
                    if field == 'effective_date' and value:
                        setattr(cost_model, field, datetime.fromisoformat(value))
                    else:
                        setattr(cost_model, field, value)
            
            cost_model.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(cost_model)
            
            return {
                "success": True,
                "message": "Cost model updated successfully",
                "cost_model": cost_model.to_dict()
            }
            
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "error": f"Failed to update cost model: {str(e)}"
            }
    
    def get_cost_models(self, db: Session, resource_name: Optional[str] = None, region: Optional[str] = None) -> Dict[str, Any]:
        """Get cost models with optional filtering"""
        try:
            query = db.query(CostModel)
            
            if resource_name:
                query = query.filter(CostModel.resource_name == resource_name)
            
            if region:
                query = query.filter(CostModel.region == region)
            
            cost_models = query.all()
            
            return {
                "success": True,
                "cost_models": [model.to_dict() for model in cost_models],
                "count": len(cost_models)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to retrieve cost models: {str(e)}"
            }
    
    def get_cost_model_by_id(self, db: Session, cost_model_id: int) -> Dict[str, Any]:
        """Get a specific cost model by ID"""
        try:
            cost_model = db.query(CostModel).filter(CostModel.id == cost_model_id).first()
            
            if not cost_model:
                return {
                    "success": False,
                    "error": f"Cost model with ID {cost_model_id} not found"
                }
            
            return {
                "success": True,
                "cost_model": cost_model.to_dict()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to retrieve cost model: {str(e)}"
            }
    
    def delete_cost_model(self, db: Session, cost_model_id: int) -> Dict[str, Any]:
        """Delete a cost model"""
        try:
            cost_model = db.query(CostModel).filter(CostModel.id == cost_model_id).first()
            
            if not cost_model:
                return {
                    "success": False,
                    "error": f"Cost model with ID {cost_model_id} not found"
                }
            
            db.delete(cost_model)
            db.commit()
            
            return {
                "success": True,
                "message": "Cost model deleted successfully"
            }
            
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "error": f"Failed to delete cost model: {str(e)}"
            }
    
    def get_regions(self, db: Session) -> Dict[str, Any]:
        """Get all unique regions from cost models"""
        try:
            regions = db.query(CostModel.region).distinct().all()
            region_list = [region[0] for region in regions]
            
            return {
                "success": True,
                "regions": region_list,
                "count": len(region_list)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to retrieve regions: {str(e)}"
            }
    
    def get_resources(self, db: Session) -> Dict[str, Any]:
        """Get all unique resource types from cost models"""
        try:
            resources = db.query(CostModel.resource_name).distinct().all()
            resource_list = [resource[0] for resource in resources]
            
            return {
                "success": True,
                "resources": resource_list,
                "count": len(resource_list)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to retrieve resources: {str(e)}"
            }
    
    def bulk_create_cost_models(self, db: Session, cost_models_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create multiple cost models at once"""
        try:
            created_models = []
            errors = []
            
            for cost_model_data in cost_models_data:
                result = self.create_cost_model(db, cost_model_data)
                if result['success']:
                    created_models.append(result['cost_model'])
                else:
                    errors.append({
                        'data': cost_model_data,
                        'error': result['error']
                    })
            
            return {
                "success": True,
                "message": f"Created {len(created_models)} cost models",
                "created_models": created_models,
                "errors": errors,
                "created_count": len(created_models),
                "error_count": len(errors)
            }
            
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "error": f"Failed to bulk create cost models: {str(e)}"
            }