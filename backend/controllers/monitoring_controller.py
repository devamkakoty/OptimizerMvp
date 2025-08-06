from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from app.models import HardwareMonitoring
from datetime import datetime, timedelta
import json
import asyncio
from collections import deque
import threading
import time

class MonitoringController:
    def __init__(self):
        # In-memory buffer for batch processing
        self.metrics_buffer = deque(maxlen=10000)  # Buffer up to 10k records
        self.batch_size = 1000  # Process in batches of 1000
        self.last_batch_time = time.time()
        self.batch_interval = 3600  # 1 hour in seconds
        self.lock = threading.Lock()
        
        # Start background batch processor
        self._start_batch_processor()
    
    def _start_batch_processor(self):
        """Start background thread for batch processing"""
        def batch_worker():
            while True:
                try:
                    time.sleep(60)  # Check every minute
                    self._process_batch()
                except Exception as e:
                    print(f"Batch processor error: {e}")
        
        thread = threading.Thread(target=batch_worker, daemon=True)
        thread.start()
    
    def _process_batch(self):
        """Process buffered metrics in batches"""
        with self.lock:
            if len(self.metrics_buffer) >= self.batch_size or \
               (len(self.metrics_buffer) > 0 and time.time() - self.last_batch_time >= self.batch_interval):
                
                # Get metrics to process
                metrics_to_process = []
                while len(self.metrics_buffer) > 0 and len(metrics_to_process) < self.batch_size:
                    metrics_to_process.append(self.metrics_buffer.popleft())
                
                if metrics_to_process:
                    print(f"Processing batch of {len(metrics_to_process)} metrics")
                    # This would be called with a database session
                    # For now, we'll store the batch for later processing
                    self._store_batch(metrics_to_process)
                    self.last_batch_time = time.time()
    
    def _store_batch(self, metrics_batch: List[Dict[str, Any]]):
        """Store a batch of metrics to database"""
        # This method is called from background thread, so we need a new session
        from app.database import MetricsSessionLocal
        
        db = MetricsSessionLocal()
        try:
            # Convert dict data to HardwareMonitoring objects
            monitoring_records = []
            for metrics_data in metrics_batch:
                monitoring_record = HardwareMonitoring(
                    hardware_id=metrics_data['hardware_id'],
                    cpu_usage_percent=metrics_data['cpu_usage_percent'],
                    gpu_usage_percent=metrics_data.get('gpu_usage_percent'),
                    memory_usage_percent=metrics_data['memory_usage_percent'],
                    temperature_cpu=metrics_data.get('temperature_cpu'),
                    temperature_gpu=metrics_data.get('temperature_gpu'),
                    power_consumption_watts=metrics_data.get('power_consumption_watts'),
                    network_usage_mbps=metrics_data.get('network_usage_mbps'),
                    disk_usage_percent=metrics_data.get('disk_usage_percent'),
                    additional_metrics=metrics_data.get('additional_metrics'),
                    timestamp=metrics_data['timestamp']
                )
                monitoring_records.append(monitoring_record)
            
            # Bulk insert all records
            db.bulk_save_objects(monitoring_records)
            db.commit()
            
            print(f"Successfully stored {len(metrics_batch)} metrics to database")
        except Exception as e:
            db.rollback()
            print(f"Failed to store metrics batch: {e}")
        finally:
            db.close()
    
    def push_metrics_data(self, db: Session, metrics_data: Dict[str, Any]) -> Dict[str, Any]:
        """Push resource metrics data to buffer for batch processing"""
        try:
            # Validate required fields
            required_fields = ['hardware_id', 'cpu_usage_percent', 'gpu_usage_percent', 
                             'memory_usage_percent', 'timestamp']
            
            for field in required_fields:
                if field not in metrics_data:
                    return {"error": f"Missing required field: {field}"}
            
            # Add timestamp if not provided
            if 'timestamp' not in metrics_data or not metrics_data['timestamp']:
                metrics_data['timestamp'] = datetime.utcnow()
            
            # Add to buffer for batch processing
            with self.lock:
                self.metrics_buffer.append(metrics_data)
            
            return {
                "status": "success",
                "message": f"Metrics data buffered. Buffer size: {len(self.metrics_buffer)}",
                "timestamp": metrics_data['timestamp'].isoformat() if isinstance(metrics_data['timestamp'], datetime) else metrics_data['timestamp']
            }
        except Exception as e:
            return {"error": f"Failed to push metrics data: {str(e)}"}
    
    def push_metrics_batch(self, db: Session, metrics_batch: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Push multiple metrics records at once for efficient processing"""
        try:
            if not metrics_batch:
                return {"error": "No metrics data provided"}
            
            # Validate all records
            for i, record in enumerate(metrics_batch):
                required_fields = ['hardware_id', 'cpu_usage_percent', 'gpu_usage_percent', 
                                 'memory_usage_percent', 'timestamp']
                
                for field in required_fields:
                    if field not in record:
                        return {"error": f"Missing required field '{field}' in record {i}"}
                
                # Add timestamp if not provided
                if 'timestamp' not in record or not record['timestamp']:
                    record['timestamp'] = datetime.utcnow()
            
            # Add all records to buffer
            with self.lock:
                for record in metrics_batch:
                    self.metrics_buffer.append(record)
            
            return {
                "status": "success",
                "message": f"Batch of {len(metrics_batch)} metrics buffered. Buffer size: {len(self.metrics_buffer)}",
                "records_processed": len(metrics_batch)
            }
        except Exception as e:
            return {"error": f"Failed to push metrics batch: {str(e)}"}
    
    def get_metrics_data(self, db: Session, 
                        start_time: Optional[datetime] = None,
                        end_time: Optional[datetime] = None,
                        hardware_id: Optional[int] = None,
                        limit: int = 1000) -> Dict[str, Any]:
        """Get metrics data with filtering capabilities"""
        try:
            query = db.query(HardwareMonitoring)
            
            # Apply filters
            if start_time:
                query = query.filter(HardwareMonitoring.timestamp >= start_time)
            
            if end_time:
                query = query.filter(HardwareMonitoring.timestamp <= end_time)
            
            if hardware_id:
                query = query.filter(HardwareMonitoring.hardware_id == hardware_id)
            
            # Order by timestamp descending (most recent first)
            query = query.order_by(desc(HardwareMonitoring.timestamp))
            
            # Apply limit
            query = query.limit(limit)
            
            # Execute query
            metrics = query.all()
            
            # Convert to list of dictionaries
            metrics_data = []
            for metric in metrics:
                metrics_data.append(metric.to_dict())
            
            return {
                "status": "success",
                "metrics": metrics_data,
                "count": len(metrics_data),
                "filters": {
                    "start_time": start_time.isoformat() if start_time else None,
                    "end_time": end_time.isoformat() if end_time else None,
                    "hardware_id": hardware_id,
                    "limit": limit
                }
            }
        except Exception as e:
            return {"error": f"Failed to get metrics data: {str(e)}"}
    
    def get_metrics_summary(self, db: Session,
                           start_time: Optional[datetime] = None,
                           end_time: Optional[datetime] = None,
                           hardware_id: Optional[int] = None) -> Dict[str, Any]:
        """Get summary statistics for metrics data"""
        try:
            query = db.query(HardwareMonitoring)
            
            # Apply filters
            if start_time:
                query = query.filter(HardwareMonitoring.timestamp >= start_time)
            
            if end_time:
                query = query.filter(HardwareMonitoring.timestamp <= end_time)
            
            if hardware_id:
                query = query.filter(HardwareMonitoring.hardware_id == hardware_id)
            
            # Get summary statistics
            summary = db.query(
                func.count(HardwareMonitoring.id).label('total_records'),
                func.avg(HardwareMonitoring.cpu_usage_percent).label('avg_cpu_usage'),
                func.avg(HardwareMonitoring.gpu_usage_percent).label('avg_gpu_usage'),
                func.avg(HardwareMonitoring.memory_usage_percent).label('avg_memory_usage'),
                func.max(HardwareMonitoring.cpu_usage_percent).label('max_cpu_usage'),
                func.max(HardwareMonitoring.gpu_usage_percent).label('max_gpu_usage'),
                func.max(HardwareMonitoring.memory_usage_percent).label('max_memory_usage'),
                func.min(HardwareMonitoring.timestamp).label('earliest_timestamp'),
                func.max(HardwareMonitoring.timestamp).label('latest_timestamp')
            ).filter(query.whereclause).first()
            
            if summary:
                return {
                    "status": "success",
                    "summary": {
                        "total_records": summary.total_records,
                        "avg_cpu_usage": float(summary.avg_cpu_usage) if summary.avg_cpu_usage else 0,
                        "avg_gpu_usage": float(summary.avg_gpu_usage) if summary.avg_gpu_usage else 0,
                        "avg_memory_usage": float(summary.avg_memory_usage) if summary.avg_memory_usage else 0,
                        "max_cpu_usage": float(summary.max_cpu_usage) if summary.max_cpu_usage else 0,
                        "max_gpu_usage": float(summary.max_gpu_usage) if summary.max_gpu_usage else 0,
                        "max_memory_usage": float(summary.max_memory_usage) if summary.max_memory_usage else 0,
                        "earliest_timestamp": summary.earliest_timestamp.isoformat() if summary.earliest_timestamp else None,
                        "latest_timestamp": summary.latest_timestamp.isoformat() if summary.latest_timestamp else None
                    },
                    "filters": {
                        "start_time": start_time.isoformat() if start_time else None,
                        "end_time": end_time.isoformat() if end_time else None,
                        "hardware_id": hardware_id
                    }
                }
            else:
                return {
                    "status": "success",
                    "summary": {
                        "total_records": 0,
                        "avg_cpu_usage": 0,
                        "avg_gpu_usage": 0,
                        "avg_memory_usage": 0,
                        "max_cpu_usage": 0,
                        "max_gpu_usage": 0,
                        "max_memory_usage": 0,
                        "earliest_timestamp": None,
                        "latest_timestamp": None
                    },
                    "filters": {
                        "start_time": start_time.isoformat() if start_time else None,
                        "end_time": end_time.isoformat() if end_time else None,
                        "hardware_id": hardware_id
                    }
                }
        except Exception as e:
            return {"error": f"Failed to get metrics summary: {str(e)}"}
    
    def force_process_batch(self, db: Session) -> Dict[str, Any]:
        """Force process the current buffer immediately"""
        try:
            with self.lock:
                metrics_to_process = list(self.metrics_buffer)
                self.metrics_buffer.clear()
            
            if not metrics_to_process:
                return {"status": "success", "message": "No metrics in buffer to process"}
            
            # Process the batch
            self._store_batch(metrics_to_process)
            self.last_batch_time = time.time()
            
            return {
                "status": "success",
                "message": f"Processed {len(metrics_to_process)} metrics from buffer",
                "records_processed": len(metrics_to_process)
            }
        except Exception as e:
            return {"error": f"Failed to force process batch: {str(e)}"}
    
    def get_buffer_status(self) -> Dict[str, Any]:
        """Get current buffer status"""
        with self.lock:
            return {
                "status": "success",
                "buffer_size": len(self.metrics_buffer),
                "buffer_capacity": self.metrics_buffer.maxlen,
                "last_batch_time": self.last_batch_time,
                "time_since_last_batch": time.time() - self.last_batch_time,
                "batch_interval": self.batch_interval
            } 