from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from app.models import VMMetric
from datetime import datetime, timedelta
import json

class VMMetricsController:
    """Controller for VM metrics operations"""
    
    def push_vm_metrics(self, db: Session, vm_metrics_data: Dict[str, Any]) -> Dict[str, Any]:
        """Push VM metrics data to database"""
        try:
            vm_metric = VMMetric(
                timestamp=vm_metrics_data.get('timestamp', datetime.utcnow()),
                vm_name=vm_metrics_data['VMName'],
                cpu_usage=vm_metrics_data.get('CPUUsage'),
                average_memory_usage=vm_metrics_data.get('AverageMemoryUsage')
            )
            
            db.add(vm_metric)
            db.commit()
            db.refresh(vm_metric)
            
            return {
                "success": True,
                "message": "VM metrics data pushed successfully",
                "data": {
                    "id": vm_metric.id,
                    "vm_name": vm_metric.vm_name,
                    "timestamp": vm_metric.timestamp.isoformat()
                }
            }
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "message": f"Failed to push VM metrics: {str(e)}"
            }
    
    def push_vm_metrics_batch(self, db: Session, vm_metrics_batch: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Push a batch of VM metrics data to database"""
        try:
            vm_metrics = []
            for metrics_data in vm_metrics_batch:
                vm_metric = VMMetric(
                    timestamp=metrics_data.get('timestamp', datetime.utcnow()),
                    vm_name=metrics_data['VMName'],
                    cpu_usage=metrics_data.get('CPUUsage'),
                    average_memory_usage=metrics_data.get('AverageMemoryUsage')
                )
                vm_metrics.append(vm_metric)
            
            db.bulk_save_objects(vm_metrics)
            db.commit()
            
            return {
                "success": True,
                "message": f"Successfully pushed {len(vm_metrics)} VM metrics records",
                "count": len(vm_metrics)
            }
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "message": f"Failed to push VM metrics batch: {str(e)}"
            }
    
    def get_vm_metrics(self, db: Session, 
                       vm_name: Optional[str] = None,
                       start_time: Optional[datetime] = None,
                       end_time: Optional[datetime] = None,
                       limit: int = 1000) -> Dict[str, Any]:
        """Get VM metrics data with optional filters"""
        try:
            query = db.query(VMMetric)
            
            # Apply filters
            if vm_name:
                query = query.filter(VMMetric.vm_name == vm_name)
            
            if start_time:
                query = query.filter(VMMetric.timestamp >= start_time)
            
            if end_time:
                query = query.filter(VMMetric.timestamp <= end_time)
            
            # Order by timestamp descending and limit results
            query = query.order_by(desc(VMMetric.timestamp)).limit(limit)
            
            vm_metrics = query.all()
            
            # Convert to JSON-serializable format
            metrics_data = []
            for metric in vm_metrics:
                metrics_data.append({
                    "id": metric.id,
                    "timestamp": metric.timestamp.isoformat(),
                    "vm_name": metric.vm_name,
                    "cpu_usage": metric.cpu_usage,
                    "average_memory_usage": metric.average_memory_usage
                })
            
            return {
                "success": True,
                "data": metrics_data,
                "count": len(metrics_data)
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to retrieve VM metrics: {str(e)}"
            }
    
    def get_vm_metrics_summary(self, db: Session, 
                              vm_name: Optional[str] = None,
                              start_time: Optional[datetime] = None,
                              end_time: Optional[datetime] = None) -> Dict[str, Any]:
        """Get summary statistics for VM metrics"""
        try:
            query = db.query(VMMetric)
            
            # Apply filters
            if vm_name:
                query = query.filter(VMMetric.vm_name == vm_name)
            
            if start_time:
                query = query.filter(VMMetric.timestamp >= start_time)
            
            if end_time:
                query = query.filter(VMMetric.timestamp <= end_time)
            
            # Calculate summary statistics
            total_records = query.count()
            
            if total_records == 0:
                return {
                    "success": True,
                    "summary": {
                        "total_records": 0,
                        "vm_names": [],
                        "avg_cpu_usage": 0,
                        "avg_memory_usage": 0
                    }
                }
            
            # Get unique VM names
            vm_names = [row[0] for row in db.query(VMMetric.vm_name).distinct().all()]
            
            # Calculate averages
            avg_cpu = db.query(func.avg(VMMetric.cpu_usage)).filter(
                VMMetric.cpu_usage.isnot(None)
            ).scalar() or 0
            
            avg_memory = db.query(func.avg(VMMetric.average_memory_usage)).filter(
                VMMetric.average_memory_usage.isnot(None)
            ).scalar() or 0
            
            return {
                "success": True,
                "summary": {
                    "total_records": total_records,
                    "vm_names": vm_names,
                    "avg_cpu_usage": float(avg_cpu),
                    "avg_memory_usage": float(avg_memory)
                }
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to get VM metrics summary: {str(e)}"
            } 