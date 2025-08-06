from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from app.models import HardwareSpecs
from datetime import datetime, timedelta
from .time_filter_utils import TimeFilterUtils
import json

class HardwareSpecsController:
    """Controller for Hardware Specifications operations"""
    
    def push_hardware_specs(self, db: Session, hardware_specs_data: Dict[str, Any]) -> Dict[str, Any]:
        """Push hardware specifications data to database"""
        try:
            # Validate required fields
            required_fields = [
                'os_name', 'os_version', 'os_architecture',
                'cpu_brand', 'cpu_model', 'cpu_physical_cores', 
                'cpu_total_cores', 'cpu_sockets', 'cpu_cores_per_socket',
                'cpu_threads_per_core', 'total_ram_gb', 'total_storage_gb'
            ]
            
            for field in required_fields:
                if field not in hardware_specs_data:
                    return {
                        "success": False,
                        "message": f"Missing required field: {field}"
                    }
            
            # Create hardware specs record
            hardware_specs = HardwareSpecs(
                os_name=hardware_specs_data['os_name'],
                os_version=hardware_specs_data['os_version'],
                os_architecture=hardware_specs_data['os_architecture'],
                cpu_brand=hardware_specs_data['cpu_brand'],
                cpu_model=hardware_specs_data['cpu_model'],
                cpu_family=hardware_specs_data.get('cpu_family'),
                cpu_model_family=hardware_specs_data.get('cpu_model_family'),
                cpu_physical_cores=hardware_specs_data['cpu_physical_cores'],
                cpu_total_cores=hardware_specs_data['cpu_total_cores'],
                cpu_sockets=hardware_specs_data['cpu_sockets'],
                cpu_cores_per_socket=hardware_specs_data['cpu_cores_per_socket'],
                cpu_threads_per_core=hardware_specs_data['cpu_threads_per_core'],
                total_ram_gb=hardware_specs_data['total_ram_gb'],
                total_storage_gb=hardware_specs_data['total_storage_gb'],
                gpu_cuda_cores=hardware_specs_data.get('gpu_cuda_cores'),
                gpu_brand=hardware_specs_data.get('gpu_brand'),
                gpu_model=hardware_specs_data.get('gpu_model'),
                gpu_driver_version=hardware_specs_data.get('gpu_driver_version'),
                gpu_vram_total_mb=hardware_specs_data.get('gpu_vram_total_mb'),
                timestamp=hardware_specs_data.get('timestamp', datetime.utcnow())
            )
            
            db.add(hardware_specs)
            db.commit()
            db.refresh(hardware_specs)
            
            return {
                "success": True,
                "message": "Hardware specifications data pushed successfully",
                "data": {
                    "id": hardware_specs.id,
                    "cpu_model": hardware_specs.cpu_model,
                    "os_name": hardware_specs.os_name,
                    "timestamp": hardware_specs.timestamp.isoformat()
                }
            }
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "message": f"Failed to push hardware specifications: {str(e)}"
            }
    
    def push_hardware_specs_batch(self, db: Session, hardware_specs_batch: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Push a batch of hardware specifications data to database"""
        try:
            if not hardware_specs_batch:
                return {
                    "success": False,
                    "message": "No hardware specifications data provided"
                }
            
            # Validate all records
            required_fields = [
                'os_name', 'os_version', 'os_architecture',
                'cpu_brand', 'cpu_model', 'cpu_physical_cores', 
                'cpu_total_cores', 'cpu_sockets', 'cpu_cores_per_socket',
                'cpu_threads_per_core', 'total_ram_gb', 'total_storage_gb'
            ]
            
            for i, record in enumerate(hardware_specs_batch):
                for field in required_fields:
                    if field not in record:
                        return {
                            "success": False,
                            "message": f"Missing required field '{field}' in record {i}"
                        }
            
            # Create hardware specs records
            hardware_specs_list = []
            for specs_data in hardware_specs_batch:
                hardware_specs = HardwareSpecs(
                    os_name=specs_data['os_name'],
                    os_version=specs_data['os_version'],
                    os_architecture=specs_data['os_architecture'],
                    cpu_brand=specs_data['cpu_brand'],
                    cpu_model=specs_data['cpu_model'],
                    cpu_family=specs_data.get('cpu_family'),
                    cpu_model_family=specs_data.get('cpu_model_family'),
                    cpu_physical_cores=specs_data['cpu_physical_cores'],
                    cpu_total_cores=specs_data['cpu_total_cores'],
                    cpu_sockets=specs_data['cpu_sockets'],
                    cpu_cores_per_socket=specs_data['cpu_cores_per_socket'],
                    cpu_threads_per_core=specs_data['cpu_threads_per_core'],
                    total_ram_gb=specs_data['total_ram_gb'],
                    total_storage_gb=specs_data['total_storage_gb'],
                    gpu_cuda_cores=specs_data.get('gpu_cuda_cores'),
                    gpu_brand=specs_data.get('gpu_brand'),
                    gpu_model=specs_data.get('gpu_model'),
                    gpu_driver_version=specs_data.get('gpu_driver_version'),
                    gpu_vram_total_mb=specs_data.get('gpu_vram_total_mb'),
                    timestamp=specs_data.get('timestamp', datetime.utcnow())
                )
                hardware_specs_list.append(hardware_specs)
            
            db.bulk_save_objects(hardware_specs_list)
            db.commit()
            
            return {
                "success": True,
                "message": f"Successfully pushed {len(hardware_specs_list)} hardware specifications records",
                "count": len(hardware_specs_list)
            }
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "message": f"Failed to push hardware specifications batch: {str(e)}"
            }
    
    def get_hardware_specs(self, db: Session, 
                           hardware_id: Optional[int] = None,
                           cpu_brand: Optional[str] = None,
                           gpu_brand: Optional[str] = None,
                           start_time: Optional[datetime] = None,
                           end_time: Optional[datetime] = None,
                           time_filter: Optional[str] = None,
                           start_date: Optional[str] = None,
                           end_date: Optional[str] = None,
                           start_time_str: Optional[str] = None,
                           end_time_str: Optional[str] = None,
                           limit: int = 1000) -> Dict[str, Any]:
        """Get hardware specifications data with optional filters"""
        try:
            # Use TimeFilterUtils for time-based filtering
            additional_filters = {}
            if hardware_id:
                additional_filters['id'] = hardware_id
            if cpu_brand:
                additional_filters['cpu_brand'] = cpu_brand
            if gpu_brand:
                additional_filters['gpu_brand'] = gpu_brand
            
            result = TimeFilterUtils.get_time_based_data(
                db=db,
                model_class=HardwareSpecs,
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
                "message": f"Failed to retrieve hardware specifications: {str(e)}"
            }
    
    def get_hardware_specs_summary(self, db: Session,
                                  cpu_brand: Optional[str] = None,
                                  gpu_brand: Optional[str] = None,
                                  start_time: Optional[datetime] = None,
                                  end_time: Optional[datetime] = None,
                                  time_filter: Optional[str] = None,
                                  start_date: Optional[str] = None,
                                  end_date: Optional[str] = None,
                                  start_time_str: Optional[str] = None,
                                  end_time_str: Optional[str] = None) -> Dict[str, Any]:
        """Get summary statistics for hardware specifications"""
        try:
            additional_filters = {}
            if cpu_brand:
                additional_filters['cpu_brand'] = cpu_brand
            if gpu_brand:
                additional_filters['gpu_brand'] = gpu_brand
            
            # Get aggregated data using TimeFilterUtils
            aggregated_data = TimeFilterUtils.get_aggregated_metrics(
                db=db,
                model_class=HardwareSpecs,
                time_filter=time_filter or 'daily',
                group_by_field='cpu_brand' if cpu_brand is None else None,
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
                        "total_hardware": len(aggregated_data) if cpu_brand is None else 1
                    }
                }
            else:
                return {
                    "success": True,
                    "summary": {
                        "time_filter": time_filter or 'daily',
                        "date_range": f"{start_date} to {end_date}" if start_date and end_date else None,
                        "aggregated_data": [],
                        "total_hardware": 0
                    }
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to get hardware specifications summary: {str(e)}"
            }
    
    def get_hardware_specs_by_time_filter(self, db: Session, 
                                         time_filter: str = 'daily',
                                         cpu_brand: Optional[str] = None,
                                         gpu_brand: Optional[str] = None,
                                         group_by_cpu: bool = True,
                                         start_date: Optional[str] = None,
                                         end_date: Optional[str] = None,
                                         start_time_str: Optional[str] = None,
                                         end_time_str: Optional[str] = None) -> Dict[str, Any]:
        """Get hardware specifications aggregated by time filter"""
        try:
            additional_filters = {}
            if cpu_brand:
                additional_filters['cpu_brand'] = cpu_brand
            if gpu_brand:
                additional_filters['gpu_brand'] = gpu_brand
            
            group_by_field = 'cpu_brand' if group_by_cpu and cpu_brand is None else None
            
            aggregated_data = TimeFilterUtils.get_aggregated_metrics(
                db=db,
                model_class=HardwareSpecs,
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
                "message": f"Failed to get hardware specifications by time filter: {str(e)}"
            }
    
    def get_latest_hardware_specs(self, db: Session, hardware_id: Optional[int] = None) -> Dict[str, Any]:
        """Get the latest hardware specifications for a specific hardware or all"""
        try:
            query = db.query(HardwareSpecs)
            
            if hardware_id:
                query = query.filter(HardwareSpecs.id == hardware_id)
            
            # Get the latest record by timestamp
            latest_specs = query.order_by(desc(HardwareSpecs.timestamp)).first()
            
            if latest_specs:
                return {
                    "success": True,
                    "data": latest_specs.to_dict()
                }
            else:
                return {
                    "success": True,
                    "data": None,
                    "message": "No hardware specifications found"
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to get latest hardware specifications: {str(e)}"
            }
    
    def get_date_range_options(self) -> Dict[str, Any]:
        """Get predefined date range options for UI calendar"""
        return TimeFilterUtils.get_date_range_options() 