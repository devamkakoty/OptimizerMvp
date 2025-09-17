import sys
sys.path.insert(0, '/root/packages')
import os, time, json, socket, datetime, platform, requests, psutil

class VMConfig:
    def __init__(self):
        self.vm_name = socket.gethostname() + "-Linux"
        self.backend_url = "http://10.25.41.86:8000"
        self.collection_interval = 2
        self.api_timeout = 30
        
        # Detect VM-specific resource limits
        self.vm_memory_limit_mb = self._get_vm_memory_limit()
        self.vm_cpu_count = self._get_vm_cpu_count()
        
    def _get_vm_memory_limit(self):
        """Get VM-specific memory limit from cgroup or system info"""
        try:
            # Try to get memory limit from cgroup (for LXD containers)
            if os.path.exists('/sys/fs/cgroup/memory/memory.limit_in_bytes'):
                with open('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'r') as f:
                    limit_bytes = int(f.read().strip())
                    # If limit is very large, it means no limit set, use system memory
                    if limit_bytes > 9223372036854775807:  # Max value indicates no limit
                        return psutil.virtual_memory().total / (1024*1024)
                    return limit_bytes / (1024*1024)
            
            # Try cgroup v2 (newer systems)
            elif os.path.exists('/sys/fs/cgroup/memory.max'):
                with open('/sys/fs/cgroup/memory.max', 'r') as f:
                    limit = f.read().strip()
                    if limit == 'max':
                        return psutil.virtual_memory().total / (1024*1024)
                    return int(limit) / (1024*1024)
            
            # Fallback to system memory
            else:
                return psutil.virtual_memory().total / (1024*1024)
                
        except Exception as e:
            print(f"Warning: Could not determine VM memory limit, using system memory: {e}")
            return psutil.virtual_memory().total / (1024*1024)
    
    def _get_vm_cpu_count(self):
        """Get VM-specific CPU count"""
        try:
            # Try to get CPU quota from cgroup
            if os.path.exists('/sys/fs/cgroup/cpu/cpu.cfs_quota_us') and os.path.exists('/sys/fs/cgroup/cpu/cpu.cfs_period_us'):
                with open('/sys/fs/cgroup/cpu/cpu.cfs_quota_us', 'r') as f:
                    quota = int(f.read().strip())
                with open('/sys/fs/cgroup/cpu/cpu.cfs_period_us', 'r') as f:
                    period = int(f.read().strip())
                
                if quota > 0 and period > 0:
                    return quota / period
            
            # Fallback to system CPU count
            return psutil.cpu_count()
            
        except Exception as e:
            print(f"Warning: Could not determine VM CPU limit, using system CPU count: {e}")
            return psutil.cpu_count()

config = VMConfig()
print(f"Starting VM agent for: {config.vm_name}")
print(f"VM Memory Limit: {config.vm_memory_limit_mb:.2f} MB")
print(f"VM CPU Count: {config.vm_cpu_count}")

# Initialize CPU monitoring for more accurate measurements
print("Initializing CPU monitoring...")
for proc in psutil.process_iter():
    try:
        proc.cpu_percent()  # First call to initialize
    except:
        pass

# Track VM-level CPU usage
vm_cpu_times = psutil.cpu_times()

while True:
    try:
        processes = []
        total_vm_cpu_percent = 0
        
        # Get current VM-level CPU times for calculation
        current_cpu_times = psutil.cpu_times()
        
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
                
                # Calculate memory usage percentage using VM-specific memory limit
                memory_mb = memory_info.rss / (1024*1024)
                memory_percent = (memory_mb / config.vm_memory_limit_mb) * 100
                
                # Normalize CPU percentage to VM CPU allocation
                # If VM has limited CPUs, scale CPU percentage accordingly
                normalized_cpu_percent = cpu_percent
                if config.vm_cpu_count < psutil.cpu_count():
                    normalized_cpu_percent = cpu_percent * (config.vm_cpu_count / psutil.cpu_count())
                
                total_vm_cpu_percent += cpu_percent
                
                # Calculate estimated power consumption based on normalized CPU
                estimated_power = round(normalized_cpu_percent * 0.1, 3)
                
                processes.append({
                    'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),      
                    'process_name': name,
                    'process_id': pid,
                    'username': username,
                    'status': status,
                    'start_time': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    'cpu_usage_percent': float(normalized_cpu_percent),
                    'memory_usage_mb': round(memory_mb, 2),
                    'memory_usage_percent': round(memory_percent, 2),
                    'read_bytes': read_bytes,
                    'write_bytes': write_bytes,
                    'iops': round((read_bytes + write_bytes) / (1024*1024), 1),
                    'open_files': open_files,
                    'gpu_memory_usage_mb': 0.0,
                    'gpu_utilization_percent': 0.0,
                    'estimated_power_watts': estimated_power,
                    'vm_name': config.vm_name     
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, AttributeError):
                continue

        # Calculate VM-level metrics
        vm_total_cpu_percent = min(total_vm_cpu_percent, 100.0)  # Cap at 100%
        vm_memory_usage = sum([p['memory_usage_mb'] for p in processes])
        vm_memory_percent = (vm_memory_usage / config.vm_memory_limit_mb) * 100

        payload = {
            'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'vm_name': config.vm_name,
            'process_metrics': processes,
            'agent_version': '1.1.0',
            'platform': platform.system(),
            'metrics_count': len(processes),
            'vm_total_cpu_percent': round(vm_total_cpu_percent, 2),
            'vm_total_memory_mb': round(vm_memory_usage, 2),
            'vm_total_memory_percent': round(vm_memory_percent, 2),
            'vm_memory_limit_mb': round(config.vm_memory_limit_mb, 2),
            'vm_cpu_limit': config.vm_cpu_count
        }

        print(f"Sending {len(processes)} processes... (VM CPU: {vm_total_cpu_percent:.1f}%, VM Memory: {vm_memory_percent:.1f}%)")
        response = requests.post(f"{config.backend_url}/api/v1/metrics/vm-snapshot",
                   json=payload, timeout=config.api_timeout)
        print(f"Response: {response.status_code}")
        if response.status_code == 200:
            print("✅ Successfully sent VM snapshot!")
        else:
            print(f"❌ Error response: {response.text[:200]}...")

    except Exception as e:
        print(f"Collection error: {e}")

    print(f"Sleeping {config.collection_interval} seconds...")
    time.sleep(config.collection_interval)