"""
GreenMatrix Data Quality Validation DAG

This DAG validates data quality across all GreenMatrix data sources,
checking for anomalies, missing data, and data consistency issues.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
import logging
import pandas as pd
import numpy as np

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
    'greenmatrix_data_quality_validation',
    default_args=default_args,
    description='Validate data quality across GreenMatrix data sources',
    schedule_interval=timedelta(hours=6),  # Check every 6 hours
    catchup=False,
    tags=['greenmatrix', 'monitoring', 'data-quality']
)

def validate_process_metrics_data():
    """Validate host process metrics data quality"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    
    validation_results = []
    
    # Check 1: Data freshness - should have data from last 2 hours
    query = """
    SELECT COUNT(*) as recent_count,
           MAX(timestamp) as latest_timestamp,
           MIN(timestamp) as earliest_timestamp
    FROM host_process_metrics 
    WHERE timestamp >= NOW() - INTERVAL '2 hours'
    """
    
    result = hook.get_first(query)
    recent_count, latest_timestamp, earliest_timestamp = result
    
    if recent_count == 0:
        validation_results.append({
            'check': 'Data Freshness',
            'status': 'failed',
            'details': 'No data in last 2 hours',
            'severity': 'critical'
        })
    elif recent_count < 10:
        validation_results.append({
            'check': 'Data Freshness',
            'status': 'warning',
            'details': f'Only {recent_count} records in last 2 hours (expected >10)',
            'severity': 'medium'
        })
    else:
        validation_results.append({
            'check': 'Data Freshness',
            'status': 'passed',
            'details': f'{recent_count} records in last 2 hours',
            'severity': 'info'
        })
    
    # Check 2: Data completeness - check for missing critical fields
    query = """
    SELECT 
        COUNT(*) as total_records,
        COUNT(process_name) as has_process_name,
        COUNT(cpu_usage_percent) as has_cpu_usage,
        COUNT(memory_usage_mb) as has_memory_usage,
        COUNT(estimated_power_watts) as has_power_estimate
    FROM host_process_metrics 
    WHERE timestamp >= NOW() - INTERVAL '24 hours'
    """
    
    result = hook.get_first(query)
    total, has_name, has_cpu, has_memory, has_power = result
    
    completeness_issues = []
    if has_name < total:
        completeness_issues.append(f"Missing process names: {total - has_name}")
    if has_cpu < total:
        completeness_issues.append(f"Missing CPU usage: {total - has_cpu}")
    if has_memory < total:
        completeness_issues.append(f"Missing memory usage: {total - has_memory}")
    if has_power < total * 0.9:  # Allow 10% missing power estimates
        completeness_issues.append(f"Missing power estimates: {total - has_power}")
    
    if completeness_issues:
        validation_results.append({
            'check': 'Data Completeness',
            'status': 'failed',
            'details': '; '.join(completeness_issues),
            'severity': 'high'
        })
    else:
        validation_results.append({
            'check': 'Data Completeness',
            'status': 'passed',
            'details': 'All critical fields populated',
            'severity': 'info'
        })
    
    # Check 3: Data validity - check for unrealistic values
    query = """
    SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN cpu_usage_percent < 0 OR cpu_usage_percent > 100 THEN 1 END) as invalid_cpu,
        COUNT(CASE WHEN memory_usage_percent < 0 OR memory_usage_percent > 100 THEN 1 END) as invalid_memory_pct,
        COUNT(CASE WHEN estimated_power_watts < 0 OR estimated_power_watts > 1000 THEN 1 END) as invalid_power,
        COUNT(CASE WHEN gpu_utilization_percent < 0 OR gpu_utilization_percent > 100 THEN 1 END) as invalid_gpu
    FROM host_process_metrics 
    WHERE timestamp >= NOW() - INTERVAL '24 hours'
    """
    
    result = hook.get_first(query)
    total, invalid_cpu, invalid_memory, invalid_power, invalid_gpu = result
    
    validity_issues = []
    if invalid_cpu > 0:
        validity_issues.append(f"Invalid CPU usage values: {invalid_cpu}")
    if invalid_memory > 0:
        validity_issues.append(f"Invalid memory percentage values: {invalid_memory}")
    if invalid_power > 0:
        validity_issues.append(f"Invalid power consumption values: {invalid_power}")
    if invalid_gpu > 0:
        validity_issues.append(f"Invalid GPU utilization values: {invalid_gpu}")
    
    if validity_issues:
        validation_results.append({
            'check': 'Data Validity',
            'status': 'failed',
            'details': '; '.join(validity_issues),
            'severity': 'high'
        })
    else:
        validation_results.append({
            'check': 'Data Validity',
            'status': 'passed',
            'details': 'All values within expected ranges',
            'severity': 'info'
        })
    
    # Check 4: Data consistency - check for duplicate timestamps per process
    query = """
    SELECT process_name, timestamp, COUNT(*) as count
    FROM host_process_metrics 
    WHERE timestamp >= NOW() - INTERVAL '24 hours'
    GROUP BY process_name, timestamp
    HAVING COUNT(*) > 1
    LIMIT 10
    """
    
    duplicates = hook.get_records(query)
    
    if duplicates:
        validation_results.append({
            'check': 'Data Consistency',
            'status': 'failed',
            'details': f'Found {len(duplicates)} duplicate timestamp-process combinations',
            'severity': 'medium'
        })
    else:
        validation_results.append({
            'check': 'Data Consistency',
            'status': 'passed',
            'details': 'No duplicate records found',
            'severity': 'info'
        })
    
    # Log results
    for result in validation_results:
        if result['status'] == 'passed':
            logging.info(f"✓ {result['check']}: {result['details']}")
        elif result['status'] == 'warning':
            logging.warning(f"⚠ {result['check']}: {result['details']}")
        else:
            logging.error(f"✗ {result['check']}: {result['details']}")
    
    return validation_results

def validate_hardware_data():
    """Validate hardware data quality"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    
    validation_results = []
    
    # Check if hardware_specs table exists and has data
    try:
        query = """
        SELECT COUNT(*) as total_records,
               MAX(last_updated) as latest_update,
               COUNT(DISTINCT component_name) as unique_components
        FROM hardware_specs
        """
        
        result = hook.get_first(query)
        total, latest_update, unique_components = result
        
        if total == 0:
            validation_results.append({
                'check': 'Hardware Data Presence',
                'status': 'failed',
                'details': 'No hardware data found',
                'severity': 'high'
            })
        else:
            validation_results.append({
                'check': 'Hardware Data Presence',
                'status': 'passed',
                'details': f'{total} hardware records, {unique_components} unique components',
                'severity': 'info'
            })
            
            # Check hardware data freshness (should be updated within last 48 hours)
            if latest_update:
                hours_since_update = hook.get_first(
                    "SELECT EXTRACT(EPOCH FROM (NOW() - %s))/3600", 
                    parameters=[latest_update]
                )[0]
                
                if hours_since_update > 48:
                    validation_results.append({
                        'check': 'Hardware Data Freshness',
                        'status': 'warning',
                        'details': f'Hardware data is {hours_since_update:.1f} hours old',
                        'severity': 'medium'
                    })
                else:
                    validation_results.append({
                        'check': 'Hardware Data Freshness',
                        'status': 'passed',
                        'details': f'Hardware data updated {hours_since_update:.1f} hours ago',
                        'severity': 'info'
                    })
        
    except Exception as e:
        validation_results.append({
            'check': 'Hardware Data Validation',
            'status': 'error',
            'details': f'Error validating hardware data: {e}',
            'severity': 'high'
        })
    
    return validation_results

def validate_cost_models_data():
    """Validate cost models data quality"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    
    validation_results = []
    
    # Check cost models completeness
    query = """
    SELECT COUNT(*) as total_models,
           COUNT(DISTINCT resource_name) as unique_resources,
           COUNT(DISTINCT region) as unique_regions,
           COUNT(DISTINCT currency) as unique_currencies
    FROM cost_models
    """
    
    result = hook.get_first(query)
    total, unique_resources, unique_regions, unique_currencies = result
    
    if total == 0:
        validation_results.append({
            'check': 'Cost Models Presence',
            'status': 'failed',
            'details': 'No cost models found',
            'severity': 'critical'
        })
    else:
        validation_results.append({
            'check': 'Cost Models Presence',
            'status': 'passed',
            'details': f'{total} cost models, {unique_resources} resources, {unique_regions} regions',
            'severity': 'info'
        })
        
        # Check for essential resource types
        query = """
        SELECT DISTINCT resource_name 
        FROM cost_models
        """
        resources = [row[0] for row in hook.get_records(query)]
        
        essential_resources = ['CPU', 'GPU', 'Memory']
        missing_resources = [r for r in essential_resources if r not in resources]
        
        if missing_resources:
            validation_results.append({
                'check': 'Essential Cost Models',
                'status': 'failed',
                'details': f'Missing cost models for: {", ".join(missing_resources)}',
                'severity': 'high'
            })
        else:
            validation_results.append({
                'check': 'Essential Cost Models',
                'status': 'passed',
                'details': 'All essential resource cost models present',
                'severity': 'info'
            })
        
        # Check for reasonable cost values
        query = """
        SELECT COUNT(*) as invalid_costs
        FROM cost_models 
        WHERE cost_per_unit <= 0 OR cost_per_unit > 10
        """
        
        invalid_costs = hook.get_first(query)[0]
        
        if invalid_costs > 0:
            validation_results.append({
                'check': 'Cost Model Values',
                'status': 'warning',
                'details': f'{invalid_costs} cost models with unrealistic values',
                'severity': 'medium'
            })
        else:
            validation_results.append({
                'check': 'Cost Model Values',
                'status': 'passed',
                'details': 'All cost values within reasonable ranges',
                'severity': 'info'
            })
    
    return validation_results

def detect_data_anomalies():
    """Detect anomalies in data patterns"""
    hook = PostgresHook(postgres_conn_id='greenmatrix_db')
    
    anomaly_results = []
    
    # Check for sudden spikes in process count
    query = """
    SELECT 
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(DISTINCT process_name) as unique_processes,
        COUNT(*) as total_records
    FROM host_process_metrics 
    WHERE timestamp >= NOW() - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', timestamp)
    ORDER BY hour DESC
    """
    
    results = hook.get_records(query)
    
    if len(results) > 1:
        # Convert to pandas for easier analysis
        df = pd.DataFrame(results, columns=['hour', 'unique_processes', 'total_records'])
        
        # Calculate z-scores for process count
        df['process_zscore'] = np.abs((df['unique_processes'] - df['unique_processes'].mean()) / df['unique_processes'].std())
        df['records_zscore'] = np.abs((df['total_records'] - df['total_records'].mean()) / df['total_records'].std())
        
        # Flag anomalies (z-score > 2)
        process_anomalies = df[df['process_zscore'] > 2]
        record_anomalies = df[df['records_zscore'] > 2]
        
        if len(process_anomalies) > 0:
            anomaly_results.append({
                'check': 'Process Count Anomalies',
                'status': 'warning',
                'details': f'Found {len(process_anomalies)} hours with unusual process counts',
                'severity': 'medium'
            })
        
        if len(record_anomalies) > 0:
            anomaly_results.append({
                'check': 'Data Volume Anomalies',
                'status': 'warning',
                'details': f'Found {len(record_anomalies)} hours with unusual data volumes',
                'severity': 'medium'
            })
        
        if len(process_anomalies) == 0 and len(record_anomalies) == 0:
            anomaly_results.append({
                'check': 'Data Pattern Analysis',
                'status': 'passed',
                'details': 'No significant anomalies detected in data patterns',
                'severity': 'info'
            })
    
    # Check for missing time periods (data gaps)
    query = """
    WITH time_series AS (
        SELECT generate_series(
            NOW() - INTERVAL '24 hours',
            NOW(),
            INTERVAL '10 minutes'
        ) as expected_time
    ),
    actual_data AS (
        SELECT 
            DATE_TRUNC('minute', timestamp) as minute_bucket,
            COUNT(*) as record_count
        FROM host_process_metrics 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY DATE_TRUNC('minute', timestamp)
    )
    SELECT COUNT(*) as missing_periods
    FROM time_series t
    LEFT JOIN actual_data a ON DATE_TRUNC('minute', t.expected_time) = a.minute_bucket
    WHERE a.record_count IS NULL
    """
    
    missing_periods = hook.get_first(query)[0]
    
    if missing_periods > 12:  # More than 2 hours of missing data (12 * 10min periods)
        anomaly_results.append({
            'check': 'Data Gaps',
            'status': 'failed',
            'details': f'Found {missing_periods} periods with no data (>2 hours missing)',
            'severity': 'high'
        })
    elif missing_periods > 0:
        anomaly_results.append({
            'check': 'Data Gaps',
            'status': 'warning',
            'details': f'Found {missing_periods} periods with no data',
            'severity': 'medium'
        })
    else:
        anomaly_results.append({
            'check': 'Data Gaps',
            'status': 'passed',
            'details': 'No significant data gaps detected',
            'severity': 'info'
        })
    
    return anomaly_results

def generate_data_quality_report():
    """Generate comprehensive data quality report"""
    logging.info("=== DATA QUALITY REPORT ===")
    
    try:
        # Run all validations
        process_validation = validate_process_metrics_data()
        hardware_validation = validate_hardware_data()
        cost_validation = validate_cost_models_data()
        anomaly_detection = detect_data_anomalies()
        
        all_checks = process_validation + hardware_validation + cost_validation + anomaly_detection
        
        # Calculate data quality score
        total_checks = len(all_checks)
        passed_checks = len([c for c in all_checks if c['status'] == 'passed'])
        failed_checks = len([c for c in all_checks if c['status'] == 'failed'])
        warning_checks = len([c for c in all_checks if c['status'] == 'warning'])
        
        # Score calculation
        quality_score = 100
        quality_score -= (failed_checks * 25)  # Major deduction for failures
        quality_score -= (warning_checks * 10)  # Minor deduction for warnings
        quality_score = max(0, quality_score)
        
        # Categorize issues by severity
        critical_issues = [c for c in all_checks if c.get('severity') == 'critical' and c['status'] != 'passed']
        high_issues = [c for c in all_checks if c.get('severity') == 'high' and c['status'] != 'passed']
        medium_issues = [c for c in all_checks if c.get('severity') == 'medium' and c['status'] != 'passed']
        
        # Log summary
        logging.info(f"Data Quality Score: {quality_score}/100")
        logging.info(f"Checks: {passed_checks} passed, {warning_checks} warnings, {failed_checks} failed")
        
        if critical_issues:
            logging.error(f"CRITICAL ISSUES ({len(critical_issues)}):")
            for issue in critical_issues:
                logging.error(f"  - {issue['check']}: {issue['details']}")
        
        if high_issues:
            logging.error(f"HIGH PRIORITY ISSUES ({len(high_issues)}):")
            for issue in high_issues:
                logging.error(f"  - {issue['check']}: {issue['details']}")
        
        if medium_issues:
            logging.warning(f"MEDIUM PRIORITY ISSUES ({len(medium_issues)}):")
            for issue in medium_issues:
                logging.warning(f"  - {issue['check']}: {issue['details']}")
        
        if not critical_issues and not high_issues:
            logging.info("✓ No critical or high priority data quality issues found!")
        
        # Fail the task if there are critical issues
        if critical_issues:
            raise Exception(f"Critical data quality issues found: {len(critical_issues)} issues")
        
        return {
            'quality_score': quality_score,
            'total_checks': total_checks,
            'passed_checks': passed_checks,
            'failed_checks': failed_checks,
            'warning_checks': warning_checks,
            'critical_issues': critical_issues,
            'high_issues': high_issues,
            'medium_issues': medium_issues,
            'all_checks': all_checks
        }
        
    except Exception as e:
        logging.error(f"Data quality report generation failed: {e}")
        raise

# Define tasks
validate_process_data = PythonOperator(
    task_id='validate_process_metrics_data',
    python_callable=validate_process_metrics_data,
    dag=dag,
)

validate_hardware = PythonOperator(
    task_id='validate_hardware_data',
    python_callable=validate_hardware_data,
    dag=dag,
)

validate_cost_models = PythonOperator(
    task_id='validate_cost_models_data',
    python_callable=validate_cost_models_data,
    dag=dag,
)

detect_anomalies = PythonOperator(
    task_id='detect_data_anomalies',
    python_callable=detect_data_anomalies,
    dag=dag,
)

quality_report = PythonOperator(
    task_id='generate_data_quality_report',
    python_callable=generate_data_quality_report,
    dag=dag,
)

# Define task dependencies
[validate_process_data, validate_hardware, validate_cost_models, detect_anomalies] >> quality_report