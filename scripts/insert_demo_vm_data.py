#!/usr/bin/env python3
"""
Demo VM Process Metrics Data Insertion Script
This script inserts dummy VM process metrics data for demonstration purposes.
This should only be run on local demo environments, not in production.
"""

import os
import sys
import time
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# TimescaleDB connection config
TIMESCALEDB_CONFIG = {
    'host': 'localhost',
    'port': 5433,
    'user': 'postgres',
    'password': 'password',
    'database': 'vm_metrics_ts'
}

def wait_for_timescaledb(max_retries=30, delay=2):
    """Wait for TimescaleDB to be available"""
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(**TIMESCALEDB_CONFIG)
            conn.close()
            logger.info("✅ TimescaleDB is available")
            return True
        except psycopg2.OperationalError as e:
            if attempt < max_retries - 1:
                logger.info(f"⏳ Waiting for TimescaleDB (attempt {attempt + 1}/{max_retries})")
                time.sleep(delay)
            else:
                logger.error(f"❌ Failed to connect to TimescaleDB after {max_retries} attempts")
                logger.error(f"Error: {e}")
                return False
    return False

def insert_demo_data():
    """Insert demo VM process metrics data"""
    try:
        conn = psycopg2.connect(**TIMESCALEDB_CONFIG)
        cursor = conn.cursor()
        
        logger.info("🚀 Inserting demo VM process metrics data...")
        
        # Clear existing data (if any)
        cursor.execute("DELETE FROM vm_process_metrics")
        logger.info("🧹 Cleared existing VM process metrics data")
        
        # Get current time for realistic timestamps
        now = datetime.now()
        
        # Demo data for multiple VMs with recent timestamps
        demo_data = []
        
        # VM 1: production-web-01 (High CPU usage web server)
        for i in range(5):  # Last 5 minutes
            timestamp = now - timedelta(minutes=i)
            demo_data.extend([
                (timestamp, 1234, 'production-web-01', 'nginx', 'www-data', 'running', now - timedelta(hours=5),
                 85.2 - i*2, 512.5, 12.3, 1048576, 524288, 45.2, 128, 0, 0, 15.4),
                (timestamp, 1235, 'production-web-01', 'php-fpm', 'www-data', 'running', now - timedelta(hours=4),
                 72.1 - i*1.5, 1024.8, 24.6, 2097152, 1048576, 67.8, 256, 0, 0, 22.1),
                (timestamp, 1236, 'production-web-01', 'mysql', 'mysql', 'running', now - timedelta(hours=6),
                 45.7 - i*0.8, 2048.3, 49.2, 4194304, 2097152, 123.4, 512, 0, 0, 18.9),
            ])
        
        # VM 2: ml-training-gpu-01 (GPU-intensive ML training)
        for i in range(5):
            timestamp = now - timedelta(minutes=i)
            demo_data.extend([
                (timestamp, 2001, 'ml-training-gpu-01', 'python3', 'ubuntu', 'running', now - timedelta(hours=2),
                 95.6 - i*0.5, 8192.4 + i*10, 51.2, 1073741824, 536870912, 234.7, 1024, 15360.5 - i*20, 87.3 - i*0.3, 285.6),
                (timestamp, 2002, 'ml-training-gpu-01', 'tensorboard', 'ubuntu', 'running', now - timedelta(hours=2),
                 12.3 + i*0.2, 512.7, 3.2, 104857600, 52428800, 15.6, 64, 0, 0, 8.4),
                (timestamp, 2003, 'ml-training-gpu-01', 'jupyter-lab', 'ubuntu', 'running', now - timedelta(hours=3),
                 8.9 + i*0.1, 1024.3, 6.4, 209715200, 104857600, 22.1, 128, 0, 0, 5.7),
            ])
        
        # VM 3: analytics-db-01 (Database server)
        for i in range(5):
            timestamp = now - timedelta(minutes=i)
            demo_data.extend([
                (timestamp, 3001, 'analytics-db-01', 'postgres', 'postgres', 'running', now - timedelta(hours=12),
                 35.8 + i*0.5, 4096.7 + i*5, 25.6, 8589934592, 4294967296, 456.8, 2048, 0, 0, 42.3),
                (timestamp, 3002, 'analytics-db-01', 'pgbouncer', 'postgres', 'running', now - timedelta(hours=12),
                 5.2 + i*0.1, 64.3, 0.4, 1048576, 524288, 12.4, 32, 0, 0, 3.1),
                (timestamp, 3003, 'analytics-db-01', 'redis-server', 'redis', 'running', now - timedelta(hours=8),
                 15.6 + i*0.3, 1024.8, 6.4, 2097152, 1048576, 67.9, 128, 0, 0, 12.8),
            ])
        
        # VM 4: dev-environment-01 (Development server)
        for i in range(5):
            timestamp = now - timedelta(minutes=i)
            demo_data.extend([
                (timestamp, 4001, 'dev-environment-01', 'vscode-server', 'developer', 'running', now - timedelta(hours=1),
                 25.4 + i*0.4, 1536.7, 9.6, 524288000, 262144000, 89.3, 512, 0, 0, 18.7),
                (timestamp, 4002, 'dev-environment-01', 'node', 'developer', 'running', now - timedelta(minutes=30),
                 42.8 - i*0.6, 512.3, 3.2, 104857600, 52428800, 34.6, 128, 0, 0, 14.2),
                (timestamp, 4003, 'dev-environment-01', 'docker', 'root', 'running', now - timedelta(hours=2),
                 18.9 + i*0.2, 2048.9, 12.8, 1073741824, 536870912, 156.7, 256, 0, 0, 22.4),
            ])
        
        # VM 5: monitoring-01 (Monitoring and logging)
        for i in range(5):
            timestamp = now - timedelta(minutes=i)
            demo_data.extend([
                (timestamp, 5001, 'monitoring-01', 'prometheus', 'prometheus', 'running', now - timedelta(hours=6),
                 28.7 + i*0.3, 3072.4, 19.2, 2147483648, 1073741824, 234.5, 1024, 0, 0, 29.8),
                (timestamp, 5002, 'monitoring-01', 'grafana-server', 'grafana', 'running', now - timedelta(hours=6),
                 12.4 + i*0.1, 512.8, 3.2, 209715200, 104857600, 45.7, 256, 0, 0, 9.6),
                (timestamp, 5003, 'monitoring-01', 'elasticsearch', 'elastic', 'running', now - timedelta(hours=8),
                 55.8 + i*0.8, 6144.7, 38.4, 4294967296, 2147483648, 567.9, 2048, 0, 0, 78.4),
            ])
        
        # Insert all data
        insert_query = """
        INSERT INTO vm_process_metrics (
            timestamp, process_id, vm_name, process_name, username, status, start_time,
            cpu_usage_percent, memory_usage_mb, memory_usage_percent,
            read_bytes, write_bytes, iops, open_files,
            gpu_memory_usage_mb, gpu_utilization_percent, estimated_power_watts
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.executemany(insert_query, demo_data)
        conn.commit()
        
        logger.info(f"✅ Inserted {len(demo_data)} VM process metrics records")
        
        # Verify the insertion
        cursor.execute("SELECT COUNT(*) FROM vm_process_metrics")
        count = cursor.fetchone()[0]
        logger.info(f"📊 Total VM process metrics records in database: {count}")
        
        # Show sample of latest data
        cursor.execute("""
            SELECT vm_name, process_name, cpu_usage_percent, memory_usage_mb, timestamp
            FROM vm_process_metrics 
            ORDER BY timestamp DESC 
            LIMIT 10
        """)
        sample_data = cursor.fetchall()
        
        logger.info("📋 Sample of latest VM process metrics:")
        for row in sample_data:
            logger.info(f"   {row[0]} | {row[1]} | CPU: {row[2]:.1f}% | Memory: {row[3]:.1f}MB | {row[4]}")
        
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Error inserting demo data: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

def main():
    """Main function"""
    logger.info("=" * 70)
    logger.info("🧪 GreenMatrix Demo VM Process Metrics Data Insertion")
    logger.info("=" * 70)
    logger.info("⚠️  This script is for DEMO purposes only!")
    logger.info("📍 It inserts dummy data into the vm_process_metrics table.")
    logger.info("")
    
    # Wait for TimescaleDB to be available
    if not wait_for_timescaledb():
        logger.error("❌ TimescaleDB is not available. Make sure Docker containers are running.")
        sys.exit(1)
    
    # Insert demo data
    if insert_demo_data():
        logger.info("=" * 70)
        logger.info("✅ Demo VM process metrics data inserted successfully!")
        logger.info("🌐 You can now view the data in the UI dashboard.")
        logger.info("📊 The data includes 5 VMs with realistic process metrics.")
        logger.info("⏱️  Data spans the last 5 minutes with 1-minute intervals.")
    else:
        logger.error("❌ Failed to insert demo data!")
        sys.exit(1)

if __name__ == "__main__":
    main()