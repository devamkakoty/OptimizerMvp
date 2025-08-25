from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
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
            
            # Memory Optimization Recommendations
            avg_memory_gb = vm_analysis['avg_memory_mb'] / 1024
            if avg_memory_gb > 0:
                if avg_memory_gb > 8:  # High memory usage
                    recommendations.append({
                        'category': 'performance',
                        'priority': 'medium',
                        'title': 'High Memory Usage',
                        'description': f'VM is using {avg_memory_gb:.1f}GB average memory',
                        'recommendations': [
                            'Monitor for memory leaks in applications',
                            'Consider increasing memory allocation if performance issues occur',
                            'Optimize memory-intensive processes',
                            'Implement memory caching strategies'
                        ],
                        'impact': 'Potential performance bottlenecks'
                    })
                elif avg_memory_gb < 1:  # Low memory usage
                    recommendations.append({
                        'category': 'cost_optimization',
                        'priority': 'low',
                        'title': 'Low Memory Utilization',
                        'description': f'VM is using only {avg_memory_gb:.1f}GB average memory',
                        'recommendations': [
                            'Consider reducing memory allocation',
                            'Evaluate if current memory allocation is oversized'
                        ],
                        'potential_savings': 'Minor cost reduction possible'
                    })
            
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
            
            # Power/Energy Efficiency Recommendations
            avg_power = vm_analysis['avg_power_watts']
            total_energy = vm_analysis['total_energy_kwh']
            
            if avg_power > 100:  # High power consumption
                recommendations.append({
                    'category': 'sustainability',
                    'priority': 'medium',
                    'title': 'High Energy Consumption',
                    'description': f'VM consumes {avg_power:.1f}W average power ({total_energy:.2f} kWh total)',
                    'recommendations': [
                        'Implement power management policies',
                        'Optimize workload scheduling during off-peak hours',
                        'Consider migrating to more energy-efficient hardware',
                        'Review process efficiency and optimization opportunities'
                    ],
                    'environmental_impact': f'Estimated CO2 footprint: {total_energy * 0.4:.2f}kg for analyzed period'
                })
            
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