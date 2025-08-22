"""
GreenMatrix Alerting and Notifications DAG

This DAG aggregates health status from all monitoring DAGs and manages
comprehensive alerting and notification systems.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.email import EmailOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.models import TaskInstance, DagRun
from airflow.utils.state import State
import logging
import json
import requests
from typing import Dict, List, Any

# DAG default arguments
default_args = {
    'owner': 'greenmatrix-admin',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=2),
    'email': ['admin@greenmatrix.com']
}

# Create DAG
dag = DAG(
    'greenmatrix_alerting_and_notifications',
    default_args=default_args,
    description='Comprehensive alerting and notification system for GreenMatrix',
    schedule_interval=timedelta(minutes=5),  # Check every 5 minutes
    catchup=False,
    tags=['greenmatrix', 'alerting', 'notifications']
)

# Configuration
MONITORING_DAGS = [
    'greenmatrix_data_pipeline_monitoring',
    'greenmatrix_database_health_monitoring', 
    'greenmatrix_api_health_monitoring',
    'greenmatrix_data_quality_validation',
    'greenmatrix_maintenance_and_cleanup'
]

ALERT_LEVELS = {
    'CRITICAL': {'color': '#FF0000', 'emoji': '🚨', 'escalate': True},
    'HIGH': {'color': '#FF8C00', 'emoji': '⚠️', 'escalate': True},
    'MEDIUM': {'color': '#FFD700', 'emoji': '⚡', 'escalate': False},
    'LOW': {'color': '#32CD32', 'emoji': 'ℹ️', 'escalate': False},
    'INFO': {'color': '#00BFFF', 'emoji': '✅', 'escalate': False}
}

def get_dag_health_status():
    """Get health status from all monitoring DAGs"""
    from airflow.models import DagRun, TaskInstance
    from airflow.utils.session import provide_session
    
    @provide_session
    def _get_health_status(session=None):
        health_status = {}
        
        for dag_id in MONITORING_DAGS:
            # Get most recent DAG run
            latest_run = session.query(DagRun).filter(
                DagRun.dag_id == dag_id
            ).order_by(DagRun.execution_date.desc()).first()
            
            if not latest_run:
                health_status[dag_id] = {
                    'status': 'UNKNOWN',
                    'last_run': None,
                    'failed_tasks': [],
                    'warning_tasks': [],
                    'success_tasks': [],
                    'health_score': 0
                }
                continue
            
            # Get task instances for this run
            task_instances = session.query(TaskInstance).filter(
                TaskInstance.dag_id == dag_id,
                TaskInstance.execution_date == latest_run.execution_date
            ).all()
            
            failed_tasks = []
            warning_tasks = []
            success_tasks = []
            
            for ti in task_instances:
                if ti.state == State.FAILED:
                    failed_tasks.append({
                        'task_id': ti.task_id,
                        'start_date': ti.start_date,
                        'end_date': ti.end_date,
                        'try_number': ti.try_number
                    })
                elif ti.state == State.UP_FOR_RETRY:
                    warning_tasks.append({
                        'task_id': ti.task_id,
                        'start_date': ti.start_date,
                        'try_number': ti.try_number
                    })
                elif ti.state == State.SUCCESS:
                    success_tasks.append({
                        'task_id': ti.task_id,
                        'start_date': ti.start_date,
                        'end_date': ti.end_date
                    })
            
            # Calculate health score
            total_tasks = len(task_instances)
            if total_tasks > 0:
                success_rate = len(success_tasks) / total_tasks
                health_score = int(success_rate * 100)
                
                # Deduct points for failures and retries
                health_score -= (len(failed_tasks) * 25)
                health_score -= (len(warning_tasks) * 10)
                health_score = max(0, health_score)
            else:
                health_score = 0
            
            # Determine overall status
            if failed_tasks:
                status = 'CRITICAL' if len(failed_tasks) > 1 else 'HIGH'
            elif warning_tasks:
                status = 'MEDIUM'
            elif latest_run.state == State.SUCCESS:
                status = 'INFO'
            else:
                status = 'MEDIUM'
            
            health_status[dag_id] = {
                'status': status,
                'last_run': latest_run.execution_date,
                'run_state': latest_run.state,
                'failed_tasks': failed_tasks,
                'warning_tasks': warning_tasks,
                'success_tasks': success_tasks,
                'health_score': health_score,
                'total_tasks': total_tasks
            }
        
        return health_status
    
    return _get_health_status()

def check_system_alerts():
    """Check for system-wide alerts and critical issues"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    alerts = []
    
    # Check 1: Data collection stopped
    try:
        query = """
        SELECT COUNT(*) FROM host_process_metrics 
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
        """
        recent_metrics = hook.get_first(query)[0]
        
        if recent_metrics == 0:
            alerts.append({
                'level': 'CRITICAL',
                'category': 'Data Collection',
                'message': 'No metrics data collected in the last hour',
                'details': 'Data collection scripts may have stopped',
                'action_required': 'Check and restart data collection processes'
            })
        elif recent_metrics < 10:
            alerts.append({
                'level': 'HIGH',
                'category': 'Data Collection',
                'message': f'Low metrics data volume: {recent_metrics} records in last hour',
                'details': 'Expected at least 10 records per hour',
                'action_required': 'Investigate data collection performance'
            })
    except Exception as e:
        alerts.append({
            'level': 'CRITICAL',
            'category': 'Database',
            'message': 'Cannot query metrics data',
            'details': str(e),
            'action_required': 'Check database connectivity'
        })
    
    # Check 2: Database connectivity
    try:
        hook.get_first("SELECT 1")
    except Exception as e:
        alerts.append({
            'level': 'CRITICAL',
            'category': 'Database',
            'message': 'Database connection failed',
            'details': str(e),
            'action_required': 'Check database server status'
        })
    
    # Check 3: Disk space critical
    import psutil
    disk_usage = psutil.disk_usage('/')
    disk_percent = (disk_usage.used / disk_usage.total) * 100
    
    if disk_percent > 95:
        alerts.append({
            'level': 'CRITICAL',
            'category': 'System',
            'message': f'Disk space critically low: {disk_percent:.1f}%',
            'details': f'Only {disk_usage.free / (1024**3):.1f} GB remaining',
            'action_required': 'Free up disk space immediately'
        })
    elif disk_percent > 85:
        alerts.append({
            'level': 'HIGH',
            'category': 'System',
            'message': f'Disk space running low: {disk_percent:.1f}%',
            'details': f'{disk_usage.free / (1024**3):.1f} GB remaining',
            'action_required': 'Plan disk cleanup or expansion'
        })
    
    # Check 4: API health
    try:
        import requests
        api_url = "http://localhost:8000/health"
        response = requests.get(api_url, timeout=10)
        
        if response.status_code != 200:
            alerts.append({
                'level': 'HIGH',
                'category': 'API',
                'message': f'API health check failed: HTTP {response.status_code}',
                'details': f'Health endpoint returned non-200 status',
                'action_required': 'Check API server status'
            })
    except requests.exceptions.ConnectionError:
        alerts.append({
            'level': 'CRITICAL',
            'category': 'API',
            'message': 'API server unreachable',
            'details': 'Connection to API server failed',
            'action_required': 'Check if API server is running'
        })
    except Exception as e:
        alerts.append({
            'level': 'MEDIUM',
            'category': 'API',
            'message': 'API health check error',
            'details': str(e),
            'action_required': 'Investigate API connectivity'
        })
    
    logging.info(f"System health check completed. Found {len(alerts)} alerts.")
    for alert in alerts:
        level_info = ALERT_LEVELS[alert['level']]
        logging.warning(f"{level_info['emoji']} {alert['level']}: {alert['message']}")
    
    return alerts

def generate_health_dashboard():
    """Generate comprehensive health dashboard data"""
    dag_health = get_dag_health_status()
    system_alerts = check_system_alerts()
    
    # Calculate overall system health score
    dag_scores = [status['health_score'] for status in dag_health.values()]
    overall_health = sum(dag_scores) / len(dag_scores) if dag_scores else 0
    
    # Deduct points for system alerts
    critical_alerts = len([a for a in system_alerts if a['level'] == 'CRITICAL'])
    high_alerts = len([a for a in system_alerts if a['level'] == 'HIGH'])
    
    overall_health -= (critical_alerts * 30)
    overall_health -= (high_alerts * 15)
    overall_health = max(0, overall_health)
    
    # Determine overall system status
    if critical_alerts > 0:
        overall_status = 'CRITICAL'
    elif high_alerts > 0:
        overall_status = 'HIGH'
    elif overall_health < 80:
        overall_status = 'MEDIUM'
    else:
        overall_status = 'INFO'
    
    dashboard = {
        'timestamp': datetime.now(),
        'overall_health_score': int(overall_health),
        'overall_status': overall_status,
        'dag_health': dag_health,
        'system_alerts': system_alerts,
        'summary': {
            'total_dags': len(MONITORING_DAGS),
            'healthy_dags': len([d for d in dag_health.values() if d['status'] == 'INFO']),
            'warning_dags': len([d for d in dag_health.values() if d['status'] in ['MEDIUM', 'HIGH']]),
            'critical_dags': len([d for d in dag_health.values() if d['status'] == 'CRITICAL']),
            'total_alerts': len(system_alerts),
            'critical_alerts': critical_alerts,
            'high_alerts': high_alerts
        }
    }
    
    logging.info(f"Health Dashboard Generated:")
    logging.info(f"  Overall Health Score: {overall_health}/100")
    logging.info(f"  Overall Status: {overall_status}")
    logging.info(f"  Total Alerts: {len(system_alerts)}")
    logging.info(f"  DAG Health: {dashboard['summary']['healthy_dags']}/{len(MONITORING_DAGS)} healthy")
    
    return dashboard

def send_slack_notification(dashboard_data: Dict[str, Any]):
    """Send notification to Slack webhook"""
    # This would be configured with actual Slack webhook URL
    slack_webhook_url = "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
    
    try:
        overall_status = dashboard_data['overall_status']
        level_info = ALERT_LEVELS[overall_status]
        
        # Build Slack message
        color = level_info['color']
        emoji = level_info['emoji']
        
        message = {
            "channel": "#greenmatrix-alerts",
            "username": "GreenMatrix Monitor",
            "icon_emoji": ":chart_with_upwards_trend:",
            "attachments": [
                {
                    "color": color,
                    "title": f"{emoji} GreenMatrix System Status: {overall_status}",
                    "text": f"Overall Health Score: {dashboard_data['overall_health_score']}/100",
                    "fields": [
                        {
                            "title": "DAG Status",
                            "value": f"✅ {dashboard_data['summary']['healthy_dags']} Healthy\n⚠️ {dashboard_data['summary']['warning_dags']} Warning\n🚨 {dashboard_data['summary']['critical_dags']} Critical",
                            "short": True
                        },
                        {
                            "title": "System Alerts",
                            "value": f"🚨 {dashboard_data['summary']['critical_alerts']} Critical\n⚠️ {dashboard_data['summary']['high_alerts']} High\n📊 {dashboard_data['summary']['total_alerts']} Total",
                            "short": True
                        }
                    ],
                    "footer": "GreenMatrix Monitoring",
                    "ts": int(dashboard_data['timestamp'].timestamp())
                }
            ]
        }
        
        # Add alert details if there are critical issues
        if dashboard_data['summary']['critical_alerts'] > 0:
            critical_alerts = [a for a in dashboard_data['system_alerts'] if a['level'] == 'CRITICAL']
            alert_text = "\n".join([f"• {alert['category']}: {alert['message']}" for alert in critical_alerts[:3]])
            message['attachments'][0]['fields'].append({
                "title": "Critical Issues",
                "value": alert_text,
                "short": False
            })
        
        # Note: In production, uncomment this to actually send to Slack
        # response = requests.post(slack_webhook_url, json=message)
        # response.raise_for_status()
        
        logging.info("Slack notification prepared (webhook disabled for demo)")
        
    except Exception as e:
        logging.error(f"Failed to send Slack notification: {e}")

def send_email_alerts(dashboard_data: Dict[str, Any]):
    """Send email alerts for critical issues"""
    critical_alerts = [a for a in dashboard_data['system_alerts'] if a['level'] == 'CRITICAL']
    high_alerts = [a for a in dashboard_data['system_alerts'] if a['level'] == 'HIGH']
    
    if not critical_alerts and not high_alerts:
        logging.info("No critical or high alerts to email")
        return
    
    # Generate email content
    subject = f"🚨 GreenMatrix Alert: {len(critical_alerts)} Critical, {len(high_alerts)} High Priority Issues"
    
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; }}
            .header {{ background-color: #f44336; color: white; padding: 20px; }}
            .content {{ padding: 20px; }}
            .alert {{ margin: 10px 0; padding: 15px; border-left: 4px solid; }}
            .critical {{ background-color: #ffebee; border-color: #f44336; }}
            .high {{ background-color: #fff3e0; border-color: #ff9800; }}
            .summary {{ background-color: #f5f5f5; padding: 15px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🚨 GreenMatrix System Alert</h1>
            <p>Overall Health Score: {dashboard_data['overall_health_score']}/100</p>
        </div>
        
        <div class="content">
            <div class="summary">
                <h2>Summary</h2>
                <ul>
                    <li>Total Alerts: {dashboard_data['summary']['total_alerts']}</li>
                    <li>Critical Issues: {dashboard_data['summary']['critical_alerts']}</li>
                    <li>High Priority Issues: {dashboard_data['summary']['high_alerts']}</li>
                    <li>DAG Status: {dashboard_data['summary']['healthy_dags']}/{dashboard_data['summary']['total_dags']} healthy</li>
                </ul>
            </div>
    """
    
    # Add critical alerts
    if critical_alerts:
        html_content += "<h2>🚨 Critical Issues (Immediate Action Required)</h2>"
        for alert in critical_alerts:
            html_content += f"""
            <div class="alert critical">
                <h3>{alert['category']}: {alert['message']}</h3>
                <p><strong>Details:</strong> {alert['details']}</p>
                <p><strong>Action Required:</strong> {alert['action_required']}</p>
            </div>
            """
    
    # Add high priority alerts
    if high_alerts:
        html_content += "<h2>⚠️ High Priority Issues</h2>"
        for alert in high_alerts:
            html_content += f"""
            <div class="alert high">
                <h3>{alert['category']}: {alert['message']}</h3>
                <p><strong>Details:</strong> {alert['details']}</p>
                <p><strong>Action Required:</strong> {alert['action_required']}</p>
            </div>
            """
    
    html_content += f"""
            <div class="summary">
                <p><strong>Generated at:</strong> {dashboard_data['timestamp']}</p>
                <p><strong>Airflow Dashboard:</strong> <a href="http://localhost:8080">http://localhost:8080</a></p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Log email content (in production, this would be sent via EmailOperator)
    logging.info(f"Email alert prepared: {subject}")
    logging.info("Email content ready for sending")
    
    return {
        'subject': subject,
        'html_content': html_content,
        'recipients': ['admin@greenmatrix.com', 'alerts@greenmatrix.com']
    }

def store_health_metrics(dashboard_data: Dict[str, Any]):
    """Store health metrics in database for historical tracking"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    
    try:
        # Create health_metrics table if not exists
        create_table_query = """
        CREATE TABLE IF NOT EXISTS health_metrics (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMP NOT NULL,
            overall_health_score INTEGER NOT NULL,
            overall_status VARCHAR(20) NOT NULL,
            total_dags INTEGER NOT NULL,
            healthy_dags INTEGER NOT NULL,
            warning_dags INTEGER NOT NULL,
            critical_dags INTEGER NOT NULL,
            total_alerts INTEGER NOT NULL,
            critical_alerts INTEGER NOT NULL,
            high_alerts INTEGER NOT NULL,
            details JSONB
        )
        """
        hook.run(create_table_query)
        
        # Insert current health metrics
        insert_query = """
        INSERT INTO health_metrics (
            timestamp, overall_health_score, overall_status,
            total_dags, healthy_dags, warning_dags, critical_dags,
            total_alerts, critical_alerts, high_alerts, details
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        hook.run(insert_query, parameters=[
            dashboard_data['timestamp'],
            dashboard_data['overall_health_score'],
            dashboard_data['overall_status'],
            dashboard_data['summary']['total_dags'],
            dashboard_data['summary']['healthy_dags'],
            dashboard_data['summary']['warning_dags'],
            dashboard_data['summary']['critical_dags'],
            dashboard_data['summary']['total_alerts'],
            dashboard_data['summary']['critical_alerts'],
            dashboard_data['summary']['high_alerts'],
            json.dumps(dashboard_data, default=str)
        ])
        
        logging.info("Health metrics stored in database")
        
    except Exception as e:
        logging.error(f"Failed to store health metrics: {e}")

def process_alerts_and_notifications():
    """Main function to process all alerts and notifications"""
    logging.info("=== GREENMATRIX ALERTING SYSTEM ===")
    
    # Generate comprehensive health dashboard
    dashboard = generate_health_dashboard()
    
    # Store metrics for historical tracking
    store_health_metrics(dashboard)
    
    # Send notifications based on severity
    if dashboard['overall_status'] in ['CRITICAL', 'HIGH']:
        # Send immediate notifications
        send_slack_notification(dashboard)
        email_data = send_email_alerts(dashboard)
        
        if dashboard['overall_status'] == 'CRITICAL':
            logging.error("🚨 CRITICAL SYSTEM STATUS - Immediate action required!")
        else:
            logging.warning("⚠️ HIGH PRIORITY ISSUES - Attention needed")
    
    elif dashboard['summary']['total_alerts'] > 0:
        # Send summary notification for medium/low alerts
        logging.info(f"📊 System Status: {dashboard['overall_status']} - {dashboard['summary']['total_alerts']} alerts")
        
    else:
        logging.info("✅ All systems healthy - No alerts to process")
    
    return dashboard

# Define tasks
generate_dashboard = PythonOperator(
    task_id='generate_health_dashboard',
    python_callable=generate_health_dashboard,
    dag=dag,
)

check_alerts = PythonOperator(
    task_id='check_system_alerts',
    python_callable=check_system_alerts,
    dag=dag,
)

process_notifications = PythonOperator(
    task_id='process_alerts_and_notifications',
    python_callable=process_alerts_and_notifications,
    dag=dag,
)

store_metrics = PythonOperator(
    task_id='store_health_metrics',
    python_callable=lambda: store_health_metrics(generate_health_dashboard()),
    dag=dag,
)

# Define task dependencies
[generate_dashboard, check_alerts] >> process_notifications >> store_metrics