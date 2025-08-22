#!/usr/bin/env python3
"""
Script to create the host_overall_metrics table and update the host_process_metrics table
to match the new schema requirements.

This script:
1. Creates the new host_overall_metrics table
2. Updates the host_process_metrics table schema
3. Creates appropriate indexes and hypertables for TimescaleDB
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from sqlalchemy import create_engine, text, MetaData, inspect
from app.database import metrics_engine, init_db
from app.models import HostOverallMetric, HostProcessMetric
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_table_exists(engine, table_name):
    """Check if a table exists in the database"""
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    return table_name in existing_tables

def create_host_overall_metrics_table():
    """Create the host_overall_metrics table"""
    try:
        logger.info("Creating host_overall_metrics table...")
        
        # Check if table already exists
        if check_table_exists(metrics_engine, 'host_overall_metrics'):
            logger.info("✓ host_overall_metrics table already exists")
            return True
            
        # Create the table
        HostOverallMetric.__table__.create(bind=metrics_engine, checkfirst=True)
        logger.info("✓ host_overall_metrics table created successfully")
        
        return True
    except Exception as e:
        logger.error(f"✗ Error creating host_overall_metrics table: {e}")
        return False

def update_host_process_metrics_table():
    """Update the host_process_metrics table to match new schema"""
    try:
        logger.info("Checking host_process_metrics table schema...")
        
        inspector = inspect(metrics_engine)
        
        # Check if old table exists (Host_Process_Metrics_table)
        old_table_exists = check_table_exists(metrics_engine, 'Host_Process_Metrics_table')
        new_table_exists = check_table_exists(metrics_engine, 'host_process_metrics')
        
        if old_table_exists and not new_table_exists:
            logger.info("Found old table 'Host_Process_Metrics_table', creating new table 'host_process_metrics'...")
            
            # Create the new table with updated schema
            HostProcessMetric.__table__.create(bind=metrics_engine, checkfirst=True)
            logger.info("✓ New host_process_metrics table created with updated schema")
            
            # Note: You may want to migrate data from old table to new table
            # This is commented out for safety - uncomment and modify as needed
            # with metrics_engine.connect() as conn:
            #     conn.execute(text("""
            #         INSERT INTO host_process_metrics (timestamp, process_id, process_name, username, status, 
            #                                          cpu_usage_percent, memory_usage_mb, gpu_memory_usage_mb, gpu_utilization_percent)
            #         SELECT timestamp, process_id, process_name, username, status, 
            #                cpu_usage_percent, memory_usage_mb, gpu_memory_usage_mb, gpu_utilization_percent
            #         FROM "Host_Process_Metrics_table"
            #     """))
            #     conn.commit()
            #     logger.info("✓ Data migrated from old table to new table")
            
        elif new_table_exists:
            logger.info("✓ host_process_metrics table already exists with correct schema")
        else:
            # Create new table
            HostProcessMetric.__table__.create(bind=metrics_engine, checkfirst=True)
            logger.info("✓ host_process_metrics table created")
            
        return True
    except Exception as e:
        logger.error(f"✗ Error updating host_process_metrics table: {e}")
        return False

def create_hypertables():
    """Create TimescaleDB hypertables for the new tables"""
    try:
        logger.info("Creating TimescaleDB hypertables...")
        
        with metrics_engine.connect() as conn:
            # Create hypertable for host_overall_metrics
            try:
                conn.execute(text("SELECT create_hypertable('host_overall_metrics', 'timestamp', if_not_exists => TRUE);"))
                logger.info("✓ host_overall_metrics hypertable created")
            except Exception as e:
                logger.warning(f"Could not create hypertable for host_overall_metrics (may not be using TimescaleDB): {e}")
            
            # Create hypertable for host_process_metrics
            try:
                conn.execute(text("SELECT create_hypertable('host_process_metrics', 'timestamp', if_not_exists => TRUE);"))
                logger.info("✓ host_process_metrics hypertable created")
            except Exception as e:
                logger.warning(f"Could not create hypertable for host_process_metrics (may not be using TimescaleDB): {e}")
            
            conn.commit()
            
        return True
    except Exception as e:
        logger.error(f"✗ Error creating hypertables: {e}")
        return False

def create_indexes():
    """Create useful indexes for the new tables"""
    try:
        logger.info("Creating database indexes...")
        
        with metrics_engine.connect() as conn:
            # Indexes for host_overall_metrics
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_host_overall_metrics_timestamp ON host_overall_metrics (timestamp DESC);"))
                logger.info("✓ Index created for host_overall_metrics.timestamp")
            except Exception as e:
                logger.warning(f"Could not create index for host_overall_metrics: {e}")
            
            # Indexes for host_process_metrics
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_host_process_metrics_timestamp ON host_process_metrics (timestamp DESC);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_host_process_metrics_process_name ON host_process_metrics (process_name);"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_host_process_metrics_process_id ON host_process_metrics (process_id);"))
                logger.info("✓ Indexes created for host_process_metrics")
            except Exception as e:
                logger.warning(f"Could not create indexes for host_process_metrics: {e}")
            
            conn.commit()
            
        return True
    except Exception as e:
        logger.error(f"✗ Error creating indexes: {e}")
        return False

def main():
    """Main function to run all database setup tasks"""
    logger.info("Starting database schema update...")
    
    try:
        # Test database connection
        with metrics_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✓ Database connection successful")
    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}")
        return False
    
    success = True
    
    # Step 1: Create host_overall_metrics table
    if not create_host_overall_metrics_table():
        success = False
    
    # Step 2: Update host_process_metrics table
    if not update_host_process_metrics_table():
        success = False
    
    # Step 3: Create hypertables (optional, for TimescaleDB)
    if not create_hypertables():
        logger.warning("Hypertable creation failed - continuing without TimescaleDB features")
    
    # Step 4: Create indexes
    if not create_indexes():
        logger.warning("Index creation had issues - tables will still work but may be slower")
    
    if success:
        logger.info("🎉 Database schema update completed successfully!")
        logger.info("\nNew tables created:")
        logger.info("- host_overall_metrics: Stores overall host performance metrics")
        logger.info("- host_process_metrics: Updated with new schema for process metrics")
        logger.info("\nYou can now use the new controllers:")
        logger.info("- HostOverallMetricsController for host overall metrics")
        logger.info("- Updated HostProcessMetricsController for process metrics")
    else:
        logger.error("❌ Database schema update completed with errors")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)