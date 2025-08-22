"""
GreenMatrix Data Pipeline Monitoring DAG

This DAG monitors the data collection scripts and ensures they are running properly
and pushing data to the database as expected.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.operators.bash import BashOperator
from airflow.operators.email import EmailOperator
from airflow.sensors.filesystem import FileSensor
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
import subprocess
import psutil
import os
import logging

# DAG default arguments
default_args = {
    'owner': 'greenmatrix-admin',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
    'email': ['admin@greenmatrix.com']
}

# Create DAG
dag = DAG(
    'greenmatrix_data_pipeline_monitoring',
    default_args=default_args,
    description='Monitor GreenMatrix data collection pipeline',
    schedule_interval=timedelta(minutes=15),  # Check every 15 minutes
    catchup=False,
    tags=['greenmatrix', 'monitoring', 'data-pipeline']
)

def check_metrics_collection_process():
    """Check if metrics collection script is running"""
    process_name = "collect_all_metrics.py"
    
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            if process_name in ' '.join(proc.info['cmdline'] or []):
                logging.info(f"✓ Metrics collection process found: PID {proc.info['pid']}")
                return True
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    
    logging.error(f"✗ Metrics collection process '{process_name}' not found!")
    raise Exception(f"Metrics collection process '{process_name}' is not running")

def check_hardware_collection_process():
    """Check if hardware collection script is running"""
    process_name = "collect_hardware_specs.py"
    
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            if process_name in ' '.join(proc.info['cmdline'] or []):
                logging.info(f"✓ Hardware collection process found: PID {proc.info['pid']}")
                return True
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    
    logging.error(f"✗ Hardware collection process '{process_name}' not found!")
    raise Exception(f"Hardware collection process '{process_name}' is not running")

def check_recent_metrics_data():
    """Check if recent metrics data exists in database"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    
    # Check host_process_metrics table for recent data (last 30 minutes)
    query = """
    SELECT COUNT(*) as recent_count,
           MAX(timestamp) as latest_timestamp
    FROM host_process_metrics 
    WHERE timestamp >= NOW() - INTERVAL '30 minutes'
    """
    
    result = hook.get_first(query)
    recent_count, latest_timestamp = result
    
    if recent_count == 0:
        logging.error("✗ No recent metrics data found in last 30 minutes!")
        raise Exception("No recent metrics data found - data collection may have failed")
    
    logging.info(f"✓ Found {recent_count} recent metrics records. Latest: {latest_timestamp}")
    return True

def check_recent_hardware_data():
    """Check if hardware data is up to date"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    
    # Check hardware_specs table for recent data (last 24 hours)
    query = """
    SELECT COUNT(*) as count,
           MAX(last_updated) as latest_update
    FROM hardware_specs 
    WHERE last_updated >= NOW() - INTERVAL '24 hours'
    """
    
    result = hook.get_first(query)
    count, latest_update = result
    
    if count == 0:
        logging.warning("⚠ No recent hardware data found in last 24 hours")
        # Hardware collection is less frequent, so just warn
        return True
    
    logging.info(f"✓ Hardware data is current. Latest update: {latest_update}")
    return True

def check_database_connectivity():
    """Test database connectivity and basic health"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    
    # Test basic connectivity
    try:
        result = hook.get_first("SELECT 1 as health_check")
        if result[0] == 1:
            logging.info("✓ Database connectivity test passed")
        else:
            raise Exception("Database health check failed")
    except Exception as e:
        logging.error(f"✗ Database connectivity failed: {e}")
        raise

    # Check table existence
    tables_to_check = [
        'host_process_metrics',
        'hardware_specs', 
        'host_overall_metrics',
        'cost_models'
    ]
    
    for table in tables_to_check:
        query = f"""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '{table}'
        )
        """
        exists = hook.get_first(query)[0]
        if not exists:
            raise Exception(f"Required table '{table}' does not exist")
        logging.info(f"✓ Table '{table}' exists")

def restart_metrics_collection_if_needed():
    """Restart metrics collection if it's not running"""
    try:
        check_metrics_collection_process()
        logging.info("Metrics collection is running - no restart needed")
        return "metrics_running"
    except:
        logging.info("Attempting to restart metrics collection...")
        # This would typically restart the service
        return "restart_metrics"

def restart_hardware_collection_if_needed():
    """Restart hardware collection if it's not running"""
    try:
        check_hardware_collection_process()
        logging.info("Hardware collection is running - no restart needed") 
        return "hardware_running"
    except:
        logging.info("Attempting to restart hardware collection...")
        return "restart_hardware"

def send_success_notification():
    """Send success notification"""
    logging.info("✓ All data pipeline monitoring checks passed successfully")

def calculate_pipeline_health_score():
    """Calculate overall pipeline health score"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    
    score = 100
    issues = []
    
    # Check data freshness (last hour)
    query = """
    SELECT COUNT(*) FROM host_process_metrics 
    WHERE timestamp >= NOW() - INTERVAL '1 hour'
    """
    recent_metrics = hook.get_first(query)[0]
    
    if recent_metrics == 0:
        score -= 50
        issues.append("No metrics data in last hour")
    elif recent_metrics < 10:  # Expect at least 10 entries per hour
        score -= 25
        issues.append("Low metrics data volume")
    
    # Check for data gaps
    query = """
    SELECT COUNT(*) FROM (
        SELECT timestamp,
               LAG(timestamp) OVER (ORDER BY timestamp) as prev_timestamp
        FROM host_process_metrics 
        WHERE timestamp >= NOW() - INTERVAL '6 hours'
    ) t
    WHERE timestamp - prev_timestamp > INTERVAL '10 minutes'
    """
    data_gaps = hook.get_first(query)[0] or 0
    
    if data_gaps > 0:
        score -= (data_gaps * 10)
        issues.append(f"Found {data_gaps} data gaps > 10 minutes")
    
    # Check database performance
    query = "SELECT COUNT(*) FROM host_process_metrics"
    start_time = datetime.now()
    hook.get_first(query)
    query_time = (datetime.now() - start_time).total_seconds()
    
    if query_time > 5:  # Query taking more than 5 seconds
        score -= 15
        issues.append("Slow database performance")
    
    score = max(0, score)  # Don't go below 0
    
    logging.info(f"Pipeline health score: {score}/100")
    if issues:
        logging.warning(f"Issues found: {', '.join(issues)}")
    
    return score

# Define tasks
check_db_connectivity = PythonOperator(
    task_id='check_database_connectivity',
    python_callable=check_database_connectivity,
    dag=dag,
)

check_metrics_process = PythonOperator(
    task_id='check_metrics_collection_process',
    python_callable=check_metrics_collection_process,
    dag=dag,
)

check_hardware_process = PythonOperator(
    task_id='check_hardware_collection_process', 
    python_callable=check_hardware_collection_process,
    dag=dag,
)

check_metrics_data = PythonOperator(
    task_id='check_recent_metrics_data',
    python_callable=check_recent_metrics_data,
    dag=dag,
)

check_hardware_data = PythonOperator(
    task_id='check_recent_hardware_data',
    python_callable=check_recent_hardware_data,
    dag=dag,
)

metrics_branch = BranchPythonOperator(
    task_id='metrics_collection_branch',
    python_callable=restart_metrics_collection_if_needed,
    dag=dag,
)

hardware_branch = BranchPythonOperator(
    task_id='hardware_collection_branch',
    python_callable=restart_hardware_collection_if_needed,
    dag=dag,
)

restart_metrics = BashOperator(
    task_id='restart_metrics',
    bash_command='cd /app && python collect_all_metrics.py &',
    dag=dag,
)

restart_hardware = BashOperator(
    task_id='restart_hardware',
    bash_command='cd /app && python collect_hardware_specs.py &',
    dag=dag,
)

metrics_running = BashOperator(
    task_id='metrics_running',
    bash_command='echo "Metrics collection is running properly"',
    dag=dag,
)

hardware_running = BashOperator(
    task_id='hardware_running', 
    bash_command='echo "Hardware collection is running properly"',
    dag=dag,
)

calculate_health_score = PythonOperator(
    task_id='calculate_pipeline_health_score',
    python_callable=calculate_pipeline_health_score,
    dag=dag,
)

success_notification = PythonOperator(
    task_id='send_success_notification',
    python_callable=send_success_notification,
    dag=dag,
    trigger_rule='none_failed_or_skipped',
)

# Define task dependencies
check_db_connectivity >> [check_metrics_process, check_hardware_process]
check_metrics_process >> check_metrics_data >> metrics_branch
check_hardware_process >> check_hardware_data >> hardware_branch

metrics_branch >> [restart_metrics, metrics_running]
hardware_branch >> [restart_hardware, hardware_running]

[restart_metrics, metrics_running, restart_hardware, hardware_running] >> calculate_health_score >> success_notification