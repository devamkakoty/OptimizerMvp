from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta, date
from sqlalchemy import func, and_, desc
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
import calendar

class TimeFilterUtils:
    """Utility class for time-based filtering and aggregation of metrics data"""
    
    @staticmethod
    def build_time_filter(timestamp_column, start_date: Optional[str] = None, end_date: Optional[str] = None):
        """
        Build a SQLAlchemy filter condition for time-based queries
        
        Args:
            timestamp_column: The timestamp column to filter on
            start_date: Start date in format 'YYYY-MM-DD' (optional)
            end_date: End date in format 'YYYY-MM-DD' (optional)
            
        Returns:
            SQLAlchemy filter condition or True (no filter)
        """
        if start_date and end_date:
            try:
                start_dt, end_dt = TimeFilterUtils.parse_date_range(start_date, end_date)
                return and_(timestamp_column >= start_dt, timestamp_column <= end_dt)
            except ValueError:
                # If date parsing fails, return no filter
                return True
        elif start_date:
            try:
                start_dt, _ = TimeFilterUtils.parse_date_range(start_date, start_date)
                return timestamp_column >= start_dt
            except ValueError:
                return True
        elif end_date:
            try:
                _, end_dt = TimeFilterUtils.parse_date_range(end_date, end_date)
                return timestamp_column <= end_dt
            except ValueError:
                return True
        else:
            # No date filters, return a condition that's always true
            return True

    @staticmethod
    def parse_time_filter(time_filter: str) -> Tuple[datetime, datetime]:
        """
        Parse time filter string and return start and end datetime
        
        Args:
            time_filter: String in format 'daily', 'weekly', 'monthly', or 'custom'
            
        Returns:
            Tuple of (start_datetime, end_datetime)
        """
        now = datetime.utcnow()
        
        if time_filter == 'daily':
            # Last 24 hours
            end_time = now
            start_time = now - timedelta(days=1)
            
        elif time_filter == 'weekly':
            # Last 7 days
            end_time = now
            start_time = now - timedelta(days=7)
            
        elif time_filter == 'monthly':
            # Last 30 days
            end_time = now
            start_time = now - timedelta(days=30)
            
        elif time_filter == 'custom':
            # For custom time range, return None values to use provided start/end times
            return None, None
            
        else:
            # Default to daily if invalid filter
            end_time = now
            start_time = now - timedelta(days=1)
        
        return start_time, end_time
    
    @staticmethod
    def parse_date_range(start_date: str, end_date: str, start_time: str = "00:00:00", end_time: str = "23:59:59") -> Tuple[datetime, datetime]:
        """
        Parse date range strings and return start and end datetime
        
        Args:
            start_date: Start date in format 'YYYY-MM-DD'
            end_date: End date in format 'YYYY-MM-DD'
            start_time: Start time in format 'HH:MM:SS' (default: "00:00:00")
            end_time: End time in format 'HH:MM:SS' (default: "23:59:59")
            
        Returns:
            Tuple of (start_datetime, end_datetime)
        """
        try:
            # Parse start date and time
            start_datetime_str = f"{start_date} {start_time}"
            start_dt = datetime.strptime(start_datetime_str, "%Y-%m-%d %H:%M:%S")
            
            # Parse end date and time
            end_datetime_str = f"{end_date} {end_time}"
            end_dt = datetime.strptime(end_datetime_str, "%Y-%m-%d %H:%M:%S")
            
            return start_dt, end_dt
        except ValueError as e:
            raise ValueError(f"Invalid date/time format: {e}")
    
    @staticmethod
    def validate_date_range(start_date: str, end_date: str) -> bool:
        """
        Validate date range format and logic
        
        Args:
            start_date: Start date in format 'YYYY-MM-DD'
            end_date: End date in format 'YYYY-MM-DD'
            
        Returns:
            True if valid, False otherwise
        """
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            
            # Check if start date is before or equal to end date
            if start_dt > end_dt:
                return False
            
            # Check if dates are not too far in the future
            now = datetime.now()
            if start_dt > now or end_dt > now:
                return False
            
            return True
        except ValueError:
            return False
    
    @staticmethod
    def get_date_range_options() -> Dict[str, Any]:
        """
        Get predefined date range options for UI calendar
        
        Returns:
            Dictionary with predefined date range options
        """
        now = datetime.now()
        today = now.date()
        
        return {
            "today": {
                "label": "Today",
                "start_date": today.strftime("%Y-%m-%d"),
                "end_date": today.strftime("%Y-%m-%d"),
                "start_time": "00:00:00",
                "end_time": "23:59:59"
            },
            "yesterday": {
                "label": "Yesterday",
                "start_date": (today - timedelta(days=1)).strftime("%Y-%m-%d"),
                "end_date": (today - timedelta(days=1)).strftime("%Y-%m-%d"),
                "start_time": "00:00:00",
                "end_time": "23:59:59"
            },
            "last_7_days": {
                "label": "Last 7 Days",
                "start_date": (today - timedelta(days=6)).strftime("%Y-%m-%d"),
                "end_date": today.strftime("%Y-%m-%d"),
                "start_time": "00:00:00",
                "end_time": "23:59:59"
            },
            "last_30_days": {
                "label": "Last 30 Days",
                "start_date": (today - timedelta(days=29)).strftime("%Y-%m-%d"),
                "end_date": today.strftime("%Y-%m-%d"),
                "start_time": "00:00:00",
                "end_time": "23:59:59"
            },
            "this_week": {
                "label": "This Week",
                "start_date": (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d"),
                "end_date": today.strftime("%Y-%m-%d"),
                "start_time": "00:00:00",
                "end_time": "23:59:59"
            },
            "last_week": {
                "label": "Last Week",
                "start_date": (today - timedelta(days=today.weekday() + 7)).strftime("%Y-%m-%d"),
                "end_date": (today - timedelta(days=today.weekday() + 1)).strftime("%Y-%m-%d"),
                "start_time": "00:00:00",
                "end_time": "23:59:59"
            },
            "this_month": {
                "label": "This Month",
                "start_date": today.replace(day=1).strftime("%Y-%m-%d"),
                "end_date": today.strftime("%Y-%m-%d"),
                "start_time": "00:00:00",
                "end_time": "23:59:59"
            },
            "last_month": {
                "label": "Last Month",
                "first_day_this_month = today.replace(day=1)": "",
                "last_day_last_month = first_day_this_month - timedelta(days=1)": "",
                "first_day_last_month = last_day_last_month.replace(day=1)": "",
                "start_date": (today.replace(day=1) - timedelta(days=1)).replace(day=1).strftime("%Y-%m-%d"),
                "end_date": (today.replace(day=1) - timedelta(days=1)).strftime("%Y-%m-%d"),
                "start_time": "00:00:00",
                "end_time": "23:59:59"
            }
        }
    
    @staticmethod
    def apply_time_filter(query, model_class, start_time: Optional[datetime] = None, 
                         end_time: Optional[datetime] = None, time_filter: Optional[str] = None,
                         start_date: Optional[str] = None, end_date: Optional[str] = None,
                         start_time_str: Optional[str] = None, end_time_str: Optional[str] = None):
        """
        Apply time filtering to a SQLAlchemy query
        
        Args:
            query: SQLAlchemy query object
            model_class: The model class with timestamp field
            start_time: Custom start time (optional)
            end_time: Custom end time (optional)
            time_filter: Time filter string ('daily', 'weekly', 'monthly', 'custom')
            start_date: Start date in format 'YYYY-MM-DD' (for date range)
            end_date: End date in format 'YYYY-MM-DD' (for date range)
            start_time_str: Start time in format 'HH:MM:SS' (for date range)
            end_time_str: End time in format 'HH:MM:SS' (for date range)
            
        Returns:
            Modified query with time filters applied
        """
        # Priority: date range > time filter > custom start/end times
        if start_date and end_date:
            # Use date range filtering
            try:
                start_dt, end_dt = TimeFilterUtils.parse_date_range(
                    start_date, end_date, 
                    start_time_str or "00:00:00", 
                    end_time_str or "23:59:59"
                )
                query = query.filter(model_class.timestamp >= start_dt)
                query = query.filter(model_class.timestamp <= end_dt)
            except ValueError:
                # If date parsing fails, fall back to time filter
                pass
        elif time_filter and time_filter != 'custom':
            # Use predefined time ranges
            filter_start, filter_end = TimeFilterUtils.parse_time_filter(time_filter)
            if filter_start:
                query = query.filter(model_class.timestamp >= filter_start)
            if filter_end:
                query = query.filter(model_class.timestamp <= filter_end)
        else:
            # Use custom start/end times
            if start_time:
                query = query.filter(model_class.timestamp >= start_time)
            if end_time:
                query = query.filter(model_class.timestamp <= end_time)
        
        return query
    
    @staticmethod
    def get_aggregated_metrics(db: Session, model_class, time_filter: str = 'daily',
                              group_by_field: Optional[str] = None, 
                              additional_filters: Optional[Dict] = None,
                              start_date: Optional[str] = None, end_date: Optional[str] = None,
                              start_time_str: Optional[str] = None, end_time_str: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get aggregated metrics data based on time filter or date range
        
        Args:
            db: Database session
            model_class: The model class to query
            time_filter: Time filter string ('daily', 'weekly', 'monthly')
            group_by_field: Field to group by (e.g., 'vm_name', 'process_name')
            additional_filters: Additional filters to apply
            start_date: Start date in format 'YYYY-MM-DD' (for date range)
            end_date: End date in format 'YYYY-MM-DD' (for date range)
            start_time_str: Start time in format 'HH:MM:SS' (for date range)
            end_time_str: End time in format 'HH:MM:SS' (for date range)
            
        Returns:
            List of aggregated metrics data
        """
        # Build base query
        query = db.query(model_class)
        
        # Apply time filtering
        if start_date and end_date:
            # Use date range filtering
            try:
                start_dt, end_dt = TimeFilterUtils.parse_date_range(
                    start_date, end_date, 
                    start_time_str or "00:00:00", 
                    end_time_str or "23:59:59"
                )
                query = query.filter(model_class.timestamp >= start_dt)
                query = query.filter(model_class.timestamp <= end_dt)
            except ValueError:
                # If date parsing fails, fall back to time filter
                filter_start, filter_end = TimeFilterUtils.parse_time_filter(time_filter)
                if filter_start:
                    query = query.filter(model_class.timestamp >= filter_start)
                if filter_end:
                    query = query.filter(model_class.timestamp <= filter_end)
        else:
            # Use time filter
            filter_start, filter_end = TimeFilterUtils.parse_time_filter(time_filter)
            if filter_start:
                query = query.filter(model_class.timestamp >= filter_start)
            if filter_end:
                query = query.filter(model_class.timestamp <= filter_end)
        
        # Apply additional filters
        if additional_filters:
            for field, value in additional_filters.items():
                if value is not None and hasattr(model_class, field):
                    query = query.filter(getattr(model_class, field) == value)
        
        if group_by_field and hasattr(model_class, group_by_field):
            # Group by specified field and aggregate
            if hasattr(model_class, 'cpu_usage_percent') and hasattr(model_class, 'memory_usage_mb'):
                # For host process metrics (uses composite primary key: timestamp + process_id)
                aggregated = query.with_entities(
                    getattr(model_class, group_by_field),
                    func.count(model_class.process_id).label('count'),
                    func.avg(model_class.cpu_usage_percent).label('avg_cpu'),
                    func.avg(model_class.memory_usage_mb).label('avg_memory'),
                    func.avg(model_class.gpu_memory_usage_mb).label('avg_gpu_memory'),
                    func.avg(model_class.gpu_utilization_percent).label('avg_gpu_util'),
                    func.max(model_class.cpu_usage_percent).label('max_cpu'),
                    func.max(model_class.memory_usage_mb).label('max_memory'),
                    func.max(model_class.gpu_memory_usage_mb).label('max_gpu_memory'),
                    func.max(model_class.gpu_utilization_percent).label('max_gpu_util')
                ).group_by(getattr(model_class, group_by_field)).all()
                
                return [
                    {
                        group_by_field: getattr(record, group_by_field),
                        'count': record.count,
                        'avg_cpu_usage': float(record.avg_cpu) if record.avg_cpu else 0,
                        'avg_memory_usage': float(record.avg_memory) if record.avg_memory else 0,
                        'avg_gpu_memory': float(record.avg_gpu_memory) if record.avg_gpu_memory else 0,
                        'avg_gpu_utilization': float(record.avg_gpu_util) if record.avg_gpu_util else 0,
                        'max_cpu_usage': float(record.max_cpu) if record.max_cpu else 0,
                        'max_memory_usage': float(record.max_memory) if record.max_memory else 0,
                        'max_gpu_memory': float(record.max_gpu_memory) if record.max_gpu_memory else 0,
                        'max_gpu_utilization': float(record.max_gpu_util) if record.max_gpu_util else 0
                    }
                    for record in aggregated
                ]
            
            elif hasattr(model_class, 'cpu_usage_percent') and hasattr(model_class, 'id') and not hasattr(model_class, 'memory_usage_mb'):
                # For monitoring metrics with single id primary key (but NOT host process metrics)
                aggregated = query.with_entities(
                    getattr(model_class, group_by_field),
                    func.count(model_class.id).label('count'),
                    func.avg(model_class.cpu_usage_percent).label('avg_cpu'),
                    func.avg(model_class.memory_usage_percent).label('avg_memory'),
                    func.avg(model_class.gpu_usage_percent).label('avg_gpu'),
                    func.max(model_class.cpu_usage_percent).label('max_cpu'),
                    func.max(model_class.memory_usage_percent).label('max_memory'),
                    func.max(model_class.gpu_usage_percent).label('max_gpu')
                ).group_by(getattr(model_class, group_by_field)).all()
                
                return [
                    {
                        group_by_field: getattr(record, group_by_field),
                        'count': record.count,
                        'avg_cpu_usage': float(record.avg_cpu) if record.avg_cpu else 0,
                        'avg_memory_usage': float(record.avg_memory) if record.avg_memory else 0,
                        'avg_gpu_usage': float(record.avg_gpu) if record.avg_gpu else 0,
                        'max_cpu_usage': float(record.max_cpu) if record.max_cpu else 0,
                        'max_memory_usage': float(record.max_memory) if record.max_memory else 0,
                        'max_gpu_usage': float(record.max_gpu) if record.max_gpu else 0
                    }
                    for record in aggregated
                ]
            
            elif hasattr(model_class, 'cpu_usage') and hasattr(model_class, 'id'):
                # For VM metrics with single id primary key
                aggregated = query.with_entities(
                    getattr(model_class, group_by_field),
                    func.count(model_class.id).label('count'),
                    func.avg(model_class.cpu_usage).label('avg_cpu'),
                    func.avg(model_class.average_memory_usage).label('avg_memory'),
                    func.max(model_class.cpu_usage).label('max_cpu'),
                    func.max(model_class.average_memory_usage).label('max_memory')
                ).group_by(getattr(model_class, group_by_field)).all()
                
                return [
                    {
                        group_by_field: getattr(record, group_by_field),
                        'count': record.count,
                        'avg_cpu_usage': float(record.avg_cpu) if record.avg_cpu else 0,
                        'avg_memory_usage': float(record.avg_memory) if record.avg_memory else 0,
                        'max_cpu_usage': float(record.max_cpu) if record.max_cpu else 0,
                        'max_memory_usage': float(record.max_memory) if record.max_memory else 0
                    }
                    for record in aggregated
                ]
        
        # If no group by, return overall summary
        total_count = query.count()
        if total_count == 0:
            return []
        
        # Get overall averages - check HostProcessMetric first
        if hasattr(model_class, 'cpu_usage_percent') and hasattr(model_class, 'memory_usage_mb'):
            # Host process metrics
            avg_cpu = db.query(func.avg(model_class.cpu_usage_percent)).scalar() or 0
            avg_memory = db.query(func.avg(model_class.memory_usage_mb)).scalar() or 0
            avg_gpu_memory = db.query(func.avg(model_class.gpu_memory_usage_mb)).scalar() or 0
            avg_gpu_util = db.query(func.avg(model_class.gpu_utilization_percent)).scalar() or 0
            
            return [{
                'total_records': total_count,
                'avg_cpu_usage_percent': float(avg_cpu),
                'avg_memory_usage_mb': float(avg_memory),
                'avg_gpu_memory_usage_mb': float(avg_gpu_memory),
                'avg_gpu_utilization_percent': float(avg_gpu_util),
                'time_filter': time_filter,
                'date_range': f"{start_date} to {end_date}" if start_date and end_date else None
            }]
        
        elif hasattr(model_class, 'cpu_usage_percent'):
            # Other monitoring metrics
            avg_cpu = db.query(func.avg(model_class.cpu_usage_percent)).filter(
                model_class.cpu_usage_percent.isnot(None)
            ).scalar() or 0
            avg_memory = db.query(func.avg(model_class.memory_usage_percent)).filter(
                model_class.memory_usage_percent.isnot(None)
            ).scalar() or 0
            avg_gpu = db.query(func.avg(model_class.gpu_usage_percent)).filter(
                model_class.gpu_usage_percent.isnot(None)
            ).scalar() or 0
            
            return [{
                'total_records': total_count,
                'avg_cpu_usage': float(avg_cpu),
                'avg_memory_usage': float(avg_memory),
                'avg_gpu_usage': float(avg_gpu),
                'time_filter': time_filter,
                'date_range': f"{start_date} to {end_date}" if start_date and end_date else None
            }]
        
        elif hasattr(model_class, 'cpu_usage'):
            # VM metrics
            avg_cpu = db.query(func.avg(model_class.cpu_usage)).filter(
                model_class.cpu_usage.isnot(None)
            ).scalar() or 0
            avg_memory = db.query(func.avg(model_class.average_memory_usage)).filter(
                model_class.average_memory_usage.isnot(None)
            ).scalar() or 0
            
            return [{
                'total_records': total_count,
                'avg_cpu_usage': float(avg_cpu),
                'avg_memory_usage': float(avg_memory),
                'time_filter': time_filter,
                'date_range': f"{start_date} to {end_date}" if start_date and end_date else None
            }]
        
        
        return []
    
    @staticmethod
    def get_time_based_data(db: Session, model_class, time_filter: str = 'daily',
                           start_time: Optional[datetime] = None,
                           end_time: Optional[datetime] = None,
                           additional_filters: Optional[Dict] = None,
                           limit: int = 1000,
                           start_date: Optional[str] = None, end_date: Optional[str] = None,
                           start_time_str: Optional[str] = None, end_time_str: Optional[str] = None) -> Dict[str, Any]:
        """
        Get time-based filtered data with optional aggregation
        
        Args:
            db: Database session
            model_class: The model class to query
            time_filter: Time filter string ('daily', 'weekly', 'monthly', 'custom')
            start_time: Custom start time (for custom filter)
            end_time: Custom end time (for custom filter)
            additional_filters: Additional filters to apply
            limit: Maximum number of records to return
            start_date: Start date in format 'YYYY-MM-DD' (for date range)
            end_date: End date in format 'YYYY-MM-DD' (for date range)
            start_time_str: Start time in format 'HH:MM:SS' (for date range)
            end_time_str: End time in format 'HH:MM:SS' (for date range)
            
        Returns:
            Dictionary with filtered data and metadata
        """
        try:
            # Build base query
            query = db.query(model_class)
            
            # Apply time filtering with priority: date range > time filter > custom times
            if start_date and end_date:
                # Use date range filtering
                try:
                    start_dt, end_dt = TimeFilterUtils.parse_date_range(
                        start_date, end_date, 
                        start_time_str or "00:00:00", 
                        end_time_str or "23:59:59"
                    )
                    query = query.filter(model_class.timestamp >= start_dt)
                    query = query.filter(model_class.timestamp <= end_dt)
                    filter_type = "date_range"
                except ValueError:
                    # If date parsing fails, fall back to time filter
                    if time_filter == 'custom':
                        if start_time:
                            query = query.filter(model_class.timestamp >= start_time)
                        if end_time:
                            query = query.filter(model_class.timestamp <= end_time)
                    else:
                        filter_start, filter_end = TimeFilterUtils.parse_time_filter(time_filter)
                        if filter_start:
                            query = query.filter(model_class.timestamp >= filter_start)
                        if filter_end:
                            query = query.filter(model_class.timestamp <= filter_end)
                    filter_type = time_filter or 'custom'
            elif time_filter == 'custom':
                if start_time:
                    query = query.filter(model_class.timestamp >= start_time)
                if end_time:
                    query = query.filter(model_class.timestamp <= end_time)
                filter_type = 'custom'
            else:
                filter_start, filter_end = TimeFilterUtils.parse_time_filter(time_filter)
                if filter_start:
                    query = query.filter(model_class.timestamp >= filter_start)
                if filter_end:
                    query = query.filter(model_class.timestamp <= filter_end)
                filter_type = time_filter
            
            # Apply additional filters
            if additional_filters:
                for field, value in additional_filters.items():
                    if value is not None and hasattr(model_class, field):
                        query = query.filter(getattr(model_class, field) == value)
            
            # Order by timestamp and limit
            query = query.order_by(desc(model_class.timestamp)).limit(limit)
            
            # Execute query
            records = query.all()
            
            # Convert to dictionary format
            data = []
            for record in records:
                record_dict = {}
                for column in record.__table__.columns:
                    value = getattr(record, column.name)
                    if isinstance(value, datetime):
                        record_dict[column.name] = value.isoformat()
                    else:
                        record_dict[column.name] = value
                data.append(record_dict)
            
            return {
                "success": True,
                "data": data,
                "count": len(data),
                "filter_type": filter_type,
                "filters_applied": {
                    "filter_type": filter_type,
                    "time_filter": time_filter if filter_type != "date_range" else None,
                    "start_date": start_date if filter_type == "date_range" else None,
                    "end_date": end_date if filter_type == "date_range" else None,
                    "start_time": start_time.isoformat() if start_time else None,
                    "end_time": end_time.isoformat() if end_time else None,
                    "additional_filters": additional_filters
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to get time-based data: {str(e)}",
                "filter_type": "date_range" if start_date and end_date else time_filter
            } 