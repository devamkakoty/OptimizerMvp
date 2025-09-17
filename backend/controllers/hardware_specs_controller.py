from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from app.models import HardwareSpecs
from datetime import datetime, timedelta
from .time_filter_utils import TimeFilterUtils
import json

class HardwareSpecsController:
    """Controller for Hardware Specifications operations"""
    
    def push_hardware_specs(self, db: Session, hardware_specs_data: Dict[str, Any]) -> Dict[str, Any]:
        """Push hardware specifications data to database - supports both API model format and old format"""
        try:
            # Validate core required fields (API model format)
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
            
            # Create hardware specs record with proper field mapping
            hardware_specs = HardwareSpecs(
                # Operating System Information
                os_name=hardware_specs_data['os_name'],
                os_version=hardware_specs_data['os_version'],
                os_architecture=hardware_specs_data['os_architecture'],
                
                # Hardware_table compatible fields - map API model to database columns
                CPU=hardware_specs_data['cpu_model'],  # API model uses cpu_model, DB column is CPU
                GPU=hardware_specs_data.get('gpu_model', 'No GPU'),  # API model uses gpu_model
                num_gpu=hardware_specs_data.get('num_gpu', 0),
                gpu_memory_total_mb=hardware_specs_data.get('gpu_vram_total_mb', 0),
                gpu_graphics_clock=hardware_specs_data.get('gpu_graphics_clock', 0.0),
                gpu_memory_clock=hardware_specs_data.get('gpu_memory_clock', 0.0),
                gpu_sm_cores=hardware_specs_data.get('gpu_sm_cores', 0),
                gpu_cuda_cores=int(hardware_specs_data.get('gpu_cuda_cores', 0)) if hardware_specs_data.get('gpu_cuda_cores') else 0,
                cpu_total_cores=hardware_specs_data['cpu_total_cores'],
                cpu_threads_per_core=hardware_specs_data['cpu_threads_per_core'],
                cpu_base_clock_ghz=hardware_specs_data.get('cpu_base_clock_ghz', 0.0),
                cpu_max_frequency_ghz=hardware_specs_data.get('cpu_max_frequency_ghz', 0.0),
                l1_cache=hardware_specs_data.get('l1_cache', 0),
                cpu_power_consumption=hardware_specs_data.get('cpu_power_consumption', 0),
                gpu_power_consumption=hardware_specs_data.get('gpu_power_consumption', 0),
                
                # Additional detailed fields
                cpu_brand=hardware_specs_data.get('cpu_brand'),
                cpu_family=hardware_specs_data.get('cpu_family'),
                cpu_model_family=hardware_specs_data.get('cpu_model_family'),
                cpu_physical_cores=hardware_specs_data.get('cpu_physical_cores'),
                cpu_sockets=hardware_specs_data.get('cpu_sockets'),
                cpu_cores_per_socket=hardware_specs_data.get('cpu_cores_per_socket'),
                gpu_brand=hardware_specs_data.get('gpu_brand'),
                gpu_driver_version=hardware_specs_data.get('gpu_driver_version'),
                total_ram_gb=hardware_specs_data['total_ram_gb'],
                total_storage_gb=hardware_specs_data['total_storage_gb'],
                region=hardware_specs_data.get('region', 'US'),
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
                    "CPU": hardware_specs.CPU,
                    "GPU": hardware_specs.GPU,
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