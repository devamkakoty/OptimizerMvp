"""
GreenMatrix Performance Analytics DAG
====================================

This DAG performs advanced analytics on collected metrics including:
- VM performance trend analysis
- Resource utilization forecasting
- Anomaly detection in metrics
- Cost analysis and optimization recommendations
- Capacity planning insights

Author: GreenMatrix Team
Schedule: Daily at 2 AM
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.postgres_operator import PostgresOperator
from airflow.hooks.postgres_hook import PostgresHook
from airflow.models import Variable
import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Any
import json

# DAG Configuration
default_args = {
    'owner': 'greenmatrix',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
    'catchup': False
}

dag = DAG(
    'greenmatrix_performance_analytics',
    default_args=default_args,
    description='Advanced analytics on GreenMatrix metrics',
    schedule_interval='0 2 * * *',  # Daily at 2 AM
    max_active_runs=1,
    tags=['analytics', 'performance', 'greenmatrix']
)

def analyze_vm_performance_trends(**context):
    """Analyze VM performance trends over the last 7 days"""
    logger = logging.getLogger(__name__)
    
    try:
        timescale_hook = PostgresHook(postgres_conn_id='timescaledb')
        
        # Query for VM performance data over last 7 days
        query = """
        SELECT 
            vm_name,
            DATE_TRUNC('hour', timestamp) as hour,
            AVG(cpu_usage_percent) as avg_cpu,
            MAX(cpu_usage_percent) as max_cpu,
            AVG(memory_usage_percent) as avg_memory,
            MAX(memory_usage_percent) as max_memory,
            AVG(gpu_utilization_percent) as avg_gpu,
            SUM(estimated_power_watts) as total_power,
            COUNT(DISTINCT process_id) as process_count
        FROM vm_process_metrics 
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY vm_name, DATE_TRUNC('hour', timestamp)
        ORDER BY vm_name, hour;
        """
        
        results = timescale_hook.get_records(query)
        
        if not results:
            logger.warning("No VM performance data found for analysis")
            return
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame(results, columns=[
            'vm_name', 'hour', 'avg_cpu', 'max_cpu', 'avg_memory', 
            'max_memory', 'avg_gpu', 'total_power', 'process_count'
        ])
        
        # Perform trend analysis for each VM
        vm_trends = {}
        
        for vm_name in df['vm_name'].unique():
            vm_data = df[df['vm_name'] == vm_name].copy()
            vm_data = vm_data.sort_values('hour')
            
            # Calculate trends (positive = increasing, negative = decreasing)
            cpu_trend = np.polyfit(range(len(vm_data)), vm_data['avg_cpu'], 1)[0]
            memory_trend = np.polyfit(range(len(vm_data)), vm_data['avg_memory'], 1)[0]
            power_trend = np.polyfit(range(len(vm_data)), vm_data['total_power'], 1)[0]
            
            # Calculate statistics
            vm_trends[vm_name] = {
                'cpu_trend_per_hour': float(cpu_trend),
                'memory_trend_per_hour': float(memory_trend),
                'power_trend_per_hour': float(power_trend),
                'avg_cpu_7d': float(vm_data['avg_cpu'].mean()),
                'peak_cpu_7d': float(vm_data['max_cpu'].max()),
                'avg_memory_7d': float(vm_data['avg_memory'].mean()),
                'peak_memory_7d': float(vm_data['max_memory'].max()),
                'total_power_7d': float(vm_data['total_power'].sum()),
                'avg_process_count': float(vm_data['process_count'].mean()),
                'data_points': len(vm_data)
            }
        
        # Store results
        context['task_instance'].xcom_push(key='vm_trends', value=vm_trends)
        
        logger.info(f"Analyzed performance trends for {len(vm_trends)} VMs")
        
        # Identify VMs with concerning trends
        alerts = []
        for vm_name, trends in vm_trends.items():
            if trends['cpu_trend_per_hour'] > 0.5:  # CPU increasing by 0.5% per hour
                alerts.append(f"{vm_name}: CPU usage trending upward ({trends['cpu_trend_per_hour']:.2f}%/hour)")
            
            if trends['memory_trend_per_hour'] > 0.3:  # Memory increasing by 0.3% per hour
                alerts.append(f"{vm_name}: Memory usage trending upward ({trends['memory_trend_per_hour']:.2f}%/hour)")
            
            if trends['peak_cpu_7d'] > 90:
                alerts.append(f"{vm_name}: High CPU usage detected (peak: {trends['peak_cpu_7d']:.1f}%)")
            
            if trends['peak_memory_7d'] > 85:
                alerts.append(f"{vm_name}: High memory usage detected (peak: {trends['peak_memory_7d']:.1f}%)")
        
        context['task_instance'].xcom_push(key='performance_alerts', value=alerts)
        
        if alerts:
            logger.warning(f"Performance alerts: {alerts}")
        
        return vm_trends
        
    except Exception as e:
        logger.error(f"✗ VM performance trend analysis failed: {e}")
        raise

def detect_resource_anomalies(**context):
    """Detect anomalies in resource usage patterns"""
    logger = logging.getLogger(__name__)
    
    try:
        timescale_hook = PostgresHook(postgres_conn_id='timescaledb')
        
        # Query for recent metrics
        query = """
        SELECT 
            vm_name,
            process_name,
            timestamp,
            cpu_usage_percent,
            memory_usage_percent,
            gpu_utilization_percent,
            estimated_power_watts
        FROM vm_process_metrics 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        AND (cpu_usage_percent > 0 OR memory_usage_percent > 0)
        ORDER BY vm_name, process_name, timestamp;
        """
        
        results = timescale_hook.get_records(query)
        
        if not results:
            logger.warning("No data available for anomaly detection")
            return
        
        df = pd.DataFrame(results, columns=[
            'vm_name', 'process_name', 'timestamp', 'cpu_usage_percent', 
            'memory_usage_percent', 'gpu_utilization_percent', 'estimated_power_watts'
        ])
        
        anomalies = []
        
        # Group by VM and process
        for (vm_name, process_name), group in df.groupby(['vm_name', 'process_name']):
            if len(group) < 10:  # Need enough data points
                continue
            
            # Calculate z-scores for different metrics
            for metric in ['cpu_usage_percent', 'memory_usage_percent', 'estimated_power_watts']:
                values = group[metric].dropna()
                if len(values) < 5:
                    continue
                
                mean_val = values.mean()
                std_val = values.std()
                
                if std_val == 0:  # No variance
                    continue
                
                # Find outliers (z-score > 3)
                z_scores = np.abs((values - mean_val) / std_val)
                outliers = values[z_scores > 3]
                
                if len(outliers) > 0:
                    anomalies.append({
                        'vm_name': vm_name,
                        'process_name': process_name,
                        'metric': metric,
                        'outlier_count': len(outliers),
                        'max_outlier': float(outliers.max()),
                        'normal_mean': float(mean_val),
                        'severity': 'high' if outliers.max() > mean_val * 3 else 'medium'
                    })
        
        # Store anomalies
        context['task_instance'].xcom_push(key='anomalies', value=anomalies)
        
        logger.info(f"Detected {len(anomalies)} resource usage anomalies")
        
        # Create summary of significant anomalies
        high_severity = [a for a in anomalies if a['severity'] == 'high']
        if high_severity:
            logger.warning(f"High severity anomalies detected: {len(high_severity)}")
        
        return anomalies
        
    except Exception as e:
        logger.error(f"✗ Anomaly detection failed: {e}")
        raise

def generate_capacity_insights(**context):
    """Generate capacity planning insights"""
    logger = logging.getLogger(__name__)
    
    try:
        vm_trends = context['task_instance'].xcom_pull(key='vm_trends', task_ids='analyze_vm_performance_trends')
        
        if not vm_trends:
            logger.warning("No VM trends data available for capacity planning")
            return
        
        capacity_insights = {
            'resource_projections': {},
            'recommendations': [],
            'at_risk_vms': [],
            'optimization_opportunities': []
        }
        
        for vm_name, trends in vm_trends.items():
            # Project resource usage 30 days into the future
            hours_in_30_days = 30 * 24
            
            projected_cpu = trends['avg_cpu_7d'] + (trends['cpu_trend_per_hour'] * hours_in_30_days)
            projected_memory = trends['avg_memory_7d'] + (trends['memory_trend_per_hour'] * hours_in_30_days)
            projected_power = trends['total_power_7d'] + (trends['power_trend_per_hour'] * hours_in_30_days * 7)  # Weekly power
            
            capacity_insights['resource_projections'][vm_name] = {
                'current_cpu_avg': trends['avg_cpu_7d'],
                'projected_cpu_30d': max(0, min(100, projected_cpu)),  # Clamp between 0-100%
                'current_memory_avg': trends['avg_memory_7d'],
                'projected_memory_30d': max(0, min(100, projected_memory)),
                'projected_weekly_power': max(0, projected_power)
            }
            
            # Identify at-risk VMs
            if projected_cpu > 80:
                capacity_insights['at_risk_vms'].append({
                    'vm_name': vm_name,
                    'risk_type': 'cpu',
                    'current': trends['avg_cpu_7d'],
                    'projected': projected_cpu,
                    'severity': 'high' if projected_cpu > 95 else 'medium'
                })
            
            if projected_memory > 80:
                capacity_insights['at_risk_vms'].append({
                    'vm_name': vm_name,
                    'risk_type': 'memory',
                    'current': trends['avg_memory_7d'],
                    'projected': projected_memory,
                    'severity': 'high' if projected_memory > 95 else 'medium'
                })
            
            # Identify optimization opportunities
            if trends['avg_cpu_7d'] < 20 and trends['avg_memory_7d'] < 30:
                capacity_insights['optimization_opportunities'].append({
                    'vm_name': vm_name,
                    'type': 'underutilized',
                    'cpu_avg': trends['avg_cpu_7d'],
                    'memory_avg': trends['avg_memory_7d'],
                    'recommendation': 'Consider downsizing or consolidating workloads'
                })
            
            if trends['peak_cpu_7d'] > 95 or trends['peak_memory_7d'] > 95:
                capacity_insights['optimization_opportunities'].append({
                    'vm_name': vm_name,
                    'type': 'overutilized',
                    'peak_cpu': trends['peak_cpu_7d'],
                    'peak_memory': trends['peak_memory_7d'],
                    'recommendation': 'Consider upgrading resources or load balancing'
                })
        
        # Generate general recommendations
        total_vms = len(vm_trends)
        at_risk_count = len(capacity_insights['at_risk_vms'])
        optimization_count = len(capacity_insights['optimization_opportunities'])
        
        capacity_insights['recommendations'] = [
            f"Monitoring {total_vms} VMs with performance data",
            f"{at_risk_count} VMs projected to need attention in 30 days",
            f"{optimization_count} optimization opportunities identified"
        ]
        
        if at_risk_count > 0:
            capacity_insights['recommendations'].append(
                "Review at-risk VMs for resource scaling or workload redistribution"
            )
        
        if optimization_count > 0:
            capacity_insights['recommendations'].append(
                "Consider resource optimization for better cost efficiency"
            )
        
        # Store insights
        context['task_instance'].xcom_push(key='capacity_insights', value=capacity_insights)
        
        logger.info(f"Generated capacity insights: {at_risk_count} at-risk VMs, {optimization_count} optimization opportunities")
        
        return capacity_insights
        
    except Exception as e:
        logger.error(f"✗ Capacity insights generation failed: {e}")
        raise

def update_analytics_summary(**context):
    """Update analytics summary in the database"""
    logger = logging.getLogger(__name__)
    
    try:
        # Collect all analytics results
        vm_trends = context['task_instance'].xcom_pull(key='vm_trends', task_ids='analyze_vm_performance_trends')
        anomalies = context['task_instance'].xcom_pull(key='anomalies', task_ids='detect_resource_anomalies')
        capacity_insights = context['task_instance'].xcom_pull(key='capacity_insights', task_ids='generate_capacity_insights')
        performance_alerts = context['task_instance'].xcom_pull(key='performance_alerts', task_ids='analyze_vm_performance_trends')
        
        # Create summary record
        analytics_summary = {
            'analysis_date': datetime.utcnow().isoformat(),
            'vm_count': len(vm_trends) if vm_trends else 0,
            'anomalies_detected': len(anomalies) if anomalies else 0,
            'performance_alerts': len(performance_alerts) if performance_alerts else 0,
            'at_risk_vms': len(capacity_insights.get('at_risk_vms', [])) if capacity_insights else 0,
            'optimization_opportunities': len(capacity_insights.get('optimization_opportunities', [])) if capacity_insights else 0,
            'high_severity_anomalies': len([a for a in (anomalies or []) if a.get('severity') == 'high']),
            'cpu_trend_vms': len([vm for vm, data in (vm_trends or {}).items() if data.get('cpu_trend_per_hour', 0) > 0.1]),
            'memory_trend_vms': len([vm for vm, data in (vm_trends or {}).items() if data.get('memory_trend_per_hour', 0) > 0.1])
        }
        
        # Store in PostgreSQL for historical tracking
        postgres_hook = PostgresHook(postgres_conn_id='greenmatrix_db')
        
        insert_query = """
        INSERT INTO analytics_summary 
        (analysis_date, vm_count, anomalies_detected, performance_alerts, 
         at_risk_vms, optimization_opportunities, high_severity_anomalies,
         cpu_trend_vms, memory_trend_vms, summary_data)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (analysis_date) DO UPDATE SET
        vm_count = EXCLUDED.vm_count,
        anomalies_detected = EXCLUDED.anomalies_detected,
        performance_alerts = EXCLUDED.performance_alerts,
        at_risk_vms = EXCLUDED.at_risk_vms,
        optimization_opportunities = EXCLUDED.optimization_opportunities,
        high_severity_anomalies = EXCLUDED.high_severity_anomalies,
        cpu_trend_vms = EXCLUDED.cpu_trend_vms,
        memory_trend_vms = EXCLUDED.memory_trend_vms,
        summary_data = EXCLUDED.summary_data;
        """
        
        postgres_hook.run(insert_query, parameters=[
            analytics_summary['analysis_date'],
            analytics_summary['vm_count'],
            analytics_summary['anomalies_detected'],
            analytics_summary['performance_alerts'],
            analytics_summary['at_risk_vms'],
            analytics_summary['optimization_opportunities'],
            analytics_summary['high_severity_anomalies'],
            analytics_summary['cpu_trend_vms'],
            analytics_summary['memory_trend_vms'],
            json.dumps({
                'vm_trends': vm_trends,
                'anomalies': anomalies,
                'capacity_insights': capacity_insights,
                'performance_alerts': performance_alerts
            })
        ])
        
        logger.info(f"Updated analytics summary: {analytics_summary}")
        
        return analytics_summary
        
    except Exception as e:
        logger.error(f"✗ Failed to update analytics summary: {e}")
        raise

# Create analytics summary table if it doesn't exist
create_analytics_table = PostgresOperator(
    task_id='create_analytics_table',
    postgres_conn_id='greenmatrix_db',
    sql="""
    CREATE TABLE IF NOT EXISTS analytics_summary (
        analysis_date DATE PRIMARY KEY,
        vm_count INTEGER,
        anomalies_detected INTEGER,
        performance_alerts INTEGER,
        at_risk_vms INTEGER,
        optimization_opportunities INTEGER,
        high_severity_anomalies INTEGER,
        cpu_trend_vms INTEGER,
        memory_trend_vms INTEGER,
        summary_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_analytics_summary_date 
    ON analytics_summary (analysis_date DESC);
    """,
    dag=dag
)

# Define Python tasks
analyze_vm_performance_trends_task = PythonOperator(
    task_id='analyze_vm_performance_trends',
    python_callable=analyze_vm_performance_trends,
    dag=dag
)

detect_resource_anomalies_task = PythonOperator(
    task_id='detect_resource_anomalies',
    python_callable=detect_resource_anomalies,
    dag=dag
)

generate_capacity_insights_task = PythonOperator(
    task_id='generate_capacity_insights',
    python_callable=generate_capacity_insights,
    dag=dag
)

update_analytics_summary_task = PythonOperator(
    task_id='update_analytics_summary',
    python_callable=update_analytics_summary,
    dag=dag
)

# Define task dependencies
create_analytics_table >> [analyze_vm_performance_trends_task, detect_resource_anomalies_task]

analyze_vm_performance_trends_task >> generate_capacity_insights_task

[analyze_vm_performance_trends_task, detect_resource_anomalies_task, 
 generate_capacity_insights_task] >> update_analytics_summary_task