#!/usr/bin/env python3
"""
Clean hardware database and repopulate with Available_HardwareHPE.csv data only
"""

import csv
import requests
import json
from typing import List, Dict, Any

def clean_hardware_database(api_url: str = "http://localhost:8000") -> bool:
    """Clear all hardware data from database"""
    try:
        response = requests.delete(
            f"{api_url}/api/hardware/clear-all",
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"[SUCCESS] Hardware database cleared: {result.get('message', '')}")
            return True
        else:
            print(f"[ERROR] Failed to clear hardware database: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"[ERROR] Error clearing hardware database: {e}")
        return False

def read_hardware_csv(file_path: str) -> List[Dict[str, Any]]:
    """Read hardware CSV file and return list of dictionaries"""
    data = []
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            for row in csv_reader:
                # Skip empty rows
                if not any(row.values()):
                    continue
                    
                # Convert empty strings to None for numeric fields
                for key, value in row.items():
                    if value == '' or value is None:
                        row[key] = None
                    elif value and key not in ['CPU', 'GPU']:  # Try to convert numeric fields
                        try:
                            # Try to convert to float first, then int if it's a whole number
                            float_val = float(value)
                            if float_val.is_integer():
                                row[key] = int(float_val)
                            else:
                                row[key] = float_val
                        except ValueError:
                            # Keep as string if not numeric
                            pass
                data.append(row)
        print(f"[SUCCESS] Successfully read {len(data)} hardware records from {file_path}")
        return data
    except Exception as e:
        print(f"[ERROR] Error reading {file_path}: {e}")
        return []

def populate_hardware_database(csv_data: List[Dict[str, Any]], api_url: str = "http://localhost:8000") -> bool:
    """Populate hardware database using the API endpoint"""
    try:
        response = requests.post(
            f"{api_url}/api/hardware/populate-database",
            json=csv_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"[SUCCESS] Hardware database populated successfully: {result.get('message', '')}")
            return True
        else:
            print(f"[ERROR] Failed to populate hardware database: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"[ERROR] Error calling hardware API: {e}")
        return False

def direct_database_cleanup():
    """Directly clean the database using SQLAlchemy (fallback if API is not running)"""
    try:
        import sys
        import os
        sys.path.append(os.path.dirname(__file__))
        
        from app.database import get_db
        from app.models import HardwareInfo
        
        print("Attempting direct database cleanup...")
        
        db = next(get_db())
        
        # Delete all hardware records
        deleted_count = db.query(HardwareInfo).delete()
        db.commit()
        
        print(f"[SUCCESS] Directly deleted {deleted_count} hardware records from database")
        return True
        
    except Exception as e:
        print(f"[ERROR] Direct database cleanup failed: {e}")
        return False

def direct_database_population(csv_data: List[Dict[str, Any]]) -> bool:
    """Directly populate database using SQLAlchemy (fallback if API is not running)"""
    try:
        import sys
        import os
        sys.path.append(os.path.dirname(__file__))
        
        from app.database import get_db
        from app.models import HardwareInfo
        from datetime import datetime
        
        print("Attempting direct database population...")
        
        db = next(get_db())
        
        for row in csv_data:
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
        print(f"[SUCCESS] Directly populated database with {len(csv_data)} hardware configurations")
        return True
        
    except Exception as e:
        print(f"[ERROR] Direct database population failed: {e}")
        return False

def main():
    """Main function to clean and repopulate hardware database"""
    print("=== HPE Hardware Database Cleanup & Repopulation ===\n")
    
    # Define CSV file path
    hardware_csv = "../sample_data/Available_HardwareHPE.csv"
    
    # Read CSV file
    print("1. Reading HPE hardware CSV file...")
    hardware_data = read_hardware_csv(hardware_csv)
    
    if not hardware_data:
        print("[ERROR] No hardware data found in CSV file")
        return False
    
    print(f"Found {len(hardware_data)} hardware configurations to populate:")
    for i, hw in enumerate(hardware_data, 1):
        print(f"  {i}. {hw['CPU']} + {hw['GPU']} ({hw.get('GPU Memory Total - VRAM (MB)', 0)}MB VRAM)")
    
    # Try API-based cleanup first
    print(f"\n2. Attempting to clean existing hardware database...")
    api_cleanup_success = clean_hardware_database()
    
    if not api_cleanup_success:
        print("API cleanup failed, trying direct database cleanup...")
        direct_cleanup_success = direct_database_cleanup()
        if not direct_cleanup_success:
            print("[ERROR] Both API and direct cleanup failed!")
            return False
    
    # Try API-based population first
    print(f"\n3. Populating hardware database with HPE data...")
    api_populate_success = populate_hardware_database(hardware_data)
    
    if not api_populate_success:
        print("API population failed, trying direct database population...")
        direct_populate_success = direct_database_population(hardware_data)
        if not direct_populate_success:
            print("[ERROR] Both API and direct population failed!")
            return False
    
    print(f"\n[SUCCESS] ✅ Hardware database successfully cleaned and repopulated!")
    print(f"[SUCCESS] ✅ Now contains {len(hardware_data)} HPE hardware configurations")
    print(f"\nHardware configurations now in database:")
    for i, hw in enumerate(hardware_data, 1):
        vram = hw.get('GPU Memory Total - VRAM (MB)', 'N/A')
        gpu_power = hw.get('GPUPower Consumption', 'N/A')
        print(f"  {i}. {hw['CPU']} + {hw['GPU']}")
        print(f"     └─ VRAM: {vram}MB, GPU Power: {gpu_power}W")
    
    return True

if __name__ == "__main__":
    success = main()
    if success:
        print("\n🎉 Database cleanup and repopulation completed successfully!")
    else:
        print("\n❌ Database cleanup and repopulation failed!")