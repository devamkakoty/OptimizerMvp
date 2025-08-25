#!/usr/bin/env python3
"""
Export existing database data for cost_models, hardware_table, and model_table
to SQL dumps that can be imported during Docker container initialization.
"""

import os
import sys
import csv
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Sample data for seeding tables with realistic data
HARDWARE_SAMPLE_DATA = [
    {
        'cpu': 'Intel(R) Xeon', 'gpu': 'Tesla T4', 'num_gpu': 1,
        'gpu_memory_total_vram_mb': 16000, 'gpu_graphics_clock': 1.5, 'gpu_memory_clock': 1.2,
        'gpu_sm_cores': 40, 'gpu_cuda_cores': 2560, 'cpu_total_cores': 12, 'cpu_threads_per_core': 2,
        'cpu_base_clock_ghz': 2.0, 'cpu_max_frequency_ghz': 3.9, 'l1_cache': 80,
        'cpu_power_consumption': 350, 'gpu_power_consumption': 70
    },
    {
        'cpu': 'Intel(R) Xeon', 'gpu': 'NVIDIA A100', 'num_gpu': 1,
        'gpu_memory_total_vram_mb': 40000, 'gpu_graphics_clock': 1.41, 'gpu_memory_clock': 1.215,
        'gpu_sm_cores': 108, 'gpu_cuda_cores': 6912, 'cpu_total_cores': 12, 'cpu_threads_per_core': 2,
        'cpu_base_clock_ghz': 2.0, 'cpu_max_frequency_ghz': 3.9, 'l1_cache': 80,
        'cpu_power_consumption': 350, 'gpu_power_consumption': 250
    },
    {
        'cpu': 'Intel(R) Xeon', 'gpu': 'NVIDIA L4', 'num_gpu': 1,
        'gpu_memory_total_vram_mb': 24000, 'gpu_graphics_clock': 2.04, 'gpu_memory_clock': 1.56,
        'gpu_sm_cores': 60, 'gpu_cuda_cores': 7680, 'cpu_total_cores': 12, 'cpu_threads_per_core': 2,
        'cpu_base_clock_ghz': 2.0, 'cpu_max_frequency_ghz': 3.9, 'l1_cache': 80,
        'cpu_power_consumption': 350, 'gpu_power_consumption': 72
    },
    {
        'cpu': 'AMD EPYC 7742', 'gpu': 'NVIDIA RTX 4090', 'num_gpu': 2,
        'gpu_memory_total_vram_mb': 24000, 'gpu_graphics_clock': 2.52, 'gpu_memory_clock': 1.31,
        'gpu_sm_cores': 128, 'gpu_cuda_cores': 16384, 'cpu_total_cores': 64, 'cpu_threads_per_core': 2,
        'cpu_base_clock_ghz': 2.25, 'cpu_max_frequency_ghz': 3.4, 'l1_cache': 64,
        'cpu_power_consumption': 225, 'gpu_power_consumption': 450
    }
]

MODEL_SAMPLE_DATA = [
    {
        'model_name': 'BERT', 'framework': 'PyTorch', 'task_type': 'Inference',
        'total_parameters_millions': 109.51, 'model_size_mb': 840.09,
        'architecture_type': 'BertForMaskedLM', 'model_type': 'bert',
        'embedding_vector_dimension': 768, 'precision': 'FP32', 'vocabulary_size': 30522,
        'ffn_dimension': 3072, 'activation_function': 'gelu'
    },
    {
        'model_name': 'RoBERTa', 'framework': 'PyTorch', 'task_type': 'Inference',
        'total_parameters_millions': 124.7, 'model_size_mb': 951.42,
        'architecture_type': 'RobertaForMaskedLM', 'model_type': 'roberta',
        'embedding_vector_dimension': 768, 'precision': 'FP32', 'vocabulary_size': 50265,
        'ffn_dimension': 3072, 'activation_function': 'gelu'
    },
    {
        'model_name': 'resnet50', 'framework': 'PyTorch', 'task_type': 'Inference',
        'total_parameters_millions': 25.56, 'model_size_mb': 97.49,
        'architecture_type': 'resnet50', 'model_type': 'resnet50',
        'embedding_vector_dimension': 2048, 'precision': 'FP32', 'vocabulary_size': 1000,
        'ffn_dimension': 2048, 'activation_function': 'relu'
    },
    {
        'model_name': 'GPT-2', 'framework': 'HuggingFace', 'task_type': 'Training',
        'total_parameters_millions': 117.0, 'model_size_mb': 548.0,
        'architecture_type': 'GPT2LMHeadModel', 'model_type': 'gpt2',
        'embedding_vector_dimension': 768, 'precision': 'FP32', 'vocabulary_size': 50257,
        'ffn_dimension': 3072, 'activation_function': 'gelu'
    }
]

COST_MODEL_SAMPLE_DATA = [
    # North America
    {"resource_name": "CPU", "region": "US", "cost_per_unit": 0.12, "currency": "USD", "description": "CPU cost per kWh in US"},
    {"resource_name": "GPU", "region": "US", "cost_per_unit": 0.12, "currency": "USD", "description": "GPU cost per kWh in US"},
    {"resource_name": "Memory", "region": "US", "cost_per_unit": 0.05, "currency": "USD", "description": "Memory cost per GB-hour in US"},
    {"resource_name": "Storage", "region": "US", "cost_per_unit": 0.10, "currency": "USD", "description": "Storage cost per GB-month in US"},
    
    {"resource_name": "CPU", "region": "CA", "cost_per_unit": 0.08, "currency": "CAD", "description": "CPU cost per kWh in Canada"},
    {"resource_name": "GPU", "region": "CA", "cost_per_unit": 0.08, "currency": "CAD", "description": "GPU cost per kWh in Canada"},
    
    # Europe
    {"resource_name": "CPU", "region": "EU", "cost_per_unit": 0.20, "currency": "EUR", "description": "CPU cost per kWh in EU"},
    {"resource_name": "GPU", "region": "EU", "cost_per_unit": 0.20, "currency": "EUR", "description": "GPU cost per kWh in EU"},
    
    # Asia Pacific
    {"resource_name": "CPU", "region": "AP", "cost_per_unit": 0.15, "currency": "USD", "description": "CPU cost per kWh in Asia Pacific"},
    {"resource_name": "GPU", "region": "AP", "cost_per_unit": 0.15, "currency": "USD", "description": "GPU cost per kWh in Asia Pacific"},
]

def generate_sql_dump():
    """Generate SQL dump files for the three required tables with sample data"""
    
    try:
        # Create data directory if it doesn't exist
        data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'docker-init-data')
        os.makedirs(data_dir, exist_ok=True)
        
        logger.info(f"Creating SQL dump files in: {data_dir}")
        
        # Generate Hardware_table SQL dump
        hardware_sql_path = os.path.join(data_dir, '03-seed-hardware-table.sql')
        with open(hardware_sql_path, 'w') as f:
            f.write("-- Hardware Table Seed Data\n")
            f.write("-- Switch to Model_Recommendation_DB database\n")
            f.write("\\c Model_Recommendation_DB;\n\n")
            
            # Create table if not exists
            f.write("""
-- Create Hardware_table if not exists
CREATE TABLE IF NOT EXISTS "Hardware_table" (
    id SERIAL PRIMARY KEY,
    cpu VARCHAR(255) NOT NULL,
    gpu VARCHAR(255),
    num_gpu INTEGER,
    gpu_memory_total_vram_mb INTEGER,
    gpu_graphics_clock REAL,
    gpu_memory_clock REAL,
    gpu_sm_cores INTEGER,
    gpu_cuda_cores INTEGER,
    cpu_total_cores INTEGER,
    cpu_threads_per_core INTEGER,
    cpu_base_clock_ghz REAL,
    cpu_max_frequency_ghz REAL,
    l1_cache INTEGER,
    cpu_power_consumption INTEGER,
    gpu_power_consumption INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

""")
            
            f.write("-- Insert hardware data\n")
            for hw in HARDWARE_SAMPLE_DATA:
                values = []
                for key, value in hw.items():
                    if isinstance(value, str):
                        values.append(f"'{value}'")
                    elif value is None:
                        values.append('NULL')
                    else:
                        values.append(str(value))
                
                columns = ', '.join(hw.keys())
                values_str = ', '.join(values)
                f.write(f'INSERT INTO "Hardware_table" ({columns}) VALUES ({values_str});\n')
        
        # Generate Model_table SQL dump
        model_sql_path = os.path.join(data_dir, '04-seed-model-table.sql')
        with open(model_sql_path, 'w') as f:
            f.write("-- Model Table Seed Data\n")
            f.write("-- Switch to Model_Recommendation_DB database\n")
            f.write("\\c Model_Recommendation_DB;\n\n")
            
            # Create table if not exists
            f.write("""
-- Create Model_table if not exists
CREATE TABLE IF NOT EXISTS "Model_table" (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    framework VARCHAR(100) NOT NULL,
    task_type VARCHAR(100) NOT NULL,
    total_parameters_millions REAL,
    model_size_mb REAL,
    architecture_type VARCHAR(255),
    model_type VARCHAR(100),
    embedding_vector_dimension INTEGER,
    precision VARCHAR(50),
    vocabulary_size INTEGER,
    ffn_dimension INTEGER,
    activation_function VARCHAR(100),
    flops REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

""")
            
            f.write("-- Insert model data\n")
            for model in MODEL_SAMPLE_DATA:
                values = []
                for key, value in model.items():
                    if isinstance(value, str):
                        values.append(f"'{value}'")
                    elif value is None:
                        values.append('NULL')
                    else:
                        values.append(str(value))
                
                columns = ', '.join(model.keys())
                values_str = ', '.join(values)
                f.write(f'INSERT INTO "Model_table" ({columns}) VALUES ({values_str});\n')
        
        # Generate cost_models SQL dump
        cost_sql_path = os.path.join(data_dir, '05-seed-cost-models.sql')
        with open(cost_sql_path, 'w') as f:
            f.write("-- Cost Models Seed Data\n")
            f.write("-- Switch to Metrics_db database\n")
            f.write("\\c Metrics_db;\n\n")
            
            # Create table if not exists
            f.write("""
-- Create cost_models table if not exists
CREATE TABLE IF NOT EXISTS cost_models (
    id SERIAL PRIMARY KEY,
    resource_name VARCHAR(100) NOT NULL,
    cost_per_unit REAL NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    region VARCHAR(100) NOT NULL,
    description TEXT,
    effective_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_resource_region UNIQUE (resource_name, region)
);

""")
            
            f.write("-- Insert cost model data\n")
            for cost in COST_MODEL_SAMPLE_DATA:
                values = []
                for key, value in cost.items():
                    if isinstance(value, str):
                        values.append(f"'{value}'")
                    elif value is None:
                        values.append('NULL')
                    else:
                        values.append(str(value))
                
                columns = ', '.join(cost.keys())
                values_str = ', '.join(values)
                f.write(f'INSERT INTO cost_models ({columns}) VALUES ({values_str}) ON CONFLICT (resource_name, region) DO NOTHING;\n')
        
        logger.info("SQL dump files generated successfully!")
        logger.info(f"Files created:")
        logger.info(f"  - {hardware_sql_path}")
        logger.info(f"  - {model_sql_path}")
        logger.info(f"  - {cost_sql_path}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error generating SQL dumps: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("GreenMatrix Data Export Script")
    print("=" * 60)
    success = generate_sql_dump()
    if success:
        print("[OK] SQL dump files generated successfully!")
    else:
        print("[ERROR] Failed to generate SQL dump files!")
        sys.exit(1)