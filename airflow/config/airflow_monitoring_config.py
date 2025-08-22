"""
Airflow Monitoring Dashboard Configuration
=========================================

This module provides configuration for Airflow monitoring dashboards,
custom views, and alerting mechanisms for the GreenMatrix system.
"""

from airflow.plugins_manager import AirflowPlugin
from airflow.www.views import BaseView
from airflow.www import auth
from flask import Blueprint, request, render_template_string, jsonify
from flask_admin import expose
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

# Dashboard HTML template
DASHBOARD_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>GreenMatrix Monitoring Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.9.4/css/bulma.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .dashboard-container { padding: 20px; }
        .metric-card { margin-bottom: 20px; }
        .status-healthy { color: #23d160; }
        .status-warning { color: #ffdd57; }
        .status-critical { color: #ff3860; }
        .metric-value { font-size: 2rem; font-weight: bold; }
        .chart-container { height: 300px; }
        .refresh-timer { position: fixed; top: 10px; right: 10px; }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <div class="refresh-timer">
            <div class="notification is-info is-small">
                Auto-refresh: <span id="countdown">60</span>s
            </div>
        </div>
        
        <h1 class="title">GreenMatrix Monitoring Dashboard</h1>
        
        <!-- System Status Overview -->
        <div class="columns">
            <div class="column is-one-quarter">
                <div class="card metric-card">
                    <div class="card-content">
                        <h3 class="subtitle">System Status</h3>
                        <div class="metric-value" id="system-status">Loading...</div>
                        <p class="has-text-grey">Overall health</p>
                    </div>
                </div>
            </div>
            <div class="column is-one-quarter">
                <div class="card metric-card">
                    <div class="card-content">
                        <h3 class="subtitle">Active VMs</h3>
                        <div class="metric-value" id="active-vms">-</div>
                        <p class="has-text-grey">Connected agents</p>
                    </div>
                </div>
            </div>
            <div class="column is-one-quarter">
                <div class="card metric-card">
                    <div class="card-content">
                        <h3 class="subtitle">Alerts</h3>
                        <div class="metric-value" id="alert-count">-</div>
                        <p class="has-text-grey">Active alerts</p>
                    </div>
                </div>
            </div>
            <div class="column is-one-quarter">
                <div class="card metric-card">
                    <div class="card-content">
                        <h3 class="subtitle">Data Points</h3>
                        <div class="metric-value" id="data-points">-</div>
                        <p class="has-text-grey">Last 24h</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Service Health -->
        <div class="card metric-card">
            <div class="card-content">
                <h3 class="subtitle">Service Health</h3>
                <div class="columns" id="service-health">
                    <!-- Populated by JavaScript -->
                </div>
            </div>
        </div>
        
        <!-- Recent DAG Runs -->
        <div class="columns">
            <div class="column is-half">
                <div class="card metric-card">
                    <div class="card-content">
                        <h3 class="subtitle">Recent Monitoring DAG Runs</h3>
                        <div class="table-container">
                            <table class="table is-fullwidth" id="dag-runs-table">
                                <thead>
                                    <tr>
                                        <th>Start Time</th>
                                        <th>Status</th>
                                        <th>Duration</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Populated by JavaScript -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="column is-half">
                <div class="card metric-card">
                    <div class="card-content">
                        <h3 class="subtitle">System Metrics Trend</h3>
                        <div class="chart-container">
                            <canvas id="metrics-chart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- VM Status -->
        <div class="card metric-card">
            <div class="card-content">
                <h3 class="subtitle">VM Status</h3>
                <div class="table-container">
                    <table class="table is-fullwidth" id="vm-status-table">
                        <thead>
                            <tr>
                                <th>VM Name</th>
                                <th>Status</th>
                                <th>CPU Avg</th>
                                <th>Memory Avg</th>
                                <th>Last Seen</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Populated by JavaScript -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- Active Alerts -->
        <div class="card metric-card">
            <div class="card-content">
                <h3 class="subtitle">Active Alerts</h3>
                <div id="alerts-container">
                    <!-- Populated by JavaScript -->
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Dashboard configuration
        const REFRESH_INTERVAL = 60000; // 1 minute
        let countdownTimer = 60;
        let metricsChart;
        
        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            loadDashboardData();
            initializeChart();
            startRefreshTimer();
        });
        
        // Load dashboard data
        async function loadDashboardData() {
            try {
                const response = await fetch('/admin/greenmatrix_monitoring/api/dashboard_data');
                const data = await response.json();
                
                updateSystemStatus(data.system_status);
                updateServiceHealth(data.service_health);
                updateVMStatus(data.vm_status);
                updateDagRuns(data.dag_runs);
                updateAlerts(data.alerts);
                updateMetricsChart(data.metrics_trend);
                
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            }
        }
        
        // Update system status
        function updateSystemStatus(status) {
            document.getElementById('system-status').textContent = status.overall_status;
            document.getElementById('system-status').className = 'metric-value status-' + status.overall_status.toLowerCase();
            document.getElementById('active-vms').textContent = status.active_vms;
            document.getElementById('alert-count').textContent = status.alert_count;
            document.getElementById('data-points').textContent = status.data_points;
        }
        
        // Update service health
        function updateServiceHealth(services) {
            const container = document.getElementById('service-health');
            container.innerHTML = '';
            
            services.forEach(service => {
                const statusClass = service.healthy ? 'status-healthy' : 'status-critical';
                const icon = service.healthy ? '✓' : '✗';
                
                container.innerHTML += `
                    <div class="column">
                        <div class="has-text-centered">
                            <span class="${statusClass}" style="font-size: 1.5rem;">${icon}</span>
                            <p>${service.name}</p>
                        </div>
                    </div>
                `;
            });
        }
        
        // Update VM status
        function updateVMStatus(vms) {
            const tbody = document.querySelector('#vm-status-table tbody');
            tbody.innerHTML = '';
            
            vms.forEach(vm => {
                const statusClass = vm.status === 'HEALTHY' ? 'status-healthy' : 
                                  vm.status === 'WARNING' ? 'status-warning' : 'status-critical';
                
                tbody.innerHTML += `
                    <tr>
                        <td>${vm.vm_name}</td>
                        <td><span class="${statusClass}">${vm.status}</span></td>
                        <td>${vm.avg_cpu}%</td>
                        <td>${vm.avg_memory}%</td>
                        <td>${new Date(vm.last_seen).toLocaleString()}</td>
                        <td>
                            <a href="/admin/greenmatrix_monitoring/vm_details?vm_name=${vm.vm_name}" class="button is-small">View</a>
                        </td>
                    </tr>
                `;
            });
        }
        
        // Update DAG runs
        function updateDagRuns(dagRuns) {
            const tbody = document.querySelector('#dag-runs-table tbody');
            tbody.innerHTML = '';
            
            dagRuns.forEach(run => {
                const statusClass = run.state === 'success' ? 'tag is-success' :
                                  run.state === 'failed' ? 'tag is-danger' :
                                  run.state === 'running' ? 'tag is-info' : 'tag is-warning';
                
                tbody.innerHTML += `
                    <tr>
                        <td>${new Date(run.start_date).toLocaleString()}</td>
                        <td><span class="${statusClass}">${run.state}</span></td>
                        <td>${run.duration || 'N/A'}</td>
                        <td>
                            <a href="/graph?dag_id=${run.dag_id}&execution_date=${run.execution_date}" class="button is-small">View</a>
                        </td>
                    </tr>
                `;
            });
        }
        
        // Update alerts
        function updateAlerts(alerts) {
            const container = document.getElementById('alerts-container');
            container.innerHTML = '';
            
            if (alerts.length === 0) {
                container.innerHTML = '<div class="notification is-success">No active alerts</div>';
                return;
            }
            
            alerts.forEach(alert => {
                const alertClass = alert.severity === 'critical' ? 'is-danger' :
                                 alert.severity === 'warning' ? 'is-warning' : 'is-info';
                
                container.innerHTML += `
                    <div class="notification ${alertClass}">
                        <strong>${alert.title}</strong><br>
                        ${alert.message}<br>
                        <small>${new Date(alert.timestamp).toLocaleString()}</small>
                    </div>
                `;
            });
        }
        
        // Initialize metrics chart
        function initializeChart() {
            const ctx = document.getElementById('metrics-chart').getContext('2d');
            metricsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'CPU Usage %',
                            borderColor: 'rgb(255, 99, 132)',
                            backgroundColor: 'rgba(255, 99, 132, 0.1)',
                            data: []
                        },
                        {
                            label: 'Memory Usage %',
                            borderColor: 'rgb(54, 162, 235)',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            data: []
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
        
        // Update metrics chart
        function updateMetricsChart(data) {
            if (metricsChart && data) {
                metricsChart.data.labels = data.labels;
                metricsChart.data.datasets[0].data = data.cpu_data;
                metricsChart.data.datasets[1].data = data.memory_data;
                metricsChart.update();
            }
        }
        
        // Start refresh timer
        function startRefreshTimer() {
            setInterval(() => {
                countdownTimer--;
                document.getElementById('countdown').textContent = countdownTimer;
                
                if (countdownTimer <= 0) {
                    countdownTimer = 60;
                    loadDashboardData();
                }
            }, 1000);
        }
    </script>
</body>
</html>
"""

class GreenMatrixMonitoringView(BaseView):
    """Custom Airflow view for GreenMatrix monitoring dashboard"""
    
    route_base = '/admin/greenmatrix_monitoring'
    
    @expose('/')
    @auth.has_access(
        [("can_read", "Website")],
    )
    def dashboard(self):
        """Main monitoring dashboard"""
        return render_template_string(DASHBOARD_TEMPLATE)
    
    @expose('/api/dashboard_data')
    @auth.has_access(
        [("can_read", "Website")],
    )
    def dashboard_data(self):
        """API endpoint for dashboard data"""
        try:
            from airflow import DAG
            from airflow.models import DagRun, TaskInstance
            from airflow.utils.session import provide_session
            from airflow.hooks.postgres_hook import PostgresHook
            import requests
            
            # Get system status
            system_status = self._get_system_status()
            
            # Get service health
            service_health = self._get_service_health()
            
            # Get VM status
            vm_status = self._get_vm_status()
            
            # Get recent DAG runs
            dag_runs = self._get_recent_dag_runs()
            
            # Get alerts
            alerts = self._get_active_alerts()
            
            # Get metrics trend
            metrics_trend = self._get_metrics_trend()
            
            return jsonify({
                'system_status': system_status,
                'service_health': service_health,
                'vm_status': vm_status,
                'dag_runs': dag_runs,
                'alerts': alerts,
                'metrics_trend': metrics_trend
            })
            
        except Exception as e:
            logger.error(f"Error getting dashboard data: {e}")
            return jsonify({'error': str(e)}), 500
    
    @expose('/vm_details')
    @auth.has_access(
        [("can_read", "Website")],
    )
    def vm_details(self):
        """Detailed VM information page"""
        vm_name = request.args.get('vm_name')
        if not vm_name:
            return "VM name required", 400
        
        # Get detailed VM info
        vm_info = self._get_vm_details(vm_name)
        
        # Simple HTML template for VM details
        template = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>VM Details: {{ vm_name }}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.9.4/css/bulma.min.css">
        </head>
        <body>
            <div class="container" style="padding: 20px;">
                <h1 class="title">VM Details: {{ vm_name }}</h1>
                <div class="content">
                    <pre>{{ vm_info | tojson(indent=2) }}</pre>
                </div>
                <a href="{{ url_for('GreenMatrixMonitoringView.dashboard') }}" class="button">Back to Dashboard</a>
            </div>
        </body>
        </html>
        """
        
        return render_template_string(template, vm_name=vm_name, vm_info=vm_info)
    
    def _get_system_status(self) -> Dict[str, Any]:
        """Get overall system status"""
        try:
            # Try to get status from backend API
            backend_url = "http://backend:8000"
            response = requests.get(f"{backend_url}/health", timeout=5)
            
            if response.status_code == 200:
                health_data = response.json()
                status = health_data.get('status', 'unknown')
                
                # Get VM count
                vm_response = requests.get(f"{backend_url}/api/v1/metrics/vms/active", timeout=5)
                active_vms = 0
                if vm_response.status_code == 200:
                    vm_data = vm_response.json()
                    active_vms = vm_data.get('count', 0)
                
                return {
                    'overall_status': status.upper(),
                    'active_vms': active_vms,
                    'alert_count': 0,  # TODO: Get from alerts system
                    'data_points': 1000  # TODO: Get actual count
                }
            else:
                return {
                    'overall_status': 'CRITICAL',
                    'active_vms': 0,
                    'alert_count': 1,
                    'data_points': 0
                }
                
        except Exception as e:
            logger.error(f"Error getting system status: {e}")
            return {
                'overall_status': 'UNKNOWN',
                'active_vms': 0,
                'alert_count': 1,
                'data_points': 0
            }
    
    def _get_service_health(self) -> List[Dict[str, Any]]:
        """Get health status of all services"""
        services = [
            {'name': 'Backend', 'url': 'http://backend:8000/health'},
            {'name': 'Frontend', 'url': 'http://frontend:3000'},
            {'name': 'PostgreSQL', 'check': self._check_postgres},
            {'name': 'TimescaleDB', 'check': self._check_timescaledb},
            {'name': 'Redis', 'url': 'http://redis:6379'}
        ]
        
        health_status = []
        
        for service in services:
            try:
                if 'url' in service:
                    response = requests.get(service['url'], timeout=5)
                    healthy = response.status_code == 200
                elif 'check' in service:
                    healthy = service['check']()
                else:
                    healthy = False
                
                health_status.append({
                    'name': service['name'],
                    'healthy': healthy
                })
                
            except Exception:
                health_status.append({
                    'name': service['name'],
                    'healthy': False
                })
        
        return health_status
    
    def _check_postgres(self) -> bool:
        """Check PostgreSQL connectivity"""
        try:
            postgres_hook = PostgresHook(postgres_conn_id='greenmatrix_db')
            postgres_hook.get_first("SELECT 1")
            return True
        except Exception:
            return False
    
    def _check_timescaledb(self) -> bool:
        """Check TimescaleDB connectivity"""
        try:
            timescale_hook = PostgresHook(postgres_conn_id='timescaledb')
            timescale_hook.get_first("SELECT 1")
            return True
        except Exception:
            return False
    
    def _get_vm_status(self) -> List[Dict[str, Any]]:
        """Get status of all VMs"""
        try:
            backend_url = "http://backend:8000"
            response = requests.get(f"{backend_url}/api/v1/metrics/vms/active", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                vms = data.get('active_vms', [])
                
                # Enhance with health status
                for vm in vms:
                    health_response = requests.get(
                        f"{backend_url}/api/v1/metrics/vm/{vm['vm_name']}/health", 
                        timeout=5
                    )
                    if health_response.status_code == 200:
                        health_data = health_response.json()
                        vm.update(health_data)
                
                return vms
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting VM status: {e}")
            return []
    
    def _get_recent_dag_runs(self) -> List[Dict[str, Any]]:
        """Get recent DAG runs for monitoring DAGs"""
        try:
            from airflow.models import DagRun
            from airflow.utils.db import provide_session
            
            @provide_session
            def get_runs(session=None):
                runs = session.query(DagRun).filter(
                    DagRun.dag_id.in_(['greenmatrix_system_monitoring', 'greenmatrix_performance_analytics'])
                ).order_by(DagRun.start_date.desc()).limit(10).all()
                
                return [{
                    'dag_id': run.dag_id,
                    'execution_date': run.execution_date.isoformat(),
                    'start_date': run.start_date.isoformat() if run.start_date else None,
                    'end_date': run.end_date.isoformat() if run.end_date else None,
                    'state': run.state,
                    'duration': str(run.end_date - run.start_date) if run.end_date and run.start_date else None
                } for run in runs]
            
            return get_runs()
            
        except Exception as e:
            logger.error(f"Error getting DAG runs: {e}")
            return []
    
    def _get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get active alerts"""
        # TODO: Implement alerts system
        # For now, return sample alerts
        return [
            {
                'title': 'High CPU Usage',
                'message': 'VM web-server-01 has high CPU usage (92%)',
                'severity': 'warning',
                'timestamp': datetime.now().isoformat()
            }
        ]
    
    def _get_metrics_trend(self) -> Dict[str, Any]:
        """Get metrics trend data for charts"""
        try:
            # Get sample trend data
            # TODO: Implement actual metrics aggregation
            now = datetime.now()
            labels = [(now - timedelta(hours=i)).strftime('%H:%M') for i in range(24, 0, -1)]
            
            return {
                'labels': labels,
                'cpu_data': [30 + i % 20 for i in range(24)],  # Sample data
                'memory_data': [45 + i % 15 for i in range(24)]  # Sample data
            }
            
        except Exception as e:
            logger.error(f"Error getting metrics trend: {e}")
            return {'labels': [], 'cpu_data': [], 'memory_data': []}
    
    def _get_vm_details(self, vm_name: str) -> Dict[str, Any]:
        """Get detailed information for a specific VM"""
        try:
            backend_url = "http://backend:8000"
            
            # Get VM summary
            summary_response = requests.get(
                f"{backend_url}/api/v1/metrics/vm/{vm_name}/summary?hours=24",
                timeout=10
            )
            
            # Get VM processes
            processes_response = requests.get(
                f"{backend_url}/api/v1/metrics/vm/{vm_name}/processes?limit=100",
                timeout=10
            )
            
            vm_details = {
                'vm_name': vm_name,
                'summary': summary_response.json() if summary_response.status_code == 200 else {},
                'recent_processes': processes_response.json() if processes_response.status_code == 200 else {}
            }
            
            return vm_details
            
        except Exception as e:
            logger.error(f"Error getting VM details for {vm_name}: {e}")
            return {'vm_name': vm_name, 'error': str(e)}

# Blueprint for additional routes
greenmatrix_blueprint = Blueprint(
    "greenmatrix_monitoring",
    __name__,
    template_folder="templates",
    static_folder="static"
)

class GreenMatrixMonitoringPlugin(AirflowPlugin):
    """Airflow plugin for GreenMatrix monitoring"""
    
    name = "greenmatrix_monitoring"
    admin_views = [GreenMatrixMonitoringView(category="GreenMatrix", name="Monitoring Dashboard")]
    flask_blueprints = [greenmatrix_blueprint]