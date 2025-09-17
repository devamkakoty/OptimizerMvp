import sys
sys.path.insert(0, '/root/packages')
import os, time, json, socket, datetime, platform, requests, psutil
import subprocess
import re

class AutoConfig:
    def __init__(self):
        self.vm_name = socket.gethostname() + "-Linux"
        self.backend_url = self._discover_backend_url()
        self.collection_interval = int(os.getenv('GREENMATRIX_COLLECTION_INTERVAL', '2'))
        self.api_timeout = int(os.getenv('GREENMATRIX_API_TIMEOUT', '30'))
        
        # Detect VM-specific resource limits
        self.vm_memory_limit_mb = self._get_vm_memory_limit()
        self.vm_cpu_count = self._get_vm_cpu_count()
        
    def _discover_backend_url(self):
        """Automatically discover GreenMatrix backend URL"""
        
        # Method 1: Check environment variable (highest priority)
        backend_url = os.getenv('GREENMATRIX_BACKEND_URL')
        if backend_url:
            print(f"Using backend URL from environment: {backend_url}")
            return backend_url
            
        # Method 2: Check configuration file
        config_file = os.getenv('GREENMATRIX_CONFIG_FILE', '/etc/greenmatrix/config.json')
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    if 'backend_url' in config:
                        print(f"Using backend URL from config file: {config['backend_url']}")
                        return config['backend_url']
            except Exception as e:
                print(f"Warning: Could not read config file {config_file}: {e}")
        
        # Method 3: Auto-discovery through network scanning
        backend_url = self._auto_discover_backend()
        if backend_url:
            return backend_url
            
        # Method 4: Default fallback patterns
        return self._try_default_patterns()
    
    def _auto_discover_backend(self):
        """Auto-discover backend through network scanning and service discovery"""
        
        print("Auto-discovering GreenMatrix backend...")
        
        # Get default gateway (likely the host)
        try:
            # Method 1: Check default gateway
            gateway_ip = self._get_default_gateway()
            if gateway_ip:
                backend_url = f"http://{gateway_ip}:8000"
                if self._test_backend_url(backend_url):
                    print(f"Discovered backend at gateway: {backend_url}")
                    return backend_url
        except Exception as e:
            print(f"Gateway discovery failed: {e}")
        
        # Method 2: Check common Docker/LXD network ranges
        common_networks = [
            "172.17.0.1",    # Docker default bridge
            "172.20.0.1",    # Docker custom bridge
            "10.0.0.1",      # Common private network
            "192.168.1.1",   # Common router IP
            "10.25.41.86",   # Your current setup (fallback)
        ]
        
        for ip in common_networks:
            backend_url = f"http://{ip}:8000"
            if self._test_backend_url(backend_url):
                print(f"Discovered backend at: {backend_url}")
                return backend_url
        
        # Method 3: Network scan of local subnet
        return self._scan_local_network()
    
    def _get_default_gateway(self):
        """Get default gateway IP address"""
        try:
            # Try ip route command (Linux)
            result = subprocess.run(['ip', 'route', 'show', 'default'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                match = re.search(r'via\s+(\d+\.\d+\.\d+\.\d+)', result.stdout)
                if match:
                    return match.group(1)
        except:
            pass
            
        try:
            # Try route command (alternative)
            result = subprocess.run(['route', '-n'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                for line in lines:
                    if line.startswith('0.0.0.0'):
                        parts = line.split()
                        if len(parts) >= 2:
                            return parts[1]
        except:
            pass
            
        return None
    
    def _test_backend_url(self, url, timeout=3):
        """Test if backend URL is accessible"""
        try:
            response = requests.get(f"{url}/api/health", timeout=timeout)
            return response.status_code == 200
        except:
            return False
    
    def _scan_local_network(self):
        """Scan local network for GreenMatrix backend"""
        try:
            # Get local IP to determine subnet
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)
            
            # Extract subnet (assuming /24)
            ip_parts = local_ip.split('.')
            subnet = '.'.join(ip_parts[:3])
            
            print(f"Scanning subnet {subnet}.x for GreenMatrix backend...")
            
            # Common host IPs to check first
            priority_ips = [1, 2, 10, 100, 254]  # Common gateway/server IPs
            
            for host in priority_ips:
                ip = f"{subnet}.{host}"
                backend_url = f"http://{ip}:8000"
                if self._test_backend_url(backend_url, timeout=1):
                    print(f"Found backend at: {backend_url}")
                    return backend_url
                    
        except Exception as e:
            print(f"Network scan failed: {e}")
            
        return None
    
    def _try_default_patterns(self):
        """Try common default patterns"""
        defaults = [
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "http://greenmatrix-backend:8000",  # Docker service name
            "http://host.docker.internal:8000", # Docker Desktop
        ]
        
        for url in defaults:
            if self._test_backend_url(url):
                print(f"Using default backend: {url}")
                return url
                
        # Final fallback
        print("Warning: Could not auto-discover backend, using fallback")
        return "http://10.25.41.86:8000"
        
    def _get_vm_memory_limit(self):
        """Get VM-specific memory limit from cgroup or system info"""
        try:
            # Try to get memory limit from cgroup (for LXD containers)
            if os.path.exists('/sys/fs/cgroup/memory/memory.limit_in_bytes'):
                with open('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'r') as f:
                    limit_bytes = int(f.read().strip())
                    if limit_bytes > 9223372036854775807:  # Max value indicates no limit
                        return psutil.virtual_memory().total / (1024*1024)
                    return limit_bytes / (1024*1024)
            
            # Try cgroup v2
            elif os.path.exists('/sys/fs/cgroup/memory.max'):
                with open('/sys/fs/cgroup/memory.max', 'r') as f:
                    limit = f.read().strip()
                    if limit == 'max':
                        return psutil.virtual_memory().total / (1024*1024)
                    return int(limit) / (1024*1024)
            
            else:
                return psutil.virtual_memory().total / (1024*1024)
                
        except Exception as e:
            print(f"Warning: Could not determine VM memory limit: {e}")
            return psutil.virtual_memory().total / (1024*1024)
    
    def _get_vm_cpu_count(self):
        """Get VM-specific CPU count"""
        try:
            if os.path.exists('/sys/fs/cgroup/cpu/cpu.cfs_quota_us') and os.path.exists('/sys/fs/cgroup/cpu/cpu.cfs_period_us'):
                with open('/sys/fs/cgroup/cpu/cpu.cfs_quota_us', 'r') as f:
                    quota = int(f.read().strip())
                with open('/sys/fs/cgroup/cpu/cpu.cfs_period_us', 'r') as f:
                    period = int(f.read().strip())
                
                if quota > 0 and period > 0:
                    return quota / period
            
            return psutil.cpu_count()
            
        except Exception as e:
            print(f"Warning: Could not determine VM CPU limit: {e}")
            return psutil.cpu_count()

config = AutoConfig()
print(f"Starting VM agent for: {config.vm_name}")
print(f"Backend URL: {config.backend_url}")
print(f"VM Memory Limit: {config.vm_memory_limit_mb:.2f} MB")
print(f"VM CPU Count: {config.vm_cpu_count}")

# Test backend connectivity
if not config._test_backend_url(config.backend_url):
    print("❌ Warning: Cannot reach backend URL. Please check configuration.")
    print("   Set GREENMATRIX_BACKEND_URL environment variable if needed.")
else:
    print("✅ Backend connectivity confirmed")

# Initialize CPU monitoring
print("Initializing CPU monitoring...")
for proc in psutil.process_iter():
    try:
        proc.cpu_percent()
    except:
        pass

# Main monitoring loop
while True:
    try:
        processes = []
        total_vm_cpu_percent = 0
        
        for proc in psutil.process_iter():        
            try:
                pid = proc.pid
                name = proc.name()
                username = proc.username() if hasattr(proc, 'username') else 'unknown'
                status = proc.status() if hasattr(proc, 'status') else 'unknown'
                cpu_percent = proc.cpu_percent(interval=None)
                memory_info = proc.memory_info()

                try:
                    io_counters = proc.io_counters()
                    read_bytes = io_counters.read_bytes
                    write_bytes = io_counters.write_bytes
                except (psutil.AccessDenied, AttributeError):
                    read_bytes = 0
                    write_bytes = 0
                
                try:
                    open_files = proc.num_fds() if hasattr(proc, 'num_fds') else 0
                except (psutil.AccessDenied, AttributeError):
                    open_files = 0
                
                memory_mb = memory_info.rss / (1024*1024)
                memory_percent = (memory_mb / config.vm_memory_limit_mb) * 100
                
                normalized_cpu_percent = cpu_percent
                if config.vm_cpu_count < psutil.cpu_count():
                    normalized_cpu_percent = cpu_percent * (config.vm_cpu_count / psutil.cpu_count())
                
                total_vm_cpu_percent += cpu_percent
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

        vm_total_cpu_percent = min(total_vm_cpu_percent, 100.0)
        vm_memory_usage = sum([p['memory_usage_mb'] for p in processes])
        vm_memory_percent = (vm_memory_usage / config.vm_memory_limit_mb) * 100

        payload = {
            'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'vm_name': config.vm_name,
            'process_metrics': processes,
            'agent_version': '2.0.0',
            'platform': platform.system(),
            'metrics_count': len(processes),
            'vm_total_cpu_percent': round(vm_total_cpu_percent, 2),
            'vm_total_memory_mb': round(vm_memory_usage, 2),
            'vm_total_memory_percent': round(vm_memory_percent, 2),
            'vm_memory_limit_mb': round(config.vm_memory_limit_mb, 2),
            'vm_cpu_limit': config.vm_cpu_count,
            'backend_url': config.backend_url  # Include for debugging
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