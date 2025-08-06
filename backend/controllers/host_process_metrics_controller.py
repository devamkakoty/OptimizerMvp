from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from app.models import HostProcessMetric
from datetime import datetime, timedelta
from .time_filter_utils import TimeFilterUtils
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
                                time_filter: Optional[str] = None,
                                start_date: Optional[str] = None,
                                end_date: Optional[str] = None,
                                start_time_str: Optional[str] = None,
                                end_time_str: Optional[str] = None,
                                limit: int = 1000) -> Dict[str, Any]:
        """Get host process metrics data with optional filters, time-based filtering, and date range filtering"""
        try:
            # Use TimeFilterUtils for time-based filtering
            additional_filters = {}
            if process_name:
                additional_filters['process_name'] = process_name
            if process_id:
                additional_filters['process_id'] = process_id
            if username:
                additional_filters['username'] = username
            
            result = TimeFilterUtils.get_time_based_data(
                db=db,
                model_class=HostProcessMetric,
                time_filter=time_filter or 'custom',
                start_time=start_time,
                end_time=end_time,
                additional_filters=additional_filters,
                limit=limit,
                start_date=start_date,
                end_date=end_date,
                start_time_str=start_time_str,
                end_time_str=end_time_str
            )
            
            return result
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to retrieve host process metrics: {str(e)}"
            }
    
    def get_host_process_metrics_summary(self, db: Session, 
                                        process_name: Optional[str] = None,
                                        username: Optional[str] = None,
                                        start_time: Optional[datetime] = None,
                                        end_time: Optional[datetime] = None,
                                        time_filter: Optional[str] = None,
                                        start_date: Optional[str] = None,
                                        end_date: Optional[str] = None,
                                        start_time_str: Optional[str] = None,
                                        end_time_str: Optional[str] = None) -> Dict[str, Any]:
        """Get summary statistics for host process metrics with time-based filtering and date range filtering"""
        try:
            additional_filters = {}
            if process_name:
                additional_filters['process_name'] = process_name
            if username:
                additional_filters['username'] = username
            
            # Get aggregated data using TimeFilterUtils
            aggregated_data = TimeFilterUtils.get_aggregated_metrics(
                db=db,
                model_class=HostProcessMetric,
                time_filter=time_filter or 'daily',
                group_by_field='process_name' if process_name is None else None,
                additional_filters=additional_filters,
                start_date=start_date,
                end_date=end_date,
                start_time_str=start_time_str,
                end_time_str=end_time_str
            )
            
            if aggregated_data:
                return {
                    "success": True,
                    "summary": {
                        "time_filter": time_filter or 'daily',
                        "date_range": f"{start_date} to {end_date}" if start_date and end_date else None,
                        "aggregated_data": aggregated_data,
                        "total_processes": len(aggregated_data) if process_name is None else 1
                    }
                }
            else:
                return {
                    "success": True,
                    "summary": {
                        "time_filter": time_filter or 'daily',
                        "date_range": f"{start_date} to {end_date}" if start_date and end_date else None,
                        "aggregated_data": [],
                        "total_processes": 0
                    }
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to get host process metrics summary: {str(e)}"
            }
    
    def get_host_process_metrics_by_time_filter(self, db: Session, 
                                               time_filter: str = 'daily',
                                               process_name: Optional[str] = None,
                                               username: Optional[str] = None,
                                               group_by_process: bool = True,
                                               start_date: Optional[str] = None,
                                               end_date: Optional[str] = None,
                                               start_time_str: Optional[str] = None,
                                               end_time_str: Optional[str] = None) -> Dict[str, Any]:
        """Get host process metrics aggregated by time filter (daily, weekly, monthly) or date range"""
        try:
            additional_filters = {}
            if process_name:
                additional_filters['process_name'] = process_name
            if username:
                additional_filters['username'] = username
            
            group_by_field = 'process_name' if group_by_process and process_name is None else None
            
            aggregated_data = TimeFilterUtils.get_aggregated_metrics(
                db=db,
                model_class=HostProcessMetric,
                time_filter=time_filter,
                group_by_field=group_by_field,
                additional_filters=additional_filters,
                start_date=start_date,
                end_date=end_date,
                start_time_str=start_time_str,
                end_time_str=end_time_str
            )
            
            return {
                "success": True,
                "data": aggregated_data,
                "time_filter": time_filter,
                "date_range": f"{start_date} to {end_date}" if start_date and end_date else None,
                "count": len(aggregated_data)
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to get host process metrics by time filter: {str(e)}"
            }
    
    def get_date_range_options(self) -> Dict[str, Any]:
        """Get predefined date range options for UI calendar"""
        return TimeFilterUtils.get_date_range_options() 