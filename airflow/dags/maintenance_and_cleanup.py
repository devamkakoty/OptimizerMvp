"""
GreenMatrix Maintenance and Cleanup DAG

This DAG handles routine maintenance tasks including data cleanup,
optimization, backups, and system maintenance.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
import logging
import os
import shutil
import psutil

# DAG default arguments
default_args = {
    'owner': 'greenmatrix-admin',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=10),
    'email': ['admin@greenmatrix.com']
}

# Create DAG
dag = DAG(
    'greenmatrix_maintenance_and_cleanup',
    default_args=default_args,
    description='Routine maintenance and cleanup tasks',
    schedule_interval='0 2 * * *',  # Run daily at 2 AM
    catchup=False,
    tags=['greenmatrix', 'maintenance', 'cleanup']
)

def cleanup_old_metrics_data():
    """Clean up old metrics data older than 30 days"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    
    # Check how much data will be deleted
    check_query = """
    SELECT COUNT(*) as old_records
    FROM host_process_metrics 
    WHERE timestamp < NOW() - INTERVAL '30 days'
    """
    
    old_records = hook.get_first(check_query)[0]
    logging.info(f"Found {old_records} old metrics records to delete")
    
    if old_records > 0:
        # Delete old data
        delete_query = """
        DELETE FROM host_process_metrics 
        WHERE timestamp < NOW() - INTERVAL '30 days'
        """
        
        hook.run(delete_query)
        logging.info(f"Successfully deleted {old_records} old metrics records")
        
        # Vacuum the table to reclaim space
        vacuum_query = "VACUUM ANALYZE host_process_metrics"
        hook.run(vacuum_query)
        logging.info("Vacuumed host_process_metrics table")
    else:
        logging.info("No old metrics data to clean up")
    
    return old_records

def cleanup_old_log_files():
    """Clean up old log files"""
    log_directories = [
        '/app/logs',
        '/var/log/greenmatrix',
        './logs'
    ]
    
    total_cleaned = 0
    total_size_cleaned = 0
    
    for log_dir in log_directories:
        if os.path.exists(log_dir):
            try:
                # Find log files older than 7 days
                cutoff_time = datetime.now() - timedelta(days=7)
                
                for root, dirs, files in os.walk(log_dir):
                    for file in files:
                        if file.endswith('.log') or file.endswith('.out'):
                            file_path = os.path.join(root, file)
                            
                            # Check file modification time
                            file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                            
                            if file_mtime < cutoff_time:
                                file_size = os.path.getsize(file_path)
                                os.remove(file_path)
                                total_cleaned += 1
                                total_size_cleaned += file_size
                                logging.info(f"Deleted old log file: {file_path}")
                                
            except Exception as e:
                logging.warning(f"Error cleaning log directory {log_dir}: {e}")
    
    size_mb = total_size_cleaned / (1024 * 1024)
    logging.info(f"Cleaned up {total_cleaned} log files, freed {size_mb:.2f} MB")
    
    return {'files_cleaned': total_cleaned, 'size_mb': size_mb}

def optimize_database_performance():
    """Optimize database performance with maintenance tasks"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    
    maintenance_tasks = []
    
    # 1. Update table statistics
    try:
        hook.run("ANALYZE;")
        maintenance_tasks.append("Updated table statistics")
        logging.info("✓ Updated table statistics")
    except Exception as e:
        logging.error(f"Failed to update statistics: {e}")
    
    # 2. Reindex critical tables
    critical_tables = [
        'host_process_metrics',
        'hardware_specs',
        'cost_models'
    ]
    
    for table in critical_tables:
        try:
            hook.run(f"REINDEX TABLE {table};")
            maintenance_tasks.append(f"Reindexed {table}")
            logging.info(f"✓ Reindexed table {table}")
        except Exception as e:
            logging.error(f"Failed to reindex {table}: {e}")
    
    # 3. Check for bloated tables
    bloat_query = """
    SELECT schemaname, tablename, 
           pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND pg_total_relation_size(schemaname||'.'||tablename) > 100000000  -- > 100MB
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    """
    
    large_tables = hook.get_records(bloat_query)
    
    if large_tables:
        logging.info("Large tables detected:")
        for schema, table, size in large_tables:
            logging.info(f"  - {table}: {size}")
            
            # Vacuum full for very large tables (if needed)
            # Note: This is commented out as VACUUM FULL locks the table
            # Uncomment if you can afford downtime
            # hook.run(f"VACUUM FULL {table};")
    
    return maintenance_tasks

def backup_critical_data():
    """Create backup of critical configuration data"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    
    backup_dir = "/app/backups"
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_files = []
    
    # Backup cost models
    try:
        cost_models_query = "SELECT * FROM cost_models ORDER BY resource_name, region"
        cost_models = hook.get_records(cost_models_query)
        
        backup_file = f"{backup_dir}/cost_models_backup_{timestamp}.sql"
        
        with open(backup_file, 'w') as f:
            f.write("-- Cost Models Backup\n")
            f.write("-- Generated on: " + datetime.now().isoformat() + "\n\n")
            f.write("DELETE FROM cost_models;\n\n")
            
            for record in cost_models:
                resource_name, region, cost_per_unit, unit, currency = record[:5]  # Adjust based on your schema
                f.write(f"INSERT INTO cost_models (resource_name, region, cost_per_unit, unit, currency) "
                       f"VALUES ('{resource_name}', '{region}', {cost_per_unit}, '{unit}', '{currency}');\n")
        
        backup_files.append(backup_file)
        logging.info(f"✓ Backed up cost models to {backup_file}")
        
    except Exception as e:
        logging.error(f"Failed to backup cost models: {e}")
    
    # Backup hardware specs
    try:
        hardware_query = "SELECT * FROM hardware_specs ORDER BY component_name"
        hardware_data = hook.get_records(hardware_query)
        
        backup_file = f"{backup_dir}/hardware_specs_backup_{timestamp}.sql"
        
        with open(backup_file, 'w') as f:
            f.write("-- Hardware Specs Backup\n")
            f.write("-- Generated on: " + datetime.now().isoformat() + "\n\n")
            f.write("DELETE FROM hardware_specs;\n\n")
            
            for record in hardware_data:
                # Adjust field extraction based on your schema
                component_name = record[0]
                component_type = record[1] if len(record) > 1 else 'Unknown'
                specifications = record[2] if len(record) > 2 else '{}'
                
                f.write(f"INSERT INTO hardware_specs (component_name, component_type, specifications) "
                       f"VALUES ('{component_name}', '{component_type}', '{specifications}');\n")
        
        backup_files.append(backup_file)
        logging.info(f"✓ Backed up hardware specs to {backup_file}")
        
    except Exception as e:
        logging.error(f"Failed to backup hardware specs: {e}")
    
    # Clean up old backups (keep last 7 days)
    try:
        cutoff_time = datetime.now() - timedelta(days=7)
        
        for file in os.listdir(backup_dir):
            if file.endswith('.sql'):
                file_path = os.path.join(backup_dir, file)
                file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                
                if file_mtime < cutoff_time:
                    os.remove(file_path)
                    logging.info(f"Removed old backup: {file}")
                    
    except Exception as e:
        logging.warning(f"Error cleaning old backups: {e}")
    
    return backup_files

def monitor_system_resources():
    """Monitor system resource usage"""
    resource_info = {}
    warnings = []
    
    # CPU usage
    cpu_percent = psutil.cpu_percent(interval=1)
    resource_info['cpu_percent'] = cpu_percent
    
    if cpu_percent > 90:
        warnings.append(f"High CPU usage: {cpu_percent}%")
    elif cpu_percent > 80:
        warnings.append(f"Elevated CPU usage: {cpu_percent}%")
    
    # Memory usage
    memory = psutil.virtual_memory()
    resource_info['memory_percent'] = memory.percent
    resource_info['memory_available_gb'] = memory.available / (1024**3)
    
    if memory.percent > 90:
        warnings.append(f"High memory usage: {memory.percent}%")
    elif memory.percent > 80:
        warnings.append(f"Elevated memory usage: {memory.percent}%")
    
    # Disk usage
    disk = psutil.disk_usage('/')
    disk_percent = (disk.used / disk.total) * 100
    resource_info['disk_percent'] = disk_percent
    resource_info['disk_free_gb'] = disk.free / (1024**3)
    
    if disk_percent > 90:
        warnings.append(f"High disk usage: {disk_percent:.1f}%")
    elif disk_percent > 85:
        warnings.append(f"Elevated disk usage: {disk_percent:.1f}%")
    
    # Network connections
    connections = len(psutil.net_connections())
    resource_info['network_connections'] = connections
    
    if connections > 1000:
        warnings.append(f"High number of network connections: {connections}")
    
    # Process count
    process_count = len(psutil.pids())
    resource_info['process_count'] = process_count
    
    # Log resource information
    logging.info(f"System Resources:")
    logging.info(f"  CPU: {cpu_percent}%")
    logging.info(f"  Memory: {memory.percent}% ({resource_info['memory_available_gb']:.1f} GB available)")
    logging.info(f"  Disk: {disk_percent:.1f}% ({resource_info['disk_free_gb']:.1f} GB free)")
    logging.info(f"  Processes: {process_count}")
    logging.info(f"  Network connections: {connections}")
    
    if warnings:
        for warning in warnings:
            logging.warning(f"⚠ {warning}")
    else:
        logging.info("✓ All system resources within normal ranges")
    
    # Raise alert if critical resources are exhausted
    if cpu_percent > 95 or memory.percent > 95 or disk_percent > 95:
        raise Exception(f"Critical resource exhaustion detected. Warnings: {'; '.join(warnings)}")
    
    return resource_info

def cleanup_temp_files():
    """Clean up temporary files and directories"""
    temp_directories = [
        '/tmp/greenmatrix',
        './temp',
        './tmp',
        '/var/tmp/greenmatrix'
    ]
    
    cleaned_files = 0
    cleaned_size = 0
    
    for temp_dir in temp_directories:
        if os.path.exists(temp_dir):
            try:
                # Remove files older than 1 day
                cutoff_time = datetime.now() - timedelta(days=1)
                
                for root, dirs, files in os.walk(temp_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        
                        try:
                            file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                            
                            if file_mtime < cutoff_time:
                                file_size = os.path.getsize(file_path)
                                os.remove(file_path)
                                cleaned_files += 1
                                cleaned_size += file_size
                                
                        except Exception as e:
                            logging.warning(f"Could not remove temp file {file_path}: {e}")
                
                # Remove empty directories
                for root, dirs, files in os.walk(temp_dir, topdown=False):
                    for dir_name in dirs:
                        dir_path = os.path.join(root, dir_name)
                        try:
                            if not os.listdir(dir_path):  # Directory is empty
                                os.rmdir(dir_path)
                                logging.info(f"Removed empty directory: {dir_path}")
                        except Exception as e:
                            logging.warning(f"Could not remove directory {dir_path}: {e}")
                            
            except Exception as e:
                logging.warning(f"Error cleaning temp directory {temp_dir}: {e}")
    
    size_mb = cleaned_size / (1024 * 1024)
    logging.info(f"Cleaned {cleaned_files} temporary files, freed {size_mb:.2f} MB")
    
    return {'files_cleaned': cleaned_files, 'size_mb': size_mb}

def generate_maintenance_report():
    """Generate comprehensive maintenance report"""
    logging.info("=== MAINTENANCE REPORT ===")
    
    try:
        # Collect all maintenance results
        metrics_cleaned = cleanup_old_metrics_data()
        log_cleanup = cleanup_old_log_files()
        db_maintenance = optimize_database_performance()
        backups = backup_critical_data()
        resources = monitor_system_resources()
        temp_cleanup = cleanup_temp_files()
        
        # Generate summary
        logging.info("Maintenance Summary:")
        logging.info(f"  - Cleaned {metrics_cleaned} old metrics records")
        logging.info(f"  - Cleaned {log_cleanup['files_cleaned']} log files ({log_cleanup['size_mb']:.2f} MB)")
        logging.info(f"  - Completed {len(db_maintenance)} database maintenance tasks")
        logging.info(f"  - Created {len(backups)} backup files")
        logging.info(f"  - Cleaned {temp_cleanup['files_cleaned']} temp files ({temp_cleanup['size_mb']:.2f} MB)")
        logging.info(f"  - System resources: CPU {resources['cpu_percent']}%, Memory {resources['memory_percent']}%, Disk {resources['disk_percent']:.1f}%")
        
        maintenance_score = 100
        issues = []
        
        # Check for maintenance issues
        if resources['cpu_percent'] > 80:
            maintenance_score -= 20
            issues.append("High CPU usage")
        
        if resources['memory_percent'] > 80:
            maintenance_score -= 20
            issues.append("High memory usage")
        
        if resources['disk_percent'] > 85:
            maintenance_score -= 25
            issues.append("High disk usage")
        
        if metrics_cleaned > 100000:  # Very large cleanup might indicate data collection issues
            maintenance_score -= 10
            issues.append("Large amount of old data cleaned")
        
        maintenance_score = max(0, maintenance_score)
        
        logging.info(f"Maintenance Health Score: {maintenance_score}/100")
        if issues:
            logging.warning(f"Issues: {'; '.join(issues)}")
        else:
            logging.info("✓ All maintenance tasks completed successfully!")
        
        return {
            'maintenance_score': maintenance_score,
            'metrics_cleaned': metrics_cleaned,
            'log_cleanup': log_cleanup,
            'db_maintenance': db_maintenance,
            'backups': backups,
            'resources': resources,
            'temp_cleanup': temp_cleanup,
            'issues': issues
        }
        
    except Exception as e:
        logging.error(f"Maintenance report generation failed: {e}")
        raise

# Define tasks
cleanup_metrics = PythonOperator(
    task_id='cleanup_old_metrics_data',
    python_callable=cleanup_old_metrics_data,
    dag=dag,
)

cleanup_logs = PythonOperator(
    task_id='cleanup_old_log_files',
    python_callable=cleanup_old_log_files,
    dag=dag,
)

optimize_db = PythonOperator(
    task_id='optimize_database_performance',
    python_callable=optimize_database_performance,
    dag=dag,
)

backup_data = PythonOperator(
    task_id='backup_critical_data',
    python_callable=backup_critical_data,
    dag=dag,
)

monitor_resources = PythonOperator(
    task_id='monitor_system_resources',
    python_callable=monitor_system_resources,
    dag=dag,
)

cleanup_temp = PythonOperator(
    task_id='cleanup_temp_files',
    python_callable=cleanup_temp_files,
    dag=dag,
)

maintenance_report = PythonOperator(
    task_id='generate_maintenance_report',
    python_callable=generate_maintenance_report,
    dag=dag,
)

# Define task dependencies
[cleanup_metrics, cleanup_logs, cleanup_temp] >> optimize_db >> [backup_data, monitor_resources] >> maintenance_report