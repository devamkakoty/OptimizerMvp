#!/usr/bin/env python3
"""
GreenMatrix VM Agent - Lightweight VM Monitoring Agent
Collects process-level metrics from VMs and sends to GreenMatrix backend
"""

import os
import sys
import time
import json
import socket
import datetime
import platform
import requests
import psutil
import subprocess
import configparser
from pathlib import Path

# Try to import GPU monitoring for both Windows and Linux
gpu_available = False
gpu_method = None

if platform.system() == 'Windows':
    try:
        from pynvml import *
        # Test if NVML library is actually available
        nvmlInit()
        nvmlShutdown()
        gpu_available = True
        gpu_method = 'pynvml'
        print("GPU monitoring available (NVIDIA - pynvml)")
    except ImportError:
        print("Windows: pynvml library not installed")
        gpu_available = False
    except Exception as e:
        print(f"Windows: NVML library not found or not working: {e}")
        gpu_available = False
else:  # Linux
    # For Linux, try multiple methods
    try:
        # Method 1: Try pynvml on Linux
        from pynvml import *
        gpu_available = True
        gpu_method = 'pynvml'
        print("Linux: GPU monitoring available (NVIDIA - pynvml)")
    except ImportError:
        # Method 2: Try nvidia-smi command
        try:
            result = subprocess.run(['nvidia-smi', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                gpu_available = True
                gpu_method = 'nvidia-smi'
                print("Linux: GPU monitoring available (nvidia-smi)")
        except FileNotFoundError:
            # Method 3: Try rocm-smi for AMD GPUs
            try:
                result = subprocess.run(['rocm-smi', '--version'], capture_output=True, text=True)
                if result.returncode == 0:
                    gpu_available = True
                    gpu_method = 'rocm-smi'
                    print("Linux: GPU monitoring available (AMD - rocm-smi)")
            except FileNotFoundError:
                print("Linux: No GPU monitoring available (no nvidia-smi, rocm-smi, or working drivers)")


class VMAgentConfig:
    """Configuration manager for VM Agent"""

    def __init__(self, config_file=None):
        """Initialize configuration from file or defaults"""
        self.config = configparser.ConfigParser()

        # Determine config file location
        if config_file and os.path.exists(config_file):
            self.config_file = config_file
        else:
            # Try multiple locations
            possible_locations = [
                'vm_agent_config.ini',
                '/opt/greenmatrix-vm-agent/vm_agent.ini',
                'C:\\GreenMatrix-VM-Agent\\vm_agent.ini',
                os.path.join(os.path.dirname(__file__), 'vm_agent_config.ini'),
                os.path.join(os.path.dirname(__file__), 'vm_agent.ini'),
            ]

            self.config_file = None
            for location in possible_locations:
                if os.path.exists(location):
                    self.config_file = location
                    break

        if self.config_file:
            print(f"Loading configuration from: {self.config_file}")
            self.config.read(self.config_file)
        else:
            print("WARNING: No configuration file found, using defaults")
            self._set_defaults()

    def _set_defaults(self):
        """Set default configuration values"""
        self.config['api'] = {
            'backend_url': 'http://localhost:8000',
            'api_timeout': '30',
            'retry_attempts': '3',
            'retry_delay': '5'
        }
        self.config['collection'] = {
            'interval_seconds': '2',
            'vm_name': socket.gethostname(),
            'collect_gpu_metrics': 'true',
            'collect_disk_metrics': 'true'
        }
        self.config['logging'] = {
            'log_level': 'INFO',
            'log_file': 'vm_agent.log',
            'log_max_size': '10485760',
            'log_backup_count': '5'
        }

    def get(self, section, key, fallback=None):
        """Get configuration value"""
        try:
            return self.config.get(section, key)
        except (configparser.NoSectionError, configparser.NoOptionError):
            return fallback

    @property
    def vm_name(self):
        """Get VM name"""
        vm_name = self.get('collection', 'vm_name', socket.gethostname())
        # Add OS suffix if not present
        if platform.system() == 'Windows' and not vm_name.endswith('-Windows'):
            vm_name += '-Windows'
        elif platform.system() == 'Linux' and not vm_name.endswith('-Linux'):
            vm_name += '-Linux'
        return vm_name

    @property
    def backend_url(self):
        """Get backend URL"""
        return self.get('api', 'backend_url', 'http://localhost:8000')

    @property
    def collection_interval(self):
        """Get collection interval in seconds"""
        return int(self.get('collection', 'interval_seconds', '2'))

    @property
    def api_timeout(self):
        """Get API timeout in seconds"""
        return int(self.get('api', 'api_timeout', '30'))

    @property
    def collect_gpu_metrics(self):
        """Check if GPU metrics collection is enabled"""
        return self.get('collection', 'collect_gpu_metrics', 'true').lower() == 'true'


def get_vm_memory_info():
    """Get VM-level memory information"""
    try:
        # Get total system RAM available to this VM
        vm_memory = psutil.virtual_memory()
        vm_total_ram_gb = round(vm_memory.total / (1024**3), 2)
        vm_available_ram_gb = round(vm_memory.available / (1024**3), 2)
        vm_used_ram_gb = round((vm_memory.total - vm_memory.available) / (1024**3), 2)
        vm_ram_usage_percent = round(vm_memory.percent, 2)

        return {
            'vm_total_ram_gb': vm_total_ram_gb,
            'vm_available_ram_gb': vm_available_ram_gb,
            'vm_used_ram_gb': vm_used_ram_gb,
            'vm_ram_usage_percent': vm_ram_usage_percent
        }
    except Exception as e:
        print(f"Error getting VM memory info: {e}")
        return {
            'vm_total_ram_gb': 0.0,
            'vm_available_ram_gb': 0.0,
            'vm_used_ram_gb': 0.0,
            'vm_ram_usage_percent': 0.0
        }


def get_vm_gpu_memory_info():
    """Get VM-level GPU memory information"""
    gpu_info = {
        'vm_total_vram_gb': 0.0,
        'vm_used_vram_gb': 0.0,
        'vm_free_vram_gb': 0.0,
        'vm_vram_usage_percent': 0.0,
        'gpu_count': 0,
        'gpu_names': []
    }

    if not gpu_available:
        return gpu_info

    try:
        if gpu_method == 'pynvml':
            # NVIDIA GPU using pynvml (Windows and Linux)
            nvmlInit()
            gpu_count = nvmlDeviceGetCount()
            gpu_info['gpu_count'] = gpu_count

            total_vram_bytes = 0
            used_vram_bytes = 0
            gpu_names = []

            for i in range(gpu_count):
                handle = nvmlDeviceGetHandleByIndex(i)
                try:
                    # Get GPU name
                    gpu_name = nvmlDeviceGetName(handle)
                    if isinstance(gpu_name, bytes):
                        gpu_name = gpu_name.decode('utf-8')
                    gpu_names.append(gpu_name)

                    # Get memory info
                    mem_info = nvmlDeviceGetMemoryInfo(handle)
                    total_vram_bytes += mem_info.total
                    used_vram_bytes += mem_info.used

                except Exception as e:
                    print(f"Error getting info for GPU {i}: {e}")
                    continue

            if total_vram_bytes > 0:
                gpu_info['vm_total_vram_gb'] = round(total_vram_bytes / (1024**3), 2)
                gpu_info['vm_used_vram_gb'] = round(used_vram_bytes / (1024**3), 2)
                gpu_info['vm_free_vram_gb'] = round((total_vram_bytes - used_vram_bytes) / (1024**3), 2)
                gpu_info['vm_vram_usage_percent'] = round((used_vram_bytes / total_vram_bytes) * 100, 2)
                gpu_info['gpu_names'] = gpu_names

            nvmlShutdown()

        elif gpu_method == 'nvidia-smi':
            # Linux nvidia-smi method
            try:
                # Get GPU memory info
                result = subprocess.run(['nvidia-smi', '--query-gpu=name,memory.total,memory.used,memory.free', '--format=csv,noheader,nounits'],
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    total_vram_mb = 0
                    used_vram_mb = 0
                    gpu_names = []
                    gpu_count = 0

                    for line in result.stdout.strip().split('\n'):
                        if line.strip():
                            parts = line.split(',')
                            if len(parts) >= 4:
                                gpu_name = parts[0].strip()
                                total_mb = float(parts[1].strip())
                                used_mb = float(parts[2].strip())

                                gpu_names.append(gpu_name)
                                total_vram_mb += total_mb
                                used_vram_mb += used_mb
                                gpu_count += 1

                    if total_vram_mb > 0:
                        gpu_info['gpu_count'] = gpu_count
                        gpu_info['gpu_names'] = gpu_names
                        gpu_info['vm_total_vram_gb'] = round(total_vram_mb / 1024, 2)
                        gpu_info['vm_used_vram_gb'] = round(used_vram_mb / 1024, 2)
                        gpu_info['vm_free_vram_gb'] = round((total_vram_mb - used_vram_mb) / 1024, 2)
                        gpu_info['vm_vram_usage_percent'] = round((used_vram_mb / total_vram_mb) * 100, 2)
            except Exception as e:
                print(f"Error getting GPU memory info via nvidia-smi: {e}")

        elif gpu_method == 'rocm-smi':
            # AMD GPU method for Linux
            try:
                result = subprocess.run(['rocm-smi', '--showmeminfo', 'vram'], capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    # Parse rocm-smi output for memory info
                    # This is a simplified implementation - rocm-smi output format varies
                    lines = result.stdout.strip().split('\n')
                    for line in lines:
                        if 'GPU' in line and ('Total' in line or 'Used' in line):
                            # Extract memory information (implementation depends on rocm-smi format)
                            pass
            except Exception as e:
                print(f"Error getting GPU memory info via rocm-smi: {e}")

    except Exception as e:
        print(f"Error getting VM GPU memory info: {e}")

    return gpu_info


def get_gpu_process_stats():
    """Get per-process GPU utilization for both Windows and Linux"""
    gpu_pid_util = {}
    gpu_pid_mem = {}

    if not gpu_available:
        return gpu_pid_util, gpu_pid_mem

    try:
        if gpu_method == 'pynvml':
            # NVIDIA GPU using pynvml (Windows and Linux)
            nvmlInit()
            gpu_count = nvmlDeviceGetCount()
            for i in range(gpu_count):
                handle = nvmlDeviceGetHandleByIndex(i)
                try:
                    # Get GPU utilization
                    util = nvmlDeviceGetUtilizationRates(handle).gpu

                    # Get processes using GPU
                    procs = nvmlDeviceGetGraphicsRunningProcesses(handle)
                    for p in procs:
                        try:
                            if p.usedGpuMemory is None or p.usedGpuMemory == 4294967295:
                                mem_mb = 0
                            else:
                                mem_mb = p.usedGpuMemory / (1024**2)

                            # Assign proportional GPU utilization to each process
                            gpu_pid_mem[p.pid] = mem_mb
                            gpu_pid_util[p.pid] = util  # This assigns overall GPU util to all processes
                        except:
                            continue
                except:
                    continue
            nvmlShutdown()

        elif gpu_method == 'nvidia-smi':
            # Linux nvidia-smi method
            try:
                # Get GPU utilization
                result = subprocess.run(['nvidia-smi', '--query-gpu=utilization.gpu', '--format=csv,noheader,nounits'],
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    gpu_util = float(result.stdout.strip())

                    # Get processes using GPU
                    result = subprocess.run(['nvidia-smi', '--query-compute-apps=pid,used_memory', '--format=csv,noheader,nounits'],
                                          capture_output=True, text=True, timeout=5)
                    if result.returncode == 0:
                        for line in result.stdout.strip().split('\n'):
                            if line.strip():
                                parts = line.split(',')
                                if len(parts) >= 2:
                                    pid = int(parts[0].strip())
                                    mem_mb = float(parts[1].strip())
                                    gpu_pid_util[pid] = gpu_util
                                    gpu_pid_mem[pid] = mem_mb
            except:
                pass

        elif gpu_method == 'rocm-smi':
            # AMD GPU method for Linux
            try:
                result = subprocess.run(['rocm-smi', '--showuse'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    # Parse rocm-smi output for GPU utilization
                    # This is a simplified implementation - rocm-smi output varies
                    lines = result.stdout.strip().split('\n')
                    for line in lines:
                        if 'GPU' in line and '%' in line:
                            # Extract GPU utilization (implementation depends on rocm-smi format)
                            pass
            except:
                pass

    except Exception as e:
        print(f"Error getting GPU stats: {e}")

    return gpu_pid_util, gpu_pid_mem


def main():
    """Main agent loop"""
    # Load configuration
    config = VMAgentConfig()

    print("=" * 60)
    print("GreenMatrix VM Agent - Starting")
    print("=" * 60)
    print(f"VM Name: {config.vm_name}")
    print(f"Backend URL: {config.backend_url}")
    print(f"Collection Interval: {config.collection_interval} seconds")
    print(f"GPU Monitoring: {'Enabled' if config.collect_gpu_metrics and gpu_available else 'Disabled'}")
    print("=" * 60)

    # Initialize CPU monitoring for more accurate measurements
    print("Initializing CPU monitoring...")
    for proc in psutil.process_iter():
        try:
            proc.cpu_percent()  # First call to initialize
        except:
            pass

    # Main collection loop
    while True:
        try:
            processes = []

            # Get VM-level memory information
            vm_memory_info = get_vm_memory_info()
            vm_gpu_info = get_vm_gpu_memory_info() if config.collect_gpu_metrics else {}

            print(f"VM RAM: {vm_memory_info['vm_total_ram_gb']}GB total, {vm_memory_info['vm_used_ram_gb']}GB used ({vm_memory_info['vm_ram_usage_percent']}%)")
            if config.collect_gpu_metrics and vm_gpu_info.get('vm_total_vram_gb', 0) > 0:
                print(f"VM VRAM: {vm_gpu_info['vm_total_vram_gb']}GB total, {vm_gpu_info['vm_used_vram_gb']}GB used ({vm_gpu_info['vm_vram_usage_percent']}%)")

            # Get overall VM CPU and memory utilization
            overall_cpu_percent = psutil.cpu_percent(interval=1)  # 1-second interval for accuracy
            overall_memory = psutil.virtual_memory()
            overall_memory_percent = overall_memory.percent

            print(f"VM CPU: {overall_cpu_percent}% overall utilization")
            print(f"VM Memory: {overall_memory_percent}% overall utilization")

            # Get overall GPU utilization (not per-process)
            overall_gpu_utilization = 0
            if config.collect_gpu_metrics and gpu_available:
                if gpu_method == 'nvidia-smi':
                    try:
                        result = subprocess.run(['nvidia-smi', '--query-gpu=utilization.gpu', '--format=csv,noheader,nounits'],
                                              capture_output=True, text=True, timeout=5)
                        if result.returncode == 0:
                            overall_gpu_utilization = float(result.stdout.strip())
                            print(f"VM GPU: {overall_gpu_utilization}% overall utilization")
                    except Exception as e:
                        print(f"Error getting overall GPU utilization: {e}")
                elif gpu_method == 'pynvml':
                    try:
                        nvmlInit()
                        handle = nvmlDeviceGetHandleByIndex(0)  # First GPU
                        util = nvmlDeviceGetUtilizationRates(handle)
                        overall_gpu_utilization = util.gpu
                        print(f"VM GPU: {overall_gpu_utilization}% overall utilization")
                        nvmlShutdown()
                    except Exception as e:
                        print(f"Error getting overall GPU utilization via pynvml: {e}")

            # Get GPU stats for all processes (per-process assignment)
            gpu_pid_util, gpu_pid_mem = get_gpu_process_stats() if config.collect_gpu_metrics else ({}, {})
            if config.collect_gpu_metrics:
                print(f"Found GPU data for {len(gpu_pid_util)} processes")

            # Use simpler process iteration to avoid attribute errors
            for proc in psutil.process_iter():
                try:
                    # Get process info safely
                    pid = proc.pid
                    name = proc.name()
                    username = proc.username() if hasattr(proc, 'username') else 'unknown'
                    status = proc.status() if hasattr(proc, 'status') else 'unknown'
                    cpu_percent = proc.cpu_percent(interval=None)
                    memory_info = proc.memory_info()

                    # Get I/O info
                    try:
                        io_counters = proc.io_counters()
                        read_bytes = io_counters.read_bytes
                        write_bytes = io_counters.write_bytes
                    except (psutil.AccessDenied, AttributeError):
                        read_bytes = 0
                        write_bytes = 0

                    # Get open files count
                    try:
                        open_files = proc.num_fds() if hasattr(proc, 'num_fds') else 0
                    except (psutil.AccessDenied, AttributeError):
                        open_files = 0

                    # Calculate memory usage percentage using actual system memory
                    memory_mb = memory_info.rss / (1024*1024)
                    total_memory_mb = psutil.virtual_memory().total / (1024*1024)
                    memory_percent = (memory_mb / total_memory_mb) * 100

                    # Calculate estimated power consumption
                    estimated_power = round(cpu_percent * 0.1, 3)

                    processes.append({
                          'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                          'process_name': name,
                          'process_id': pid,
                          'username': username,
                          'status': status,
                          'start_time': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                          'cpu_usage_percent': float(cpu_percent),
                          'memory_usage_mb': round(memory_mb, 2),
                          'memory_usage_percent': round(memory_percent, 2),
                          'read_bytes': read_bytes,
                          'write_bytes': write_bytes,
                          'iops': round((read_bytes + write_bytes) / (1024*1024), 1),
                          'open_files': open_files,
                          'gpu_memory_usage_mb': round(gpu_pid_mem.get(pid, 0.0), 2),
                          'gpu_utilization_percent': gpu_pid_util.get(pid, 0.0),
                          'estimated_power_watts': estimated_power,
                          'vm_name': config.vm_name,
                          # Overall VM-level metrics (same for all processes in this snapshot)
                          'vm_overall_cpu_percent': round(overall_cpu_percent, 2),
                          'vm_overall_gpu_utilization': round(overall_gpu_utilization, 2)
                      })
                except (psutil.NoSuchProcess, psutil.AccessDenied, AttributeError):
                    continue

            payload = {
                  'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  'vm_name': config.vm_name,
                  'process_metrics': processes,
                  'agent_version': '2.0.0',
                  'platform': platform.system(),
                  'metrics_count': len(processes),
                  # VM-level memory information
                  'vm_memory_info': vm_memory_info,
                  'vm_gpu_info': vm_gpu_info
              }

            print(f"Sending {len(processes)} processes...")
            response = requests.post(
                f"{config.backend_url}/api/v1/metrics/vm-snapshot",
                json=payload,
                timeout=config.api_timeout
            )
            print(f"Response: {response.status_code}")

            if response.status_code == 200:
                print("✅ Successfully sent VM snapshot!")
            else:
                print(f"❌ Error response: {response.text[:200]}...")

        except requests.exceptions.RequestException as e:
            print(f"❌ Connection error: {e}")
            print(f"   Backend URL: {config.backend_url}")
            print("   Please check:")
            print("   1. GreenMatrix backend is running")
            print("   2. Backend URL is correct in config")
            print("   3. Network connectivity to backend")
        except Exception as e:
            print(f"❌ Collection error: {e}")

        print(f"Sleeping {config.collection_interval} seconds...")
        time.sleep(config.collection_interval)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nShutting down GreenMatrix VM Agent...")
        sys.exit(0)
