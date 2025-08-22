"""
GreenMatrix Database Health Monitoring DAG

This DAG monitors database health, performance, and data integrity
across all GreenMatrix databases.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.email import EmailOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
import logging
import psutil
import os

# DAG default arguments
default_args = {
    'owner': 'greenmatrix-admin',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'email': ['admin@greenmatrix.com']
}

# Create DAG
dag = DAG(
    'greenmatrix_database_health_monitoring',
    default_args=default_args,
    description='Monitor GreenMatrix database health and performance',
    schedule_interval=timedelta(hours=1),  # Check every hour
    catchup=False,
    tags=['greenmatrix', 'monitoring', 'database']
)

def check_database_connections():
    """Check connectivity to all GreenMatrix databases"""
    databases = [
        ('greenmatrix', 'greenmatrix_db'),
        ('Model_Recommendation_DB', 'model_db'),
        ('Metrics_db', 'metrics_db')
    ]
    
    connection_status = {}
    
    for db_name, conn_id in databases:
        try:
            hook = PostgresHook(postgres_conn_id=conn_id)
            result = hook.get_first("SELECT 1 as health_check, NOW() as timestamp")
            
            if result[0] == 1:
                connection_status[db_name] = {
                    'status': 'healthy',
                    'timestamp': result[1],
                    'error': None
                }
                logging.info(f"✓ Database '{db_name}' connection healthy")
            else:
                raise Exception("Health check query failed")
                
        except Exception as e:
            connection_status[db_name] = {
                'status': 'failed',
                'timestamp': None,
                'error': str(e)
            }
            logging.error(f"✗ Database '{db_name}' connection failed: {e}")
    
    # Check if any databases failed
    failed_dbs = [db for db, status in connection_status.items() if status['status'] == 'failed']
    if failed_dbs:
        raise Exception(f"Database connection failed for: {', '.join(failed_dbs)}")
    
    return connection_status

def check_table_sizes_and_growth():
    """Monitor table sizes and growth patterns"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    
    # Query to get table sizes
    query = """
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    """
    
    results = hook.get_records(query)
    
    table_info = {}
    total_size = 0
    
    for schema, table, size_pretty, size_bytes in results:
        table_info[table] = {
            'size_pretty': size_pretty,
            'size_bytes': size_bytes
        }
        total_size += size_bytes
        logging.info(f"Table '{table}': {size_pretty}")
    
    # Check for unusually large tables (> 1GB)
    large_tables = [table for table, info in table_info.items() 
                   if info['size_bytes'] > 1024*1024*1024]
    
    if large_tables:
        logging.warning(f"Large tables detected (>1GB): {', '.join(large_tables)}")
    
    # Check total database size
    total_size_gb = total_size / (1024*1024*1024)
    logging.info(f"Total database size: {total_size_gb:.2f} GB")
    
    if total_size_gb > 10:  # Alert if database > 10GB
        logging.warning(f"Database size is large: {total_size_gb:.2f} GB")
    
    return table_info

def check_data_integrity():
    """Check data integrity and constraints"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    
    integrity_checks = []
    
    # Check for NULL values in critical columns
    critical_null_checks = [
        ("host_process_metrics", "process_name", "Process name should not be NULL"),
        ("host_process_metrics", "timestamp", "Timestamp should not be NULL"),
        ("hardware_specs", "component_name", "Component name should not be NULL"),
        ("cost_models", "resource_name", "Resource name should not be NULL"),
    ]
    
    for table, column, description in critical_null_checks:
        try:
            query = f"SELECT COUNT(*) FROM {table} WHERE {column} IS NULL"
            null_count = hook.get_first(query)[0]
            
            if null_count > 0:
                integrity_checks.append({
                    'check': description,
                    'status': 'failed',
                    'details': f"Found {null_count} NULL values in {table}.{column}"
                })
                logging.error(f"✗ {description}: {null_count} NULL values found")
            else:
                integrity_checks.append({
                    'check': description,
                    'status': 'passed',
                    'details': 'No NULL values found'
                })
                logging.info(f"✓ {description}: No NULL values")
        except Exception as e:
            integrity_checks.append({
                'check': description,
                'status': 'error',
                'details': f"Check failed: {e}"
            })
    
    # Check for duplicate entries in unique constraint tables
    duplicate_checks = [
        ("cost_models", ["resource_name", "region"], "Cost models should be unique per resource-region"),
    ]
    
    for table, columns, description in duplicate_checks:
        try:
            column_list = ', '.join(columns)
            query = f"""
            SELECT {column_list}, COUNT(*) as count
            FROM {table} 
            GROUP BY {column_list}
            HAVING COUNT(*) > 1
            """
            duplicates = hook.get_records(query)
            
            if duplicates:
                integrity_checks.append({
                    'check': description,
                    'status': 'failed',
                    'details': f"Found {len(duplicates)} duplicate entries"
                })
                logging.error(f"✗ {description}: {len(duplicates)} duplicates found")
            else:
                integrity_checks.append({
                    'check': description,
                    'status': 'passed',
                    'details': 'No duplicates found'
                })
                logging.info(f"✓ {description}: No duplicates")
        except Exception as e:
            integrity_checks.append({
                'check': description,
                'status': 'error', 
                'details': f"Check failed: {e}"
            })
    
    # Check if any integrity checks failed
    failed_checks = [check for check in integrity_checks if check['status'] == 'failed']
    if failed_checks:
        error_msg = "Data integrity issues found:\n" + "\n".join([
            f"- {check['check']}: {check['details']}" for check in failed_checks
        ])
        raise Exception(error_msg)
    
    return integrity_checks

def check_database_performance():
    """Monitor database performance metrics"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    
    performance_metrics = {}
    
    # Check active connections
    query = "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"
    active_connections = hook.get_first(query)[0]
    performance_metrics['active_connections'] = active_connections
    
    # Check for long-running queries
    query = """
    SELECT count(*) 
    FROM pg_stat_activity 
    WHERE state = 'active' 
    AND query_start < NOW() - INTERVAL '5 minutes'
    AND query NOT LIKE '%pg_stat_activity%'
    """
    long_running_queries = hook.get_first(query)[0]
    performance_metrics['long_running_queries'] = long_running_queries
    
    # Check database size
    query = "SELECT pg_size_pretty(pg_database_size(current_database()))"
    db_size = hook.get_first(query)[0]
    performance_metrics['database_size'] = db_size
    
    # Check for table bloat (simplified check)
    query = """
    SELECT schemaname, tablename, 
           pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 5
    """
    largest_tables = hook.get_records(query)
    performance_metrics['largest_tables'] = largest_tables
    
    # Performance warnings
    warnings = []
    if active_connections > 50:
        warnings.append(f"High number of active connections: {active_connections}")
    
    if long_running_queries > 0:
        warnings.append(f"Found {long_running_queries} long-running queries")
    
    if warnings:
        logging.warning("Performance warnings: " + "; ".join(warnings))
    else:
        logging.info("✓ Database performance looks good")
    
    # Log metrics
    logging.info(f"Active connections: {active_connections}")
    logging.info(f"Long-running queries: {long_running_queries}")
    logging.info(f"Database size: {db_size}")
    
    return performance_metrics

def check_disk_space():
    """Check disk space on database server"""
    disk_usage = psutil.disk_usage('/')
    
    total_gb = disk_usage.total / (1024**3)
    used_gb = disk_usage.used / (1024**3) 
    free_gb = disk_usage.free / (1024**3)
    usage_percent = (disk_usage.used / disk_usage.total) * 100
    
    disk_info = {
        'total_gb': round(total_gb, 2),
        'used_gb': round(used_gb, 2),
        'free_gb': round(free_gb, 2),
        'usage_percent': round(usage_percent, 2)
    }
    
    logging.info(f"Disk usage: {usage_percent:.1f}% ({used_gb:.1f}GB / {total_gb:.1f}GB)")
    
    # Alert thresholds
    if usage_percent > 90:
        raise Exception(f"Critical: Disk usage very high ({usage_percent:.1f}%)")
    elif usage_percent > 80:
        logging.warning(f"Warning: Disk usage high ({usage_percent:.1f}%)")
    elif usage_percent > 70:
        logging.info(f"Notice: Disk usage moderate ({usage_percent:.1f}%)")
    
    return disk_info

def generate_health_report():
    """Generate overall database health report"""
    logging.info("=== DATABASE HEALTH REPORT ===")
    
    try:
        # Collect all metrics
        conn_status = check_database_connections()
        table_info = check_table_sizes_and_growth()
        integrity_status = check_data_integrity()
        performance_metrics = check_database_performance()
        disk_info = check_disk_space()
        
        # Calculate health score
        health_score = 100
        issues = []
        
        # Deduct points for issues
        failed_connections = sum(1 for status in conn_status.values() if status['status'] == 'failed')
        if failed_connections > 0:
            health_score -= (failed_connections * 30)
            issues.append(f"{failed_connections} database connection(s) failed")
        
        failed_integrity = sum(1 for check in integrity_status if check['status'] == 'failed')
        if failed_integrity > 0:
            health_score -= (failed_integrity * 20)
            issues.append(f"{failed_integrity} data integrity issue(s)")
        
        if performance_metrics['long_running_queries'] > 0:
            health_score -= 15
            issues.append("Long-running queries detected")
        
        if disk_info['usage_percent'] > 80:
            health_score -= 20
            issues.append("High disk usage")
        
        health_score = max(0, health_score)
        
        logging.info(f"Overall Database Health Score: {health_score}/100")
        if issues:
            logging.warning(f"Issues: {'; '.join(issues)}")
        else:
            logging.info("✓ All database health checks passed!")
        
        return {
            'health_score': health_score,
            'connections': conn_status,
            'tables': table_info,
            'integrity': integrity_status,
            'performance': performance_metrics,
            'disk': disk_info,
            'issues': issues
        }
        
    except Exception as e:
        logging.error(f"Health report generation failed: {e}")
        raise

# Define tasks
check_connections = PythonOperator(
    task_id='check_database_connections',
    python_callable=check_database_connections,
    dag=dag,
)

check_tables = PythonOperator(
    task_id='check_table_sizes_and_growth',
    python_callable=check_table_sizes_and_growth,
    dag=dag,
)

check_integrity = PythonOperator(
    task_id='check_data_integrity',
    python_callable=check_data_integrity,
    dag=dag,
)

check_performance = PythonOperator(
    task_id='check_database_performance',
    python_callable=check_database_performance,
    dag=dag,
)

check_disk = PythonOperator(
    task_id='check_disk_space',
    python_callable=check_disk_space,
    dag=dag,
)

health_report = PythonOperator(
    task_id='generate_health_report',
    python_callable=generate_health_report,
    dag=dag,
)

# Define task dependencies
check_connections >> [check_tables, check_integrity, check_performance, check_disk] >> health_report