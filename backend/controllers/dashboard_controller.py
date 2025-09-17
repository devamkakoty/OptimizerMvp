from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func, or_
from app.models.host_process_metrics import HostProcessMetric
from app.models.host_overall_metrics import HostOverallMetric
from app.models.vm_process_metrics import VMProcessMetric
from app.models.hardware_specs import HardwareSpecs
from datetime import datetime, timedelta
from .time_filter_utils import TimeFilterUtils
from .cost_calculation_engine import CostCalculationEngine
import json

class DashboardController:
    """Controller for dashboard aggregated data and statistics"""
    
    def get_top_processes(
        self, 
        db: Session, 
        metric: str = 'cpu',
        limit: int = 5,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        region: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get top N processes by specified metric (cpu, memory, gpu, power)"""
        try:
            # Build time filter
            time_filter = TimeFilterUtils.build_time_filter(
                HostProcessMetric.timestamp, 
                start_date, 
                end_date
            )
            
            # Build order by clause based on metric
            if metric == 'cpu':
                order_column = desc(HostProcessMetric.cpu_usage_percent)
            elif metric == 'memory':
                order_column = desc(HostProcessMetric.memory_usage_mb)
            elif metric == 'gpu':
                order_column = desc(HostProcessMetric.gpu_utilization_percent)
            elif metric == 'power':
                order_column = desc(HostProcessMetric.estimated_power_watts)
            else:
                order_column = desc(HostProcessMetric.cpu_usage_percent)
            
            # Get the absolute latest timestamp across all processes
            latest_timestamp = db.query(
                func.max(HostProcessMetric.timestamp)
            ).filter(time_filter).scalar()
            
            if not latest_timestamp:
                return {
                    "success": True,
                    "data": [],
                    "metric": metric,
                    "limit": limit,
                    "count": 0,
                    "message": "No process data available"
                }
            
            # Get all processes from the absolute latest timestamp only
            query = db.query(HostProcessMetric).filter(
                and_(
                    time_filter,
                    HostProcessMetric.timestamp == latest_timestamp
                )
            ).order_by(order_column).limit(limit)
            
            processes = query.all()
            
            # Initialize cost calculation engine
            cost_engine = CostCalculationEngine()
            electricity_cost_per_kwh = cost_engine.get_electricity_cost(db, region)
            
            # Transform to frontend format
            result_data = []
            for process in processes:
                power_watts = process.estimated_power_watts or 0
                # Convert watts to kWh (watts / 1000 / hours) and calculate cost
                energy_cost = (power_watts / 1000.0) * electricity_cost_per_kwh
                
                result_data.append({
                    'Process ID': process.process_id,
                    'Process Name': process.process_name,
                    'Username': process.username,
                    'CPU Usage (%)': process.cpu_usage_percent or 0,
                    'Memory Usage (MB)': process.memory_usage_mb or 0,
                    'Memory Usage (%)': process.memory_usage_percent or 0,
                    'Read Bytes': process.read_bytes or 0,
                    'Write Bytes': process.write_bytes or 0,
                    'IOPS': process.iops or 0,
                    'GPU Memory Usage (MB)': process.gpu_memory_usage_mb or 0,
                    'GPU Utilization (%)': process.gpu_utilization_percent or 0,
                    'Open Files': process.open_files or 0,
                    'Status': process.status or 'Running',
                    'Power Consumption (W)': power_watts,
                    'Energy Cost ($)': energy_cost
                })
            
            return {
                "success": True,
                "data": result_data,
                "metric": metric,
                "limit": limit,
                "count": len(result_data),
                "latest_timestamp": latest_timestamp.isoformat() if latest_timestamp else None,
                "start_date": start_date,
                "end_date": end_date
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get top processes: {str(e)}"
            }
    
    def get_performance_summary(
        self,
        db: Session,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get performance metrics summary with aggregated statistics"""
        try:
            # Build time filter for host metrics
            time_filter = TimeFilterUtils.build_time_filter(
                HostOverallMetric.timestamp,
                start_date,
                end_date
            )
            
            # Get latest host metrics
            latest_host_metrics = db.query(HostOverallMetric).filter(
                time_filter
            ).order_by(desc(HostOverallMetric.timestamp)).first()
            
            if not latest_host_metrics:
                return {
                    "success": True,
                    "data": {
                        "host_metrics": None,
                        "process_summary": {
                            "total_processes": 0,
                            "high_cpu_processes": 0,
                            "total_memory_usage_mb": 0,
                            "average_cpu_usage": 0,
                            "total_power_consumption": 0
                        }
                    }
                }
            
            # Build time filter for process metrics
            process_time_filter = TimeFilterUtils.build_time_filter(
                HostProcessMetric.timestamp,
                start_date,
                end_date
            )
            
            # Get process summary statistics
            process_stats = db.query(
                func.count(HostProcessMetric.process_id).label('total_processes'),
                func.sum(func.case([(HostProcessMetric.cpu_usage_percent > 5, 1)], else_=0)).label('high_cpu_processes'),
                func.sum(HostProcessMetric.memory_usage_mb).label('total_memory_usage_mb'),
                func.avg(HostProcessMetric.cpu_usage_percent).label('average_cpu_usage'),
                func.sum(HostProcessMetric.estimated_power_watts).label('total_power_consumption')
            ).filter(process_time_filter).first()
            
            return {
                "success": True,
                "data": {
                    "host_metrics": {
                        "host_cpu_usage_percent": latest_host_metrics.host_cpu_usage_percent or 0,
                        "host_ram_usage_percent": latest_host_metrics.host_ram_usage_percent or 0,
                        "host_gpu_utilization_percent": latest_host_metrics.host_gpu_utilization_percent or 0,
                        "host_network_usage_percent": latest_host_metrics.host_network_usage_percent or 0,
                        "host_disk_usage_percent": latest_host_metrics.host_disk_usage_percent or 0,
                        "timestamp": latest_host_metrics.timestamp.isoformat()
                    },
                    "process_summary": {
                        "total_processes": int(process_stats.total_processes or 0),
                        "high_cpu_processes": int(process_stats.high_cpu_processes or 0),
                        "total_memory_usage_mb": float(process_stats.total_memory_usage_mb or 0),
                        "average_cpu_usage": float(process_stats.average_cpu_usage or 0),
                        "total_power_consumption": float(process_stats.total_power_consumption or 0)
                    }
                },
                "start_date": start_date,
                "end_date": end_date
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get performance summary: {str(e)}"
            }
    
    def get_system_overview(
        self,
        metrics_db: Session,
        greenmatrix_db: Session,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get complete system overview with hardware specs and metrics"""
        try:
            # Get latest hardware specs from greenmatrix database
            hardware_specs = greenmatrix_db.query(HardwareSpecs).order_by(
                desc(HardwareSpecs.timestamp)
            ).first()
            
            # Get performance summary from metrics database
            performance_data = self.get_performance_summary(metrics_db, start_date, end_date)
            
            if not performance_data['success']:
                return performance_data
            
            # Build response
            result = {
                "success": True,
                "data": {
                    "hardware_specs": {
                        "cpu_model": hardware_specs.cpu_model if hardware_specs else None,
                        "cpu_cores": hardware_specs.cpu_cores if hardware_specs else None,
                        "cpu_frequency": hardware_specs.cpu_frequency if hardware_specs else None,
                        "gpu_model": hardware_specs.gpu_model if hardware_specs else None,
                        "total_memory": hardware_specs.total_memory if hardware_specs else None,
                        "storage_capacity": hardware_specs.storage_capacity if hardware_specs else None,
                        "total_memory_gb": hardware_specs.total_ram_gb if hardware_specs else None,
                        "total_storage_gb": hardware_specs.total_storage_gb if hardware_specs else None
                    } if hardware_specs else None,
                    **performance_data['data']
                },
                "start_date": start_date,
                "end_date": end_date
            }
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get system overview: {str(e)}"
            }
    
    def get_chart_data(
        self,
        db: Session,
        metric: str = 'cpu',
        limit: int = 5,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        region: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get pre-processed chart data for frontend visualization"""
        try:
            # Get top processes data
            top_processes_result = self.get_top_processes(db, metric, limit, start_date, end_date, region)
            
            if not top_processes_result['success']:
                return top_processes_result
            
            processes = top_processes_result['data']
            
            # Transform to chart format
            labels = [p['Process Name'] for p in processes]
            
            if metric == 'cpu':
                values = [p['CPU Usage (%)'] for p in processes]
                title = 'CPU Usage by Process (Top 5)'
                color = 'rgba(59, 130, 246, 0.8)'  # blue
            elif metric == 'memory':
                values = [p['Memory Usage (MB)'] for p in processes]
                title = 'Memory Usage by Process (Top 5)'
                color = 'rgba(34, 197, 94, 0.8)'  # green
            elif metric == 'gpu':
                values = [p['GPU Utilization (%)'] for p in processes]
                title = 'GPU Usage by Process (Top 5)'
                color = 'rgba(168, 85, 247, 0.8)'  # purple
            elif metric == 'power':
                values = [p['Power Consumption (W)'] for p in processes]
                title = 'Power Consumption by Process (Top 5)'
                color = 'rgba(239, 68, 68, 0.8)'  # red
            else:
                values = [p['CPU Usage (%)'] for p in processes]
                title = 'CPU Usage by Process (Top 5)'
                color = 'rgba(59, 130, 246, 0.8)'
            
            chart_data = {
                "labels": labels,
                "datasets": [{
                    "label": title,
                    "data": values,
                    "backgroundColor": color,
                    "borderColor": color.replace('0.8', '1'),
                    "borderWidth": 1
                }]
            }
            
            return {
                "success": True,
                "chart_data": chart_data,
                "metric": metric,
                "title": title,
                "start_date": start_date,
                "end_date": end_date
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get chart data: {str(e)}"
            }