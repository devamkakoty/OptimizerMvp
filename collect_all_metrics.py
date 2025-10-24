import configparser, subprocess, json, datetime, os, time, requests, psutil, platform
if platform.system() == 'Windows':
    from pynvml import *

# --- PID File Management ---
# Cross-platform PID file path
if platform.system() == 'Windows':
    PID_DIR = os.path.join(os.environ.get('PROGRAMDATA', 'C:\\ProgramData'), 'GreenMatrix')
    PID_FILE = os.path.join(PID_DIR, 'metrics_collector.pid')
else:
    PID_DIR = '/opt/greenmatrix'
    PID_FILE = os.path.join(PID_DIR, 'metrics_collector.pid')

# Ensure PID directory exists
os.makedirs(PID_DIR, exist_ok=True)


def create_pid_file():
    if os.path.exists(PID_FILE):
        print("Metrics collector is already running.")
        exit()
    try:
        with open(PID_FILE, 'w') as f:
            f.write(str(os.getpid()))
    except Exception as e:
        print(f"Warning: Could not create PID file: {e}")


def remove_pid_file():
    try:
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)
    except Exception as e:
        print(f"Warning: Could not remove PID file: {e}")

# --- Configuration & Helper Functions (These are the final, stable versions) ---
config = configparser.ConfigParser()
script_dir = os.path.dirname(os.path.realpath(__file__))
config.read(os.path.join(script_dir, 'config.ini'))
settings = config['Settings']
BACKEND_URL = settings.get('backend_api_url', 'http://localhost:8000')
API_TIMEOUT = settings.getint('api_request_timeout', 30)
CPU_TDP_WATTS = settings.getfloat('cpu_tdp_watts', 125.0)

def get_host_process_stats(interval=2.0):
    """
    Get comprehensive process statistics with improved accuracy for Task Manager compatibility.
    Optimized for faster collection.
    """
    def _get_gpu_stats():
        gpu_pid_mem, gpu_pid_util = {}, {}
        if platform.system() != 'Windows': return gpu_pid_mem, gpu_pid_util
        try:
            nvmlInit()
            gpu_count = nvmlDeviceGetCount()
            for i in range(gpu_count):
                handle = nvmlDeviceGetHandleByIndex(i)
                try:
                    util = nvmlDeviceGetUtilizationRates(handle).gpu
                    procs = nvmlDeviceGetGraphicsRunningProcesses(handle)
                    for p in procs:
                        try:
                            if p.usedGpuMemory is None or p.usedGpuMemory == 4294967295: mem_mb = 0
                            else: mem_mb = p.usedGpuMemory / 1024**2
                            gpu_pid_mem[p.pid], gpu_pid_util[p.pid] = mem_mb, util
                        except NVMLError: continue
                except NVMLError: continue
            nvmlShutdown()
        except Exception: pass
        return gpu_pid_mem, gpu_pid_util
    
    snapshot_timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    processes_list = []
    gpu_pid_mem, gpu_pid_util = _get_gpu_stats()
    
    # Get system memory info for accurate calculations
    virtual_memory = psutil.virtual_memory()
    total_memory_mb = virtual_memory.total / (1024**2)
    
    # Single pass to collect all process data efficiently
    # First pass: get baseline CPU and I/O data
    baseline_data = {}
    for proc in psutil.process_iter(['pid', 'name', 'username', 'memory_info', 'status', 'create_time', 'io_counters']):
        try:
            pinfo = proc.info
            pid = pinfo.get('pid')
            if pid is None: continue
            
            process_name = pinfo.get('name', '')
            if process_name in ['Idle', 'System Idle Process']:
                continue
            
            # Get baseline CPU
            cpu_baseline = proc.cpu_percent(interval=None)
            
            baseline_data[pid] = {
                'proc': proc,
                'pinfo': pinfo,
                'cpu_baseline': cpu_baseline,
                'io_baseline': pinfo.get('io_counters')
            }
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    
    # Short sleep for CPU and I/O measurement
    time.sleep(interval)
    
    # Second pass: get final measurements and build result
    for pid, baseline in baseline_data.items():
        try:
            proc = baseline['proc']
            pinfo = baseline['pinfo']
            
            # Get final CPU percentage
            cpu_percent = proc.cpu_percent(interval=None)
            
            # Debug: If this is a process we know should have CPU usage, log it
            if pinfo.get('name') == 'python3' and cpu_percent > 0:
                print(f"DEBUG: {pinfo.get('name')} (PID {pid}) CPU: {cpu_percent}%")
            
            # Get I/O stats if available
            try:
                io_current = proc.io_counters()
                io_baseline = baseline['io_baseline']
                if io_baseline and io_current:
                    read_iops = max(0, (io_current.read_count - io_baseline.read_count) / interval)
                    write_iops = max(0, (io_current.write_count - io_baseline.write_count) / interval)
                    read_bytes = io_current.read_bytes
                    write_bytes = io_current.write_bytes
                else:
                    read_iops = write_iops = 0
                    read_bytes = write_bytes = 0
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                read_iops = write_iops = 0
                read_bytes = write_bytes = 0
            
            # Get memory info - use working set (more accurate for Task Manager comparison)
            memory_info = pinfo.get('memory_info')
            if hasattr(memory_info, 'wset'):
                memory_mb = memory_info.wset / (1024**2)
            else:
                memory_mb = memory_info.rss / (1024**2)
            
            # Calculate accurate memory percentage
            memory_percent = (memory_mb / total_memory_mb) * 100
                
            processes_list.append({
                'timestamp': snapshot_timestamp, 
                'process_name': pinfo.get('name', ''), 
                'process_id': pid, 
                'username': pinfo.get('username', 'Unknown'),
                'status': pinfo.get('status', 'unknown'), 
                'start_time': datetime.datetime.fromtimestamp(pinfo.get('create_time', 0)).isoformat(),
                'cpu_usage_percent': round(cpu_percent, 2),
                'memory_usage_mb': round(memory_mb, 2), 
                'memory_usage_percent': round(memory_percent, 2),
                'read_bytes': read_bytes, 
                'write_bytes': write_bytes,
                'iops': round(read_iops + write_iops, 1), 
                'open_files': 0,  # Skip for performance
                'gpu_memory_usage_mb': round(gpu_pid_mem.get(pid, 0), 2),
                'gpu_utilization_percent': gpu_pid_util.get(pid, 0)
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    
    return processes_list

def get_hyperv_vm_metrics():
    if platform.system() != 'Windows': return []
    command = "Get-VM | Where-Object {$_.State -eq 'Running'} | Measure-VM | Select-Object VMName, CPUUsage, AverageMemoryUsage | ConvertTo-Json"
    try:
        result = subprocess.run(["powershell.exe", "-Command", command], capture_output=True, text=True, check=True)
        return json.loads(result.stdout) if result.stdout else []
    except Exception: return []

def get_overall_host_metrics():
    # Get system-wide CPU and memory usage (matches Task Manager)
    # Use non-blocking CPU percent (it will be accurate after the first call)
    cpu_percent = psutil.cpu_percent(interval=None)
    memory_percent = psutil.virtual_memory().percent

    metrics = {
        'host_cpu_usage_percent': cpu_percent,
        'host_ram_usage_percent': memory_percent
    }

    # Network I/O metrics
    try:
        net_io = psutil.net_io_counters()
        if net_io:
            metrics.update({
                'host_network_bytes_sent': net_io.bytes_sent,
                'host_network_bytes_received': net_io.bytes_recv,
                'host_network_packets_sent': net_io.packets_sent,
                'host_network_packets_received': net_io.packets_recv
            })
        else:
            metrics.update({
                'host_network_bytes_sent': 0,
                'host_network_bytes_received': 0,
                'host_network_packets_sent': 0,
                'host_network_packets_received': 0
            })
    except:
        metrics.update({
            'host_network_bytes_sent': 0,
            'host_network_bytes_received': 0,
            'host_network_packets_sent': 0,
            'host_network_packets_received': 0
        })

    # Disk I/O metrics
    try:
        disk_io = psutil.disk_io_counters()
        if disk_io:
            metrics.update({
                'host_disk_read_bytes': disk_io.read_bytes,
                'host_disk_write_bytes': disk_io.write_bytes,
                'host_disk_read_count': disk_io.read_count,
                'host_disk_write_count': disk_io.write_count
            })
        else:
            metrics.update({
                'host_disk_read_bytes': 0,
                'host_disk_write_bytes': 0,
                'host_disk_read_count': 0,
                'host_disk_write_count': 0
            })
    except:
        metrics.update({
            'host_disk_read_bytes': 0,
            'host_disk_write_bytes': 0,
            'host_disk_read_count': 0,
            'host_disk_write_count': 0
        })
    if platform.system() == 'Windows':
        try:
            nvmlInit()
            handle = nvmlDeviceGetHandleByIndex(0)
            util = nvmlDeviceGetUtilizationRates(handle)
            
            # Get GPU power draw in watts
            try:
                gpu_power_watts = nvmlDeviceGetPowerUsage(handle) / 1000.0  # Convert from mW to W
            except NVMLError:
                gpu_power_watts = 0.0
            
            metrics.update({
                'host_gpu_utilization_percent': util.gpu, 
                'host_gpu_memory_utilization_percent': util.memory,
                'host_gpu_temperature_celsius': nvmlDeviceGetTemperature(handle, NVML_TEMPERATURE_GPU),
                'host_gpu_power_draw_watts': gpu_power_watts
            })
            nvmlShutdown()
        except (NameError, NVMLError): 
            metrics.update({
                'host_gpu_utilization_percent': 0, 
                'host_gpu_memory_utilization_percent': 0, 
                'host_gpu_temperature_celsius': 0,
                'host_gpu_power_draw_watts': 0.0
            })
    else:
        metrics.update({
            'host_gpu_utilization_percent': 0, 
            'host_gpu_memory_utilization_percent': 0, 
            'host_gpu_temperature_celsius': 0,
            'host_gpu_power_draw_watts': 0.0
        })
    return metrics

def calculate_process_power_estimation(cpu_usage_percent, gpu_util_percent, gpu_power_watts):
    """
    Calculate estimated power consumption for a process based on CPU and GPU usage.
    
    Args:
        cpu_usage_percent: CPU usage percentage for the process
        gpu_util_percent: GPU utilization percentage for the process
        gpu_power_watts: Total GPU power draw in watts
    
    Returns:
        Estimated power consumption in watts
    """
    # CPU power estimation: proportional to CPU usage based on TDP
    cpu_power_estimate = (cpu_usage_percent / 100.0) * CPU_TDP_WATTS
    
    # GPU power estimation: proportional to GPU utilization
    gpu_power_estimate = (gpu_util_percent / 100.0) * gpu_power_watts
    
    # Total estimated power consumption
    total_power_estimate = cpu_power_estimate + gpu_power_estimate
    
    return round(total_power_estimate, 3)

if __name__ == "__main__":
    create_pid_file()
    try:
        # Initialize CPU monitoring
        print("Initializing CPU monitoring...")
        psutil.cpu_percent(interval=1)  # First call to initialize
        
        interval_minutes = settings.getfloat('collection_interval_minutes', 1.0)
        sleep_seconds = interval_minutes * 60
        print(f"Starting metrics collection with {interval_minutes} minute intervals ({sleep_seconds} seconds)")
        
        while True:
            try:
                print("Starting data collection cycle...")
                timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
                
                print("Getting VM metrics...")
                vm_metrics = get_hyperv_vm_metrics()
                
                print("Getting overall host metrics...")
                overall_metrics = get_overall_host_metrics()
                
                print("Getting host process stats...")
                host_processes = get_host_process_stats()
                print(f"Collected {len(host_processes)} processes")
                
                # Add power estimation to each process
                gpu_power_watts = overall_metrics.get('host_gpu_power_draw_watts', 0.0)
                for process in host_processes:
                    process['estimated_power_watts'] = calculate_process_power_estimation(
                        process['cpu_usage_percent'],
                        process['gpu_utilization_percent'], 
                        gpu_power_watts
                    )
                
                snapshot = {
                    "timestamp": timestamp, 
                    "overall_host_metrics": overall_metrics,
                    "host_processes": host_processes,
                    "vm_metrics": [{'timestamp': timestamp, **vm} for vm in vm_metrics] if vm_metrics else []
                }
                
                print(overall_metrics)
                # Debug: print sample data
                if host_processes:
                    sample_process = host_processes[0]
                    print(f"Sample process: {sample_process['process_name']} - CPU: {sample_process['cpu_usage_percent']}%, Memory: {sample_process['memory_usage_mb']}MB")
                
                print(f"Sending {len(host_processes)} processes to API...")
                response = requests.post(f"{BACKEND_URL}/api/metrics/snapshot", json=snapshot, timeout=API_TIMEOUT)
                print(f"API Response: {response.status_code}")
                
                if response.status_code != 200:
                    print(f"API Error: {response.text}")
                    
            except Exception as e:
                print(f"Error in collection cycle: {e}")
                import traceback
                traceback.print_exc()
            
            print(f"Sleeping for {sleep_seconds} seconds...")
            time.sleep(sleep_seconds)
    finally:
        remove_pid_file()