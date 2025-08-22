from sqlalchemy.orm import Session
from sqlalchemy import and_, func, text
from app.models.cost_models import CostModel
from app.models.host_process_metrics import HostProcessMetric
from app.models.host_overall_metrics import HostOverallMetric
from app.models.hardware_specs import HardwareSpecs
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import configparser
import os

class CostCalculationEngine:
    """Engine for calculating energy consumption and monetary costs"""
    
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
        self.default_region = settings.get('current_region', 'US')
    
    def get_electricity_cost(self, db: Session, region: str = None) -> float:
        """Get electricity cost per kWh for a specific region"""
        try:
            if not region:
                region = self.default_region
            
            cost_model = db.query(CostModel).filter(
                and_(
                    CostModel.resource_name == 'ELECTRICITY_KWH',
                    CostModel.region == region
                )
            ).first()
            
            if cost_model:
                return cost_model.cost_per_unit
            else:
                return self.default_cost_per_kwh
                
        except Exception:
            return self.default_cost_per_kwh
    
    def calculate_energy_consumption_kwh(self, power_watts: float, duration_hours: float) -> float:
        """Calculate energy consumption in kWh"""
        return (power_watts * duration_hours) / 1000.0
    
    def calculate_process_cost_over_time(
        self, 
        db: Session, 
        process_name: str = None,
        process_id: int = None,
        start_time: datetime = None,
        end_time: datetime = None,
        region: str = None
    ) -> Dict[str, Any]:
        """Calculate the total cost for a process over a time period"""
        try:
            # Default time range: last 24 hours
            if not end_time:
                end_time = datetime.utcnow()
            if not start_time:
                start_time = end_time - timedelta(hours=24)
            
            # Build query
            query = db.query(HostProcessMetric).filter(
                and_(
                    HostProcessMetric.timestamp >= start_time,
                    HostProcessMetric.timestamp <= end_time
                )
            )
            
            if process_name:
                query = query.filter(HostProcessMetric.process_name == process_name)
            if process_id:
                query = query.filter(HostProcessMetric.process_id == process_id)
            
            # Get all process metrics in the time range
            process_metrics = query.all()
            
            if not process_metrics:
                return {
                    "success": True,
                    "message": "No process metrics found for the specified criteria",
                    "total_energy_kwh": 0,
                    "total_cost": 0,
                    "currency": self.default_currency,
                    "region": region or self.default_region,
                    "data_points": 0
                }
            
            # Calculate total energy consumption
            total_energy_kwh = 0
            data_points = len(process_metrics)
            
            # Assume each metric represents a 1-minute interval (adjust based on your collection frequency)
            interval_hours = 1 / 60.0  # 1 minute in hours
            
            for metric in process_metrics:
                if metric.estimated_power_watts:
                    energy_kwh = self.calculate_energy_consumption_kwh(
                        metric.estimated_power_watts, 
                        interval_hours
                    )
                    total_energy_kwh += energy_kwh
            
            # Get electricity cost for the region
            electricity_cost_per_kwh = self.get_electricity_cost(db, region)
            
            # Calculate total monetary cost
            total_cost = total_energy_kwh * electricity_cost_per_kwh
            
            return {
                "success": True,
                "process_name": process_name,
                "process_id": process_id,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "total_energy_kwh": round(total_energy_kwh, 4),
                "total_cost": round(total_cost, 4),
                "electricity_cost_per_kwh": electricity_cost_per_kwh,
                "currency": self.default_currency,
                "region": region or self.default_region,
                "data_points": data_points,
                "interval_hours": interval_hours
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to calculate process cost: {str(e)}"
            }
    
    def get_process_cost_summary(
        self, 
        db: Session,
        start_time: datetime = None,
        end_time: datetime = None,
        region: str = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get cost summary for all processes over a time period"""
        try:
            # Default time range: last 24 hours
            if not end_time:
                end_time = datetime.utcnow()
            if not start_time:
                start_time = end_time - timedelta(hours=24)
            
            # Get electricity cost for the region
            electricity_cost_per_kwh = self.get_electricity_cost(db, region)
            interval_hours = 1 / 60.0  # Assume 1-minute intervals
            
            # Aggregate query to get power consumption by process
            query = db.query(
                HostProcessMetric.process_name,
                func.sum(HostProcessMetric.estimated_power_watts).label('total_power_watts'),
                func.count(HostProcessMetric.estimated_power_watts).label('data_points'),
                func.avg(HostProcessMetric.estimated_power_watts).label('avg_power_watts'),
                func.max(HostProcessMetric.estimated_power_watts).label('max_power_watts')
            ).filter(
                and_(
                    HostProcessMetric.timestamp >= start_time,
                    HostProcessMetric.timestamp <= end_time,
                    HostProcessMetric.estimated_power_watts.isnot(None)
                )
            ).group_by(
                HostProcessMetric.process_name
            ).order_by(
                func.sum(HostProcessMetric.estimated_power_watts).desc()
            ).limit(limit)
            
            results = query.all()
            
            process_costs = []
            total_energy_kwh = 0
            total_cost = 0
            
            for result in results:
                # Calculate energy consumption for this process
                # total_power_watts represents sum of all power measurements
                # We need to convert this to energy consumption
                energy_kwh = (result.total_power_watts * interval_hours) / 1000.0
                cost = energy_kwh * electricity_cost_per_kwh
                
                total_energy_kwh += energy_kwh
                total_cost += cost
                
                process_costs.append({
                    "process_name": result.process_name,
                    "total_energy_kwh": round(energy_kwh, 4),
                    "cost": round(cost, 4),
                    "avg_power_watts": round(float(result.avg_power_watts), 2),
                    "max_power_watts": round(float(result.max_power_watts), 2),
                    "data_points": result.data_points
                })
            
            return {
                "success": True,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "region": region or self.default_region,
                "electricity_cost_per_kwh": electricity_cost_per_kwh,
                "currency": self.default_currency,
                "total_energy_kwh": round(total_energy_kwh, 4),
                "total_cost": round(total_cost, 4),
                "process_costs": process_costs,
                "process_count": len(process_costs)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get process cost summary: {str(e)}"
            }
    
    def get_energy_trend_over_time(
        self,
        db: Session,
        start_time: datetime = None,
        end_time: datetime = None,
        interval: str = "hour",  # hour, day, week
        region: str = None
    ) -> Dict[str, Any]:
        """Get energy consumption and cost trends over time"""
        try:
            # Default time range: last 7 days
            if not end_time:
                end_time = datetime.utcnow()
            if not start_time:
                start_time = end_time - timedelta(days=7)
            
            # Get electricity cost for the region
            electricity_cost_per_kwh = self.get_electricity_cost(db, region)
            
            # Build time grouping based on interval
            if interval == "hour":
                time_group = func.date_trunc('hour', HostProcessMetric.timestamp)
                interval_hours = 1.0
            elif interval == "day":
                time_group = func.date_trunc('day', HostProcessMetric.timestamp)
                interval_hours = 24.0
            elif interval == "week":
                time_group = func.date_trunc('week', HostProcessMetric.timestamp)
                interval_hours = 168.0
            else:
                time_group = func.date_trunc('hour', HostProcessMetric.timestamp)
                interval_hours = 1.0
            
            # Query for time-based aggregation
            query = db.query(
                time_group.label('time_period'),
                func.sum(HostProcessMetric.estimated_power_watts).label('total_power_watts'),
                func.count(HostProcessMetric.estimated_power_watts).label('data_points')
            ).filter(
                and_(
                    HostProcessMetric.timestamp >= start_time,
                    HostProcessMetric.timestamp <= end_time,
                    HostProcessMetric.estimated_power_watts.isnot(None)
                )
            ).group_by(
                time_group
            ).order_by(
                time_group
            )
            
            results = query.all()
            
            trend_data = []
            total_energy_kwh = 0
            total_cost = 0
            
            for result in results:
                # Convert aggregated power to energy consumption
                # For time-based aggregation, we need to consider the measurement frequency
                measurement_interval_hours = 1 / 60.0  # Assume 1-minute measurements
                energy_kwh = (result.total_power_watts * measurement_interval_hours) / 1000.0
                cost = energy_kwh * electricity_cost_per_kwh
                
                total_energy_kwh += energy_kwh
                total_cost += cost
                
                trend_data.append({
                    "time_period": result.time_period.isoformat(),
                    "energy_kwh": round(energy_kwh, 4),
                    "cost": round(cost, 4),
                    "data_points": result.data_points
                })
            
            return {
                "success": True,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "interval": interval,
                "region": region or self.default_region,
                "electricity_cost_per_kwh": electricity_cost_per_kwh,
                "currency": self.default_currency,
                "total_energy_kwh": round(total_energy_kwh, 4),
                "total_cost": round(total_cost, 4),
                "trend_data": trend_data,
                "data_points": len(trend_data)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get energy trend: {str(e)}"
            }