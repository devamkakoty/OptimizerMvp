from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from app.models import HostOverallMetric
from datetime import datetime, timedelta
from .time_filter_utils import TimeFilterUtils
import json

class HostOverallMetricsController:
    """Controller for Host Overall metrics operations"""
    
    def push_host_overall_metrics(self, db: Session, host_overall_metrics_data: Dict[str, Any]) -> Dict[str, Any]:
        """Push host overall metrics data to database"""
        try:
            host_overall_metric = HostOverallMetric(
                timestamp=host_overall_metrics_data.get('timestamp', datetime.utcnow()),
                host_cpu_usage_percent=host_overall_metrics_data.get('host_cpu_usage_percent'),
                host_ram_usage_percent=host_overall_metrics_data.get('host_ram_usage_percent'),
                host_gpu_utilization_percent=host_overall_metrics_data.get('host_gpu_utilization_percent'),
                host_gpu_memory_utilization_percent=host_overall_metrics_data.get('host_gpu_memory_utilization_percent'),
                host_gpu_temperature_celsius=host_overall_metrics_data.get('host_gpu_temperature_celsius'),
                host_gpu_power_draw_watts=host_overall_metrics_data.get('host_gpu_power_draw_watts')
            )
            
            db.add(host_overall_metric)
            db.commit()
            db.refresh(host_overall_metric)
            
            return {
                "success": True,
                "message": "Host overall metrics data pushed successfully",
                "data": {
                    "timestamp": host_overall_metric.timestamp.isoformat(),
                    "host_cpu_usage_percent": host_overall_metric.host_cpu_usage_percent,
                    "host_ram_usage_percent": host_overall_metric.host_ram_usage_percent,
                    "host_gpu_utilization_percent": host_overall_metric.host_gpu_utilization_percent
                }
            }
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "message": f"Failed to push host overall metrics: {str(e)}"
            }
    
    def push_host_overall_metrics_batch(self, db: Session, host_overall_metrics_batch: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Push a batch of host overall metrics data to database"""
        try:
            host_overall_metrics = []
            for metrics_data in host_overall_metrics_batch:
                host_overall_metric = HostOverallMetric(
                    timestamp=metrics_data.get('timestamp', datetime.utcnow()),
                    host_cpu_usage_percent=metrics_data.get('host_cpu_usage_percent'),
                    host_ram_usage_percent=metrics_data.get('host_ram_usage_percent'),
                    host_gpu_utilization_percent=metrics_data.get('host_gpu_utilization_percent'),
                    host_gpu_memory_utilization_percent=metrics_data.get('host_gpu_memory_utilization_percent'),
                    host_gpu_temperature_celsius=metrics_data.get('host_gpu_temperature_celsius'),
                    host_gpu_power_draw_watts=metrics_data.get('host_gpu_power_draw_watts')
                )
                host_overall_metrics.append(host_overall_metric)
            
            db.bulk_save_objects(host_overall_metrics)
            db.commit()
            
            return {
                "success": True,
                "message": f"Successfully pushed {len(host_overall_metrics)} host overall metrics records",
                "count": len(host_overall_metrics)
            }
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "message": f"Failed to push host overall metrics batch: {str(e)}"
            }
    
    def get_host_overall_metrics(self, db: Session, 
                                start_time: Optional[datetime] = None,
                                end_time: Optional[datetime] = None,
                                time_filter: Optional[str] = None,
                                start_date: Optional[str] = None,
                                end_date: Optional[str] = None,
                                start_time_str: Optional[str] = None,
                                end_time_str: Optional[str] = None,
                                limit: int = 1000) -> Dict[str, Any]:
        """Get host overall metrics data with optional filters and time-based filtering"""
        try:
            result = TimeFilterUtils.get_time_based_data(
                db=db,
                model_class=HostOverallMetric,
                time_filter=time_filter or 'custom',
                start_time=start_time,
                end_time=end_time,
                additional_filters={},
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
                "message": f"Failed to retrieve host overall metrics: {str(e)}"
            }
    
    def get_host_overall_metrics_summary(self, db: Session, 
                                        start_time: Optional[datetime] = None,
                                        end_time: Optional[datetime] = None,
                                        time_filter: Optional[str] = None,
                                        start_date: Optional[str] = None,
                                        end_date: Optional[str] = None,
                                        start_time_str: Optional[str] = None,
                                        end_time_str: Optional[str] = None) -> Dict[str, Any]:
        """Get summary statistics for host overall metrics with time-based filtering"""
        try:
            # Get aggregated data using TimeFilterUtils
            aggregated_data = TimeFilterUtils.get_aggregated_metrics(
                db=db,
                model_class=HostOverallMetric,
                time_filter=time_filter or 'daily',
                group_by_field=None,
                additional_filters={},
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
                        "total_records": len(aggregated_data)
                    }
                }
            else:
                return {
                    "success": True,
                    "summary": {
                        "time_filter": time_filter or 'daily',
                        "date_range": f"{start_date} to {end_date}" if start_date and end_date else None,
                        "aggregated_data": [],
                        "total_records": 0
                    }
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to get host overall metrics summary: {str(e)}"
            }
    
    def get_host_overall_metrics_by_time_filter(self, db: Session, 
                                               time_filter: str = 'daily',
                                               start_date: Optional[str] = None,
                                               end_date: Optional[str] = None,
                                               start_time_str: Optional[str] = None,
                                               end_time_str: Optional[str] = None) -> Dict[str, Any]:
        """Get host overall metrics aggregated by time filter (daily, weekly, monthly) or date range"""
        try:
            aggregated_data = TimeFilterUtils.get_aggregated_metrics(
                db=db,
                model_class=HostOverallMetric,
                time_filter=time_filter,
                group_by_field=None,
                additional_filters={},
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
                "message": f"Failed to get host overall metrics by time filter: {str(e)}"
            }
    
    def get_latest_host_overall_metrics(self, db: Session) -> Dict[str, Any]:
        """Get the latest host overall metrics record"""
        try:
            latest_metric = db.query(HostOverallMetric).order_by(desc(HostOverallMetric.timestamp)).first()
            
            if latest_metric:
                return {
                    "success": True,
                    "data": latest_metric.to_dict()
                }
            else:
                return {
                    "success": True,
                    "data": None,
                    "message": "No host overall metrics found"
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to get latest host overall metrics: {str(e)}"
            }
    
    def get_date_range_options(self) -> Dict[str, Any]:
        """Get predefined date range options for UI calendar"""
        return TimeFilterUtils.get_date_range_options()