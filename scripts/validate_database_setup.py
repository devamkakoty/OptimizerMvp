#!/usr/bin/env python3
"""
Validation script to verify that all databases, tables, and data are properly set up
in the GreenMatrix Docker environment.
"""

import os
import sys
import time
import logging
import psycopg2
from psycopg2.extras import RealDictCursor

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database connection configurations
DB_CONFIGS = {
    'greenmatrix': {
        'host': 'localhost',
        'port': 5432,
        'user': 'postgres', 
        'password': 'password',
        'database': 'greenmatrix'
    },
    'Model_Recommendation_DB': {
        'host': 'localhost',
        'port': 5432,
        'user': 'postgres',
        'password': 'password', 
        'database': 'Model_Recommendation_DB'
    },
    'Metrics_db': {
        'host': 'localhost',
        'port': 5432,
        'user': 'postgres',
        'password': 'password',
        'database': 'Metrics_db'
    },
    'vm_metrics_ts': {
        'host': 'localhost',
        'port': 5433,
        'user': 'postgres',
        'password': 'password',
        'database': 'vm_metrics_ts'
    }
}

# Expected tables and their data status
EXPECTED_TABLES = {
    'greenmatrix': {
        'hardware_specs': {'should_have_data': False},
        'hardware_monitoring': {'should_have_data': False}
    },
    'Model_Recommendation_DB': {
        'Hardware_table': {'should_have_data': True, 'min_rows': 3},
        'Model_table': {'should_have_data': True, 'min_rows': 3}
    },
    'Metrics_db': {
        'cost_models': {'should_have_data': True, 'min_rows': 8},
        'host_overall_metrics': {'should_have_data': False},
        'host_process_metrics': {'should_have_data': False},
        'vm_metrics': {'should_have_data': False}
    },
    'vm_metrics_ts': {
        'vm_process_metrics': {'should_have_data': False}
    }
}

def wait_for_db_connection(db_name, config, max_retries=30, delay=2):
    """Wait for database to be available with retries"""
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(**config)
            conn.close()
            logger.info(f"✅ Database '{db_name}' is available")
            return True
        except psycopg2.OperationalError as e:
            if attempt < max_retries - 1:
                logger.info(f"⏳ Waiting for database '{db_name}' (attempt {attempt + 1}/{max_retries})")
                time.sleep(delay)
            else:
                logger.error(f"❌ Failed to connect to database '{db_name}' after {max_retries} attempts")
                logger.error(f"Error: {e}")
                return False
    return False

def validate_database(db_name, config, expected_tables):
    """Validate a single database and its tables"""
    logger.info(f"🔍 Validating database: {db_name}")
    
    try:
        # Connect to database
        conn = psycopg2.connect(**config)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if all expected tables exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        """)
        
        existing_tables = {row['table_name'] for row in cursor.fetchall()}
        logger.info(f"📋 Found tables in {db_name}: {sorted(existing_tables)}")
        
        validation_results = {}
        
        for table_name, table_config in expected_tables.items():
            if table_name not in existing_tables:
                logger.error(f"❌ Table '{table_name}' not found in database '{db_name}'")
                validation_results[table_name] = False
                continue
            
            # Check row count
            cursor.execute(f'SELECT COUNT(*) as count FROM "{table_name}"')
            row_count = cursor.fetchone()['count']
            
            should_have_data = table_config.get('should_have_data', False)
            min_rows = table_config.get('min_rows', 0)
            
            if should_have_data and row_count < min_rows:
                logger.error(f"❌ Table '{table_name}' should have at least {min_rows} rows but has {row_count}")
                validation_results[table_name] = False
            elif should_have_data and row_count >= min_rows:
                logger.info(f"✅ Table '{table_name}' has {row_count} rows (expected: >={min_rows})")
                validation_results[table_name] = True
            elif not should_have_data:
                logger.info(f"✅ Table '{table_name}' exists (empty table as expected)")
                validation_results[table_name] = True
            else:
                validation_results[table_name] = True
        
        # For seeded tables, show sample data
        if db_name == 'Model_Recommendation_DB' and 'Hardware_table' in existing_tables:
            cursor.execute('SELECT cpu, gpu, num_gpu FROM "Hardware_table" LIMIT 2')
            sample_hardware = cursor.fetchall()
            logger.info(f"📊 Sample Hardware_table data: {sample_hardware}")
        
        if db_name == 'Model_Recommendation_DB' and 'Model_table' in existing_tables:
            cursor.execute('SELECT model_name, framework, task_type FROM "Model_table" LIMIT 2')
            sample_models = cursor.fetchall()
            logger.info(f"📊 Sample Model_table data: {sample_models}")
            
        if db_name == 'Metrics_db' and 'cost_models' in existing_tables:
            cursor.execute('SELECT resource_name, region, cost_per_unit, currency FROM cost_models LIMIT 3')
            sample_costs = cursor.fetchall()
            logger.info(f"📊 Sample cost_models data: {sample_costs}")
        
        conn.close()
        return all(validation_results.values())
        
    except Exception as e:
        logger.error(f"❌ Error validating database '{db_name}': {e}")
        return False

def main():
    """Main validation function"""
    logger.info("=" * 60)
    logger.info("🚀 GreenMatrix Database Setup Validation")
    logger.info("=" * 60)
    
    overall_success = True
    
    # Wait for all databases to be available
    logger.info("⏳ Waiting for databases to be available...")
    for db_name, config in DB_CONFIGS.items():
        if not wait_for_db_connection(db_name, config):
            overall_success = False
    
    if not overall_success:
        logger.error("❌ Not all databases are available. Check Docker containers.")
        sys.exit(1)
    
    # Validate each database
    for db_name, config in DB_CONFIGS.items():
        expected_tables = EXPECTED_TABLES.get(db_name, {})
        if not validate_database(db_name, config, expected_tables):
            overall_success = False
    
    # Final results
    logger.info("=" * 60)
    if overall_success:
        logger.info("✅ ALL VALIDATIONS PASSED!")
        logger.info("🎉 GreenMatrix database setup is complete and ready!")
        logger.info("") 
        logger.info("📍 Next steps:")
        logger.info("   - Access frontend at: http://localhost:3000")
        logger.info("   - Access backend API at: http://localhost:8000")
        logger.info("   - Access Airflow at: http://localhost:8080 (airflow/airflow)")
        logger.info("   - PostgreSQL is available at: localhost:5432")
        logger.info("   - TimescaleDB is available at: localhost:5433")
    else:
        logger.error("❌ VALIDATION FAILED!")
        logger.error("🔧 Please check the Docker logs and fix any issues.")
        sys.exit(1)

if __name__ == "__main__":
    main()