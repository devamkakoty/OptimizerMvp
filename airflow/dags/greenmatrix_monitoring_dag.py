"""
GreenMatrix System Monitoring DAG
=================================

This DAG monitors the health and performance of the GreenMatrix system including:
- Backend API health checks
- Database connectivity monitoring  
- VM agent connectivity verification
- Log analysis and alerting
- Performance metrics collection
- System resource monitoring

Author: GreenMatrix Team
Schedule: Every 5 minutes
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.operators.email import EmailOperator
from airflow.sensors.filesystem import FileSensor
from airflow.hooks.postgres_hook import PostgresHook
from airflow.models import Variable
import requests
import json
import logging
import psutil
import os
import re
from typing import Dict, List, Any

# DAG Configuration
default_args = {
    'owner': 'greenmatrix',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=2),
    'catchup': False
}

dag = DAG(
    'greenmatrix_system_monitoring',
    default_args=default_args,
    description='Monitor GreenMatrix system health and performance',
    schedule_interval=timedelta(minutes=5),
    max_active_runs=1,
    tags=['monitoring', 'health-check', 'greenmatrix']
)

# Configuration
BACKEND_URL = Variable.get("GREENMATRIX_API_BASE_URL", "http://backend:8000")
MONITORING_EMAIL = Variable.get("MONITORING_EMAIL", "admin@greenmatrix.com")
LOG_PATHS = {
    'backend': '/app/logs',
    'collector': '/app/logs',
    'nginx': '/var/log/nginx'
}

def check_backend_health(**context):
    """Check if the backend API is healthy and responsive"""
    logger = logging.getLogger(__name__)
    
    try:
        # Check main health endpoint
        response = requests.get(f"{BACKEND_URL}/health", timeout=10)
        
        if response.status_code != 200:
            raise Exception(f"Backend health check failed: HTTP {response.status_code}")
        
        health_data = response.json()
        logger.info(f"Backend health: {health_data}")
        
        # Check API status endpoint for detailed info
        response = requests.get(f"{BACKEND_URL}/api/status", timeout=10)
        status_data = response.json()
        
        # Store metrics in XCom for downstream tasks
        context['task_instance'].xcom_push(key='backend_health', value=health_data)
        context['task_instance'].xcom_push(key='backend_status', value=status_data)
        
        # Check database connections
        if status_data.get('database', {}).get('status') != 'connected':
            raise Exception("Database connection failed")
        
        logger.info("✓ Backend health check passed")
        return True
        
    except Exception as e:
        logger.error(f"✗ Backend health check failed: {e}")
        context['task_instance'].xcom_push(key='health_error', value=str(e))
        raise

def check_database_connectivity(**context):
    """Check connectivity to all databases"""
    logger = logging.getLogger(__name__)
    
    try:
        # Check PostgreSQL (main databases)
        postgres_hook = PostgresHook(postgres_conn_id='greenmatrix_db')
        
        # Test main database
        result = postgres_hook.get_first("SELECT 1 as test")
        if not result:
            raise Exception("PostgreSQL connection test failed")
        
        # Check metrics database
        metrics_hook = PostgresHook(postgres_conn_id='metrics_db')
        result = metrics_hook.get_first("SELECT COUNT(*) FROM hardware_monitoring_table")
        logger.info(f"Hardware monitoring records: {result[0]}")
        
        # Check TimescaleDB for VM metrics
        timescale_hook = PostgresHook(postgres_conn_id='timescaledb')
        result = timescale_hook.get_first("SELECT COUNT(*) FROM vm_process_metrics")
        logger.info(f"VM process metrics records: {result[0]}")
        
        context['task_instance'].xcom_push(key='db_check_status', value='healthy')
        logger.info("✓ All database connections healthy")
        return True
        
    except Exception as e:
        logger.error(f"✗ Database connectivity check failed: {e}")
        context['task_instance'].xcom_push(key='db_error', value=str(e))
        raise

def monitor_vm_agents(**context):
    """Monitor active VM agents and their last contact times"""
    logger = logging.getLogger(__name__)
    
    try:
        # Get list of active VMs from API
        response = requests.get(f"{BACKEND_URL}/api/v1/metrics/vms/active", timeout=15)
        
        if response.status_code != 200:
            raise Exception(f"Failed to get active VMs: HTTP {response.status_code}")
        
        vm_data = response.json()
        active_vms = vm_data.get('active_vms', [])
        
        logger.info(f"Found {len(active_vms)} active VMs")
        
        # Check for VMs that haven't reported in > 10 minutes
        stale_vms = []
        current_time = datetime.utcnow()
        
        for vm in active_vms:
            last_seen = datetime.fromisoformat(vm['last_seen'].replace('Z', '+00:00'))
            time_diff = current_time - last_seen.replace(tzinfo=None)
            
            if time_diff > timedelta(minutes=10):
                stale_vms.append({
                    'vm_name': vm['vm_name'],
                    'last_seen': vm['last_seen'],
                    'minutes_ago': int(time_diff.total_seconds() / 60)
                })
        
        # Store results
        context['task_instance'].xcom_push(key='active_vms_count', value=len(active_vms))
        context['task_instance'].xcom_push(key='stale_vms', value=stale_vms)
        
        if stale_vms:
            logger.warning(f"Found {len(stale_vms)} stale VMs: {stale_vms}")
        else:
            logger.info("✓ All VMs reporting within expected timeframe")
        
        return {
            'active_count': len(active_vms),
            'stale_count': len(stale_vms),
            'stale_vms': stale_vms
        }
        
    except Exception as e:
        logger.error(f"✗ VM agent monitoring failed: {e}")
        context['task_instance'].xcom_push(key='vm_monitor_error', value=str(e))
        raise

def analyze_system_logs(**context):
    """Analyze system logs for errors and warnings"""
    logger = logging.getLogger(__name__)
    
    try:
        log_analysis = {
            'error_count': 0,
            'warning_count': 0,
            'critical_errors': [],
            'recent_errors': []
        }
        
        # Define error patterns to look for
        error_patterns = [
            r'ERROR.*database.*connection',
            r'CRITICAL.*',
            r'FATAL.*',
            r'Exception.*TimescaleDB',
            r'Failed to store.*metrics',
            r'Connection refused',
            r'Timeout.*backend'
        ]
        
        warning_patterns = [
            r'WARNING.*high.*usage',
            r'WARN.*retry',
            r'WARNING.*buffer.*full',
            r'Performance.*degraded'
        ]
        
        # Analyze backend logs
        backend_log_path = '/app/logs/backend.log'
        if os.path.exists(backend_log_path):
            with open(backend_log_path, 'r') as f:
                # Read last 1000 lines
                lines = f.readlines()[-1000:]
                
                for line in lines:
                    # Check for errors
                    for pattern in error_patterns:
                        if re.search(pattern, line, re.IGNORECASE):
                            log_analysis['error_count'] += 1
                            if 'CRITICAL' in line or 'FATAL' in line:
                                log_analysis['critical_errors'].append(line.strip())
                            else:
                                log_analysis['recent_errors'].append(line.strip())
                    
                    # Check for warnings
                    for pattern in warning_patterns:
                        if re.search(pattern, line, re.IGNORECASE):
                            log_analysis['warning_count'] += 1
        
        # Store analysis results
        context['task_instance'].xcom_push(key='log_analysis', value=log_analysis)
        
        logger.info(f"Log analysis: {log_analysis['error_count']} errors, {log_analysis['warning_count']} warnings")
        
        if log_analysis['critical_errors']:
            logger.error(f"Found critical errors: {log_analysis['critical_errors']}")
        
        return log_analysis
        
    except Exception as e:
        logger.error(f"✗ Log analysis failed: {e}")
        context['task_instance'].xcom_push(key='log_analysis_error', value=str(e))
        raise

def check_system_resources(**context):
    """Monitor system resource usage"""
    logger = logging.getLogger(__name__)
    
    try:
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Get network I/O
        network = psutil.net_io_counters()
        
        # Check for high resource usage
        alerts = []
        
        if cpu_percent > 90:
            alerts.append(f"High CPU usage: {cpu_percent}%")
        
        if memory.percent > 85:
            alerts.append(f"High memory usage: {memory.percent}%")
        
        if disk.percent > 85:
            alerts.append(f"High disk usage: {disk.percent}%")
        
        system_metrics = {
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'memory_available_gb': memory.available / (1024**3),
            'disk_percent': disk.percent,
            'disk_free_gb': disk.free / (1024**3),
            'network_bytes_sent': network.bytes_sent,
            'network_bytes_recv': network.bytes_recv,
            'alerts': alerts
        }
        
        context['task_instance'].xcom_push(key='system_metrics', value=system_metrics)
        
        if alerts:
            logger.warning(f"System resource alerts: {alerts}")
        else:
            logger.info("✓ System resources within normal limits")
        
        return system_metrics
        
    except Exception as e:
        logger.error(f"✗ System resource check failed: {e}")
        context['task_instance'].xcom_push(key='resource_check_error', value=str(e))
        raise

def generate_monitoring_report(**context):
    """Generate comprehensive monitoring report"""
    logger = logging.getLogger(__name__)
    
    try:
        # Gather data from previous tasks
        backend_health = context['task_instance'].xcom_pull(key='backend_health', task_ids='check_backend_health')
        vm_monitor_result = context['task_instance'].xcom_pull(key='active_vms_count', task_ids='monitor_vm_agents')
        stale_vms = context['task_instance'].xcom_pull(key='stale_vms', task_ids='monitor_vm_agents')
        log_analysis = context['task_instance'].xcom_pull(key='log_analysis', task_ids='analyze_system_logs')
        system_metrics = context['task_instance'].xcom_pull(key='system_metrics', task_ids='check_system_resources')
        
        # Generate report
        report = {
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'healthy',
            'backend_health': backend_health,
            'vm_monitoring': {
                'active_vms': vm_monitor_result or 0,
                'stale_vms_count': len(stale_vms) if stale_vms else 0,
                'stale_vms': stale_vms or []
            },
            'log_analysis': log_analysis or {},
            'system_metrics': system_metrics or {},
            'alerts': []
        }
        
        # Determine overall status and alerts
        if log_analysis and log_analysis.get('critical_errors'):
            report['status'] = 'critical'
            report['alerts'].append('Critical errors found in logs')
        
        if stale_vms and len(stale_vms) > 0:
            report['status'] = 'warning' if report['status'] == 'healthy' else report['status']
            report['alerts'].append(f'{len(stale_vms)} VMs have not reported recently')
        
        if system_metrics and system_metrics.get('alerts'):
            report['status'] = 'warning' if report['status'] == 'healthy' else report['status']
            report['alerts'].extend(system_metrics['alerts'])
        
        # Store report
        context['task_instance'].xcom_push(key='monitoring_report', value=report)
        
        logger.info(f"Generated monitoring report: Status={report['status']}, Alerts={len(report['alerts'])}")
        
        return report
        
    except Exception as e:
        logger.error(f"✗ Failed to generate monitoring report: {e}")
        raise

def send_alert_if_needed(**context):
    """Send alerts via email if critical issues are detected"""
    logger = logging.getLogger(__name__)
    
    try:
        report = context['task_instance'].xcom_pull(key='monitoring_report', task_ids='generate_monitoring_report')
        
        if not report:
            logger.warning("No monitoring report found")
            return
        
        if report['status'] in ['critical', 'warning'] and report['alerts']:
            # Prepare alert email content
            alert_subject = f"GreenMatrix Alert: {report['status'].upper()} - {len(report['alerts'])} issues detected"
            
            alert_body = f"""
GreenMatrix System Alert
========================

Status: {report['status'].upper()}
Timestamp: {report['timestamp']}
Alerts: {len(report['alerts'])}

Issues Detected:
{chr(10).join(f"• {alert}" for alert in report['alerts'])}

System Metrics:
• CPU Usage: {report.get('system_metrics', {}).get('cpu_percent', 'N/A')}%
• Memory Usage: {report.get('system_metrics', {}).get('memory_percent', 'N/A')}%
• Disk Usage: {report.get('system_metrics', {}).get('disk_percent', 'N/A')}%

VM Monitoring:
• Active VMs: {report.get('vm_monitoring', {}).get('active_vms', 'N/A')}
• Stale VMs: {report.get('vm_monitoring', {}).get('stale_vms_count', 'N/A')}

Log Analysis:
• Errors: {report.get('log_analysis', {}).get('error_count', 'N/A')}
• Warnings: {report.get('log_analysis', {}).get('warning_count', 'N/A')}
• Critical Errors: {len(report.get('log_analysis', {}).get('critical_errors', []))}

Please investigate these issues promptly.

GreenMatrix Monitoring System
"""
            
            # Store alert for email task
            context['task_instance'].xcom_push(key='alert_subject', value=alert_subject)
            context['task_instance'].xcom_push(key='alert_body', value=alert_body)
            context['task_instance'].xcom_push(key='send_alert', value=True)
            
            logger.warning(f"Alert triggered: {alert_subject}")
        else:
            context['task_instance'].xcom_push(key='send_alert', value=False)
            logger.info("✓ No alerts needed - system healthy")
        
    except Exception as e:
        logger.error(f"✗ Alert processing failed: {e}")
        raise

# Define tasks
check_backend_health_task = PythonOperator(
    task_id='check_backend_health',
    python_callable=check_backend_health,
    dag=dag,
    doc_md="Check if the backend API is responsive and healthy"
)

check_database_connectivity_task = PythonOperator(
    task_id='check_database_connectivity',
    python_callable=check_database_connectivity,
    dag=dag,
    doc_md="Verify connectivity to PostgreSQL and TimescaleDB"
)

monitor_vm_agents_task = PythonOperator(
    task_id='monitor_vm_agents',
    python_callable=monitor_vm_agents,
    dag=dag,
    doc_md="Monitor VM agent connectivity and reporting status"
)

analyze_system_logs_task = PythonOperator(
    task_id='analyze_system_logs',
    python_callable=analyze_system_logs,
    dag=dag,
    doc_md="Analyze system logs for errors and warnings"
)

check_system_resources_task = PythonOperator(
    task_id='check_system_resources',
    python_callable=check_system_resources,
    dag=dag,
    doc_md="Monitor system resource usage (CPU, memory, disk)"
)

generate_monitoring_report_task = PythonOperator(
    task_id='generate_monitoring_report',
    python_callable=generate_monitoring_report,
    dag=dag,
    doc_md="Generate comprehensive monitoring report"
)

send_alert_if_needed_task = PythonOperator(
    task_id='send_alert_if_needed',
    python_callable=send_alert_if_needed,
    dag=dag,
    doc_md="Send email alerts if critical issues are detected"
)

# Email task (conditional)
send_email_alert_task = EmailOperator(
    task_id='send_email_alert',
    to=[MONITORING_EMAIL],
    subject="{{ task_instance.xcom_pull(key='alert_subject', task_ids='send_alert_if_needed') }}",
    html_content="{{ task_instance.xcom_pull(key='alert_body', task_ids='send_alert_if_needed') }}",
    dag=dag,
    trigger_rule='none_failed'
)

# Archive logs task
archive_old_logs_task = BashOperator(
    task_id='archive_old_logs',
    bash_command="""
    # Archive logs older than 7 days
    find /app/logs -name "*.log" -mtime +7 -exec gzip {} \;
    find /app/logs -name "*.log.gz" -mtime +30 -delete
    echo "Log archival completed"
    """,
    dag=dag,
    doc_md="Archive old log files to save disk space"
)

# Define task dependencies
check_backend_health_task >> check_database_connectivity_task
check_backend_health_task >> monitor_vm_agents_task
check_backend_health_task >> analyze_system_logs_task
check_backend_health_task >> check_system_resources_task

[check_database_connectivity_task, monitor_vm_agents_task, 
 analyze_system_logs_task, check_system_resources_task] >> generate_monitoring_report_task

generate_monitoring_report_task >> send_alert_if_needed_task
send_alert_if_needed_task >> send_email_alert_task
send_alert_if_needed_task >> archive_old_logs_task