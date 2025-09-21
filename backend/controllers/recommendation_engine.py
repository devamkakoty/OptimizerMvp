from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc, text, case
from app.models.cost_models import CostModel
from app.models.host_process_metrics import HostProcessMetric
from app.models.host_overall_metrics import HostOverallMetric
from app.models.hardware_specs import HardwareSpecs
from app.models.vm_process_metrics import VMProcessMetric
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import configparser
import os

class RecommendationEngine:
    """Engine for analyzing workloads and suggesting cost-saving migrations"""
    
    def __init__(self):
        # Load configuration
        config = configparser.ConfigParser()
        # Look for config.ini in the app directory (container working directory)
        config_path = os.path.join('/app', 'config.ini')
        if not os.path.exists(config_path):
            # Fallback to relative path
            script_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
            config_path = os.path.join(script_dir, 'config.ini')
        config.read(config_path)
        settings = config['Settings']
        
        self.default_cost_per_kwh = settings.getfloat('cost_per_kwh', 0.12)
        self.default_currency = settings.get('currency_symbol', '$')
        self.current_region = settings.get('current_region', 'US')
        
        # Minimum savings threshold (in percentage) to trigger a recommendation
        self.min_savings_threshold = 0.15  # 15% savings minimum
    
    def get_all_regions_with_pricing(self, db: Session) -> List[Dict[str, Any]]:
        """Get all regions with their electricity pricing"""
        try:
            regions = db.query(
                CostModel.region,
                CostModel.cost_per_unit,
                CostModel.currency
            ).filter(
                CostModel.resource_name == 'ELECTRICITY_KWH'
            ).all()
            
            region_list = []
            for region in regions:
                region_list.append({
                    'region': region.region,
                    'cost_per_kwh': region.cost_per_unit,
                    'currency': region.currency
                })
            
            # Add current region if not in database
            current_found = any(r['region'] == self.current_region for r in region_list)
            if not current_found:
                region_list.append({
                    'region': self.current_region,
                    'cost_per_kwh': self.default_cost_per_kwh,
                    'currency': self.default_currency
                })
            
            return region_list
            
        except Exception:
            # Return default if error
            return [{
                'region': self.current_region,
                'cost_per_kwh': self.default_cost_per_kwh,
                'currency': self.default_currency
            }]
    
    def analyze_workload_resource_consumption(
        self, 
        db: Session,
        workload_filter: Dict[str, Any] = None,
        time_range_days: int = 7,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze historical resource consumption of a workload"""
        try:
            # Use specific date range if provided, otherwise use time_range_days
            if start_date and end_date:
                start_time = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if 'T' in start_date else datetime.strptime(start_date, '%Y-%m-%d')
                end_time = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if 'T' in end_date else datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
                
                # For current date, limit to current time
                if end_date == datetime.utcnow().strftime('%Y-%m-%d'):
                    end_time = datetime.utcnow()
            else:
                end_time = datetime.utcnow()
                start_time = end_time - timedelta(days=time_range_days)
            
            # Build query based on workload filter
            query = db.query(HostProcessMetric).filter(
                and_(
                    HostProcessMetric.timestamp >= start_time,
                    HostProcessMetric.timestamp <= end_time,
                    HostProcessMetric.estimated_power_watts.isnot(None)
                )
            )
            
            # Apply workload filters
            if workload_filter:
                if workload_filter.get('process_name'):
                    query = query.filter(HostProcessMetric.process_name == workload_filter['process_name'])
                if workload_filter.get('username'):
                    query = query.filter(HostProcessMetric.username == workload_filter['username'])
            
            # Get aggregated metrics
            result = query.with_entities(
                func.avg(HostProcessMetric.estimated_power_watts).label('avg_power_watts'),
                func.max(HostProcessMetric.estimated_power_watts).label('max_power_watts'),
                func.sum(HostProcessMetric.estimated_power_watts).label('total_power_watts'),
                func.count(HostProcessMetric.estimated_power_watts).label('data_points'),
                func.avg(HostProcessMetric.cpu_usage_percent).label('avg_cpu_percent'),
                func.avg(HostProcessMetric.gpu_utilization_percent).label('avg_gpu_percent'),
                func.avg(HostProcessMetric.memory_usage_mb).label('avg_memory_mb')
            ).first()
            
            if not result or result.data_points == 0:
                return {
                    "success": False,
                    "error": "No workload data found for the specified criteria"
                }
            
            # Calculate energy consumption (assuming 1-minute intervals)
            interval_hours = 1 / 60.0
            total_energy_kwh = (result.total_power_watts * interval_hours) / 1000.0
            
            return {
                "success": True,
                "workload_analysis": {
                    "time_range_days": time_range_days,
                    "data_points": result.data_points,
                    "avg_power_watts": round(float(result.avg_power_watts), 2),
                    "max_power_watts": round(float(result.max_power_watts), 2),
                    "total_energy_kwh": round(total_energy_kwh, 4),
                    "avg_cpu_percent": round(float(result.avg_cpu_percent), 2),
                    "avg_gpu_percent": round(float(result.avg_gpu_percent), 2),
                    "avg_memory_mb": round(float(result.avg_memory_mb), 2)
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to analyze workload: {str(e)}"
            }
    
    def simulate_costs_across_regions(
        self,
        db: Session,
        workload_analysis: Dict[str, Any],
        projection_days: int = 30
    ) -> Dict[str, Any]:
        """Simulate the cost of running a workload in different regions"""
        try:
            regions = self.get_all_regions_with_pricing(db)
            
            if not regions:
                return {
                    "success": False,
                    "error": "No region pricing data available"
                }
            
            # Extract workload metrics
            avg_power_watts = workload_analysis['avg_power_watts']
            
            # Calculate daily energy consumption
            daily_energy_kwh = (avg_power_watts * 24) / 1000.0
            projected_energy_kwh = daily_energy_kwh * projection_days
            
            region_costs = []
            min_cost = float('inf')
            max_cost = 0
            current_region_cost = None
            
            for region in regions:
                regional_cost = projected_energy_kwh * region['cost_per_kwh']
                
                region_data = {
                    'region': region['region'],
                    'cost_per_kwh': region['cost_per_kwh'],
                    'currency': region['currency'],
                    'projected_cost': round(regional_cost, 4),
                    'daily_cost': round(regional_cost / projection_days, 4),
                    'is_current': region['region'] == self.current_region
                }
                
                region_costs.append(region_data)
                
                if region['region'] == self.current_region:
                    current_region_cost = regional_cost
                
                min_cost = min(min_cost, regional_cost)
                max_cost = max(max_cost, regional_cost)
            
            # Sort by cost (cheapest first)
            region_costs.sort(key=lambda x: x['projected_cost'])
            
            return {
                "success": True,
                "projection_days": projection_days,
                "projected_energy_kwh": round(projected_energy_kwh, 4),
                "daily_energy_kwh": round(daily_energy_kwh, 4),
                "current_region": self.current_region,
                "current_region_cost": round(current_region_cost, 4) if current_region_cost else None,
                "cheapest_cost": round(min_cost, 4),
                "most_expensive_cost": round(max_cost, 4),
                "region_costs": region_costs
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to simulate cross-region costs: {str(e)}"
            }
    
    def generate_migration_recommendations(
        self,
        db: Session,
        workload_filter: Dict[str, Any] = None,
        time_range_days: int = 7,
        projection_days: int = 30,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate cost-saving migration recommendations"""
        try:
            # Step 1: Analyze current workload
            workload_result = self.analyze_workload_resource_consumption(
                db, workload_filter, time_range_days, start_date, end_date
            )
            
            if not workload_result['success']:
                return workload_result
            
            workload_analysis = workload_result['workload_analysis']
            
            # Step 2: Simulate costs across regions
            cost_result = self.simulate_costs_across_regions(
                db, workload_analysis, projection_days
            )
            
            if not cost_result['success']:
                return cost_result
            
            # Step 3: Generate recommendations
            current_cost = cost_result.get('current_region_cost')
            cheapest_cost = cost_result['cheapest_cost']
            region_costs = cost_result['region_costs']
            
            recommendations = []
            
            if current_cost and cheapest_cost < current_cost:
                potential_savings = current_cost - cheapest_cost
                savings_percentage = (potential_savings / current_cost) * 100
                
                # Only recommend if savings exceed threshold
                if savings_percentage >= (self.min_savings_threshold * 100):
                    cheapest_region = region_costs[0]  # Already sorted by cost
                    
                    recommendations.append({
                        'recommendation_type': 'cost_optimization',
                        'priority': 'high' if savings_percentage >= 30 else 'medium',
                        'target_region': cheapest_region['region'],
                        'current_cost': round(current_cost, 4),
                        'target_cost': round(cheapest_cost, 4),
                        'potential_savings': round(potential_savings, 4),
                        'savings_percentage': round(savings_percentage, 2),
                        'payback_period_days': None,  # Would need migration costs to calculate
                        'description': f"Migrate workload to {cheapest_region['region']} to save {savings_percentage:.1f}% on energy costs",
                        'considerations': [
                            "Network latency impact",
                            "Data transfer costs",
                            "Compliance requirements",
                            "Service availability in target region"
                        ]
                    })
            
            # Additional recommendations for top 3 cheapest regions
            top_regions = region_costs[:3]
            alternative_recommendations = []
            
            for i, region in enumerate(top_regions):
                if region['region'] != self.current_region and not region['is_current']:
                    if current_cost:
                        savings = current_cost - region['projected_cost']
                        savings_pct = (savings / current_cost) * 100
                        
                        if savings > 0:
                            alternative_recommendations.append({
                                'rank': i + 1,
                                'region': region['region'],
                                'cost': region['projected_cost'],
                                'savings': round(savings, 4),
                                'savings_percentage': round(savings_pct, 2)
                            })
            
            return {
                "success": True,
                "analysis_summary": {
                    "workload_filter": workload_filter,
                    "time_range_days": time_range_days,
                    "projection_days": projection_days,
                    "current_region": self.current_region
                },
                "workload_analysis": workload_analysis,
                "cost_analysis": {
                    "current_region_cost": round(current_cost, 4) if current_cost else None,
                    "cheapest_region_cost": round(cheapest_cost, 4),
                    "cost_range": {
                        "min": round(cheapest_cost, 4),
                        "max": round(cost_result['most_expensive_cost'], 4)
                    }
                },
                "recommendations": recommendations,
                "alternative_regions": alternative_recommendations,
                "detailed_regional_costs": region_costs
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to generate recommendations: {str(e)}"
            }
    
    def get_top_energy_consuming_processes(
        self,
        db: Session,
        time_range_days: int = 7,
        limit: int = 10,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get top energy-consuming processes for optimization recommendations"""
        try:
            # Use specific date range if provided, otherwise use time_range_days
            if start_date and end_date:
                start_time = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if 'T' in start_date else datetime.strptime(start_date, '%Y-%m-%d')
                end_time = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if 'T' in end_date else datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
                
                # For current date, limit to current time
                if end_date == datetime.utcnow().strftime('%Y-%m-%d'):
                    end_time = datetime.utcnow()
            else:
                end_time = datetime.utcnow()
                start_time = end_time - timedelta(days=time_range_days)
            
            # Query for top processes by energy consumption
            query = db.query(
                HostProcessMetric.process_name,
                func.sum(HostProcessMetric.estimated_power_watts).label('total_power_watts'),
                func.avg(HostProcessMetric.estimated_power_watts).label('avg_power_watts'),
                func.count(HostProcessMetric.estimated_power_watts).label('data_points')
            ).filter(
                and_(
                    HostProcessMetric.timestamp >= start_time,
                    HostProcessMetric.timestamp <= end_time,
                    HostProcessMetric.estimated_power_watts.isnot(None)
                )
            ).group_by(
                HostProcessMetric.process_name
            ).order_by(
                desc(func.sum(HostProcessMetric.estimated_power_watts))
            ).limit(limit)
            
            results = query.all()
            
            top_processes = []
            interval_hours = 1 / 60.0  # Assume 1-minute intervals
            
            for result in results:
                energy_kwh = (result.total_power_watts * interval_hours) / 1000.0
                
                top_processes.append({
                    'process_name': result.process_name,
                    'total_energy_kwh': round(energy_kwh, 4),
                    'avg_power_watts': round(float(result.avg_power_watts), 2),
                    'data_points': result.data_points,
                    'optimization_potential': 'high' if energy_kwh > 10 else 'medium' if energy_kwh > 1 else 'low'
                })
            
            return {
                "success": True,
                "time_range_days": time_range_days,
                "top_processes": top_processes,
                "total_processes": len(top_processes)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get top energy processes: {str(e)}"
            }

    def analyze_vm_resource_consumption(
        self, 
        db: Session,
        vm_name: str,
        time_range_days: int = 7,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze historical resource consumption of a specific VM"""
        try:
            # Use specific date range if provided, otherwise use time_range_days
            if start_date and end_date:
                start_time = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if 'T' in start_date else datetime.strptime(start_date, '%Y-%m-%d')
                end_time = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if 'T' in end_date else datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
                
                # For current date, limit to current time
                if end_date == datetime.utcnow().strftime('%Y-%m-%d'):
                    end_time = datetime.utcnow()
            else:
                end_time = datetime.utcnow()
                start_time = end_time - timedelta(days=time_range_days)
            
            # Query VM-specific metrics
            query = db.query(VMProcessMetric).filter(
                and_(
                    VMProcessMetric.vm_name == vm_name,
                    VMProcessMetric.timestamp >= start_time,
                    VMProcessMetric.timestamp <= end_time,
                    VMProcessMetric.estimated_power_watts.isnot(None)
                )
            )
            
            # Get aggregated metrics
            result = query.with_entities(
                func.avg(VMProcessMetric.estimated_power_watts).label('avg_power_watts'),
                func.max(VMProcessMetric.estimated_power_watts).label('max_power_watts'),
                func.sum(VMProcessMetric.estimated_power_watts).label('total_power_watts'),
                func.count(VMProcessMetric.estimated_power_watts).label('data_points'),
                func.avg(VMProcessMetric.cpu_usage_percent).label('avg_cpu_percent'),
                func.avg(VMProcessMetric.gpu_utilization_percent).label('avg_gpu_percent'),
                func.avg(VMProcessMetric.memory_usage_mb).label('avg_memory_mb'),
                func.avg(VMProcessMetric.iops).label('avg_iops'),
                func.count(func.distinct(VMProcessMetric.process_name)).label('unique_processes')
            ).first()
            
            if not result or result.data_points == 0:
                return {
                    "success": False,
                    "error": f"No data found for VM '{vm_name}' in the specified time range"
                }
            
            # Calculate energy consumption (assuming 1-minute intervals)
            interval_hours = 1 / 60.0
            total_energy_kwh = (result.total_power_watts * interval_hours) / 1000.0
            
            # Get top processes for this VM
            top_processes_query = db.query(
                VMProcessMetric.process_name,
                func.avg(VMProcessMetric.estimated_power_watts).label('avg_power'),
                func.avg(VMProcessMetric.cpu_usage_percent).label('avg_cpu'),
                func.avg(VMProcessMetric.memory_usage_mb).label('avg_memory'),
                func.count(VMProcessMetric.process_name).label('occurrences')
            ).filter(
                and_(
                    VMProcessMetric.vm_name == vm_name,
                    VMProcessMetric.timestamp >= start_time,
                    VMProcessMetric.timestamp <= end_time,
                    VMProcessMetric.estimated_power_watts.isnot(None)
                )
            ).group_by(
                VMProcessMetric.process_name
            ).order_by(
                desc(func.avg(VMProcessMetric.estimated_power_watts))
            ).limit(5)
            
            top_processes = []
            for proc in top_processes_query.all():
                top_processes.append({
                    'process_name': proc.process_name,
                    'avg_power_watts': round(float(proc.avg_power), 2),
                    'avg_cpu_percent': round(float(proc.avg_cpu or 0), 2),
                    'avg_memory_mb': round(float(proc.avg_memory or 0), 2),
                    'occurrences': proc.occurrences
                })
            
            return {
                "success": True,
                "vm_analysis": {
                    "vm_name": vm_name,
                    "time_range_days": time_range_days,
                    "data_points": result.data_points,
                    "avg_power_watts": round(float(result.avg_power_watts), 2),
                    "max_power_watts": round(float(result.max_power_watts), 2),
                    "total_energy_kwh": round(total_energy_kwh, 4),
                    "avg_cpu_percent": round(float(result.avg_cpu_percent or 0), 2),
                    "avg_gpu_percent": round(float(result.avg_gpu_percent or 0), 2),
                    "avg_memory_mb": round(float(result.avg_memory_mb or 0), 2),
                    "avg_iops": round(float(result.avg_iops or 0), 2),
                    "unique_processes": result.unique_processes,
                    "top_processes": top_processes
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to analyze VM '{vm_name}': {str(e)}"
            }
    
    def generate_vm_recommendations(
        self,
        db: Session,
        vm_name: str,
        time_range_days: int = 7,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate performance and cost optimization recommendations for a specific VM"""
        try:
            # Define time range for analysis - needed for helper functions
            if start_date and end_date:
                start_time = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if 'T' in start_date else datetime.strptime(start_date, '%Y-%m-%d')
                end_time = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if 'T' in end_date else datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
                
                # For current date, limit to current time
                if end_date == datetime.utcnow().strftime('%Y-%m-%d'):
                    end_time = datetime.utcnow()
            else:
                end_time = datetime.utcnow()
                start_time = end_time - timedelta(days=time_range_days)
            
            # Step 1: Analyze VM resource consumption
            vm_result = self.analyze_vm_resource_consumption(db, vm_name, time_range_days, start_date, end_date)
            
            if not vm_result['success']:
                return vm_result
            
            vm_analysis = vm_result['vm_analysis']
            
            recommendations = []
            
            # CPU Performance Recommendations
            avg_cpu = vm_analysis['avg_cpu_percent']
            if avg_cpu > 80:
                recommendations.append({
                    'category': 'performance',
                    'priority': 'high',
                    'title': 'High CPU Utilization Detected',
                    'description': f'VM is running at {avg_cpu:.1f}% average CPU utilization',
                    'recommendations': [
                        'Consider scaling up CPU resources',
                        'Optimize CPU-intensive processes',
                        'Implement load balancing if applicable',
                        'Review process efficiency'
                    ],
                    'impact': 'High performance impact if not addressed'
                })
            elif avg_cpu < 20:
                recommendations.append({
                    'category': 'cost_optimization',
                    'priority': 'medium',
                    'title': 'Low CPU Utilization',
                    'description': f'VM is running at only {avg_cpu:.1f}% average CPU utilization',
                    'recommendations': [
                        'Consider downsizing CPU allocation',
                        'Consolidate workloads with other VMs',
                        'Review if VM is necessary during analyzed period',
                        'Consider auto-scaling based on demand'
                    ],
                    'potential_savings': 'Up to 30-50% cost reduction'
                })
            
            # Memory Optimization Recommendations - Enhanced Logic
            avg_memory_gb = vm_analysis['avg_memory_mb'] / 1024
            if avg_memory_gb > 0:
                # Get hardware specs to calculate memory percentage
                memory_recommendations = self._analyze_memory_usage_patterns(
                    db, vm_name, start_time, end_time, avg_memory_gb
                )
                if memory_recommendations:
                    recommendations.extend(memory_recommendations)
            
            # GPU Optimization Recommendations
            avg_gpu = vm_analysis['avg_gpu_percent']
            if avg_gpu > 0:
                if avg_gpu > 80:
                    recommendations.append({
                        'category': 'performance',
                        'priority': 'high',
                        'title': 'High GPU Utilization',
                        'description': f'VM is running at {avg_gpu:.1f}% average GPU utilization',
                        'recommendations': [
                            'Consider scaling GPU resources',
                            'Optimize GPU workload distribution',
                            'Monitor for GPU memory constraints',
                            'Consider GPU clustering for intensive workloads'
                        ],
                        'impact': 'Critical for GPU-intensive applications'
                    })
                elif avg_gpu < 20:
                    recommendations.append({
                        'category': 'cost_optimization',
                        'priority': 'medium',
                        'title': 'Underutilized GPU Resources',
                        'description': f'GPU is running at only {avg_gpu:.1f}% average utilization',
                        'recommendations': [
                            'Consider removing or downsizing GPU allocation',
                            'Share GPU resources with other VMs',
                            'Evaluate GPU necessity for current workloads'
                        ],
                        'potential_savings': 'Significant cost reduction (GPUs are expensive)'
                    })
            
            # Power/Energy Efficiency Recommendations - Enhanced Logic
            avg_power = vm_analysis['avg_power_watts']
            max_power = vm_analysis['max_power_watts']
            total_energy = vm_analysis['total_energy_kwh']
            
            # Enhanced power consumption analysis with adaptive thresholds
            power_recommendations = self._analyze_power_consumption_patterns(
                db, vm_name, start_time, end_time, avg_power, max_power, total_energy
            )
            if power_recommendations:
                recommendations.extend(power_recommendations)
            
            # Process-Specific Recommendations
            top_processes = vm_analysis.get('top_processes', [])
            if top_processes:
                high_power_processes = [p for p in top_processes if p['avg_power_watts'] > 20]
                if high_power_processes:
                    recommendations.append({
                        'category': 'optimization',
                        'priority': 'medium',
                        'title': 'High Power Consuming Processes Identified',
                        'description': f'Found {len(high_power_processes)} processes with high power consumption',
                        'recommendations': [
                            f"Optimize '{proc['process_name']}' (avg: {proc['avg_power_watts']:.1f}W)"
                            for proc in high_power_processes[:3]
                        ] + ['Consider process optimization or replacement'],
                        'processes': high_power_processes
                    })
            
            # Cost Estimation and Regional Comparison
            regions = self.get_all_regions_with_pricing(db)
            if regions and avg_power > 0:
                # Calculate 30-day projected costs
                daily_energy_kwh = (avg_power * 24) / 1000.0
                monthly_energy_kwh = daily_energy_kwh * 30
                
                current_region_cost = None
                cheapest_cost = float('inf')
                most_expensive_cost = 0
                
                regional_costs = []
                for region in regions:
                    monthly_cost = monthly_energy_kwh * region['cost_per_kwh']
                    regional_costs.append({
                        'region': region['region'],
                        'monthly_cost': round(monthly_cost, 4),
                        'cost_per_kwh': region['cost_per_kwh']
                    })
                    
                    if region['region'] == self.current_region:
                        current_region_cost = monthly_cost
                    
                    cheapest_cost = min(cheapest_cost, monthly_cost)
                    most_expensive_cost = max(most_expensive_cost, monthly_cost)
                
                if current_region_cost and cheapest_cost < current_region_cost:
                    potential_savings = current_region_cost - cheapest_cost
                    savings_percentage = (potential_savings / current_region_cost) * 100
                    
                    if savings_percentage > 15:  # Only recommend if savings > 15%
                        cheapest_region = min(regional_costs, key=lambda x: x['monthly_cost'])
                        recommendations.append({
                            'category': 'cost_optimization',
                            'priority': 'high' if savings_percentage > 30 else 'medium',
                            'title': 'Cross-Region Migration Opportunity',
                            'description': f'VM could save {savings_percentage:.1f}% on energy costs',
                            'recommendations': [
                                f"Consider migrating to {cheapest_region['region']}",
                                'Evaluate network latency impact',
                                'Assess data transfer costs',
                                'Review compliance requirements'
                            ],
                            'cost_analysis': {
                                'current_monthly_cost': round(current_region_cost, 4),
                                'target_monthly_cost': round(cheapest_cost, 4),
                                'monthly_savings': round(potential_savings, 4),
                                'annual_savings': round(potential_savings * 12, 4)
                            }
                        })
            
            return {
                "success": True,
                "vm_name": vm_name,
                "analysis_period": f"Last {time_range_days} days",
                "timestamp": datetime.utcnow().isoformat(),
                "vm_analysis": vm_analysis,
                "recommendations": recommendations,
                "summary": {
                    "total_recommendations": len(recommendations),
                    "high_priority": len([r for r in recommendations if r.get('priority') == 'high']),
                    "medium_priority": len([r for r in recommendations if r.get('priority') == 'medium']),
                    "low_priority": len([r for r in recommendations if r.get('priority') == 'low']),
                    "categories": list(set([r.get('category', 'general') for r in recommendations]))
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to generate VM recommendations: {str(e)}"
            }
    
    def _analyze_memory_usage_patterns(
        self, 
        db: Session, 
        vm_name: str, 
        start_time: datetime, 
        end_time: datetime,
        avg_memory_gb: float
    ) -> List[Dict[str, Any]]:
        """
        Enhanced memory usage analysis with percentage-based thresholds and peak analysis
        Your improved logic: Check peak memory usage and frequency of threshold crossings
        """
        try:
            recommendations = []
            
            # Get detailed memory usage data for pattern analysis
            memory_query = db.query(
                VMProcessMetric.memory_usage_mb,
                VMProcessMetric.timestamp
            ).filter(
                and_(
                    VMProcessMetric.vm_name == vm_name,
                    VMProcessMetric.timestamp >= start_time,
                    VMProcessMetric.timestamp <= end_time,
                    VMProcessMetric.memory_usage_mb.isnot(None)
                )
            ).order_by(VMProcessMetric.timestamp)
            
            memory_data = memory_query.all()
            if not memory_data:
                return recommendations
            
            # Get VM hardware specs to calculate memory percentage
            # Try to get from hardware_specs table or use reasonable defaults
            try:
                from app.models.hardware_specs import HardwareSpecs
                hw_spec = db.query(HardwareSpecs).filter(
                    HardwareSpecs.vm_name == vm_name
                ).first()
                
                if hw_spec and hw_spec.total_memory_gb:
                    total_memory_gb = hw_spec.total_memory_gb
                else:
                    # Estimate total memory based on peak usage (assume peak is ~60-80% of total)
                    peak_memory_gb = max([float(m.memory_usage_mb) / 1024 for m in memory_data])
                    total_memory_gb = max(peak_memory_gb / 0.7, 8.0)  # Assume peak is 70% of total, min 8GB
            except:
                # Fallback: estimate based on usage patterns
                peak_memory_gb = max([float(m.memory_usage_mb) / 1024 for m in memory_data])
                total_memory_gb = max(peak_memory_gb / 0.7, 8.0)
            
            # Calculate memory statistics
            memory_values_gb = [float(m.memory_usage_mb) / 1024 for m in memory_data]
            peak_memory_gb = max(memory_values_gb)
            min_memory_gb = min(memory_values_gb)
            
            # Calculate percentage usage
            avg_memory_percent = (avg_memory_gb / total_memory_gb) * 100
            peak_memory_percent = (peak_memory_gb / total_memory_gb) * 100
            min_memory_percent = (min_memory_gb / total_memory_gb) * 100
            
            # Analyze threshold crossing frequency
            high_threshold_80 = total_memory_gb * 0.8  # 80% threshold in GB
            low_threshold_20 = total_memory_gb * 0.2   # 20% threshold in GB
            
            high_threshold_crossings = sum(1 for m in memory_values_gb if m > high_threshold_80)
            low_threshold_count = sum(1 for m in memory_values_gb if m < low_threshold_20)
            
            total_data_points = len(memory_values_gb)
            high_threshold_frequency = (high_threshold_crossings / total_data_points) * 100
            low_threshold_frequency = (low_threshold_count / total_data_points) * 100
            
            # High Memory Usage Analysis (>80% sustained or frequent peak crossing)
            if peak_memory_percent > 80 and high_threshold_frequency > 30:  # Frequently above 80%
                recommendations.append({
                    'category': 'performance',
                    'priority': 'high',
                    'title': 'Critical Memory Pressure Detected',
                    'description': f'VM frequently exceeds 80% memory usage. Peak: {peak_memory_percent:.1f}%, Average: {avg_memory_percent:.1f}%',
                    'analysis': {
                        'total_memory_gb': round(total_memory_gb, 1),
                        'peak_memory_gb': round(peak_memory_gb, 1),
                        'peak_memory_percent': round(peak_memory_percent, 1),
                        'high_usage_frequency': round(high_threshold_frequency, 1),
                        'threshold_crossings': high_threshold_crossings,
                        'total_data_points': total_data_points
                    },
                    'recommendations': [
                        f'Immediate action required: Increase memory allocation to {int(peak_memory_gb * 1.2)}GB minimum',
                        'Monitor for memory leaks in applications',
                        'Implement memory optimization in top processes',
                        'Consider memory profiling for resource-intensive applications',
                        'Set up memory alerts at 70% and 85% thresholds'
                    ],
                    'impact': 'Critical: Performance degradation and potential system instability'
                })
            elif avg_memory_percent > 80:  # High average usage
                recommendations.append({
                    'category': 'performance',
                    'priority': 'medium',
                    'title': 'High Memory Utilization',
                    'description': f'VM consistently uses {avg_memory_percent:.1f}% of available memory (Peak: {peak_memory_percent:.1f}%)',
                    'analysis': {
                        'total_memory_gb': round(total_memory_gb, 1),
                        'avg_memory_percent': round(avg_memory_percent, 1),
                        'peak_memory_percent': round(peak_memory_percent, 1)
                    },
                    'recommendations': [
                        f'Consider increasing memory allocation to {int(total_memory_gb * 1.3)}GB',
                        'Monitor memory usage trends',
                        'Optimize memory-intensive processes',
                        'Implement memory caching strategies'
                    ],
                    'impact': 'Potential performance bottlenecks during peak usage'
                })
            
            # Low Memory Usage Analysis (<20% sustained)
            elif low_threshold_frequency > 70:  # More than 70% of time below 20%
                potential_savings_gb = total_memory_gb - (peak_memory_gb * 1.2)  # Keep 20% buffer above peak
                if potential_savings_gb > 1:  # Only recommend if significant savings
                    recommended_memory_gb = max(peak_memory_gb * 1.2, 2.0)  # At least 2GB minimum
                    
                    recommendations.append({
                        'category': 'cost_optimization',
                        'priority': 'medium',
                        'title': 'Memory Over-Allocation Detected',
                        'description': f'VM uses only {avg_memory_percent:.1f}% average memory ({low_threshold_frequency:.1f}% of time below 20%)',
                        'analysis': {
                            'total_memory_gb': round(total_memory_gb, 1),
                            'avg_memory_percent': round(avg_memory_percent, 1),
                            'peak_memory_gb': round(peak_memory_gb, 1),
                            'low_usage_frequency': round(low_threshold_frequency, 1),
                            'recommended_memory_gb': round(recommended_memory_gb, 1),
                            'potential_savings_gb': round(potential_savings_gb, 1)
                        },
                        'recommendations': [
                            f'Consider reducing memory allocation to {int(recommended_memory_gb)}GB',
                            'Monitor peak usage patterns before making changes',
                            'Implement auto-scaling if workload varies significantly',
                            'Evaluate if current allocation is oversized for typical workload'
                        ],
                        'potential_savings': f'Estimated {(potential_savings_gb/total_memory_gb*100):.0f}% memory cost reduction',
                        'cost_impact': f'Could save ~${(potential_savings_gb * 0.05 * 30):.2f}/month (estimated)'
                    })
            
            return recommendations
            
        except Exception as e:
            # Return empty list if analysis fails, don't break the main recommendation flow
            return []
    
    def _analyze_power_consumption_patterns(
        self,
        db: Session,
        vm_name: str,
        start_time: datetime,
        end_time: datetime,
        avg_power: float,
        max_power: float,
        total_energy: float
    ) -> List[Dict[str, Any]]:
        """
        Enhanced power consumption analysis with dynamic thresholds based on hardware capacity
        """
        try:
            recommendations = []
            
            # Get detailed power consumption data for pattern analysis
            power_query = db.query(
                VMProcessMetric.estimated_power_watts,
                VMProcessMetric.timestamp
            ).filter(
                and_(
                    VMProcessMetric.vm_name == vm_name,
                    VMProcessMetric.timestamp >= start_time,
                    VMProcessMetric.timestamp <= end_time,
                    VMProcessMetric.estimated_power_watts.isnot(None)
                )
            ).order_by(VMProcessMetric.timestamp)
            
            power_data = power_query.all()
            if not power_data:
                return recommendations
            
            # Calculate power statistics
            power_values = [float(p.estimated_power_watts) for p in power_data]
            min_power = min(power_values)
            median_power = sorted(power_values)[len(power_values) // 2]
            
            # Estimate system's maximum power capacity based on observed patterns
            # Use 95th percentile as a reasonable estimate of system capacity
            power_95th = sorted(power_values)[int(len(power_values) * 0.95)]
            estimated_max_capacity = max(power_95th * 1.2, 150.0)  # At least 150W capacity
            
            # Calculate percentage-based thresholds
            high_power_threshold_80 = estimated_max_capacity * 0.8  # 80% of capacity
            low_power_threshold_20 = estimated_max_capacity * 0.2   # 20% of capacity
            
            # Analyze threshold crossing frequency
            high_power_crossings = sum(1 for p in power_values if p > high_power_threshold_80)
            low_power_count = sum(1 for p in power_values if p < low_power_threshold_20)
            
            total_points = len(power_values)
            high_power_frequency = (high_power_crossings / total_points) * 100
            low_power_frequency = (low_power_count / total_points) * 100
            
            # Power efficiency analysis
            power_utilization_percent = (avg_power / estimated_max_capacity) * 100
            peak_power_percent = (max_power / estimated_max_capacity) * 100
            
            # High Power Consumption Analysis
            if peak_power_percent > 85 and high_power_frequency > 25:  # Frequently near capacity
                recommendations.append({
                    'category': 'performance',
                    'priority': 'high',
                    'title': 'Critical Power Consumption Detected',
                    'description': f'VM frequently operates at {peak_power_percent:.1f}% of estimated power capacity',
                    'analysis': {
                        'estimated_max_capacity_watts': round(estimated_max_capacity, 1),
                        'peak_power_watts': round(max_power, 1),
                        'avg_power_watts': round(avg_power, 1),
                        'power_utilization_percent': round(power_utilization_percent, 1),
                        'high_consumption_frequency': round(high_power_frequency, 1),
                        'total_energy_kwh': round(total_energy, 3)
                    },
                    'recommendations': [
                        'Immediate: Review thermal throttling and power limits',
                        'Consider upgrading to higher capacity power supply',
                        'Implement power management profiles',
                        'Optimize power-hungry processes during peak hours',
                        'Monitor for power-related performance degradation'
                    ],
                    'impact': 'Critical: Risk of power throttling and system instability',
                    'environmental_impact': f'High CO2 footprint: {total_energy * 0.4:.2f}kg for analyzed period'
                })
            elif power_utilization_percent > 70:  # High average power usage
                recommendations.append({
                    'category': 'sustainability',
                    'priority': 'medium',
                    'title': 'High Energy Consumption',
                    'description': f'VM consumes {power_utilization_percent:.1f}% of available power capacity on average',
                    'analysis': {
                        'avg_power_utilization_percent': round(power_utilization_percent, 1),
                        'total_energy_kwh': round(total_energy, 3),
                        'daily_energy_kwh': round(total_energy / 7, 3)  # Assuming 7-day analysis
                    },
                    'recommendations': [
                        'Implement advanced power management policies',
                        'Schedule intensive workloads during renewable energy peak hours',
                        'Consider migrating to more energy-efficient hardware',
                        'Review and optimize power-intensive processes',
                        'Implement power monitoring and alerting'
                    ],
                    'environmental_impact': f'Estimated CO2 footprint: {total_energy * 0.4:.2f}kg',
                    'potential_savings': f'Up to {(power_utilization_percent - 50):.0f}% energy reduction possible'
                })
            
            # Low Power Consumption Analysis (under-utilization)
            elif low_power_frequency > 60:  # More than 60% of time below 20% capacity
                efficiency_opportunity = estimated_max_capacity - (max_power * 1.2)
                if efficiency_opportunity > 30:  # Significant over-provisioning
                    recommendations.append({
                        'category': 'cost_optimization',
                        'priority': 'medium',
                        'title': 'Power Infrastructure Over-Provisioning',
                        'description': f'VM uses only {power_utilization_percent:.1f}% of power capacity ({low_power_frequency:.1f}% of time below 20%)',
                        'analysis': {
                            'avg_power_utilization_percent': round(power_utilization_percent, 1),
                            'low_usage_frequency': round(low_power_frequency, 1),
                            'estimated_over_provision_watts': round(efficiency_opportunity, 1),
                            'actual_peak_watts': round(max_power, 1)
                        },
                        'recommendations': [
                            'Consider consolidating workloads on fewer, better-utilized systems',
                            'Evaluate migration to lower-capacity, more efficient hardware',
                            'Implement auto-scaling to match power provisioning with demand',
                            'Consider cloud migration for variable workloads'
                        ],
                        'potential_savings': f'Infrastructure cost reduction potential: {(efficiency_opportunity/estimated_max_capacity*100):.0f}%',
                        'environmental_benefit': 'Reduced carbon footprint through better resource utilization'
                    })
            
            # Seasonal/Time-based analysis if we have enough data points
            if total_points > 1000:  # More than ~17 hours of data (assuming 1-minute intervals)
                # Analyze power consumption patterns by time of day
                power_variance = max(power_values) - min(power_values)
                if power_variance > (avg_power * 0.5):  # High variance indicates opportunity
                    recommendations.append({
                        'category': 'optimization',
                        'priority': 'low',
                        'title': 'Variable Power Consumption Pattern Detected',
                        'description': f'Power usage varies significantly ({power_variance:.1f}W range)',
                        'analysis': {
                            'power_variance_watts': round(power_variance, 1),
                            'min_power_watts': round(min_power, 1),
                            'max_power_watts': round(max_power, 1),
                            'median_power_watts': round(median_power, 1)
                        },
                        'recommendations': [
                            'Implement time-based auto-scaling',
                            'Schedule batch jobs during low-usage periods',
                            'Consider demand-based power management',
                            'Optimize workload distribution across time'
                        ],
                        'optimization_potential': 'Moderate energy savings through better scheduling'
                    })
            
            return recommendations
            
        except Exception as e:
            # Return empty list if analysis fails
            return []

    def analyze_host_resource_consumption(
        self,
        db: Session,
        time_range_days: int = 7,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze historical resource consumption of the bare metal host"""
        try:
            # Use specific date range if provided, otherwise use time_range_days
            if start_date and end_date:
                start_time = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if 'T' in start_date else datetime.strptime(start_date, '%Y-%m-%d')
                end_time = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if 'T' in end_date else datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)

                # For current date, limit to current time
                if end_date == datetime.utcnow().strftime('%Y-%m-%d'):
                    end_time = datetime.utcnow()
            else:
                end_time = datetime.utcnow()
                start_time = end_time - timedelta(days=time_range_days)

            # Query host-specific process metrics
            query = db.query(HostProcessMetric).filter(
                and_(
                    HostProcessMetric.timestamp >= start_time,
                    HostProcessMetric.timestamp <= end_time,
                    HostProcessMetric.estimated_power_watts.isnot(None)
                )
            )

            # Get comprehensive statistical analysis from process-level data
            result = query.with_entities(
                # Basic aggregations
                func.avg(HostProcessMetric.estimated_power_watts).label('avg_power_watts'),
                func.max(HostProcessMetric.estimated_power_watts).label('max_power_watts'),
                func.min(HostProcessMetric.estimated_power_watts).label('min_power_watts'),
                func.sum(HostProcessMetric.estimated_power_watts).label('total_power_watts'),
                func.count(HostProcessMetric.estimated_power_watts).label('data_points'),

                # CPU statistics
                func.avg(HostProcessMetric.cpu_usage_percent).label('avg_cpu_percent'),
                func.max(HostProcessMetric.cpu_usage_percent).label('max_cpu_percent'),
                func.min(HostProcessMetric.cpu_usage_percent).label('min_cpu_percent'),
                func.stddev(HostProcessMetric.cpu_usage_percent).label('cpu_volatility'),

                # GPU statistics
                func.avg(HostProcessMetric.gpu_utilization_percent).label('avg_gpu_percent'),
                func.max(HostProcessMetric.gpu_utilization_percent).label('max_gpu_percent'),
                func.min(HostProcessMetric.gpu_utilization_percent).label('min_gpu_percent'),

                # Memory statistics
                func.avg(HostProcessMetric.memory_usage_mb).label('avg_memory_mb'),
                func.max(HostProcessMetric.memory_usage_mb).label('max_memory_mb'),
                func.min(HostProcessMetric.memory_usage_mb).label('min_memory_mb'),

                # Power efficiency statistics
                func.stddev(HostProcessMetric.estimated_power_watts).label('power_volatility'),
                func.avg(HostProcessMetric.iops).label('avg_iops'),
                func.count(func.distinct(HostProcessMetric.process_name)).label('unique_processes')
            ).first()

            if not result or result.data_points == 0:
                return {
                    "success": False,
                    "error": f"No process data found for host in the specified time range"
                }

            # Calculate percentiles efficiently using separate queries (compatible with all PostgreSQL versions)
            cpu_percentiles = db.execute(text("""
                SELECT
                    percentile_disc(0.95) WITHIN GROUP (ORDER BY cpu_usage_percent) as cpu_95th,
                    percentile_disc(0.99) WITHIN GROUP (ORDER BY cpu_usage_percent) as cpu_99th
                FROM host_process_metrics
                WHERE timestamp >= :start_time AND timestamp <= :end_time
                AND estimated_power_watts IS NOT NULL
            """), {'start_time': start_time, 'end_time': end_time}).fetchone()

            # Calculate overall metrics percentiles
            overall_percentiles = db.execute(text("""
                SELECT
                    percentile_disc(0.95) WITHIN GROUP (ORDER BY host_cpu_usage_percent) as cpu_95th,
                    percentile_disc(0.95) WITHIN GROUP (ORDER BY host_ram_usage_percent) as ram_95th,
                    percentile_disc(0.95) WITHIN GROUP (ORDER BY host_gpu_utilization_percent) as gpu_95th
                FROM host_overall_metrics
                WHERE timestamp >= :start_time AND timestamp <= :end_time
            """), {'start_time': start_time, 'end_time': end_time}).fetchone()

            # Calculate energy consumption (assuming 1-minute intervals)
            interval_hours = 1 / 60.0
            total_energy_kwh = (result.total_power_watts * interval_hours) / 1000.0

            # Get top processes for the host
            top_processes_query = db.query(
                HostProcessMetric.process_name,
                func.avg(HostProcessMetric.estimated_power_watts).label('avg_power'),
                func.avg(HostProcessMetric.cpu_usage_percent).label('avg_cpu'),
                func.avg(HostProcessMetric.memory_usage_mb).label('avg_memory'),
                func.count(HostProcessMetric.process_name).label('occurrences')
            ).filter(
                and_(
                    HostProcessMetric.timestamp >= start_time,
                    HostProcessMetric.timestamp <= end_time,
                    HostProcessMetric.estimated_power_watts.isnot(None)
                )
            ).group_by(
                HostProcessMetric.process_name
            ).order_by(
                desc(func.avg(HostProcessMetric.estimated_power_watts))
            ).limit(5)

            top_processes = []
            for proc in top_processes_query.all():
                top_processes.append({
                    'process_name': proc.process_name,
                    'avg_power_watts': round(float(proc.avg_power), 2),
                    'avg_cpu_percent': round(float(proc.avg_cpu or 0), 2),
                    'avg_memory_mb': round(float(proc.avg_memory or 0), 2),
                    'occurrences': proc.occurrences
                })

            # Get host overall metrics for additional insights
            overall_metrics_query = db.query(HostOverallMetric).filter(
                and_(
                    HostOverallMetric.timestamp >= start_time,
                    HostOverallMetric.timestamp <= end_time
                )
            )

            overall_result = overall_metrics_query.with_entities(
                # Basic averages
                func.avg(HostOverallMetric.host_cpu_usage_percent).label('avg_host_cpu'),
                func.avg(HostOverallMetric.host_ram_usage_percent).label('avg_host_ram'),
                func.avg(HostOverallMetric.host_gpu_utilization_percent).label('avg_host_gpu'),
                func.avg(HostOverallMetric.host_gpu_memory_utilization_percent).label('avg_host_gpu_memory'),
                func.avg(HostOverallMetric.host_gpu_temperature_celsius).label('avg_gpu_temp'),
                func.avg(HostOverallMetric.host_gpu_power_draw_watts).label('avg_gpu_power'),
                func.count().label('overall_data_points'),

                # Peak analysis
                func.max(HostOverallMetric.host_cpu_usage_percent).label('max_host_cpu'),
                func.max(HostOverallMetric.host_ram_usage_percent).label('max_host_ram'),
                func.max(HostOverallMetric.host_gpu_utilization_percent).label('max_host_gpu'),
                func.max(HostOverallMetric.host_gpu_temperature_celsius).label('max_gpu_temp'),

                # Min values for range analysis
                func.min(HostOverallMetric.host_cpu_usage_percent).label('min_host_cpu'),
                func.min(HostOverallMetric.host_ram_usage_percent).label('min_host_ram'),
                func.min(HostOverallMetric.host_gpu_utilization_percent).label('min_host_gpu'),

                # Volatility analysis
                func.stddev(HostOverallMetric.host_cpu_usage_percent).label('cpu_volatility'),
                func.stddev(HostOverallMetric.host_ram_usage_percent).label('ram_volatility'),
                func.stddev(HostOverallMetric.host_gpu_power_draw_watts).label('gpu_power_volatility')
            ).first()

            # Simplified threshold breach analysis using raw SQL to avoid SQLAlchemy case issues
            try:
                threshold_sql = text("""
                    SELECT
                        (COUNT(CASE WHEN host_cpu_usage_percent > 90 THEN 1 END) * 100.0 / COUNT(*)) as cpu_critical_breach_percent,
                        (COUNT(CASE WHEN host_cpu_usage_percent > 80 THEN 1 END) * 100.0 / COUNT(*)) as cpu_warning_breach_percent,
                        (COUNT(CASE WHEN host_cpu_usage_percent > 70 THEN 1 END) * 100.0 / COUNT(*)) as cpu_elevated_breach_percent,
                        (COUNT(CASE WHEN host_ram_usage_percent > 90 THEN 1 END) * 100.0 / COUNT(*)) as memory_critical_breach_percent,
                        (COUNT(CASE WHEN host_ram_usage_percent > 80 THEN 1 END) * 100.0 / COUNT(*)) as memory_warning_breach_percent,
                        (COUNT(CASE WHEN host_gpu_utilization_percent > 90 THEN 1 END) * 100.0 / COUNT(*)) as gpu_critical_breach_percent,
                        (COUNT(CASE WHEN host_gpu_utilization_percent > 80 THEN 1 END) * 100.0 / COUNT(*)) as gpu_warning_breach_percent,
                        (COUNT(CASE WHEN host_gpu_temperature_celsius > 85 THEN 1 END) * 100.0 / COUNT(*)) as temp_critical_breach_percent,
                        (COUNT(CASE WHEN host_gpu_temperature_celsius > 80 THEN 1 END) * 100.0 / COUNT(*)) as temp_warning_breach_percent
                    FROM host_overall_metrics
                    WHERE timestamp >= :start_time AND timestamp <= :end_time
                """)
                threshold_analysis = db.execute(threshold_sql, {"start_time": start_time, "end_time": end_time}).first()
            except Exception as e:
                # If threshold analysis fails, create default values
                threshold_analysis = type('obj', (object,), {
                    'cpu_critical_breach_percent': 0, 'cpu_warning_breach_percent': 0, 'cpu_elevated_breach_percent': 0,
                    'memory_critical_breach_percent': 0, 'memory_warning_breach_percent': 0,
                    'gpu_critical_breach_percent': 0, 'gpu_warning_breach_percent': 0,
                    'temp_critical_breach_percent': 0, 'temp_warning_breach_percent': 0
                })()

            # Time pattern analysis - peak usage by hour using raw SQL
            try:
                peak_hours_sql = text("""
                    SELECT
                        EXTRACT(hour FROM timestamp) as hour,
                        AVG(host_cpu_usage_percent) as avg_cpu,
                        MAX(host_cpu_usage_percent) as peak_cpu,
                        COUNT(CASE WHEN host_cpu_usage_percent > 80 THEN 1 END) as high_cpu_count
                    FROM host_overall_metrics
                    WHERE timestamp >= :start_time AND timestamp <= :end_time
                    GROUP BY EXTRACT(hour FROM timestamp)
                    ORDER BY hour
                """)
                peak_hours_query = db.execute(peak_hours_sql, {"start_time": start_time, "end_time": end_time}).fetchall()
            except Exception as e:
                peak_hours_query = []

            # Process efficiency analysis - optimized to avoid heavy computation
            efficiency_query = db.query(
                HostProcessMetric.process_name,
                func.avg(HostProcessMetric.cpu_usage_percent).label('avg_cpu'),
                func.avg(HostProcessMetric.estimated_power_watts).label('avg_power'),
                func.avg(HostProcessMetric.memory_usage_mb).label('avg_memory'),
                func.count().label('sample_count')
            ).filter(
                and_(
                    HostProcessMetric.timestamp >= start_time,
                    HostProcessMetric.timestamp <= end_time,
                    HostProcessMetric.estimated_power_watts > 1.0,  # Only processes using meaningful power
                    HostProcessMetric.estimated_power_watts.isnot(None)
                )
            ).group_by(HostProcessMetric.process_name).having(func.count() > 10).limit(20).all()  # Limit to top 20 processes

            # Convert efficiency results to dict with calculated ratios
            efficiency_data = []
            for eff in efficiency_query:
                avg_power = float(eff.avg_power or 1.0)
                cpu_efficiency = round(float(eff.avg_cpu or 0) / avg_power, 4) if avg_power > 0 else 0
                memory_efficiency = round(float(eff.avg_memory or 0) / avg_power, 4) if avg_power > 0 else 0

                efficiency_data.append({
                    'process_name': eff.process_name,
                    'avg_cpu_percent': round(float(eff.avg_cpu or 0), 2),
                    'avg_power_watts': round(avg_power, 2),
                    'avg_memory_mb': round(float(eff.avg_memory or 0), 2),
                    'cpu_efficiency_per_watt': cpu_efficiency,
                    'memory_efficiency_per_watt': memory_efficiency,
                    'sample_count': eff.sample_count
                })

            # Convert peak hours to structured data
            peak_hours_data = {}
            for hour_data in peak_hours_query:
                peak_hours_data[int(hour_data.hour)] = {
                    'avg_cpu': round(float(hour_data.avg_cpu or 0), 2),
                    'peak_cpu': round(float(hour_data.peak_cpu or 0), 2),
                    'high_cpu_count': hour_data.high_cpu_count or 0
                }

            # Combine process-level and overall metrics with advanced statistics
            host_analysis = {
                "host_name": "bare-metal-host",
                "time_range_days": time_range_days,
                "process_data_points": result.data_points,
                "overall_data_points": overall_result.overall_data_points if overall_result else 0,

                # Process-level aggregated metrics with enhanced statistics
                "avg_process_power_watts": round(float(result.avg_power_watts), 2),
                "max_process_power_watts": round(float(result.max_power_watts), 2),
                "min_process_power_watts": round(float(result.min_power_watts or 0), 2),
                "power_volatility": round(float(result.power_volatility or 0), 2),
                "total_energy_kwh": round(total_energy_kwh, 4),

                # CPU statistics with percentiles and volatility
                "avg_process_cpu_percent": round(float(result.avg_cpu_percent or 0), 2),
                "max_process_cpu_percent": round(float(result.max_cpu_percent or 0), 2),
                "min_process_cpu_percent": round(float(result.min_cpu_percent or 0), 2),
                "cpu_95th_percentile": round(float(cpu_percentiles.cpu_95th or 0), 2) if cpu_percentiles else 0,
                "cpu_99th_percentile": round(float(cpu_percentiles.cpu_99th or 0), 2) if cpu_percentiles else 0,
                "cpu_volatility": round(float(result.cpu_volatility or 0), 2),

                # GPU statistics with percentiles
                "avg_process_gpu_percent": round(float(result.avg_gpu_percent or 0), 2),
                "max_process_gpu_percent": round(float(result.max_gpu_percent or 0), 2),
                "min_process_gpu_percent": round(float(result.min_gpu_percent or 0), 2),

                # Memory statistics with percentiles
                "avg_process_memory_mb": round(float(result.avg_memory_mb or 0), 2),
                "max_process_memory_mb": round(float(result.max_memory_mb or 0), 2),
                "min_process_memory_mb": round(float(result.min_memory_mb or 0), 2),

                # Other process metrics
                "avg_process_iops": round(float(result.avg_iops or 0), 2),
                "unique_processes": result.unique_processes,
                "top_processes": top_processes,

                # Overall host metrics with enhanced statistics
                "avg_host_cpu_percent": round(float(overall_result.avg_host_cpu or 0), 2) if overall_result else 0,
                "max_host_cpu_percent": round(float(overall_result.max_host_cpu or 0), 2) if overall_result else 0,
                "min_host_cpu_percent": round(float(overall_result.min_host_cpu or 0), 2) if overall_result else 0,
                "host_cpu_95th_percentile": round(float(overall_percentiles.cpu_95th or 0), 2) if overall_percentiles else 0,
                "host_cpu_volatility": round(float(overall_result.cpu_volatility or 0), 2) if overall_result else 0,

                "avg_host_ram_percent": round(float(overall_result.avg_host_ram or 0), 2) if overall_result else 0,
                "max_host_ram_percent": round(float(overall_result.max_host_ram or 0), 2) if overall_result else 0,
                "min_host_ram_percent": round(float(overall_result.min_host_ram or 0), 2) if overall_result else 0,
                "host_ram_95th_percentile": round(float(overall_percentiles.ram_95th or 0), 2) if overall_percentiles else 0,
                "host_ram_volatility": round(float(overall_result.ram_volatility or 0), 2) if overall_result else 0,

                "avg_host_gpu_percent": round(float(overall_result.avg_host_gpu or 0), 2) if overall_result else 0,
                "max_host_gpu_percent": round(float(overall_result.max_host_gpu or 0), 2) if overall_result else 0,
                "min_host_gpu_percent": round(float(overall_result.min_host_gpu or 0), 2) if overall_result else 0,
                "host_gpu_95th_percentile": round(float(overall_percentiles.gpu_95th or 0), 2) if overall_percentiles else 0,

                "avg_host_gpu_memory_percent": round(float(overall_result.avg_host_gpu_memory or 0), 2) if overall_result else 0,
                "avg_gpu_temperature_celsius": round(float(overall_result.avg_gpu_temp or 0), 2) if overall_result else 0,
                "max_gpu_temperature_celsius": round(float(overall_result.max_gpu_temp or 0), 2) if overall_result else 0,
                "avg_gpu_power_watts": round(float(overall_result.avg_gpu_power or 0), 2) if overall_result else 0,
                "gpu_power_volatility": round(float(overall_result.gpu_power_volatility or 0), 2) if overall_result else 0,

                # Threshold breach analysis
                "cpu_critical_breach_percent": round(float(threshold_analysis.cpu_critical_breach_percent or 0), 2) if threshold_analysis else 0,
                "cpu_warning_breach_percent": round(float(threshold_analysis.cpu_warning_breach_percent or 0), 2) if threshold_analysis else 0,
                "cpu_elevated_breach_percent": round(float(threshold_analysis.cpu_elevated_breach_percent or 0), 2) if threshold_analysis else 0,

                "memory_critical_breach_percent": round(float(threshold_analysis.memory_critical_breach_percent or 0), 2) if threshold_analysis else 0,
                "memory_warning_breach_percent": round(float(threshold_analysis.memory_warning_breach_percent or 0), 2) if threshold_analysis else 0,

                "gpu_critical_breach_percent": round(float(threshold_analysis.gpu_critical_breach_percent or 0), 2) if threshold_analysis else 0,
                "gpu_warning_breach_percent": round(float(threshold_analysis.gpu_warning_breach_percent or 0), 2) if threshold_analysis else 0,

                "temp_critical_breach_percent": round(float(threshold_analysis.temp_critical_breach_percent or 0), 2) if threshold_analysis else 0,
                "temp_warning_breach_percent": round(float(threshold_analysis.temp_warning_breach_percent or 0), 2) if threshold_analysis else 0,

                # Time pattern analysis
                "peak_hours_analysis": peak_hours_data,

                # Process efficiency analysis
                "process_efficiency_data": efficiency_data
            }

            return {
                "success": True,
                "host_analysis": host_analysis
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to analyze host: {str(e)}"
            }

    def generate_host_recommendations(
        self,
        db: Session,
        time_range_days: int = 7,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate performance and cost optimization recommendations for bare metal host"""
        try:
            # Define time range for analysis
            if start_date and end_date:
                start_time = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if 'T' in start_date else datetime.strptime(start_date, '%Y-%m-%d')
                end_time = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if 'T' in end_date else datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)

                if end_date == datetime.utcnow().strftime('%Y-%m-%d'):
                    end_time = datetime.utcnow()
            else:
                end_time = datetime.utcnow()
                start_time = end_time - timedelta(days=time_range_days)

            # Step 1: Analyze host resource consumption
            host_result = self.analyze_host_resource_consumption(db, time_range_days, start_date, end_date)

            if not host_result['success']:
                return host_result

            host_analysis = host_result['host_analysis']
            recommendations = []

            # Enhanced CPU Performance Recommendations using sophisticated statistics
            avg_host_cpu = host_analysis['avg_host_cpu_percent']
            cpu_95th = host_analysis['host_cpu_95th_percentile']
            cpu_critical_breach = host_analysis['cpu_critical_breach_percent']
            cpu_warning_breach = host_analysis['cpu_warning_breach_percent']
            cpu_volatility = host_analysis['host_cpu_volatility']

            # Critical: Frequent breaches of 90% threshold
            if cpu_critical_breach > 5:  # More than 5% of time above 90%
                recommendations.append({
                    'category': 'performance',
                    'priority': 'high',
                    'title': 'Critical CPU Threshold Breaches Detected',
                    'description': f'CPU exceeded 90% for {cpu_critical_breach:.1f}% of monitoring period (95th percentile: {cpu_95th:.1f}%)',
                    'recommendations': [
                        'Immediate CPU upgrade required - system at capacity',
                        'Implement emergency load balancing',
                        'Schedule non-critical processes during off-peak hours',
                        'Consider horizontal scaling with additional hosts'
                    ],
                    'impact': 'System stability at risk - immediate action required',
                    'statistics': {
                        'critical_breach_percent': cpu_critical_breach,
                        'cpu_95th_percentile': cpu_95th,
                        'avg_cpu': avg_host_cpu
                    }
                })
            # Warning: Frequent breaches of 80% threshold
            elif cpu_warning_breach > 15:  # More than 15% of time above 80%
                recommendations.append({
                    'category': 'performance',
                    'priority': 'medium',
                    'title': 'Frequent CPU Performance Bottlenecks',
                    'description': f'CPU exceeded 80% for {cpu_warning_breach:.1f}% of time (peak 95th percentile: {cpu_95th:.1f}%)',
                    'recommendations': [
                        'Plan CPU capacity upgrade within 2-4 weeks',
                        'Optimize CPU-intensive processes during peak hours',
                        'Implement CPU affinity for critical applications',
                        'Monitor for performance degradation'
                    ],
                    'impact': 'Performance bottlenecks during peak usage',
                    'statistics': {
                        'warning_breach_percent': cpu_warning_breach,
                        'cpu_95th_percentile': cpu_95th
                    }
                })
            # Underutilization: Low average with minimal peak usage
            elif avg_host_cpu < 20 and cpu_95th < 40:
                recommendations.append({
                    'category': 'cost_optimization',
                    'priority': 'medium',
                    'title': 'Significant CPU Underutilization',
                    'description': f'CPU averaging {avg_host_cpu:.1f}% with 95th percentile only {cpu_95th:.1f}%',
                    'recommendations': [
                        'Consolidate workloads from other hosts',
                        'Deploy additional applications to utilize capacity',
                        'Consider downsizing CPU allocation',
                        'Evaluate cost savings from resource optimization'
                    ],
                    'potential_savings': f'Up to 60-70% capacity available for consolidation',
                    'statistics': {
                        'avg_cpu': avg_host_cpu,
                        'cpu_95th_percentile': cpu_95th,
                        'utilization_efficiency': f'{(avg_host_cpu/100)*100:.1f}%'
                    }
                })

            # High volatility workload pattern analysis
            if cpu_volatility > 15:  # High variance in CPU usage
                peak_hours = [hour for hour, data in host_analysis['peak_hours_analysis'].items()
                             if data['avg_cpu'] > avg_host_cpu * 1.5]

                recommendations.append({
                    'category': 'optimization',
                    'priority': 'medium',
                    'title': 'Highly Variable CPU Workload Pattern',
                    'description': f'CPU usage shows high volatility (σ={cpu_volatility:.1f}%), indicating unpredictable load spikes',
                    'recommendations': [
                        'Implement auto-scaling based on CPU metrics',
                        'Schedule batch jobs during low-usage periods',
                        f'Peak usage occurs around hours: {peak_hours}' if peak_hours else 'Analyze workload timing patterns',
                        'Consider burst-capable instance types'
                    ],
                    'impact': 'Improved resource efficiency through better scheduling',
                    'statistics': {
                        'cpu_volatility': cpu_volatility,
                        'peak_hours': peak_hours
                    }
                })

            # Enhanced Memory Optimization Recommendations
            avg_host_ram = host_analysis['avg_host_ram_percent']
            ram_95th = host_analysis['host_ram_95th_percentile']
            memory_critical_breach = host_analysis['memory_critical_breach_percent']
            memory_warning_breach = host_analysis['memory_warning_breach_percent']
            ram_volatility = host_analysis['host_ram_volatility']

            # Critical memory pressure
            if memory_critical_breach > 3:  # More than 3% of time above 90%
                recommendations.append({
                    'category': 'performance',
                    'priority': 'high',
                    'title': 'Critical Memory Pressure Detected',
                    'description': f'Memory exceeded 90% for {memory_critical_breach:.1f}% of time (95th percentile: {ram_95th:.1f}%)',
                    'recommendations': [
                        'Immediate memory upgrade required to prevent swapping',
                        'Identify and optimize memory-intensive processes',
                        'Implement memory monitoring and alerting',
                        'Consider temporary process migration to reduce load'
                    ],
                    'impact': 'Risk of system swapping and severe performance degradation',
                    'statistics': {
                        'critical_breach_percent': memory_critical_breach,
                        'ram_95th_percentile': ram_95th,
                        'avg_ram': avg_host_ram
                    }
                })
            # Warning level memory usage
            elif memory_warning_breach > 10:  # More than 10% of time above 80%
                recommendations.append({
                    'category': 'performance',
                    'priority': 'medium',
                    'title': 'Frequent Memory Pressure Events',
                    'description': f'Memory exceeded 80% for {memory_warning_breach:.1f}% of time (peak: {ram_95th:.1f}%)',
                    'recommendations': [
                        'Plan memory capacity upgrade within 1-2 months',
                        'Optimize memory usage of top consuming processes',
                        'Implement memory caching strategies',
                        'Monitor for memory leaks'
                    ],
                    'impact': 'Performance may degrade during peak memory usage',
                    'statistics': {
                        'warning_breach_percent': memory_warning_breach,
                        'ram_95th_percentile': ram_95th
                    }
                })
            # Significant underutilization
            elif avg_host_ram < 30 and ram_95th < 50:
                recommendations.append({
                    'category': 'cost_optimization',
                    'priority': 'low',
                    'title': 'Significant Memory Underutilization',
                    'description': f'Memory averaging {avg_host_ram:.1f}% with 95th percentile only {ram_95th:.1f}%',
                    'recommendations': [
                        'Consolidate memory-intensive workloads here',
                        'Deploy in-memory caching solutions',
                        'Consider reducing memory allocation elsewhere',
                        'Utilize excess memory for performance optimization'
                    ],
                    'potential_savings': f'Over 50% memory capacity available for optimization',
                    'statistics': {
                        'avg_ram': avg_host_ram,
                        'ram_95th_percentile': ram_95th,
                        'available_capacity_percent': 100 - ram_95th
                    }
                })

            # Process Efficiency Analysis Recommendations
            efficiency_data = host_analysis.get('process_efficiency_data', [])
            if efficiency_data:
                # Find most and least efficient processes
                most_efficient = sorted(efficiency_data, key=lambda x: x['cpu_efficiency_per_watt'], reverse=True)[:3]
                least_efficient = sorted(efficiency_data, key=lambda x: x['cpu_efficiency_per_watt'])[:3]

                if least_efficient and least_efficient[0]['cpu_efficiency_per_watt'] < 1.0:
                    recommendations.append({
                        'category': 'optimization',
                        'priority': 'medium',
                        'title': 'Process Efficiency Optimization Opportunities',
                        'description': f'Found {len([p for p in efficiency_data if p["cpu_efficiency_per_watt"] < 1.0])} inefficient processes consuming disproportionate power',
                        'recommendations': [
                            f"Optimize '{proc['process_name']}' (efficiency: {proc['cpu_efficiency_per_watt']:.3f} CPU%/W)"
                            for proc in least_efficient[:3]
                        ] + [
                            'Consider process replacement or configuration optimization',
                            'Benchmark against most efficient processes',
                            'Implement power-aware process scheduling'
                        ],
                        'impact': 'Significant power savings through process optimization',
                        'statistics': {
                            'least_efficient_processes': least_efficient[:3],
                            'most_efficient_processes': most_efficient[:3],
                            'total_processes_analyzed': len(efficiency_data)
                        }
                    })

            # GPU Optimization Recommendations
            avg_host_gpu = host_analysis['avg_host_gpu_percent']
            avg_gpu_temp = host_analysis['avg_gpu_temperature_celsius']
            avg_gpu_power = host_analysis['avg_gpu_power_watts']

            if avg_host_gpu > 0:
                if avg_host_gpu > 80:
                    recommendations.append({
                        'category': 'performance',
                        'priority': 'high',
                        'title': 'High GPU Utilization',
                        'description': f'Host GPU running at {avg_host_gpu:.1f}% utilization',
                        'recommendations': [
                            'Consider adding additional GPUs',
                            'Implement GPU workload scheduling',
                            'Optimize GPU memory allocation',
                            'Monitor GPU temperature and power limits'
                        ],
                        'impact': 'Critical for GPU-intensive workloads'
                    })
                elif avg_host_gpu < 20 and avg_gpu_power > 50:
                    recommendations.append({
                        'category': 'cost_optimization',
                        'priority': 'medium',
                        'title': 'Underutilized High-Power GPU',
                        'description': f'GPU at {avg_host_gpu:.1f}% usage but consuming {avg_gpu_power:.1f}W',
                        'recommendations': [
                            'Deploy GPU-accelerated applications',
                            'Consider GPU power management settings',
                            'Share GPU resources across applications',
                            'Evaluate if GPU is necessary for current workload'
                        ],
                        'potential_savings': 'Significant power savings possible'
                    })

            # Temperature monitoring
            if avg_gpu_temp > 80:
                recommendations.append({
                    'category': 'maintenance',
                    'priority': 'high',
                    'title': 'High GPU Temperature',
                    'description': f'Average GPU temperature at {avg_gpu_temp:.1f}°C',
                    'recommendations': [
                        'Check cooling system and airflow',
                        'Clean dust from GPU fans and heatsinks',
                        'Consider undervolting or reducing power limits',
                        'Monitor for thermal throttling'
                    ],
                    'impact': 'Prevent hardware damage and performance throttling'
                })

            # Process-Specific Recommendations
            top_processes = host_analysis.get('top_processes', [])
            if top_processes:
                high_power_processes = [p for p in top_processes if p['avg_power_watts'] > 25]
                if high_power_processes:
                    recommendations.append({
                        'category': 'optimization',
                        'priority': 'medium',
                        'title': 'High Power Consuming Processes Identified',
                        'description': f'Found {len(high_power_processes)} processes with high power consumption',
                        'recommendations': [
                            f"Optimize '{proc['process_name']}' (avg: {proc['avg_power_watts']:.1f}W)"
                            for proc in high_power_processes[:3]
                        ] + ['Consider process optimization or scheduling'],
                        'processes': high_power_processes
                    })

            # Cost Estimation and Regional Comparison
            regions = self.get_all_regions_with_pricing(db)
            avg_total_power = host_analysis['avg_process_power_watts'] + host_analysis['avg_gpu_power_watts']

            if regions and avg_total_power > 0:
                # Calculate 30-day projected costs
                daily_energy_kwh = (avg_total_power * 24) / 1000.0
                monthly_energy_kwh = daily_energy_kwh * 30

                regional_costs = []
                for region in regions:
                    monthly_cost = monthly_energy_kwh * region['cost_per_kwh']
                    regional_costs.append({
                        'region': region['region'],
                        'monthly_cost': round(monthly_cost, 4),
                        'cost_per_kwh': region['cost_per_kwh']
                    })

                # Sort by cost
                regional_costs.sort(key=lambda x: x['monthly_cost'])

                if len(regional_costs) > 1:
                    cheapest = regional_costs[0]
                    current_region_cost = next(
                        (r for r in regional_costs if r['region'] == self.current_region),
                        cheapest
                    )

                    if current_region_cost['monthly_cost'] > cheapest['monthly_cost']:
                        savings = current_region_cost['monthly_cost'] - cheapest['monthly_cost']
                        recommendations.append({
                            'category': 'cost_optimization',
                            'priority': 'low',
                            'title': 'Regional Cost Optimization Opportunity',
                            'description': f'Current region costs ${current_region_cost["monthly_cost"]:.2f}/month vs ${cheapest["monthly_cost"]:.2f}/month in {cheapest["region"]}',
                            'recommendations': [
                                f'Consider migrating to {cheapest["region"]} region',
                                'Evaluate migration costs vs energy savings',
                                'Consider hybrid deployment across regions'
                            ],
                            'potential_savings': f'${savings:.2f}/month (${savings*12:.2f}/year)',
                            'regional_analysis': regional_costs[:3]
                        })

            return {
                "success": True,
                "host_analysis": host_analysis,
                "recommendations": recommendations,
                "analysis_period": f"Last {time_range_days} days" if not start_date else f"{start_date} to {end_date}",
                "generated_at": datetime.utcnow().isoformat(),
                "summary": {
                    "total_recommendations": len(recommendations),
                    "high_priority": len([r for r in recommendations if r.get('priority') == 'high']),
                    "medium_priority": len([r for r in recommendations if r.get('priority') == 'medium']),
                    "low_priority": len([r for r in recommendations if r.get('priority') == 'low']),
                    "categories": list(set([r.get('category', 'general') for r in recommendations]))
                }
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to generate host recommendations: {str(e)}"
            }