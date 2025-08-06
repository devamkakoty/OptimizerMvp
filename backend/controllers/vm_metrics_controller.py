from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from app.models import VMMetric
from datetime import datetime, timedelta
from .time_filter_utils import TimeFilterUtils
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
                       time_filter: Optional[str] = None,
                       start_date: Optional[str] = None,
                       end_date: Optional[str] = None,
                       start_time_str: Optional[str] = None,
                       end_time_str: Optional[str] = None,
                       limit: int = 1000) -> Dict[str, Any]:
        """Get VM metrics data with optional filters, time-based filtering, and date range filtering"""
        try:
            # Use TimeFilterUtils for time-based filtering
            additional_filters = {}
            if vm_name:
                additional_filters['vm_name'] = vm_name
            
            result = TimeFilterUtils.get_time_based_data(
                db=db,
                model_class=VMMetric,
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
                "message": f"Failed to retrieve VM metrics: {str(e)}"
            }
    
    def get_vm_metrics_summary(self, db: Session, 
                              vm_name: Optional[str] = None,
                              start_time: Optional[datetime] = None,
                              end_time: Optional[datetime] = None,
                              time_filter: Optional[str] = None,
                              start_date: Optional[str] = None,
                              end_date: Optional[str] = None,
                              start_time_str: Optional[str] = None,
                              end_time_str: Optional[str] = None) -> Dict[str, Any]:
        """Get summary statistics for VM metrics with time-based filtering and date range filtering"""
        try:
            additional_filters = {}
            if vm_name:
                additional_filters['vm_name'] = vm_name
            
            # Get aggregated data using TimeFilterUtils
            aggregated_data = TimeFilterUtils.get_aggregated_metrics(
                db=db,
                model_class=VMMetric,
                time_filter=time_filter or 'daily',
                group_by_field='vm_name' if vm_name is None else None,
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
                        "total_vms": len(aggregated_data) if vm_name is None else 1
                    }
                }
            else:
                return {
                    "success": True,
                    "summary": {
                        "time_filter": time_filter or 'daily',
                        "date_range": f"{start_date} to {end_date}" if start_date and end_date else None,
                        "aggregated_data": [],
                        "total_vms": 0
                    }
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to get VM metrics summary: {str(e)}"
            }
    
    def get_vm_metrics_by_time_filter(self, db: Session, 
                                     time_filter: str = 'daily',
                                     vm_name: Optional[str] = None,
                                     group_by_vm: bool = True,
                                     start_date: Optional[str] = None,
                                     end_date: Optional[str] = None,
                                     start_time_str: Optional[str] = None,
                                     end_time_str: Optional[str] = None) -> Dict[str, Any]:
        """Get VM metrics aggregated by time filter (daily, weekly, monthly) or date range"""
        try:
            additional_filters = {}
            if vm_name:
                additional_filters['vm_name'] = vm_name
            
            group_by_field = 'vm_name' if group_by_vm and vm_name is None else None
            
            aggregated_data = TimeFilterUtils.get_aggregated_metrics(
                db=db,
                model_class=VMMetric,
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
                "message": f"Failed to get VM metrics by time filter: {str(e)}"
            }
    
    def get_date_range_options(self) -> Dict[str, Any]:
        """Get predefined date range options for UI calendar"""
        return TimeFilterUtils.get_date_range_options() 