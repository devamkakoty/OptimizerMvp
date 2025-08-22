from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from app.models.cost_models import CostModel
from app.models.host_process_metrics import HostProcessMetric
from app.models.host_overall_metrics import HostOverallMetric
from app.models.hardware_specs import HardwareSpecs
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
        time_range_days: int = 7
    ) -> Dict[str, Any]:
        """Analyze historical resource consumption of a workload"""
        try:
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
        projection_days: int = 30
    ) -> Dict[str, Any]:
        """Generate cost-saving migration recommendations"""
        try:
            # Step 1: Analyze current workload
            workload_result = self.analyze_workload_resource_consumption(
                db, workload_filter, time_range_days
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
        limit: int = 10
    ) -> Dict[str, Any]:
        """Get top energy-consuming processes for optimization recommendations"""
        try:
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