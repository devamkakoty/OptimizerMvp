from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from app.models import HostProcessMetric
from datetime import datetime, timedelta
import json

class HostProcessMetricsController:
    """Controller for Host Process metrics operations"""
    
    def push_host_process_metrics(self, db: Session, host_process_metrics_data: Dict[str, Any]) -> Dict[str, Any]:
        """Push host process metrics data to database"""
        try:
            host_process_metric = HostProcessMetric(
                timestamp=host_process_metrics_data.get('timestamp', datetime.utcnow()),
                process_name=host_process_metrics_data.get('process_name'),
                process_id=host_process_metrics_data['process_id'],
                username=host_process_metrics_data.get('username'),
                status=host_process_metrics_data.get('status'),
                cpu_usage_percent=host_process_metrics_data['cpu_usage_percent'],
                memory_usage_mb=host_process_metrics_data['memory_usage_mb'],
                gpu_memory_usage_mb=host_process_metrics_data['gpu_memory_usage_mb'],
                gpu_utilization_percent=host_process_metrics_data['gpu_utilization_percent']
            )
            
            db.add(host_process_metric)
            db.commit()
            db.refresh(host_process_metric)
            
            return {
                "success": True,
                "message": "Host process metrics data pushed successfully",
                "data": {
                    "id": host_process_metric.id,
                    "process_name": host_process_metric.process_name,
                    "process_id": host_process_metric.process_id,
                    "timestamp": host_process_metric.timestamp.isoformat()
                }
            }
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "message": f"Failed to push host process metrics: {str(e)}"
            }
    
    def push_host_process_metrics_batch(self, db: Session, host_process_metrics_batch: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Push a batch of host process metrics data to database"""
        try:
            host_process_metrics = []
            for metrics_data in host_process_metrics_batch:
                host_process_metric = HostProcessMetric(
                    timestamp=metrics_data.get('timestamp', datetime.utcnow()),
                    process_name=metrics_data.get('process_name'),
                    process_id=metrics_data['process_id'],
                    username=metrics_data.get('username'),
                    status=metrics_data.get('status'),
                    cpu_usage_percent=metrics_data['cpu_usage_percent'],
                    memory_usage_mb=metrics_data['memory_usage_mb'],
                    gpu_memory_usage_mb=metrics_data['gpu_memory_usage_mb'],
                    gpu_utilization_percent=metrics_data['gpu_utilization_percent']
                )
                host_process_metrics.append(host_process_metric)
            
            db.bulk_save_objects(host_process_metrics)
            db.commit()
            
            return {
                "success": True,
                "message": f"Successfully pushed {len(host_process_metrics)} host process metrics records",
                "count": len(host_process_metrics)
            }
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "message": f"Failed to push host process metrics batch: {str(e)}"
            }
    
    def get_host_process_metrics(self, db: Session, 
                                process_name: Optional[str] = None,
                                process_id: Optional[int] = None,
                                username: Optional[str] = None,
                                start_time: Optional[datetime] = None,
                                end_time: Optional[datetime] = None,
                                limit: int = 1000) -> Dict[str, Any]:
        """Get host process metrics data with optional filters"""
        try:
            query = db.query(HostProcessMetric)
            
            # Apply filters
            if process_name:
                query = query.filter(HostProcessMetric.process_name == process_name)
            
            if process_id:
                query = query.filter(HostProcessMetric.process_id == process_id)
            
            if username:
                query = query.filter(HostProcessMetric.username == username)
            
            if start_time:
                query = query.filter(HostProcessMetric.timestamp >= start_time)
            
            if end_time:
                query = query.filter(HostProcessMetric.timestamp <= end_time)
            
            # Order by timestamp descending and limit results
            query = query.order_by(desc(HostProcessMetric.timestamp)).limit(limit)
            
            host_process_metrics = query.all()
            
            # Convert to JSON-serializable format
            metrics_data = []
            for metric in host_process_metrics:
                metrics_data.append({
                    "id": metric.id,
                    "timestamp": metric.timestamp.isoformat(),
                    "process_name": metric.process_name,
                    "process_id": metric.process_id,
                    "username": metric.username,
                    "status": metric.status,
                    "cpu_usage_percent": metric.cpu_usage_percent,
                    "memory_usage_mb": metric.memory_usage_mb,
                    "gpu_memory_usage_mb": metric.gpu_memory_usage_mb,
                    "gpu_utilization_percent": metric.gpu_utilization_percent
                })
            
            return {
                "success": True,
                "data": metrics_data,
                "count": len(metrics_data)
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to retrieve host process metrics: {str(e)}"
            }
    
    def get_host_process_metrics_summary(self, db: Session, 
                                        process_name: Optional[str] = None,
                                        username: Optional[str] = None,
                                        start_time: Optional[datetime] = None,
                                        end_time: Optional[datetime] = None) -> Dict[str, Any]:
        """Get summary statistics for host process metrics"""
        try:
            query = db.query(HostProcessMetric)
            
            # Apply filters
            if process_name:
                query = query.filter(HostProcessMetric.process_name == process_name)
            
            if username:
                query = query.filter(HostProcessMetric.username == username)
            
            if start_time:
                query = query.filter(HostProcessMetric.timestamp >= start_time)
            
            if end_time:
                query = query.filter(HostProcessMetric.timestamp <= end_time)
            
            # Calculate summary statistics
            total_records = query.count()
            
            if total_records == 0:
                return {
                    "success": True,
                    "summary": {
                        "total_records": 0,
                        "process_names": [],
                        "usernames": [],
                        "avg_cpu_usage_percent": 0,
                        "avg_memory_usage_mb": 0,
                        "avg_gpu_memory_usage_mb": 0,
                        "avg_gpu_utilization_percent": 0
                    }
                }
            
            # Get unique process names and usernames
            process_names = [row[0] for row in db.query(HostProcessMetric.process_name).distinct().all() if row[0]]
            usernames = [row[0] for row in db.query(HostProcessMetric.username).distinct().all() if row[0]]
            
            # Calculate averages
            avg_cpu = db.query(func.avg(HostProcessMetric.cpu_usage_percent)).scalar() or 0
            avg_memory = db.query(func.avg(HostProcessMetric.memory_usage_mb)).scalar() or 0
            avg_gpu_memory = db.query(func.avg(HostProcessMetric.gpu_memory_usage_mb)).scalar() or 0
            avg_gpu_util = db.query(func.avg(HostProcessMetric.gpu_utilization_percent)).scalar() or 0
            
            return {
                "success": True,
                "summary": {
                    "total_records": total_records,
                    "process_names": process_names,
                    "usernames": usernames,
                    "avg_cpu_usage_percent": float(avg_cpu),
                    "avg_memory_usage_mb": float(avg_memory),
                    "avg_gpu_memory_usage_mb": float(avg_gpu_memory),
                    "avg_gpu_utilization_percent": float(avg_gpu_util)
                }
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to get host process metrics summary: {str(e)}"
            } 