#!/usr/bin/env python3
"""
Self-Contained VM Monitoring Agent
==================================

A robust, cross-platform monitoring agent designed to run inside virtual machines.
Collects granular, process-level metrics and sends them to the GreenMatrix backend.

Features:
- Auto-discovery of backend API endpoint via default gateway
- Cross-platform support (Windows and Linux)
- Self-contained with all dependencies bundled
- Continuous data collection with configurable intervals
- Comprehensive process metrics including CPU, memory, GPU, and I/O

Requirements for packaging:
- psutil>=5.9.0
- requests>=2.28.0
- netifaces>=0.11.0
- pynvml>=11.4.1 (Windows only)

Author: GreenMatrix Team
Version: 1.0.0
"""

import os
import sys
import json
import time
import socket
import logging
import datetime
import platform
import traceback
import configparser
from typing import Dict, List, Any, Optional, Tuple

try:
    import psutil
    import requests
    import netifaces
    if platform.system() == 'Windows':
        from pynvml import *
except ImportError as e:
    print(f"Critical dependency missing: {e}")
    print("Please ensure all required packages are installed:")
    print("- psutil>=5.9.0")
    print("- requests>=2.28.0") 
    print("- netifaces>=0.11.0")
    print("- pynvml>=11.4.1 (Windows only)")
    sys.exit(1)

# Agent Configuration
class AgentConfig:
    """Configuration management for the VM agent"""
    
    def __init__(self):
        self.vm_name = self._get_vm_identifier()
        self.backend_url = None
        self.collection_interval = 5  # seconds (default 5 seconds as requested)
        self.api_timeout = 30
        self.cpu_tdp_watts = 125.0
        self.max_retries = 3
        self.retry_delay = 5
        self.log_level = "INFO"
        
        # Load configuration from file if it exists
        self._load_config()
        
        # Auto-discover backend if not configured
        if not self.backend_url:
            self.backend_url = self._auto_discover_backend()
    
    def _get_vm_identifier(self) -> str:
        """Get unique identifier for this VM (hostname by default)"""
        try:
            hostname = socket.gethostname()
            # Add OS info for better identification
            os_info = platform.system()
            return f"{hostname}-{os_info}"
        except Exception:
            return "unknown-vm"
    
    def _load_config(self):
        """Load configuration from vm_agent.ini if it exists"""
        config_file = os.path.join(os.path.dirname(__file__), 'vm_agent.ini')
        if os.path.exists(config_file):
            try:
                config = configparser.ConfigParser()
                config.read(config_file)
                
                if 'agent' in config:
                    section = config['agent']
                    self.backend_url = section.get('backend_url', self.backend_url)
                    self.collection_interval = section.getint('collection_interval', self.collection_interval)
                    self.api_timeout = section.getint('api_timeout', self.api_timeout)
                    self.cpu_tdp_watts = section.getfloat('cpu_tdp_watts', self.cpu_tdp_watts)
                    self.max_retries = section.getint('max_retries', self.max_retries)
                    self.retry_delay = section.getint('retry_delay', self.retry_delay)
                    self.log_level = section.get('log_level', self.log_level)
                    
                    # Override VM name if specified
                    custom_vm_name = section.get('vm_name')
                    if custom_vm_name:
                        self.vm_name = custom_vm_name
                        
            except Exception as e:
                print(f"Warning: Could not load config file: {e}")
    
    def _auto_discover_backend(self) -> Optional[str]:
        """Auto-discover backend API endpoint via default gateway"""
        try:
            # Get default gateway
            gateways = netifaces.gateways()
            default_gateway = gateways.get('default')
            
            if not default_gateway:
                return None
                
            # Get gateway IP for the default interface
            gateway_info = default_gateway.get(netifaces.AF_INET)
            if not gateway_info:
                return None
                
            gateway_ip = gateway_info[0]
            
            # Try common backend ports
            backend_ports = [8000, 80, 443, 5000, 3000]
            
            for port in backend_ports:
                try:
                    # Test if backend is reachable
                    if port == 443:
                        test_url = f"https://{gateway_ip}:{port}/health"
                    else:
                        test_url = f"http://{gateway_ip}:{port}/health"
                    
                    response = requests.get(test_url, timeout=5)
                    if response.status_code == 200:
                        base_url = f"http://{gateway_ip}:{port}" if port != 443 else f"https://{gateway_ip}:{port}"
                        print(f"Auto-discovered backend at: {base_url}")
                        return base_url
                        
                except Exception:
                    continue
            
            # Fallback to default
            return f"http://{gateway_ip}:8000"
            
        except Exception as e:
            print(f"Warning: Auto-discovery failed: {e}")
            return "http://localhost:8000"

# Logging setup
def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """Setup logging configuration"""
    logger = logging.getLogger('vm_agent')
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Create console handler
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger

# Data Collection Functions
class MetricsCollector:
    """Responsible for collecting system and process metrics"""
    
    def __init__(self, config: AgentConfig, logger: logging.Logger):
        self.config = config
        self.logger = logger
        self.platform = platform.system()
        
    def get_process_metrics(self, interval: float = 1.0) -> List[Dict[str, Any]]:
        """
        Collect detailed process-level metrics similar to collect_all_metrics.py
        
        Args:
            interval: Measurement interval for CPU and I/O calculations
            
        Returns:
            List of process metrics dictionaries
        """
        try:
            snapshot_timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
            processes_list = []
            
            # Get GPU metrics if available
            gpu_pid_mem, gpu_pid_util = self._get_gpu_stats()
            
            # Take I/O snapshots for accurate IOPS calculation
            io_snapshot_1 = {
                p.pid: p.info.get('io_counters') 
                for p in psutil.process_iter(['pid', 'io_counters'])
            }
            
            # Initialize CPU percent calculation
            for proc in psutil.process_iter(['pid']):
                try:
                    proc.cpu_percent(interval=None)
                except Exception:
                    pass
            
            # Wait for interval
            time.sleep(interval)
            
            # Take second I/O snapshot
            io_snapshot_2 = {
                p.pid: p.info.get('io_counters') 
                for p in psutil.process_iter(['pid', 'io_counters'])
            }
            
            # Collect process data
            for proc in psutil.process_iter([
                'pid', 'name', 'username', 'memory_info', 
                'memory_percent', 'status', 'create_time'
            ]):
                try:
                    pinfo = proc.info
                    pid = pinfo.get('pid')
                    
                    if pid is None:
                        continue
                    
                    # Calculate I/O rates
                    io1 = io_snapshot_1.get(pid)
                    io2 = io_snapshot_2.get(pid)
                    read_iops = write_iops = 0
                    
                    if io1 and io2:
                        read_iops = (io2.read_count - io1.read_count) / interval
                        write_iops = (io2.write_count - io1.write_count) / interval
                    
                    # Get CPU usage
                    try:
                        cpu_usage = proc.cpu_percent(interval=None)
                    except Exception:
                        cpu_usage = 0.0
                    
                    # Count open files
                    try:
                        open_files_count = len(proc.open_files())
                    except Exception:
                        open_files_count = 0
                    
                    # Calculate power estimation
                    gpu_util = gpu_pid_util.get(pid, 0)
                    estimated_power = self._calculate_power_estimation(
                        cpu_usage, gpu_util
                    )
                    
                    process_data = {
                        'timestamp': snapshot_timestamp,
                        'process_name': pinfo.get('name'),
                        'process_id': pid,
                        'username': pinfo.get('username'),
                        'status': pinfo.get('status'),
                        'start_time': datetime.datetime.fromtimestamp(
                            pinfo.get('create_time', 0)
                        ).isoformat() if pinfo.get('create_time') else None,
                        'cpu_usage_percent': cpu_usage,
                        'memory_usage_mb': round(
                            pinfo.get('memory_info').rss / (1024**2), 2
                        ) if pinfo.get('memory_info') else 0,
                        'memory_usage_percent': round(
                            pinfo.get('memory_percent', 0), 2
                        ),
                        'read_bytes': io2.read_bytes if io2 else 0,
                        'write_bytes': io2.write_bytes if io2 else 0,
                        'iops': read_iops + write_iops,
                        'open_files': open_files_count,
                        'gpu_memory_usage_mb': round(
                            gpu_pid_mem.get(pid, 0), 2
                        ),
                        'gpu_utilization_percent': gpu_util,
                        'estimated_power_watts': estimated_power,
                        'vm_name': self.config.vm_name  # Add VM identifier
                    }
                    
                    processes_list.append(process_data)
                    
                except Exception as e:
                    self.logger.debug(f"Error collecting data for process {pid}: {e}")
                    continue
            
            self.logger.info(f"Collected metrics for {len(processes_list)} processes")
            return processes_list
            
        except Exception as e:
            self.logger.error(f"Error collecting process metrics: {e}")
            return []
    
    def _get_gpu_stats(self) -> Tuple[Dict[int, float], Dict[int, float]]:
        """Get GPU memory usage and utilization by process ID"""
        gpu_pid_mem = {}
        gpu_pid_util = {}
        
        if self.platform != 'Windows':
            return gpu_pid_mem, gpu_pid_util
        
        try:
            nvmlInit()
            gpu_count = nvmlDeviceGetCount()
            
            for i in range(gpu_count):
                try:
                    handle = nvmlDeviceGetHandleByIndex(i)
                    util = nvmlDeviceGetUtilizationRates(handle).gpu
                    
                    # Get processes running on this GPU
                    try:
                        procs = nvmlDeviceGetGraphicsRunningProcesses(handle)
                    except NVMLError:
                        # Try compute processes if graphics processes fail
                        procs = nvmlDeviceGetComputeRunningProcesses(handle)
                    
                    for p in procs:
                        try:
                            # Handle memory usage
                            if p.usedGpuMemory is None or p.usedGpuMemory == 4294967295:
                                mem_mb = 0
                            else:
                                mem_mb = p.usedGpuMemory / 1024**2
                            
                            gpu_pid_mem[p.pid] = mem_mb
                            gpu_pid_util[p.pid] = util
                            
                        except NVMLError:
                            continue
                            
                except NVMLError:
                    continue
            
            nvmlShutdown()
            
        except Exception as e:
            self.logger.debug(f"GPU monitoring not available: {e}")
        
        return gpu_pid_mem, gpu_pid_util
    
    def _calculate_power_estimation(self, cpu_usage_percent: float, 
                                  gpu_util_percent: float) -> float:
        """Calculate estimated power consumption for a process"""
        # CPU power estimation based on TDP
        cpu_power_estimate = (cpu_usage_percent / 100.0) * self.config.cpu_tdp_watts
        
        # GPU power estimation (simplified)
        # Assuming average GPU TDP of 250W for estimation
        gpu_power_estimate = (gpu_util_percent / 100.0) * 250.0
        
        total_power_estimate = cpu_power_estimate + gpu_power_estimate
        
        return round(total_power_estimate, 3)

# Data Transmission
class DataTransmitter:
    """Handles sending data to the backend API"""
    
    def __init__(self, config: AgentConfig, logger: logging.Logger):
        self.config = config
        self.logger = logger
        self.session = requests.Session()
        
        # Set up session with retries
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry
        
        retry_strategy = Retry(
            total=self.config.max_retries,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
    
    def send_vm_snapshot(self, process_metrics: List[Dict[str, Any]]) -> bool:
        """
        Send VM process metrics snapshot to the backend
        
        Args:
            process_metrics: List of process metrics to send
            
        Returns:
            True if successful, False otherwise
        """
        if not process_metrics:
            self.logger.warning("No metrics to send")
            return True
        
        try:
            # Prepare payload matching the expected format
            payload = {
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "vm_name": self.config.vm_name,
                "process_metrics": process_metrics,
                "agent_version": "1.0.0",
                "platform": platform.system(),
                "metrics_count": len(process_metrics)
            }
            
            # Send to the VM snapshot endpoint
            endpoint = f"{self.config.backend_url}/api/v1/metrics/vm-snapshot"
            
            self.logger.debug(f"Sending {len(process_metrics)} metrics to {endpoint}")
            
            response = self.session.post(
                endpoint,
                json=payload,
                timeout=self.config.api_timeout,
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': f'VM-Agent/1.0.0 ({platform.system()})'
                }
            )
            
            if response.status_code == 200:
                self.logger.info(f"Successfully sent {len(process_metrics)} metrics")
                return True
            else:
                self.logger.error(
                    f"Backend returned status {response.status_code}: {response.text}"
                )
                return False
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Network error sending metrics: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error sending metrics: {e}")
            return False

# Main Agent Class
class VMAgent:
    """Main VM monitoring agent"""
    
    def __init__(self):
        self.config = AgentConfig()
        self.logger = setup_logging(self.config.log_level)
        self.collector = MetricsCollector(self.config, self.logger)
        self.transmitter = DataTransmitter(self.config, self.logger)
        self.running = False
        
        # Print startup information
        self.logger.info("="*60)
        self.logger.info("GreenMatrix VM Monitoring Agent v1.0.0")
        self.logger.info("="*60)
        self.logger.info(f"VM Name: {self.config.vm_name}")
        self.logger.info(f"Backend URL: {self.config.backend_url}")
        self.logger.info(f"Collection Interval: {self.config.collection_interval}s")
        self.logger.info(f"Platform: {platform.system()} {platform.release()}")
        self.logger.info("="*60)
    
    def test_connectivity(self) -> bool:
        """Test connectivity to the backend"""
        try:
            health_url = f"{self.config.backend_url}/health"
            response = requests.get(health_url, timeout=10)
            
            if response.status_code == 200:
                self.logger.info("✓ Backend connectivity test passed")
                return True
            else:
                self.logger.error(f"✗ Backend health check failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.logger.error(f"✗ Backend connectivity test failed: {e}")
            return False
    
    def run_once(self) -> bool:
        """Run a single collection cycle"""
        try:
            self.logger.info("Starting metrics collection cycle...")
            
            # Collect metrics
            start_time = time.time()
            process_metrics = self.collector.get_process_metrics()
            collection_time = time.time() - start_time
            
            if not process_metrics:
                self.logger.warning("No metrics collected")
                return False
            
            self.logger.info(
                f"Collected {len(process_metrics)} process metrics "
                f"in {collection_time:.2f}s"
            )
            
            # Send metrics
            success = self.transmitter.send_vm_snapshot(process_metrics)
            
            if success:
                self.logger.info("✓ Metrics collection cycle completed successfully")
            else:
                self.logger.error("✗ Failed to send metrics to backend")
            
            return success
            
        except Exception as e:
            self.logger.error(f"Error in collection cycle: {e}")
            self.logger.debug(traceback.format_exc())
            return False
    
    def run(self):
        """Run the agent in continuous mode"""
        self.logger.info("Starting VM agent in continuous mode...")
        
        # Test connectivity first
        if not self.test_connectivity():
            self.logger.error("Cannot connect to backend. Please check configuration.")
            return
        
        self.running = True
        failed_attempts = 0
        max_failed_attempts = 5
        
        try:
            while self.running:
                try:
                    success = self.run_once()
                    
                    if success:
                        failed_attempts = 0
                    else:
                        failed_attempts += 1
                        
                        if failed_attempts >= max_failed_attempts:
                            self.logger.error(
                                f"Too many consecutive failures ({failed_attempts}). "
                                "Stopping agent."
                            )
                            break
                    
                    # Wait for next collection cycle
                    self.logger.info(
                        f"Waiting {self.config.collection_interval}s until next cycle..."
                    )
                    time.sleep(self.config.collection_interval)
                    
                except KeyboardInterrupt:
                    self.logger.info("Received interrupt signal, stopping...")
                    break
                except Exception as e:
                    self.logger.error(f"Unexpected error in main loop: {e}")
                    failed_attempts += 1
                    time.sleep(self.config.retry_delay)
        
        finally:
            self.running = False
            self.logger.info("VM agent stopped")

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='GreenMatrix VM Monitoring Agent')
    parser.add_argument(
        '--once', 
        action='store_true', 
        help='Run once and exit (for testing)'
    )
    parser.add_argument(
        '--test', 
        action='store_true', 
        help='Test connectivity and configuration'
    )
    parser.add_argument(
        '--config', 
        help='Path to configuration file'
    )
    parser.add_argument(
        '--vm-name', 
        help='Override VM name identifier'
    )
    parser.add_argument(
        '--backend-url', 
        help='Override backend URL'
    )
    parser.add_argument(
        '--interval', 
        type=int, 
        help='Collection interval in seconds'
    )
    parser.add_argument(
        '--log-level', 
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'], 
        default='INFO',
        help='Logging level'
    )
    
    args = parser.parse_args()
    
    try:
        # Create agent
        agent = VMAgent()
        
        # Apply command line overrides
        if args.vm_name:
            agent.config.vm_name = args.vm_name
        if args.backend_url:
            agent.config.backend_url = args.backend_url
        if args.interval:
            agent.config.collection_interval = args.interval
        
        # Set log level
        agent.logger.setLevel(getattr(logging, args.log_level))
        
        if args.test:
            # Test mode
            print("Testing VM agent configuration...")
            
            # Test connectivity
            if agent.test_connectivity():
                print("✓ Backend connectivity: OK")
            else:
                print("✗ Backend connectivity: FAILED")
                return 1
            
            # Test metrics collection
            print("Testing metrics collection...")
            metrics = agent.collector.get_process_metrics()
            print(f"✓ Collected {len(metrics)} process metrics")
            
            print("✓ All tests passed!")
            return 0
            
        elif args.once:
            # Run once mode
            success = agent.run_once()
            return 0 if success else 1
        else:
            # Continuous mode
            agent.run()
            return 0
            
    except KeyboardInterrupt:
        print("\nInterrupted by user")
        return 0
    except Exception as e:
        print(f"Fatal error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())