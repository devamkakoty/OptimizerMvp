import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text, and_, func, desc
from sqlalchemy.exc import SQLAlchemyError
from app.models.vm_process_metrics import VMProcessMetric

logger = logging.getLogger(__name__)

class VMProcessMetricsController:
    """Controller for managing VM process metrics data in TimescaleDB"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def push_vm_process_metrics(self, db: Session, metrics_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Push single VM process metrics data to TimescaleDB
        
        Args:
            db: Database session
            metrics_data: Dictionary containing process metrics
            
        Returns:
            Result dictionary with success status and message
        """
        try:
            # Parse timestamp
            if isinstance(metrics_data.get('timestamp'), str):
                timestamp = datetime.fromisoformat(metrics_data['timestamp'].replace('Z', '+00:00'))
            else:
                timestamp = metrics_data.get('timestamp', datetime.utcnow())
            
            # Parse start_time
            start_time = None
            if metrics_data.get('start_time'):
                try:
                    if isinstance(metrics_data['start_time'], str):
                        start_time = datetime.fromisoformat(metrics_data['start_time'].replace('Z', '+00:00'))
                    else:
                        start_time = metrics_data['start_time']
                except Exception:
                    start_time = None
            
            # Create VM process metrics record
            vm_process_metric = VMProcessMetric(
                timestamp=timestamp,
                process_id=metrics_data['process_id'],
                vm_name=metrics_data['vm_name'],
                process_name=metrics_data.get('process_name'),
                username=metrics_data.get('username'),
                status=metrics_data.get('status'),
                start_time=start_time,
                cpu_usage_percent=metrics_data.get('cpu_usage_percent'),
                memory_usage_mb=metrics_data.get('memory_usage_mb'),
                memory_usage_percent=metrics_data.get('memory_usage_percent'),
                read_bytes=metrics_data.get('read_bytes'),
                write_bytes=metrics_data.get('write_bytes'),
                iops=metrics_data.get('iops'),
                open_files=metrics_data.get('open_files'),
                gpu_memory_usage_mb=metrics_data.get('gpu_memory_usage_mb'),
                gpu_utilization_percent=metrics_data.get('gpu_utilization_percent'),
                estimated_power_watts=metrics_data.get('estimated_power_watts'),
                # NEW: VM-level memory fields
                vm_total_ram_gb=metrics_data.get('vm_total_ram_gb'),
                vm_available_ram_gb=metrics_data.get('vm_available_ram_gb'),
                vm_used_ram_gb=metrics_data.get('vm_used_ram_gb'),
                vm_ram_usage_percent=metrics_data.get('vm_ram_usage_percent'),
                vm_total_vram_gb=metrics_data.get('vm_total_vram_gb'),
                vm_used_vram_gb=metrics_data.get('vm_used_vram_gb'),
                vm_free_vram_gb=metrics_data.get('vm_free_vram_gb'),
                vm_vram_usage_percent=metrics_data.get('vm_vram_usage_percent'),
                gpu_count=metrics_data.get('gpu_count'),
                gpu_names=metrics_data.get('gpu_names'),
                # NEW: Overall VM-level utilization metrics
                vm_overall_cpu_percent=metrics_data.get('vm_overall_cpu_percent'),
                vm_overall_gpu_utilization=metrics_data.get('vm_overall_gpu_utilization')
            )
            
            db.add(vm_process_metric)
            db.commit()
            
            self.logger.debug(f"Successfully inserted VM process metric for {metrics_data['vm_name']}")
            
            return {
                "success": True,
                "message": "VM process metrics data inserted successfully",
                "vm_name": metrics_data['vm_name'],
                "process_id": metrics_data['process_id']
            }
            
        except SQLAlchemyError as e:
            db.rollback()
            self.logger.error(f"Database error inserting VM process metrics: {e}")
            return {
                "success": False,
                "error": f"Database error: {str(e)}"
            }
        except Exception as e:
            db.rollback()
            self.logger.error(f"Unexpected error inserting VM process metrics: {e}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }
    
    def push_vm_process_metrics_batch(self, db: Session, metrics_batch: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Push multiple VM process metrics data points to TimescaleDB
        
        Args:
            db: Database session
            metrics_batch: List of process metrics dictionaries
            
        Returns:
            Result dictionary with success status and batch processing info
        """
        if not metrics_batch:
            return {
                "success": True,
                "message": "No VM process metrics to process",
                "processed_count": 0
            }
        
        try:
            processed_count = 0
            failed_count = 0
            
            for metrics_data in metrics_batch:
                try:
                    # Parse timestamp
                    if isinstance(metrics_data.get('timestamp'), str):
                        timestamp = datetime.fromisoformat(metrics_data['timestamp'].replace('Z', '+00:00'))
                    else:
                        timestamp = metrics_data.get('timestamp', datetime.utcnow())
                    
                    # Parse start_time
                    start_time = None
                    if metrics_data.get('start_time'):
                        try:
                            if isinstance(metrics_data['start_time'], str):
                                start_time = datetime.fromisoformat(metrics_data['start_time'].replace('Z', '+00:00'))
                            else:
                                start_time = metrics_data['start_time']
                        except Exception:
                            start_time = None
                    
                    # Create VM process metrics record
                    vm_process_metric = VMProcessMetric(
                        timestamp=timestamp,
                        process_id=metrics_data['process_id'],
                        vm_name=metrics_data['vm_name'],
                        process_name=metrics_data.get('process_name'),
                        username=metrics_data.get('username'),
                        status=metrics_data.get('status'),
                        start_time=start_time,
                        cpu_usage_percent=metrics_data.get('cpu_usage_percent'),
                        memory_usage_mb=metrics_data.get('memory_usage_mb'),
                        memory_usage_percent=metrics_data.get('memory_usage_percent'),
                        read_bytes=metrics_data.get('read_bytes'),
                        write_bytes=metrics_data.get('write_bytes'),
                        iops=metrics_data.get('iops'),
                        open_files=metrics_data.get('open_files'),
                        gpu_memory_usage_mb=metrics_data.get('gpu_memory_usage_mb'),
                        gpu_utilization_percent=metrics_data.get('gpu_utilization_percent'),
                        estimated_power_watts=metrics_data.get('estimated_power_watts'),
                        # NEW: VM-level memory fields
                        vm_total_ram_gb=metrics_data.get('vm_total_ram_gb'),
                        vm_available_ram_gb=metrics_data.get('vm_available_ram_gb'),
                        vm_used_ram_gb=metrics_data.get('vm_used_ram_gb'),
                        vm_ram_usage_percent=metrics_data.get('vm_ram_usage_percent'),
                        vm_total_vram_gb=metrics_data.get('vm_total_vram_gb'),
                        vm_used_vram_gb=metrics_data.get('vm_used_vram_gb'),
                        vm_free_vram_gb=metrics_data.get('vm_free_vram_gb'),
                        vm_vram_usage_percent=metrics_data.get('vm_vram_usage_percent'),
                        gpu_count=metrics_data.get('gpu_count'),
                        gpu_names=metrics_data.get('gpu_names'),
                        # NEW: Overall VM-level utilization metrics
                        vm_overall_cpu_percent=metrics_data.get('vm_overall_cpu_percent'),
                        vm_overall_gpu_utilization=metrics_data.get('vm_overall_gpu_utilization')
                    )
                    
                    db.add(vm_process_metric)
                    processed_count += 1
                    
                except Exception as e:
                    self.logger.error(f"Error processing individual VM metric: {e}")
                    failed_count += 1
                    continue
            
            db.commit()
            
            self.logger.info(f"Batch insert completed: {processed_count} processed, {failed_count} failed")
            
            return {
                "success": True,
                "message": f"Batch processing completed",
                "processed_count": processed_count,
                "failed_count": failed_count,
                "total_count": len(metrics_batch)
            }
            
        except SQLAlchemyError as e:
            db.rollback()
            self.logger.error(f"Database error in batch insert: {e}")
            return {
                "success": False,
                "error": f"Database error: {str(e)}",
                "processed_count": 0
            }
        except Exception as e:
            db.rollback()
            self.logger.error(f"Unexpected error in batch insert: {e}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}",
                "processed_count": 0
            }
    
    def get_vm_process_metrics(
        self, 
        db: Session, 
        vm_name: Optional[str] = None,
        process_name: Optional[str] = None,
        process_id: Optional[int] = None,
        username: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 1000
    ) -> Dict[str, Any]:
        """
        Get VM process metrics with optional filtering
        
        Args:
            db: Database session
            vm_name: Filter by VM name
            process_name: Filter by process name
            process_id: Filter by process ID
            username: Filter by username
            start_time: Start time for filtering
            end_time: End time for filtering
            limit: Maximum number of records to return
            
        Returns:
            Dictionary containing the query results
        """
        try:
            query = db.query(VMProcessMetric)
            
            # Apply filters
            if vm_name:
                query = query.filter(VMProcessMetric.vm_name == vm_name)
            
            if process_name:
                query = query.filter(VMProcessMetric.process_name.ilike(f"%{process_name}%"))
            
            if process_id:
                query = query.filter(VMProcessMetric.process_id == process_id)
            
            if username:
                query = query.filter(VMProcessMetric.username.ilike(f"%{username}%"))
            
            if start_time:
                query = query.filter(VMProcessMetric.timestamp >= start_time)
            
            if end_time:
                query = query.filter(VMProcessMetric.timestamp <= end_time)
            
            # Order by timestamp descending and limit
            query = query.order_by(desc(VMProcessMetric.timestamp))
            
            if limit:
                query = query.limit(limit)
            
            results = query.all()
            
            return {
                "success": True,
                "data": [metric.to_dict() for metric in results],
                "count": len(results),
                "filters_applied": {
                    "vm_name": vm_name,
                    "process_name": process_name,
                    "process_id": process_id,
                    "username": username,
                    "start_time": start_time.isoformat() if start_time else None,
                    "end_time": end_time.isoformat() if end_time else None,
                    "limit": limit
                }
            }
            
        except SQLAlchemyError as e:
            self.logger.error(f"Database error retrieving VM process metrics: {e}")
            return {
                "success": False,
                "error": f"Database error: {str(e)}"
            }
        except Exception as e:
            self.logger.error(f"Unexpected error retrieving VM process metrics: {e}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }
    
    def get_vm_health_status(self, db: Session, vm_name: str) -> Dict[str, Any]:
        """
        Get health status for a specific VM using the database function
        
        Args:
            db: Database session
            vm_name: Name of the VM to check
            
        Returns:
            Dictionary containing VM health information
        """
        try:
            # Use the database function created in the init script
            result = db.execute(
                text("SELECT * FROM get_vm_health_status(:vm_name)"),
                {"vm_name": vm_name}
            ).fetchone()
            
            if result:
                return {
                    "success": True,
                    "vm_name": result.vm_name,
                    "status": result.status,
                    "avg_cpu_usage": float(result.avg_cpu_usage or 0),
                    "avg_memory_usage": float(result.avg_memory_usage or 0),
                    "avg_gpu_usage": float(result.avg_gpu_usage or 0),
                    "process_count": int(result.process_count or 0),
                    "last_seen": result.last_seen.isoformat() if result.last_seen else None
                }
            else:
                return {
                    "success": True,
                    "vm_name": vm_name,
                    "status": "NO_DATA",
                    "message": "No recent data found for this VM"
                }
                
        except SQLAlchemyError as e:
            self.logger.error(f"Database error getting VM health status: {e}")
            return {
                "success": False,
                "error": f"Database error: {str(e)}"
            }
        except Exception as e:
            self.logger.error(f"Unexpected error getting VM health status: {e}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }
    
    def get_active_vms(self, db: Session) -> Dict[str, Any]:
        """
        Get list of all active VMs (VMs that have sent data recently)
        
        Args:
            db: Database session
            
        Returns:
            Dictionary containing list of active VMs
        """
        try:
            # Get VMs that have sent data in the last hour
            cutoff_time = datetime.utcnow() - timedelta(hours=1)
            
            query = db.query(
                VMProcessMetric.vm_name,
                func.max(VMProcessMetric.timestamp).label('last_seen'),
                func.count(func.distinct(VMProcessMetric.process_id)).label('process_count')
            ).filter(
                VMProcessMetric.timestamp >= cutoff_time
            ).group_by(
                VMProcessMetric.vm_name
            ).order_by(
                desc('last_seen')
            )
            
            results = query.all()
            
            active_vms = []
            for result in results:
                active_vms.append({
                    "vm_name": result.vm_name,
                    "last_seen": result.last_seen.isoformat(),
                    "process_count": result.process_count
                })
            
            return {
                "success": True,
                "active_vms": active_vms,
                "count": len(active_vms),
                "cutoff_time": cutoff_time.isoformat()
            }
            
        except SQLAlchemyError as e:
            self.logger.error(f"Database error getting active VMs: {e}")
            return {
                "success": False,
                "error": f"Database error: {str(e)}"
            }
        except Exception as e:
            self.logger.error(f"Unexpected error getting active VMs: {e}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }
    
    def get_active_vms_with_memory_info(self, db: Session) -> Dict[str, Any]:
        """
        Get list of all active VMs with their RAM and VRAM information
        
        Args:
            db: Database session
            
        Returns:
            Dictionary containing list of active VMs with memory details
        """
        try:
            # Get VMs that have sent data in the last hour with latest memory info
            cutoff_time = datetime.utcnow() - timedelta(hours=1)
            
            # Subquery to get the latest record for each VM
            latest_record_subquery = db.query(
                VMProcessMetric.vm_name,
                func.max(VMProcessMetric.timestamp).label('max_timestamp')
            ).filter(
                VMProcessMetric.timestamp >= cutoff_time
            ).group_by(
                VMProcessMetric.vm_name
            ).subquery()
            
            # Main query to get VM details with memory information
            query = db.query(
                VMProcessMetric.vm_name,
                VMProcessMetric.timestamp.label('last_seen'),
                func.count(func.distinct(VMProcessMetric.process_id)).label('process_count'),
                func.avg(VMProcessMetric.vm_total_ram_gb).label('total_ram_gb'),
                func.avg(VMProcessMetric.vm_total_vram_gb).label('total_vram_gb'),
                func.avg(VMProcessMetric.vm_ram_usage_percent).label('ram_usage_percent'),
                func.avg(VMProcessMetric.vm_vram_usage_percent).label('vram_usage_percent'),
                func.max(VMProcessMetric.gpu_count).label('gpu_count')
            ).join(
                latest_record_subquery,
                and_(
                    VMProcessMetric.vm_name == latest_record_subquery.c.vm_name,
                    VMProcessMetric.timestamp == latest_record_subquery.c.max_timestamp
                )
            ).group_by(
                VMProcessMetric.vm_name,
                VMProcessMetric.timestamp
            ).order_by(
                desc('last_seen')
            )
            
            results = query.all()
            
            active_vms = []
            for result in results:
                # Format memory values safely
                total_ram_gb = float(result.total_ram_gb or 0)
                total_vram_gb = float(result.total_vram_gb or 0)
                ram_usage_percent = float(result.ram_usage_percent or 0)
                vram_usage_percent = float(result.vram_usage_percent or 0)
                gpu_count = int(result.gpu_count or 0)
                
                active_vms.append({
                    "vm_name": result.vm_name,
                    "last_seen": result.last_seen.isoformat() if result.last_seen else None,
                    "process_count": result.process_count,
                    "total_ram_gb": total_ram_gb,
                    "total_vram_gb": total_vram_gb,
                    "ram_usage_percent": ram_usage_percent,
                    "vram_usage_percent": vram_usage_percent,
                    "gpu_count": gpu_count,
                    # Format display strings for dropdown
                    "display_name": f"{result.vm_name} (RAM: {total_ram_gb:.1f}GB, VRAM: {total_vram_gb:.1f}GB)",
                    "memory_summary": {
                        "ram": f"{total_ram_gb:.1f}GB",
                        "vram": f"{total_vram_gb:.1f}GB" if total_vram_gb > 0 else "No GPU",
                        "gpu_count": gpu_count
                    }
                })
            
            return {
                "success": True,
                "active_vms": active_vms,
                "count": len(active_vms),
                "cutoff_time": cutoff_time.isoformat()
            }
            
        except SQLAlchemyError as e:
            self.logger.error(f"Database error getting active VMs with memory info: {e}")
            return {
                "success": False,
                "error": f"Database error: {str(e)}"
            }
        except Exception as e:
            self.logger.error(f"Unexpected error getting active VMs with memory info: {e}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }
    
    def get_vm_latest_metrics(self, db: Session, vm_name: str) -> Dict[str, Any]:
        """
        Get the latest overall metrics for a specific VM (aggregated across all processes)
        
        Args:
            db: Database session
            vm_name: Name of the VM
            
        Returns:
            Dictionary containing latest VM metrics
        """
        try:
            # Get the latest timestamp for this VM
            latest_timestamp_subquery = db.query(
                func.max(VMProcessMetric.timestamp).label('max_timestamp')
            ).filter(
                VMProcessMetric.vm_name == vm_name
            ).subquery()
            
            # Get aggregated metrics for the latest timestamp
            result = db.query(
                VMProcessMetric.vm_name,
                func.max(VMProcessMetric.timestamp).label('timestamp'),
                func.sum(VMProcessMetric.memory_usage_mb).label('total_memory_mb'),    # Sum memory usage in MB for process-level calculation
                func.sum(VMProcessMetric.gpu_memory_usage_mb).label('total_gpu_memory_mb'), # Sum GPU memory
                func.sum(VMProcessMetric.iops).label('total_iops'),                    # Sum IOPS
                func.count(func.distinct(VMProcessMetric.process_id)).label('process_count'),
                # Use actual VM-level metrics (not process aggregation)
                func.avg(VMProcessMetric.vm_overall_cpu_percent).label('vm_overall_cpu_percent'),
                func.avg(VMProcessMetric.vm_overall_gpu_utilization).label('vm_overall_gpu_utilization'),
                func.avg(VMProcessMetric.vm_total_ram_gb).label('total_ram_gb'),
                func.avg(VMProcessMetric.vm_total_vram_gb).label('total_vram_gb'),
                func.avg(VMProcessMetric.vm_ram_usage_percent).label('vm_ram_usage_percent'),  # Already VM-level
                func.avg(VMProcessMetric.vm_vram_usage_percent).label('vm_vram_usage_percent'), # Already VM-level
                func.max(VMProcessMetric.gpu_count).label('gpu_count')
            ).filter(
                and_(
                    VMProcessMetric.vm_name == vm_name,
                    VMProcessMetric.timestamp == latest_timestamp_subquery.c.max_timestamp
                )
            ).group_by(
                VMProcessMetric.vm_name
            ).first()
            
            if result:
                # Debug logging to see what data we're getting
                self.logger.info(f"VM latest metrics debug for {vm_name}:")
                self.logger.info(f"  - total_ram_gb: {result.total_ram_gb}")
                self.logger.info(f"  - total_memory_mb: {result.total_memory_mb}")
                self.logger.info(f"  - vm_overall_cpu_percent: {result.vm_overall_cpu_percent}")
                self.logger.info(f"  - vm_overall_gpu_utilization: {result.vm_overall_gpu_utilization}")
                self.logger.info(f"  - vm_ram_usage_percent: {result.vm_ram_usage_percent}")
                self.logger.info(f"  - vm_vram_usage_percent: {result.vm_vram_usage_percent}")
                self.logger.info(f"  - process_count: {result.process_count}")
                
                # Calculate overall VM memory usage percentage from summed memory
                vm_memory_usage_percent = 0
                if result.total_ram_gb and result.total_ram_gb > 0 and result.total_memory_mb:
                    vm_memory_usage_percent = round((result.total_memory_mb / (result.total_ram_gb * 1024)) * 100, 2)
                    self.logger.info(f"  - calculated vm_memory_usage_percent: {vm_memory_usage_percent}")
                else:
                    # Fallback to VM-level RAM usage if available
                    vm_memory_usage_percent = round(float(result.vm_ram_usage_percent or 0), 2)
                    self.logger.info(f"  - fallback vm_memory_usage_percent: {vm_memory_usage_percent}")
                
                # Calculate GPU memory usage percentage from summed GPU memory
                gpu_memory_usage_percent = 0
                if result.total_vram_gb and result.total_vram_gb > 0 and result.total_gpu_memory_mb:
                    gpu_memory_usage_percent = round((result.total_gpu_memory_mb / (result.total_vram_gb * 1024)) * 100, 2)
                else:
                    # Fallback to VM-level VRAM usage if available
                    gpu_memory_usage_percent = round(float(result.vm_vram_usage_percent or 0), 2)
                
                # Use accurate VM-level CPU utilization instead of process aggregation
                cpu_utilization = round(float(result.vm_overall_cpu_percent or 0), 2)
                
                # Use accurate VM-level GPU utilization instead of process aggregation
                gpu_utilization = round(float(result.vm_overall_gpu_utilization or 0), 2)
                
                return {
                    "success": True,
                    "vm_name": result.vm_name,
                    "timestamp": result.timestamp.isoformat() if result.timestamp else None,
                    "metrics": {
                        "cpu_utilization": cpu_utilization,
                        "cpu_memory_usage": vm_memory_usage_percent,  # Use calculated VM memory percentage
                        "gpu_utilization": gpu_utilization,
                        "gpu_memory_usage": gpu_memory_usage_percent,
                        "disk_iops": round(float(result.total_iops or 0), 2),
                        "network_bandwidth": 0,  # Not currently collected at process level
                        "vm_ram_usage_percent": round(float(result.vm_ram_usage_percent or 0), 2),
                        "vm_vram_usage_percent": round(float(result.vm_vram_usage_percent or 0), 2),
                        "total_ram_gb": round(float(result.total_ram_gb or 0), 2),
                        "total_vram_gb": round(float(result.total_vram_gb or 0), 2),
                        "process_count": int(result.process_count or 0),
                        "gpu_count": int(result.gpu_count or 0)
                    }
                }
            else:
                return {
                    "success": False,
                    "error": f"No recent data found for VM '{vm_name}'"
                }
                
        except SQLAlchemyError as e:
            self.logger.error(f"Database error getting VM latest metrics: {e}")
            return {
                "success": False,
                "error": f"Database error: {str(e)}"
            }
        except Exception as e:
            self.logger.error(f"Unexpected error getting VM latest metrics: {e}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }
    
    def get_vm_summary_metrics(self, db: Session, vm_name: str, hours: int = 24) -> Dict[str, Any]:
        """
        Get summary metrics for a VM over a specified time period
        
        Args:
            db: Database session
            vm_name: Name of the VM
            hours: Number of hours to look back
            
        Returns:
            Dictionary containing summary metrics
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            # Get aggregated metrics
            result = db.query(
                func.avg(VMProcessMetric.cpu_usage_percent).label('avg_cpu'),
                func.max(VMProcessMetric.cpu_usage_percent).label('max_cpu'),
                func.avg(VMProcessMetric.memory_usage_percent).label('avg_memory'),
                func.max(VMProcessMetric.memory_usage_percent).label('max_memory'),
                func.avg(VMProcessMetric.gpu_utilization_percent).label('avg_gpu'),
                func.max(VMProcessMetric.gpu_utilization_percent).label('max_gpu'),
                func.sum(VMProcessMetric.estimated_power_watts).label('total_power'),
                func.count(func.distinct(VMProcessMetric.process_id)).label('unique_processes'),
                func.count().label('total_records')
            ).filter(
                and_(
                    VMProcessMetric.vm_name == vm_name,
                    VMProcessMetric.timestamp >= cutoff_time
                )
            ).first()
            
            if result and result.total_records > 0:
                return {
                    "success": True,
                    "vm_name": vm_name,
                    "time_period_hours": hours,
                    "metrics": {
                        "avg_cpu_usage": round(float(result.avg_cpu or 0), 2),
                        "max_cpu_usage": round(float(result.max_cpu or 0), 2),
                        "avg_memory_usage": round(float(result.avg_memory or 0), 2),
                        "max_memory_usage": round(float(result.max_memory or 0), 2),
                        "avg_gpu_usage": round(float(result.avg_gpu or 0), 2),
                        "max_gpu_usage": round(float(result.max_gpu or 0), 2),
                        "total_power_consumption": round(float(result.total_power or 0), 2),
                        "unique_processes": int(result.unique_processes or 0),
                        "total_data_points": int(result.total_records)
                    }
                }
            else:
                return {
                    "success": True,
                    "vm_name": vm_name,
                    "message": f"No data found for VM '{vm_name}' in the last {hours} hours"
                }
                
        except SQLAlchemyError as e:
            self.logger.error(f"Database error getting VM summary: {e}")
            return {
                "success": False,
                "error": f"Database error: {str(e)}"
            }
        except Exception as e:
            self.logger.error(f"Unexpected error getting VM summary: {e}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }