#!/usr/bin/env python3
"""
Database population script that runs during Docker initialization.
Populates the three main tables from CSV files and predefined data.
"""

import os
import sys
import csv
import time
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from typing import List, Dict, Any

# Add the backend directory to the path
sys.path.append('/app')
sys.path.append('/app/app')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database URLs from environment
MODEL_DB_URL = os.getenv('MODEL_DB_URL', 'postgresql://postgres:password@postgres:5432/Model_Recommendation_DB')
METRICS_DB_URL = os.getenv('METRICS_DB_URL', 'postgresql://postgres:password@postgres:5432/Metrics_db')
TIMESCALEDB_URL = os.getenv('TIMESCALEDB_URL', 'postgresql://postgres:password@timescaledb:5432/vm_metrics_ts')

# Cost models data removed - now handled by docker-init-data/05-seed-cost-models.sql

def wait_for_db(db_url: str, max_retries: int = 30) -> bool:
    """Wait for database to be ready"""
    for i in range(max_retries):
        try:
            engine = create_engine(db_url)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info(f"✓ Database {db_url.split('/')[-1]} is ready")
            return True
        except Exception as e:
            if i % 5 == 0:  # Log every 5 attempts
                logger.info(f"Waiting for database {db_url.split('/')[-1]}... ({i+1}/{max_retries})")
            time.sleep(2)
    
    logger.error(f"✗ Database not ready after {max_retries} attempts")
    return False

def read_csv_file(file_path: str) -> List[Dict[str, Any]]:
    """Read CSV file and return list of dictionaries"""
    data = []
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            for row in csv_reader:
                # Convert empty strings to None and process data
                processed_row = {}
                for key, value in row.items():
                    if value == '' or value is None:
                        processed_row[key] = None
                    else:
                        processed_row[key] = value
                data.append(processed_row)
        
        logger.info(f"✓ Read {len(data)} records from {file_path}")
        return data
    except Exception as e:
        logger.error(f"✗ Error reading {file_path}: {e}")
        return []

def populate_hardware_table():
    """Populate Hardware_table from CSV"""
    logger.info("Populating Hardware_table...")
    
    if not wait_for_db(MODEL_DB_URL):
        return False
    
    csv_file = "/app/sample_data/Available_HardwareHPE.csv"
    if not os.path.exists(csv_file):
        logger.error(f"CSV file not found: {csv_file}")
        return False
    
    hardware_data = read_csv_file(csv_file)
    if not hardware_data:
        return False
    
    try:
        engine = create_engine(MODEL_DB_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Create table if not exists
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS "Hardware_table" (
                id SERIAL PRIMARY KEY,
                "CPU" VARCHAR(255),
                "GPU" VARCHAR(255),
                "# of GPU" INTEGER,
                "GPU Memory Total - VRAM (MB)" INTEGER,
                "GPU Graphics clock" REAL,
                "GPU Memory clock" REAL,
                "GPU SM Cores" INTEGER,
                "GPU CUDA Cores" INTEGER,
                "CPU Total cores (Including Logical cores)" INTEGER,
                "CPU Threads per Core" INTEGER,
                "CPU Base clock(GHz)" REAL,
                "CPU Max Frequency(GHz)" REAL,
                "L1 Cache" INTEGER,
                "CPU Power Consumption" INTEGER,
                "GPUPower Consumption" INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # Clear existing data
        session.execute(text('DELETE FROM "Hardware_table"'))
        
        # Insert new data
        for hardware in hardware_data:
            columns = ', '.join([f'"{k}"' for k in hardware.keys()])
            placeholders = ', '.join([':' + k.replace(' ', '_').replace('-', '_').replace('(', '').replace(')', '').replace('#', 'num') for k in hardware.keys()])
            
            # Create a clean parameter dict
            params = {}
            for k, v in hardware.items():
                clean_key = k.replace(' ', '_').replace('-', '_').replace('(', '').replace(')', '').replace('#', 'num')
                # Convert numeric strings to appropriate types
                if v is not None and k not in ['CPU', 'GPU']:
                    try:
                        if '.' in str(v):
                            params[clean_key] = float(v)
                        else:
                            params[clean_key] = int(v)
                    except (ValueError, TypeError):
                        params[clean_key] = v
                else:
                    params[clean_key] = v
            
            query = f'INSERT INTO "Hardware_table" ({columns}) VALUES ({placeholders})'
            session.execute(text(query), params)
        
        session.commit()
        
        # Verify
        result = session.execute(text('SELECT COUNT(*) FROM "Hardware_table"'))
        count = result.scalar()
        logger.info(f"✓ Hardware_table populated with {count} records")
        
        session.close()
        return True
        
    except Exception as e:
        logger.error(f"✗ Error populating Hardware_table: {e}")
        return False

def populate_model_table():
    """Populate Model_table from CSV"""
    logger.info("Populating Model_table...")
    
    if not wait_for_db(MODEL_DB_URL):
        return False
    
    csv_file = "/app/sample_data/Model_Info.csv"
    if not os.path.exists(csv_file):
        logger.error(f"CSV file not found: {csv_file}")
        return False
    
    model_data = read_csv_file(csv_file)
    if not model_data:
        return False
    
    try:
        engine = create_engine(MODEL_DB_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Create table if not exists (using original column names from CSV)
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS "Model_table" (
                id SERIAL PRIMARY KEY,
                "Model Name" VARCHAR(255),
                "Framework" VARCHAR(100),
                "Task Type" VARCHAR(100),
                "Total Parameters (Millions)" REAL,
                "Model Size (MB)" REAL,
                "Architecture type" VARCHAR(255),
                "Model Type" VARCHAR(100),
                "Embedding Vector Dimension (Hidden Size)" INTEGER,
                "Precision" VARCHAR(50),
                "Vocabulary Size" INTEGER,
                "FFN (MLP) Dimension" INTEGER,
                "Activation Function" VARCHAR(100),
                "GFLOPs (Billions)" REAL,
                "Number of hidden Layers" INTEGER,
                "Number of Attention Layers" INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # Clear existing data
        session.execute(text('DELETE FROM "Model_table"'))
        
        # Insert new data
        for model in model_data:
            columns = ', '.join([f'"{k}"' for k in model.keys()])
            placeholders = ', '.join([':' + k.replace(' ', '_').replace('-', '_').replace('(', '').replace(')', '').replace('#', 'num') for k in model.keys()])
            
            # Create a clean parameter dict with type conversion
            params = {}
            for k, v in model.items():
                clean_key = k.replace(' ', '_').replace('-', '_').replace('(', '').replace(')', '').replace('#', 'num')
                # Convert numeric strings to appropriate types, handle empty values
                if v is None or str(v).strip() == '':
                    params[clean_key] = None
                elif k in ['Model Name', 'Framework', 'Architecture type', 'Model Type', 'Precision', 'Activation Function', 'Task Type']:
                    # String fields
                    params[clean_key] = str(v).strip() if v else None
                else:
                    # Numeric fields - try to convert
                    try:
                        if '.' in str(v):
                            params[clean_key] = float(v) if v else None
                        else:
                            params[clean_key] = int(v) if v else None
                    except (ValueError, TypeError):
                        params[clean_key] = None
            
            query = f'INSERT INTO "Model_table" ({columns}) VALUES ({placeholders})'
            session.execute(text(query), params)
        
        session.commit()
        
        # Verify
        result = session.execute(text('SELECT COUNT(*) FROM "Model_table"'))
        count = result.scalar()
        logger.info(f"✓ Model_table populated with {count} records")
        
        session.close()
        return True
        
    except Exception as e:
        logger.error(f"✗ Error populating Model_table: {e}")
        return False

# populate_cost_models() function removed - cost models now handled by docker-init-data/05-seed-cost-models.sql

def main():
    """Main population function"""
    logger.info("=" * 50)
    logger.info("Starting database population from CSV files")
    logger.info("=" * 50)
    
    success_count = 0
    
    # Populate Hardware_table
    if populate_hardware_table():
        success_count += 1
    
    # Populate Model_table
    if populate_model_table():
        success_count += 1

    # Cost models now handled by docker-init-data/05-seed-cost-models.sql

    logger.info("=" * 50)
    logger.info(f"Population completed: {success_count}/2 tables populated successfully")
    logger.info("=" * 50)

    return success_count == 2

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)