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
    
    def create_hardware(self, db: Session, hardware_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new hardware configuration"""
        try:
            # Check if hardware already exists with same CPU and GPU
            existing_hardware = db.query(HardwareInfo).filter(
                HardwareInfo.cpu == hardware_data.get('cpu'),
                HardwareInfo.gpu == hardware_data.get('gpu')
            ).first()
            
            if existing_hardware:
                return {"error": f"Hardware with CPU '{hardware_data.get('cpu')}' and GPU '{hardware_data.get('gpu')}' already exists"}
            
            # Create new hardware
            new_hardware = HardwareInfo(
                cpu=hardware_data.get('cpu'),
                gpu=hardware_data.get('gpu'),
                num_gpu=hardware_data.get('num_gpu'),
                gpu_memory_total_vram_mb=hardware_data.get('gpu_memory_total_vram_mb'),
                gpu_graphics_clock=hardware_data.get('gpu_graphics_clock'),
                gpu_memory_clock=hardware_data.get('gpu_memory_clock'),
                gpu_sm_cores=hardware_data.get('gpu_sm_cores'),
                gpu_cuda_cores=hardware_data.get('gpu_cuda_cores'),
                cpu_total_cores=hardware_data.get('cpu_total_cores'),
                cpu_threads_per_core=hardware_data.get('cpu_threads_per_core'),
                cpu_base_clock_ghz=hardware_data.get('cpu_base_clock_ghz'),
                cpu_max_frequency_ghz=hardware_data.get('cpu_max_frequency_ghz'),
                l1_cache=hardware_data.get('l1_cache'),
                cpu_power_consumption=hardware_data.get('cpu_power_consumption'),
                gpu_power_consumption=hardware_data.get('gpu_power_consumption')
            )
            
            db.add(new_hardware)
            db.commit()
            db.refresh(new_hardware)
            
            return {
                "status": "success",
                "message": "Hardware configuration created successfully",
                "hardware": new_hardware.to_dict()
            }
        except Exception as e:
            db.rollback()
            return {"error": f"Failed to create hardware: {str(e)}"}
    
    def update_hardware(self, db: Session, hardware_id: int, hardware_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing hardware configuration"""
        try:
            hardware = db.query(HardwareInfo).filter(HardwareInfo.id == hardware_id).first()
            
            if not hardware:
                return {"error": f"Hardware with ID {hardware_id} not found"}
            
            # Update fields if provided
            if 'cpu' in hardware_data:
                hardware.cpu = hardware_data['cpu']
            if 'gpu' in hardware_data:
                hardware.gpu = hardware_data['gpu']
            if 'num_gpu' in hardware_data:
                hardware.num_gpu = hardware_data['num_gpu']
            if 'gpu_memory_total_vram_mb' in hardware_data:
                hardware.gpu_memory_total_vram_mb = hardware_data['gpu_memory_total_vram_mb']
            if 'gpu_graphics_clock' in hardware_data:
                hardware.gpu_graphics_clock = hardware_data['gpu_graphics_clock']
            if 'gpu_memory_clock' in hardware_data:
                hardware.gpu_memory_clock = hardware_data['gpu_memory_clock']
            if 'gpu_sm_cores' in hardware_data:
                hardware.gpu_sm_cores = hardware_data['gpu_sm_cores']
            if 'gpu_cuda_cores' in hardware_data:
                hardware.gpu_cuda_cores = hardware_data['gpu_cuda_cores']
            if 'cpu_total_cores' in hardware_data:
                hardware.cpu_total_cores = hardware_data['cpu_total_cores']
            if 'cpu_threads_per_core' in hardware_data:
                hardware.cpu_threads_per_core = hardware_data['cpu_threads_per_core']
            if 'cpu_base_clock_ghz' in hardware_data:
                hardware.cpu_base_clock_ghz = hardware_data['cpu_base_clock_ghz']
            if 'cpu_max_frequency_ghz' in hardware_data:
                hardware.cpu_max_frequency_ghz = hardware_data['cpu_max_frequency_ghz']
            if 'l1_cache' in hardware_data:
                hardware.l1_cache = hardware_data['l1_cache']
            if 'cpu_power_consumption' in hardware_data:
                hardware.cpu_power_consumption = hardware_data['cpu_power_consumption']
            if 'gpu_power_consumption' in hardware_data:
                hardware.gpu_power_consumption = hardware_data['gpu_power_consumption']
            
            db.commit()
            db.refresh(hardware)
            
            return {
                "status": "success",
                "message": "Hardware configuration updated successfully",
                "hardware": hardware.to_dict()
            }
        except Exception as e:
            db.rollback()
            return {"error": f"Failed to update hardware: {str(e)}"}
    
    def delete_hardware(self, db: Session, hardware_id: int) -> Dict[str, Any]:
        """Delete a hardware configuration"""
        try:
            hardware = db.query(HardwareInfo).filter(HardwareInfo.id == hardware_id).first()
            
            if not hardware:
                return {"error": f"Hardware with ID {hardware_id} not found"}
            
            db.delete(hardware)
            db.commit()
            
            return {
                "status": "success",
                "message": f"Hardware configuration with ID {hardware_id} deleted successfully"
            }
        except Exception as e:
            db.rollback()
            return {"error": f"Failed to delete hardware: {str(e)}"} 