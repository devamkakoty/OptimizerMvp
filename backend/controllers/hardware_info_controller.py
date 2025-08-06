from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from app.models import HardwareInfo
from datetime import datetime
import json

class HardwareInfoController:
    def __init__(self):
        pass
    
    def get_all_hardware(self, db: Session) -> Dict[str, Any]:
        """Get all hardware configurations"""
        try:
            hardware_list = db.query(HardwareInfo).all()
            
            return {
                "status": "success",
                "hardware_list": [hw.to_dict() for hw in hardware_list]
            }
        except Exception as e:
            return {"error": f"Failed to fetch hardware data: {str(e)}"}
    
    def get_hardware_by_id(self, db: Session, hardware_id: int) -> Dict[str, Any]:
        """Get hardware configuration by ID"""
        try:
            hardware = db.query(HardwareInfo).filter(HardwareInfo.id == hardware_id).first()
            
            if not hardware:
                return {"error": f"Hardware with ID {hardware_id} not found"}
            
            return {
                "status": "success",
                "hardware": hardware.to_dict()
            }
        except Exception as e:
            return {"error": f"Failed to fetch hardware data: {str(e)}"}
    
    def populate_hardware_database(self, db: Session, csv_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Populate the hardware database with data from CSV"""
        try:
            for row in csv_data:
                # Check if hardware already exists
                existing_hardware = db.query(HardwareInfo).filter(
                    HardwareInfo.cpu == row['CPU'],
                    HardwareInfo.gpu == row['GPU']
                ).first()
                
                if existing_hardware:
                    # Update existing hardware
                    existing_hardware.num_gpu = row.get('# of GPU')
                    existing_hardware.gpu_memory_total_vram_mb = row.get('GPU Memory Total - VRAM (MB)')
                    existing_hardware.gpu_graphics_clock = row.get('GPU Graphics clock')
                    existing_hardware.gpu_memory_clock = row.get('GPU Memory clock')
                    existing_hardware.gpu_sm_cores = row.get('GPU SM Cores')
                    existing_hardware.gpu_cuda_cores = row.get('GPU CUDA Cores')
                    existing_hardware.cpu_total_cores = row.get('CPU Total cores (Including Logical cores)')
                    existing_hardware.cpu_threads_per_core = row.get('CPU Threads per Core')
                    existing_hardware.cpu_base_clock_ghz = row.get('CPU Base clock(GHz)')
                    existing_hardware.cpu_max_frequency_ghz = row.get('CPU Max Frequency(GHz)')
                    existing_hardware.l1_cache = row.get('L1 Cache')
                    existing_hardware.cpu_power_consumption = row.get('CPU Power Consumption')
                    existing_hardware.gpu_power_consumption = row.get('GPUPower Consumption')
                    existing_hardware.updated_at = datetime.utcnow()
                else:
                    # Create new hardware
                    new_hardware = HardwareInfo(
                        cpu=row['CPU'],
                        gpu=row['GPU'],
                        num_gpu=row.get('# of GPU'),
                        gpu_memory_total_vram_mb=row.get('GPU Memory Total - VRAM (MB)'),
                        gpu_graphics_clock=row.get('GPU Graphics clock'),
                        gpu_memory_clock=row.get('GPU Memory clock'),
                        gpu_sm_cores=row.get('GPU SM Cores'),
                        gpu_cuda_cores=row.get('GPU CUDA Cores'),
                        cpu_total_cores=row.get('CPU Total cores (Including Logical cores)'),
                        cpu_threads_per_core=row.get('CPU Threads per Core'),
                        cpu_base_clock_ghz=row.get('CPU Base clock(GHz)'),
                        cpu_max_frequency_ghz=row.get('CPU Max Frequency(GHz)'),
                        l1_cache=row.get('L1 Cache'),
                        cpu_power_consumption=row.get('CPU Power Consumption'),
                        gpu_power_consumption=row.get('GPUPower Consumption')
                    )
                    db.add(new_hardware)
            
            db.commit()
            return {"status": "success", "message": f"Successfully populated database with {len(csv_data)} hardware configurations"}
        except Exception as e:
            db.rollback()
            return {"error": f"Failed to populate database: {str(e)}"} 