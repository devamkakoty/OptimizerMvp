"""
GreenMatrix API Health Monitoring DAG

This DAG monitors the health and performance of all GreenMatrix API endpoints
including response times, error rates, and functionality tests.
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.email import EmailOperator
import requests
import time
import logging
import json

# DAG default arguments
default_args = {
    'owner': 'greenmatrix-admin',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=3),
    'email': ['admin@greenmatrix.com']
}

# Create DAG
dag = DAG(
    'greenmatrix_api_health_monitoring',
    default_args=default_args,
    description='Monitor GreenMatrix API health and performance',
    schedule_interval=timedelta(minutes=10),  # Check every 10 minutes
    catchup=False,
    tags=['greenmatrix', 'monitoring', 'api']
)

# API Configuration
API_BASE_URL = "http://localhost:8000"
API_TIMEOUT = 30  # seconds

# Define API endpoints to monitor
API_ENDPOINTS = [
    {
        'name': 'Health Check',
        'url': '/health',
        'method': 'GET',
        'expected_status': 200,
        'critical': True,
        'timeout': 5
    },
    {
        'name': 'Host Process Metrics',
        'url': '/api/host-process-metrics',
        'method': 'GET',
        'expected_status': 200,
        'critical': True,
        'timeout': 15
    },
    {
        'name': 'Cost Models',
        'url': '/api/cost-models',
        'method': 'GET',
        'expected_status': 200,
        'critical': False,
        'timeout': 10
    },
    {
        'name': 'Process Summary',
        'url': '/api/costs/process-summary',
        'method': 'GET',
        'expected_status': 200,
        'critical': False,
        'timeout': 20
    },
    {
        'name': 'Top Energy Processes',
        'url': '/api/recommendations/top-energy-processes',
        'method': 'GET',
        'expected_status': 200,
        'critical': False,
        'timeout': 15
    },
    {
        'name': 'Cross Region Recommendations',
        'url': '/api/recommendations/cross-region',
        'method': 'GET',
        'expected_status': 200,
        'critical': False,
        'timeout': 25
    },
    {
        'name': 'Model Inference',
        'url': '/api/model/inference',
        'method': 'GET',
        'expected_status': 200,
        'critical': False,
        'timeout': 30
    },
    # New Dashboard Optimization Endpoints
    {
        'name': 'Dashboard Top Processes',
        'url': '/api/dashboard/top-processes',
        'method': 'GET',
        'expected_status': 200,
        'critical': True,
        'timeout': 10,
        'params': {'metric': 'cpu', 'limit': 5}
    },
    {
        'name': 'Dashboard Performance Summary',
        'url': '/api/dashboard/performance-summary',
        'method': 'GET',
        'expected_status': 200,
        'critical': True,
        'timeout': 15
    },
    {
        'name': 'Dashboard System Overview',
        'url': '/api/dashboard/system-overview',
        'method': 'GET',
        'expected_status': 200,
        'critical': True,
        'timeout': 20
    },
    {
        'name': 'Dashboard Chart Data',
        'url': '/api/dashboard/chart-data',
        'method': 'GET',
        'expected_status': 200,
        'critical': False,
        'timeout': 12,
        'params': {'metric': 'cpu', 'limit': 5}
    }
]

def check_api_endpoint(endpoint):
    """Check a single API endpoint"""
    url = f"{API_BASE_URL}{endpoint['url']}"
    
    try:
        start_time = time.time()
        
        # Add query parameters if specified
        params = endpoint.get('params', {})
        
        if endpoint['method'] == 'GET':
            response = requests.get(url, params=params, timeout=endpoint.get('timeout', API_TIMEOUT))
        elif endpoint['method'] == 'POST':
            response = requests.post(url, params=params, timeout=endpoint.get('timeout', API_TIMEOUT))
        else:
            raise Exception(f"Unsupported HTTP method: {endpoint['method']}")
        
        response_time = time.time() - start_time
        
        # Check response status
        if response.status_code != endpoint['expected_status']:
            raise Exception(f"Unexpected status code: {response.status_code}, expected: {endpoint['expected_status']}")
        
        # Try to parse JSON response
        try:
            response_data = response.json()
            has_valid_json = True
        except:
            response_data = response.text
            has_valid_json = False
        
        result = {
            'name': endpoint['name'],
            'url': endpoint['url'],
            'status': 'success',
            'status_code': response.status_code,
            'response_time': round(response_time, 3),
            'has_valid_json': has_valid_json,
            'response_size': len(response.content),
            'critical': endpoint.get('critical', False),
            'error': None
        }
        
        # Log results
        logging.info(f"✓ {endpoint['name']}: {response.status_code} ({response_time:.3f}s)")
        
        # Check for slow response times
        if response_time > endpoint.get('timeout', API_TIMEOUT) * 0.8:
            logging.warning(f"⚠ {endpoint['name']}: Slow response ({response_time:.3f}s)")
        
        return result
        
    except requests.exceptions.Timeout:
        error_msg = f"Request timeout after {endpoint.get('timeout', API_TIMEOUT)}s"
        logging.error(f"✗ {endpoint['name']}: {error_msg}")
        return {
            'name': endpoint['name'],
            'url': endpoint['url'],
            'status': 'timeout',
            'status_code': None,
            'response_time': endpoint.get('timeout', API_TIMEOUT),
            'has_valid_json': False,
            'response_size': 0,
            'critical': endpoint.get('critical', False),
            'error': error_msg
        }
        
    except requests.exceptions.ConnectionError:
        error_msg = "Connection failed - API server may be down"
        logging.error(f"✗ {endpoint['name']}: {error_msg}")
        return {
            'name': endpoint['name'],
            'url': endpoint['url'],
            'status': 'connection_error',
            'status_code': None,
            'response_time': None,
            'has_valid_json': False,
            'response_size': 0,
            'critical': endpoint.get('critical', False),
            'error': error_msg
        }
        
    except Exception as e:
        error_msg = str(e)
        logging.error(f"✗ {endpoint['name']}: {error_msg}")
        return {
            'name': endpoint['name'],
            'url': endpoint['url'],
            'status': 'error',
            'status_code': getattr(response, 'status_code', None) if 'response' in locals() else None,
            'response_time': None,
            'has_valid_json': False,
            'response_size': 0,
            'critical': endpoint.get('critical', False),
            'error': error_msg
        }

def check_all_api_endpoints():
    """Check all API endpoints and return comprehensive results"""
    results = []
    
    for endpoint in API_ENDPOINTS:
        result = check_api_endpoint(endpoint)
        results.append(result)
    
    # Analyze results
    total_endpoints = len(results)
    successful_endpoints = len([r for r in results if r['status'] == 'success'])
    failed_endpoints = len([r for r in results if r['status'] != 'success'])
    critical_failures = len([r for r in results if r['status'] != 'success' and r['critical']])
    
    # Calculate average response time for successful requests
    successful_times = [r['response_time'] for r in results if r['response_time'] is not None]
    avg_response_time = sum(successful_times) / len(successful_times) if successful_times else 0
    
    summary = {
        'total_endpoints': total_endpoints,
        'successful_endpoints': successful_endpoints,
        'failed_endpoints': failed_endpoints,
        'critical_failures': critical_failures,
        'success_rate': round((successful_endpoints / total_endpoints) * 100, 2),
        'avg_response_time': round(avg_response_time, 3),
        'results': results
    }
    
    logging.info(f"API Health Summary: {successful_endpoints}/{total_endpoints} endpoints healthy ({summary['success_rate']}%)")
    logging.info(f"Average response time: {avg_response_time:.3f}s")
    
    if critical_failures > 0:
        critical_failed_names = [r['name'] for r in results if r['status'] != 'success' and r['critical']]
        raise Exception(f"Critical API failures detected: {', '.join(critical_failed_names)}")
    
    if failed_endpoints > 0:
        failed_names = [r['name'] for r in results if r['status'] != 'success']
        logging.warning(f"Non-critical API failures: {', '.join(failed_names)}")
    
    return summary

def test_api_functionality():
    """Perform functional tests on API endpoints"""
    functional_tests = []
    
    # Test 1: Verify host process metrics returns data
    try:
        url = f"{API_BASE_URL}/api/host-process-metrics?limit=1"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('data'):
                functional_tests.append({
                    'test': 'Host Process Metrics Data',
                    'status': 'passed',
                    'details': f"Returned {len(data['data'])} records"
                })
            else:
                functional_tests.append({
                    'test': 'Host Process Metrics Data',
                    'status': 'failed',
                    'details': 'No data returned in response'
                })
        else:
            functional_tests.append({
                'test': 'Host Process Metrics Data',
                'status': 'failed',
                'details': f'HTTP {response.status_code}'
            })
    except Exception as e:
        functional_tests.append({
            'test': 'Host Process Metrics Data',
            'status': 'error',
            'details': str(e)
        })
    
    # Test 2: Verify cost models endpoint
    try:
        url = f"{API_BASE_URL}/api/cost-models"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('cost_models'):
                functional_tests.append({
                    'test': 'Cost Models Data',
                    'status': 'passed',
                    'details': f"Returned {len(data['cost_models'])} cost models"
                })
            else:
                functional_tests.append({
                    'test': 'Cost Models Data',
                    'status': 'failed',
                    'details': 'No cost models returned'
                })
        else:
            functional_tests.append({
                'test': 'Cost Models Data',
                'status': 'failed',
                'details': f'HTTP {response.status_code}'
            })
    except Exception as e:
        functional_tests.append({
            'test': 'Cost Models Data',
            'status': 'error',
            'details': str(e)
        })
    
    # Test 3: Test API response structure
    try:
        url = f"{API_BASE_URL}/health"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            # Should return some health status
            functional_tests.append({
                'test': 'Health Endpoint Structure',
                'status': 'passed',
                'details': 'Health endpoint responding correctly'
            })
        else:
            functional_tests.append({
                'test': 'Health Endpoint Structure',
                'status': 'failed',
                'details': f'HTTP {response.status_code}'
            })
    except Exception as e:
        functional_tests.append({
            'test': 'Health Endpoint Structure',
            'status': 'error',
            'details': str(e)
        })
    
    # Log test results
    passed_tests = len([t for t in functional_tests if t['status'] == 'passed'])
    total_tests = len(functional_tests)
    
    logging.info(f"Functional Tests: {passed_tests}/{total_tests} passed")
    
    for test in functional_tests:
        status_symbol = "✓" if test['status'] == 'passed' else "✗"
        logging.info(f"{status_symbol} {test['test']}: {test['details']}")
    
    # Fail if critical functional tests failed
    failed_tests = [t for t in functional_tests if t['status'] in ['failed', 'error']]
    if failed_tests:
        failed_names = [t['test'] for t in failed_tests]
        logging.warning(f"Some functional tests failed: {', '.join(failed_names)}")
    
    return functional_tests

def check_api_rate_limits():
    """Test API rate limiting behavior"""
    rate_limit_tests = []
    
    # Test rapid requests to health endpoint
    try:
        url = f"{API_BASE_URL}/health"
        request_count = 20
        start_time = time.time()
        
        responses = []
        for i in range(request_count):
            response = requests.get(url, timeout=5)
            responses.append(response.status_code)
        
        total_time = time.time() - start_time
        requests_per_second = request_count / total_time
        
        # Check if any requests were rate limited (429 status)
        rate_limited = len([r for r in responses if r == 429])
        
        rate_limit_tests.append({
            'test': 'Rate Limit Behavior',
            'requests_sent': request_count,
            'rate_limited': rate_limited,
            'requests_per_second': round(requests_per_second, 2),
            'total_time': round(total_time, 2)
        })
        
        logging.info(f"Rate limit test: {request_count} requests in {total_time:.2f}s ({requests_per_second:.2f} req/s)")
        if rate_limited > 0:
            logging.info(f"Rate limiting working: {rate_limited} requests limited")
        
    except Exception as e:
        logging.error(f"Rate limit test failed: {e}")
    
    return rate_limit_tests

def generate_api_health_report():
    """Generate comprehensive API health report"""
    logging.info("=== API HEALTH REPORT ===")
    
    try:
        # Run all checks
        endpoint_results = check_all_api_endpoints()
        functional_results = test_api_functionality()
        rate_limit_results = check_api_rate_limits()
        
        # Calculate overall API health score
        health_score = 100
        issues = []
        
        # Deduct points for endpoint failures
        if endpoint_results['critical_failures'] > 0:
            health_score -= (endpoint_results['critical_failures'] * 40)
            issues.append(f"{endpoint_results['critical_failures']} critical endpoint failure(s)")
        
        if endpoint_results['failed_endpoints'] > endpoint_results['critical_failures']:
            non_critical_failures = endpoint_results['failed_endpoints'] - endpoint_results['critical_failures']
            health_score -= (non_critical_failures * 15)
            issues.append(f"{non_critical_failures} non-critical endpoint failure(s)")
        
        # Deduct points for slow response times
        if endpoint_results['avg_response_time'] > 5:
            health_score -= 20
            issues.append("Slow API response times")
        elif endpoint_results['avg_response_time'] > 2:
            health_score -= 10
            issues.append("Moderate API response times")
        
        # Deduct points for functional test failures
        failed_functional = len([t for t in functional_results if t['status'] != 'passed'])
        if failed_functional > 0:
            health_score -= (failed_functional * 20)
            issues.append(f"{failed_functional} functional test failure(s)")
        
        health_score = max(0, health_score)
        
        logging.info(f"Overall API Health Score: {health_score}/100")
        logging.info(f"Success Rate: {endpoint_results['success_rate']}%")
        logging.info(f"Average Response Time: {endpoint_results['avg_response_time']}s")
        
        if issues:
            logging.warning(f"Issues: {'; '.join(issues)}")
        else:
            logging.info("✓ All API health checks passed!")
        
        return {
            'health_score': health_score,
            'endpoints': endpoint_results,
            'functional_tests': functional_results,
            'rate_limit_tests': rate_limit_results,
            'issues': issues
        }
        
    except Exception as e:
        logging.error(f"API health report generation failed: {e}")
        raise

# Define tasks
check_endpoints = PythonOperator(
    task_id='check_all_api_endpoints',
    python_callable=check_all_api_endpoints,
    dag=dag,
)

test_functionality = PythonOperator(
    task_id='test_api_functionality',
    python_callable=test_api_functionality,
    dag=dag,
)

check_rate_limits = PythonOperator(
    task_id='check_api_rate_limits',
    python_callable=check_api_rate_limits,
    dag=dag,
)

api_health_report = PythonOperator(
    task_id='generate_api_health_report',
    python_callable=generate_api_health_report,
    dag=dag,
)

# Define task dependencies
[check_endpoints, test_functionality, check_rate_limits] >> api_health_report