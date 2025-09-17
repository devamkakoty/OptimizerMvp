import time
import configparser, psutil, cpuinfo, platform, requests, datetime, os, re, subprocess

if platform.system() == 'Windows':
    import wmi
    try:
        from pynvml import *
    except ImportError:
        pass
else:
    # Try to import pynvml for Linux as well
    try:
        from pynvml import *
    except ImportError:
        pass

# --- PID File Management ---
PID_FILE = '/opt/greenmatrix/hardware_collector.pid'


def create_pid_file():
    if os.path.exists(PID_FILE):
        print("Hardware collector is already running.")
        exit()
    with open(PID_FILE, 'w') as f: f.write(str(os.getpid()))


def remove_pid_file():
    if os.path.exists(PID_FILE): os.remove(PID_FILE)


# --- Configuration Loading ---
config = configparser.ConfigParser()
script_dir = os.path.dirname(os.path.realpath(__file__))
config.read(os.path.join(script_dir, 'config.ini'))
settings = config['Settings']
BACKEND_URL = settings.get('backend_api_url', 'http://localhost:8000')
CURRENT_REGION = settings.get('current_region', 'US')


def get_cuda_cores_estimate(gpu_name):
    """
    Estimate CUDA cores based on GPU model name.
    This is an approximation since exact CUDA core counts vary by specific model variants.
    """
    gpu_name_lower = gpu_name.lower()
    
    # Common NVIDIA GPU CUDA core estimates
    cuda_cores_map = {
        # RTX 40 Series
        'rtx 4090': 16384, 'rtx 4080': 9728, 'rtx 4070': 5888, 'rtx 4060': 3072,
        # RTX 30 Series  
        'rtx 3090': 10496, 'rtx 3080': 8704, 'rtx 3070': 5888, 'rtx 3060': 3584,
        # RTX 20 Series
        'rtx 2080': 2944, 'rtx 2070': 2304, 'rtx 2060': 1920,
        # GTX 10 Series
        'gtx 1080': 2560, 'gtx 1070': 1920, 'gtx 1060': 1280, 'gtx 1050': 640,
        # Tesla/Quadro Professional Cards
        'tesla v100': 5120, 'tesla p100': 3584, 'tesla k80': 2496, 'tesla t4': 2560,
        'a100': 6912, 'a40': 10752, 'a30': 3584, 'a10': 2560,
        'quadro rtx 8000': 4608, 'quadro rtx 6000': 4608, 'quadro rtx 5000': 3072,
        # Older cards
        'gtx 980': 2048, 'gtx 970': 1664, 'gtx 960': 1024, 'gtx 950': 768,
    }
    
    # Try to match GPU name with known models
    for model, cuda_cores in cuda_cores_map.items():
        if model in gpu_name_lower:
            return cuda_cores
    
    # If no exact match, try to extract series information for rough estimates
    if 'rtx 40' in gpu_name_lower or '4090' in gpu_name_lower or '4080' in gpu_name_lower:
        return 8000
    elif 'rtx 30' in gpu_name_lower or '3090' in gpu_name_lower or '3080' in gpu_name_lower:
        return 5888  
    elif 'rtx 20' in gpu_name_lower or '2080' in gpu_name_lower or '2070' in gpu_name_lower:
        return 1920
    elif 'gtx 10' in gpu_name_lower or '1080' in gpu_name_lower or '1070' in gpu_name_lower:
        return 1280
    elif 'tesla' in gpu_name_lower or 'quadro' in gpu_name_lower:
        return 2560
    elif 'a100' in gpu_name_lower:
        return 6912
    elif 'a40' in gpu_name_lower:
        return 10752
    else:
        return 0  # Unknown GPU model


def get_gpu_sm_cores_estimate(gpu_name, cuda_cores):
    """
    Estimate SM cores based on GPU model and CUDA cores.
    SM cores = CUDA cores / cores_per_sm (typically 128 for modern NVIDIA GPUs)
    """
    if cuda_cores > 0:
        # Most modern NVIDIA GPUs have 128 CUDA cores per SM
        cores_per_sm = 128
        return int(cuda_cores / cores_per_sm)
    return 0


def get_gpu_clock_estimates(gpu_name):
    """
    Estimate GPU graphics and memory clocks based on model name.
    Returns (graphics_clock_ghz, memory_clock_ghz)
    """
    gpu_name_lower = gpu_name.lower()
    
    # Common GPU clock estimates (base clocks)
    gpu_clocks_map = {
        'rtx 4090': (2.2, 10.5), 'rtx 4080': (2.2, 10.5), 'rtx 4070': (1.9, 10.5),
        'rtx 3090': (1.7, 9.75), 'rtx 3080': (1.7, 9.5), 'rtx 3070': (1.5, 7.0),
        'rtx 2080': (1.5, 7.0), 'rtx 2070': (1.4, 7.0), 'rtx 2060': (1.4, 7.0),
        'gtx 1080': (1.6, 5.0), 'gtx 1070': (1.5, 4.0), 'gtx 1060': (1.5, 4.0),
        'tesla v100': (1.4, 1.75), 'tesla t4': (1.6, 5.0), 'a100': (1.4, 1.2),
        'a40': (1.3, 7.25), 'intel arc': (2.1, 8.0)
    }
    
    for model, (graphics_clock, memory_clock) in gpu_clocks_map.items():
        if model in gpu_name_lower:
            return graphics_clock, memory_clock
    
    # Default estimates based on GPU type
    if 'nvidia' in gpu_name_lower or 'rtx' in gpu_name_lower or 'gtx' in gpu_name_lower:
        return 1.5, 6.0  # Default for NVIDIA
    elif 'intel' in gpu_name_lower:
        return 2.0, 8.0  # Default for Intel
    elif 'amd' in gpu_name_lower or 'radeon' in gpu_name_lower:
        return 1.8, 7.0  # Default for AMD
    else:
        return 0.0, 0.0


def get_cpu_frequency_info():
    """
    Get CPU base and max frequency information.
    Returns (base_freq_ghz, max_freq_ghz)
    """
    try:
        # Try to get CPU frequency info
        cpu_freq = psutil.cpu_freq()
        if cpu_freq:
            base_freq = cpu_freq.min / 1000 if cpu_freq.min else 0  # Convert MHz to GHz
            max_freq = cpu_freq.max / 1000 if cpu_freq.max else 0   # Convert MHz to GHz
            return base_freq, max_freq
    except:
        pass
    
    # Fallback: Try to extract from CPU model name using regex
    try:
        cpu_info = cpuinfo.get_cpu_info()
        cpu_model = cpu_info.get('brand_raw', '')
        
        # Look for frequency patterns in CPU name like "2.4GHz" or "3.9GHz"
        import re
        freq_matches = re.findall(r'(\d+\.?\d*)\s*GHz', cpu_model, re.IGNORECASE)
        if freq_matches:
            # Usually the first match is base, if multiple matches exist
            freqs = [float(f) for f in freq_matches]
            base_freq = min(freqs) if len(freqs) > 1 else freqs[0]
            max_freq = max(freqs) if len(freqs) > 1 else freqs[0] * 1.5  # Estimate boost
            return base_freq, max_freq
    except:
        pass
    
    return 0.0, 0.0  # Default values


def get_cpu_cache_info():
    """
    Get CPU L1 cache information in KB.
    """
    try:
        cpu_info = cpuinfo.get_cpu_info()
        
        # Try to get L1 cache info
        l1_cache = cpu_info.get('l1_data_cache_size', 0)
        if l1_cache and isinstance(l1_cache, (int, str)):
            # Convert to KB if it's a string with units
            if isinstance(l1_cache, str):
                l1_cache_num = int(re.findall(r'\d+', l1_cache)[0]) if re.findall(r'\d+', l1_cache) else 0
            else:
                l1_cache_num = int(l1_cache)
            return l1_cache_num
    except:
        pass
    
    # Fallback estimates based on CPU type
    try:
        cpu_info = cpuinfo.get_cpu_info()
        cpu_model = cpu_info.get('brand_raw', '').lower()
        
        if 'xeon' in cpu_model or 'core' in cpu_model:
            return 64  # Typical L1 cache for Intel CPUs (64KB)
        elif 'amd' in cpu_model or 'ryzen' in cpu_model:
            return 64  # Typical L1 cache for AMD CPUs
    except:
        pass
    
    return 0  # Default


def parse_lspci_gpu_info(lspci_output):
    """
    Parse lspci -v output to extract GPU information including memory ranges.
    Returns list of GPU dictionaries with name, brand, memory_mb, and driver info.
    """
    gpu_devices = []
    lines = lspci_output.split('\n')
    i = 0

    while i < len(lines):
        line = lines[i].strip()

        # Look for GPU devices (VGA, Display, 3D controller)
        if ('VGA compatible controller:' in line or
            'Display controller:' in line or
            '3D controller:' in line) and line:

            gpu_info = {
                'name': 'Unknown GPU',
                'brand': 'Other',
                'memory_mb': 0,
                'driver': None,
                'pci_slot': line.split()[0] if line.split() else 'Unknown'
            }

            # Extract GPU name and brand from device line
            if ':' in line:
                device_name = line.split(':', 2)[-1].strip()
                gpu_info['name'] = device_name

                # Determine brand
                if 'nvidia' in device_name.lower():
                    gpu_info['brand'] = 'NVIDIA'
                elif 'amd' in device_name.lower() or 'radeon' in device_name.lower():
                    gpu_info['brand'] = 'AMD'
                elif 'intel' in device_name.lower():
                    gpu_info['brand'] = 'Intel'

            # Parse the detailed info block for this GPU
            i += 1
            while i < len(lines) and (lines[i].startswith('\t') or lines[i].startswith(' ')):
                detail_line = lines[i].strip()

                # Extract memory information from Memory lines - prioritize largest prefetchable memory
                if detail_line.startswith('Memory at') and '[size=' in detail_line:
                    memory_size_mb = 0

                    if '[size=' in detail_line and 'G]' in detail_line:
                        size_part = detail_line.split('[size=')[1].split(']')[0]
                        if 'G' in size_part:
                            try:
                                gb_size = float(size_part.replace('G', '').strip())
                                memory_size_mb = int(gb_size * 1024)  # Convert GB to MB
                            except:
                                pass
                    elif '[size=' in detail_line and 'M]' in detail_line:
                        size_part = detail_line.split('[size=')[1].split(']')[0]
                        if 'M' in size_part:
                            try:
                                memory_size_mb = int(float(size_part.replace('M', '').strip()))
                            except:
                                pass

                    # Use the largest memory range found (typically the VRAM for GPUs)
                    if memory_size_mb > gpu_info['memory_mb']:
                        gpu_info['memory_mb'] = memory_size_mb

                # Extract driver information
                elif detail_line.startswith('Kernel driver in use:'):
                    gpu_info['driver'] = detail_line.split(':', 1)[1].strip()
                elif detail_line.startswith('Kernel modules:'):
                    if not gpu_info['driver']:  # Only if no active driver found
                        modules = detail_line.split(':', 1)[1].strip()
                        gpu_info['driver'] = f"Modules: {modules}"

                i += 1

            # Skip VM/integrated graphics unless it's the only GPU found
            if ('basic display adapter' not in gpu_info['name'].lower() and
                'microsoft basic' not in gpu_info['name'].lower() and
                'vmware svga' not in gpu_info['name'].lower()):
                gpu_devices.append(gpu_info)
        else:
            i += 1

    return gpu_devices


def detect_gpu_from_sysfs():
    """
    Fallback GPU detection using /sys/bus/pci/devices/ and lspci -nn.
    Works even when lspci -v fails or provides incomplete info.
    """
    gpu_devices = []

    try:
        # Get GPU devices using lspci with vendor/device IDs
        result = subprocess.run(['lspci', '-nn'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            for line in result.stdout.split('\n'):
                if (('VGA' in line or 'Display' in line or '3D controller' in line) and
                    '[' in line and ']' in line):

                    # Extract vendor:device ID from [xxxx:yyyy]
                    bracket_content = line[line.find('['):line.find(']')+1]
                    if ':' in bracket_content:
                        vendor_device = bracket_content.strip('[]')
                        vendor_id, device_id = vendor_device.split(':')

                        gpu_info = {
                            'name': 'Unknown GPU',
                            'brand': 'Other',
                            'vendor_id': vendor_id,
                            'device_id': device_id
                        }

                        # Determine brand by vendor ID
                        if vendor_id.lower() == '10de':  # NVIDIA
                            gpu_info['brand'] = 'NVIDIA'
                            gpu_info['name'] = get_nvidia_gpu_name_by_device_id(device_id)
                        elif vendor_id.lower() in ['1002', '1022']:  # AMD
                            gpu_info['brand'] = 'AMD'
                            gpu_info['name'] = f"AMD GPU (Device {device_id})"
                        elif vendor_id.lower() == '8086':  # Intel
                            gpu_info['brand'] = 'Intel'
                            gpu_info['name'] = f"Intel GPU (Device {device_id})"

                        # Extract basic name from lspci line
                        if ':' in line:
                            basic_name = line.split(':', 2)[-1].strip()
                            if '[' in basic_name:
                                basic_name = basic_name[:basic_name.find('[')].strip()
                            if basic_name and 'Unknown' in gpu_info['name']:
                                gpu_info['name'] = basic_name

                        gpu_devices.append(gpu_info)

        # Try to get additional info from sysfs
        try:
            pci_devices_path = '/sys/bus/pci/devices'
            if os.path.exists(pci_devices_path):
                for device_dir in os.listdir(pci_devices_path):
                    class_file = os.path.join(pci_devices_path, device_dir, 'class')
                    if os.path.exists(class_file):
                        with open(class_file, 'r') as f:
                            device_class = f.read().strip()
                            # Check if it's a display/GPU device (class 0x03xxxx)
                            if device_class.startswith('0x03'):
                                # This is a display device, could extract more info if needed
                                pass
        except:
            pass

    except Exception:
        pass

    return gpu_devices


def get_nvidia_gpu_name_by_device_id(device_id):
    """
    Map NVIDIA device IDs to GPU names for common models.
    """
    nvidia_device_map = {
        # RTX 40 Series
        '2684': 'GeForce RTX 4090',
        '2682': 'GeForce RTX 4080',
        '2786': 'GeForce RTX 4070',

        # RTX 30 Series
        '2204': 'GeForce RTX 3090',
        '2206': 'GeForce RTX 3080',
        '2484': 'GeForce RTX 3070',
        '2487': 'GeForce RTX 3060',

        # GA103 (your GPU based on debug output)
        '2482': 'GeForce RTX 3070 Ti',
        '2488': 'GeForce RTX 3060 Ti',

        # Add more as needed
    }

    device_id_upper = device_id.upper()
    return nvidia_device_map.get(device_id_upper, f"NVIDIA GPU GA103 (Device {device_id})")


def get_power_consumption_estimates(cpu_model, gpu_model):
    """
    Estimate power consumption for CPU and GPU based on model names.
    Returns (cpu_power_watts, gpu_power_watts)
    """
    cpu_power = 0
    gpu_power = 0
    
    # CPU Power estimates
    if cpu_model:
        cpu_lower = cpu_model.lower()
        if 'xeon' in cpu_lower:
            cpu_power = 150  # Typical server CPU
        elif 'i9' in cpu_lower or 'ultra 7' in cpu_lower:
            cpu_power = 125  # High-end desktop
        elif 'i7' in cpu_lower or 'ultra 5' in cpu_lower:
            cpu_power = 95   # Mid-high desktop
        elif 'i5' in cpu_lower or 'ultra 3' in cpu_lower:
            cpu_power = 65   # Mid-range desktop
        elif 'i3' in cpu_lower:
            cpu_power = 54   # Entry desktop
        elif 'amd' in cpu_lower or 'ryzen' in cpu_lower:
            cpu_power = 105  # Typical AMD CPU
        else:
            cpu_power = 95   # Default estimate
    
    # GPU Power estimates  
    if gpu_model and gpu_model != 'N/A' and gpu_model != 'No GPU':
        gpu_lower = gpu_model.lower()
        if 'rtx 4090' in gpu_lower:
            gpu_power = 450
        elif 'rtx 4080' in gpu_lower:
            gpu_power = 320
        elif 'rtx 4070' in gpu_lower:
            gpu_power = 200
        elif 'rtx 3090' in gpu_lower:
            gpu_power = 350
        elif 'rtx 3080' in gpu_lower:
            gpu_power = 320
        elif 'rtx 3070' in gpu_lower:
            gpu_power = 220
        elif 'rtx' in gpu_lower or 'gtx' in gpu_lower:
            gpu_power = 250  # Default NVIDIA GPU
        elif 'tesla' in gpu_lower:
            gpu_power = 300  # Tesla cards
        elif 'a100' in gpu_lower:
            gpu_power = 400
        elif 'intel' in gpu_lower:
            gpu_power = 30   # Intel integrated graphics
        elif 'amd' in gpu_lower or 'radeon' in gpu_lower:
            gpu_power = 200  # AMD GPU estimate
        else:
            gpu_power = 150  # Default discrete GPU
    
    return cpu_power, gpu_power


def get_static_specs():
    """
    Collect hardware specifications in Hardware_table compatible format.
    Maps data to exact column names expected by PKL models.
    """
    specs = {}
    os_name = platform.system()
    
    # Operating System Information (additional fields, not in Hardware_table)
    specs['os_name'] = os_name
    specs['os_version'] = platform.version() if os_name == 'Windows' else platform.release()
    specs['os_architecture'] = platform.architecture()[0]

    # CPU Information
    cpu_info = cpuinfo.get_cpu_info()
    cpu_brand = cpu_info.get('vendor_id_raw', 'N/A')
    cpu_model = cpu_info.get('brand_raw', 'N/A')
    cpu_physical_cores = psutil.cpu_count(logical=False)
    cpu_total_cores = psutil.cpu_count(logical=True)
    cpu_threads_per_core = cpu_total_cores / cpu_physical_cores if cpu_physical_cores else 1
    
    # Get CPU frequency information
    cpu_base_freq, cpu_max_freq = get_cpu_frequency_info()
    
    # Get CPU cache information
    l1_cache = get_cpu_cache_info()
    
    # Hardware_table compatible CPU fields
    specs['CPU'] = cpu_model  # Full CPU model name for Hardware_table
    specs['CPU Total cores (Including Logical cores)'] = cpu_total_cores
    specs['CPU Threads per Core'] = cpu_threads_per_core
    specs['CPU Base clock(GHz)'] = cpu_base_freq
    specs['CPU Max Frequency(GHz)'] = cpu_max_freq
    specs['L1 Cache'] = l1_cache
    
    # Additional detailed CPU fields (not in Hardware_table but useful)
    specs['cpu_brand'] = cpu_brand
    specs['cpu_family'] = cpu_info.get('family', None)
    specs['cpu_model_family'] = cpu_info.get('model', None)
    specs['cpu_physical_cores'] = cpu_physical_cores
    specs['cpu_total_cores'] = cpu_total_cores  # Duplicate for backward compatibility

    # Additional detailed CPU socket information
    if os_name == 'Windows':
        try:
            c = wmi.WMI()
            processors = c.Win32_Processor()
            cpu_sockets = len(processors)
            total_cores = sum(p.NumberOfCores for p in processors)
            cpu_cores_per_socket = total_cores // cpu_sockets if cpu_sockets > 0 else 1
            specs['cpu_sockets'] = cpu_sockets
            specs['cpu_cores_per_socket'] = cpu_cores_per_socket
        except Exception:
            specs.update({'cpu_sockets': 1, 'cpu_cores_per_socket': cpu_physical_cores})
    elif os_name == 'Linux':
        try:
            result = subprocess.run(['lscpu'], stdout=subprocess.PIPE, text=True)
            lscpu = {k.strip(): v.strip() for k, v in
                     (line.split(':', 1) for line in result.stdout.splitlines() if ':' in line)}
            specs['cpu_sockets'] = int(lscpu.get('Socket(s)', 1))
            specs['cpu_cores_per_socket'] = int(lscpu.get('Core(s) per socket', cpu_physical_cores))
        except (FileNotFoundError, ValueError):
            specs.update({'cpu_sockets': 1, 'cpu_cores_per_socket': cpu_physical_cores})

    # Memory and Storage
    specs['total_ram_gb'] = round(psutil.virtual_memory().total / (1024 ** 3), 2)
    try:
        specs['total_storage_gb'] = round(psutil.disk_usage('/').total / (1024 ** 3), 2)
    except Exception:
        specs['total_storage_gb'] = 0

    # GPU Detection - Initialize Hardware_table compatible defaults
    specs.update({
        # Hardware_table compatible GPU fields
        'GPU': 'No GPU',
        '# of GPU': 0,
        'GPU Memory Total - VRAM (MB)': 0,
        'GPU Graphics clock': 0.0,
        'GPU Memory clock': 0.0,
        'GPU SM Cores': 0,
        'GPU CUDA Cores': 0,
        # Additional detailed GPU fields
        'gpu_brand': 'N/A',
        'gpu_driver_version': 'N/A'
    })
    
    # Try GPU detection for both Windows and Linux
    gpu_detected = False
    gpu_count = 0
    
    if os_name == 'Windows':
        # Method 1: Try NVIDIA via pynvml
        try:
            nvmlInit()
            gpu_count = nvmlDeviceGetCount()
            if gpu_count > 0:
                handle = nvmlDeviceGetHandleByIndex(0)
                gpu_name = nvmlDeviceGetName(handle).decode('utf-8') if isinstance(nvmlDeviceGetName(handle), bytes) else nvmlDeviceGetName(handle)
                gpu_memory_mb = round(nvmlDeviceGetMemoryInfo(handle).total / (1024 ** 2), 2)
                driver_version = nvmlSystemGetDriverVersion().decode('utf-8') if isinstance(nvmlSystemGetDriverVersion(), bytes) else nvmlSystemGetDriverVersion()
                
                # Get additional GPU specs
                cuda_cores = get_cuda_cores_estimate(gpu_name)
                sm_cores = get_gpu_sm_cores_estimate(gpu_name, cuda_cores)
                graphics_clock, memory_clock = get_gpu_clock_estimates(gpu_name)
                
                # Update Hardware_table compatible fields
                specs.update({
                    'GPU': gpu_name,
                    '# of GPU': gpu_count,
                    'GPU Memory Total - VRAM (MB)': gpu_memory_mb,
                    'GPU Graphics clock': graphics_clock,
                    'GPU Memory clock': memory_clock,
                    'GPU SM Cores': sm_cores,
                    'GPU CUDA Cores': cuda_cores,
                    'gpu_brand': 'NVIDIA',
                    'gpu_driver_version': driver_version
                })
                
                gpu_detected = True
                gpu_count = gpu_count
            nvmlShutdown()
        except (NameError, Exception):
            pass
        
        # Method 2: Try WMI for all GPU brands on Windows (fallback)
        if not gpu_detected:
            try:
                import wmi
                c = wmi.WMI()
                gpu_list = []
                for gpu in c.Win32_VideoController():
                    if gpu.Name and 'microsoft basic' not in gpu.Name.lower():
                        gpu_list.append(gpu)
                
                if gpu_list:
                    # Use the first discrete GPU found
                    gpu = gpu_list[0]
                    gpu_name = gpu.Name
                    gpu_brand = 'Other'
                    
                    if 'intel' in gpu_name.lower():
                        gpu_brand = 'Intel'
                    elif 'amd' in gpu_name.lower() or 'radeon' in gpu_name.lower():
                        gpu_brand = 'AMD'
                    elif 'nvidia' in gpu_name.lower():
                        gpu_brand = 'NVIDIA'
                    
                    # Get VRAM info
                    gpu_memory_mb = 0
                    if hasattr(gpu, 'AdapterRAM') and gpu.AdapterRAM:
                        gpu_memory_mb = round(int(gpu.AdapterRAM) / (1024 ** 2), 2)
                    
                    # Get GPU clock estimates
                    graphics_clock, memory_clock = get_gpu_clock_estimates(gpu_name)
                    cuda_cores = get_cuda_cores_estimate(gpu_name) if gpu_brand == 'NVIDIA' else 0
                    sm_cores = get_gpu_sm_cores_estimate(gpu_name, cuda_cores) if gpu_brand == 'NVIDIA' else 0
                    
                    specs.update({
                        'GPU': gpu_name,
                        '# of GPU': len(gpu_list),
                        'GPU Memory Total - VRAM (MB)': gpu_memory_mb,
                        'GPU Graphics clock': graphics_clock,
                        'GPU Memory clock': memory_clock,
                        'GPU SM Cores': sm_cores,
                        'GPU CUDA Cores': cuda_cores,
                        'gpu_brand': gpu_brand,
                        'gpu_driver_version': gpu.DriverVersion or 'Unknown'
                    })
                    
                    gpu_detected = True
                    gpu_count = len(gpu_list)
            except Exception:
                pass
    
    elif os_name == 'Linux':
        # Method 1: Try NVIDIA via pynvml on Linux
        try:
            nvmlInit()
            gpu_count_nvml = nvmlDeviceGetCount()
            if gpu_count_nvml > 0:
                handle = nvmlDeviceGetHandleByIndex(0)
                gpu_name = nvmlDeviceGetName(handle).decode('utf-8') if isinstance(nvmlDeviceGetName(handle), bytes) else nvmlDeviceGetName(handle)
                gpu_memory_mb = round(nvmlDeviceGetMemoryInfo(handle).total / (1024 ** 2), 2)
                driver_version = nvmlSystemGetDriverVersion().decode('utf-8') if isinstance(nvmlSystemGetDriverVersion(), bytes) else nvmlSystemGetDriverVersion()
                
                # Get additional GPU specs
                cuda_cores = get_cuda_cores_estimate(gpu_name)
                sm_cores = get_gpu_sm_cores_estimate(gpu_name, cuda_cores)
                graphics_clock, memory_clock = get_gpu_clock_estimates(gpu_name)
                
                # Update Hardware_table compatible fields
                specs.update({
                    'GPU': gpu_name,
                    '# of GPU': gpu_count_nvml,
                    'GPU Memory Total - VRAM (MB)': gpu_memory_mb,
                    'GPU Graphics clock': graphics_clock,
                    'GPU Memory clock': memory_clock,
                    'GPU SM Cores': sm_cores,
                    'GPU CUDA Cores': cuda_cores,
                    'gpu_brand': 'NVIDIA',
                    'gpu_driver_version': driver_version
                })
                
                gpu_detected = True
                gpu_count = gpu_count_nvml
            nvmlShutdown()
        except (ImportError, Exception):
            pass
        
        # Method 2: Try nvidia-smi command as fallback
        if not gpu_detected:
            try:
                # Check if nvidia-smi is available and count GPUs
                result = subprocess.run(['nvidia-smi', '--list-gpus'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0 and result.stdout.strip():
                    gpu_count_smi = len(result.stdout.strip().split('\n'))
                    
                    # Get GPU info
                    result = subprocess.run(['nvidia-smi', '--query-gpu=name,memory.total,driver_version', '--format=csv,noheader,nounits'], 
                                          capture_output=True, text=True, timeout=5)
                    if result.returncode == 0 and result.stdout.strip():
                        gpu_lines = result.stdout.strip().split('\n')
                        if gpu_lines:
                            # Use first GPU info
                            gpu_info = gpu_lines[0].split(',')
                            if len(gpu_info) >= 3:
                                gpu_name = gpu_info[0].strip()
                                gpu_memory_mb = float(gpu_info[1].strip())
                                driver_version = gpu_info[2].strip()
                                
                                # Get additional GPU specs
                                cuda_cores = get_cuda_cores_estimate(gpu_name)
                                sm_cores = get_gpu_sm_cores_estimate(gpu_name, cuda_cores)
                                graphics_clock, memory_clock = get_gpu_clock_estimates(gpu_name)
                                
                                specs.update({
                                    'GPU': gpu_name,
                                    '# of GPU': gpu_count_smi,
                                    'GPU Memory Total - VRAM (MB)': gpu_memory_mb,
                                    'GPU Graphics clock': graphics_clock,
                                    'GPU Memory clock': memory_clock,
                                    'GPU SM Cores': sm_cores,
                                    'GPU CUDA Cores': cuda_cores,
                                    'gpu_brand': 'NVIDIA',
                                    'gpu_driver_version': driver_version
                                })
                                
                                gpu_detected = True
                                gpu_count = gpu_count_smi
            except (FileNotFoundError, subprocess.TimeoutExpired, Exception):
                pass
        
        # Method 3: Enhanced lspci-based GPU detection (works without drivers)
        if not gpu_detected:
            try:
                # Get detailed GPU info with lspci -v
                result = subprocess.run(['lspci', '-v'], capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    gpu_devices = parse_lspci_gpu_info(result.stdout)

                    if gpu_devices:
                        # Use the first discrete GPU (prefer NVIDIA/AMD over Intel integrated)
                        discrete_gpu = None
                        for gpu in gpu_devices:
                            if gpu['brand'] in ['NVIDIA', 'AMD']:
                                discrete_gpu = gpu
                                break

                        if not discrete_gpu and gpu_devices:
                            discrete_gpu = gpu_devices[0]  # Fallback to first GPU

                        if discrete_gpu:
                            gpu_name = discrete_gpu['name']
                            gpu_brand = discrete_gpu['brand']
                            gpu_memory_mb = discrete_gpu['memory_mb']

                            # Get GPU specifications
                            graphics_clock, memory_clock = get_gpu_clock_estimates(gpu_name)
                            cuda_cores = get_cuda_cores_estimate(gpu_name) if gpu_brand == 'NVIDIA' else 0
                            sm_cores = get_gpu_sm_cores_estimate(gpu_name, cuda_cores) if gpu_brand == 'NVIDIA' else 0

                            # Only include reliable hardware specs, mark estimates clearly
                            specs.update({
                                'GPU': gpu_name,
                                '# of GPU': len(gpu_devices),
                                'GPU Memory Total - VRAM (MB)': gpu_memory_mb if gpu_memory_mb > 0 else 0,
                                'GPU Graphics clock': 0.0,  # Cannot determine without driver
                                'GPU Memory clock': 0.0,    # Cannot determine without driver
                                'GPU SM Cores': cuda_cores // 128 if cuda_cores > 0 and gpu_brand == 'NVIDIA' else 0,
                                'GPU CUDA Cores': cuda_cores if gpu_brand == 'NVIDIA' else 0,
                                'gpu_brand': gpu_brand,
                                'gpu_driver_version': discrete_gpu.get('driver', 'No Driver - Hardware Detected via lspci')
                            })

                            gpu_detected = True
                            gpu_count = len(gpu_devices)
            except (FileNotFoundError, subprocess.TimeoutExpired, Exception):
                pass

        # Method 4: Fallback using /sys/bus/pci/devices/ for GPU detection
        if not gpu_detected:
            try:
                gpu_devices = detect_gpu_from_sysfs()
                if gpu_devices:
                    gpu = gpu_devices[0]  # Use first GPU found
                    gpu_name = gpu['name']
                    gpu_brand = gpu['brand']

                    # Only report confirmed hardware, no estimates for clocks/performance
                    cuda_cores = get_cuda_cores_estimate(gpu_name) if gpu_brand == 'NVIDIA' else 0

                    specs.update({
                        'GPU': gpu_name,
                        '# of GPU': len(gpu_devices),
                        'GPU Memory Total - VRAM (MB)': 0,  # Cannot determine from sysfs without driver
                        'GPU Graphics clock': 0.0,          # Cannot determine without driver
                        'GPU Memory clock': 0.0,            # Cannot determine without driver
                        'GPU SM Cores': cuda_cores // 128 if cuda_cores > 0 and gpu_brand == 'NVIDIA' else 0,
                        'GPU CUDA Cores': cuda_cores if gpu_brand == 'NVIDIA' else 0,
                        'gpu_brand': gpu_brand,
                        'gpu_driver_version': 'No Driver - Hardware Detected via PCI ID'
                    })

                    gpu_detected = True
                    gpu_count = len(gpu_devices)
            except Exception:
                pass
    
    # Add power consumption estimates
    cpu_power, gpu_power = get_power_consumption_estimates(specs['CPU'], specs['GPU'])
    specs['CPU Power Consumption'] = cpu_power
    specs['GPUPower Consumption'] = gpu_power
    
    # Add region information
    specs['region'] = CURRENT_REGION
    
    return specs


def map_to_api_format(hardware_data):
    """
    Map hardware data from get_static_specs() to the format expected by the API.
    This ensures compatibility with HardwareSpecsRequest model and includes ALL collected fields.
    """
    mapped_data = {}
    
    # Operating System fields (direct mapping)
    mapped_data['os_name'] = hardware_data.get('os_name')
    mapped_data['os_version'] = hardware_data.get('os_version')  
    mapped_data['os_architecture'] = hardware_data.get('os_architecture')
    
    # CPU fields (required by API) - map script names to API names
    mapped_data['cpu_brand'] = hardware_data.get('cpu_brand', 'Unknown')
    mapped_data['cpu_model'] = hardware_data.get('CPU', 'Unknown CPU')  # Script uses 'CPU' for full model name
    mapped_data['cpu_family'] = hardware_data.get('cpu_family')
    mapped_data['cpu_model_family'] = hardware_data.get('cpu_model_family')
    mapped_data['cpu_physical_cores'] = hardware_data.get('cpu_physical_cores', 1)
    mapped_data['cpu_total_cores'] = hardware_data.get('CPU Total cores (Including Logical cores)')  # Script name
    mapped_data['cpu_sockets'] = hardware_data.get('cpu_sockets', 1)
    mapped_data['cpu_cores_per_socket'] = hardware_data.get('cpu_cores_per_socket', 1)
    mapped_data['cpu_threads_per_core'] = hardware_data.get('CPU Threads per Core')  # Script name
    
    # Additional CPU fields that script collects (now supported by API)
    mapped_data['cpu_base_clock_ghz'] = hardware_data.get('CPU Base clock(GHz)')  # Script name
    mapped_data['cpu_max_frequency_ghz'] = hardware_data.get('CPU Max Frequency(GHz)')  # Script name
    mapped_data['l1_cache'] = hardware_data.get('L1 Cache')  # Script name
    mapped_data['cpu_power_consumption'] = hardware_data.get('CPU Power Consumption')  # Script name
    
    # Memory and Storage (direct mapping)
    mapped_data['total_ram_gb'] = hardware_data.get('total_ram_gb')
    mapped_data['total_storage_gb'] = hardware_data.get('total_storage_gb')
    
    # GPU fields (map script names to API names)
    gpu_cuda_cores = hardware_data.get('GPU CUDA Cores', 0)  # Script name
    mapped_data['gpu_cuda_cores'] = str(gpu_cuda_cores) if gpu_cuda_cores and gpu_cuda_cores > 0 else None
    mapped_data['gpu_brand'] = hardware_data.get('gpu_brand')
    gpu_name = hardware_data.get('GPU', 'No GPU')  # Script name 
    mapped_data['gpu_model'] = gpu_name if gpu_name != 'No GPU' else None
    mapped_data['gpu_driver_version'] = hardware_data.get('gpu_driver_version')
    gpu_vram = hardware_data.get('GPU Memory Total - VRAM (MB)', 0)  # Script name
    mapped_data['gpu_vram_total_mb'] = gpu_vram if gpu_vram and gpu_vram > 0 else None
    
    # Additional GPU fields that script collects (now supported by API)
    mapped_data['num_gpu'] = hardware_data.get('# of GPU')  # Script name  
    mapped_data['gpu_graphics_clock'] = hardware_data.get('GPU Graphics clock')  # Script name
    mapped_data['gpu_memory_clock'] = hardware_data.get('GPU Memory clock')  # Script name
    mapped_data['gpu_sm_cores'] = hardware_data.get('GPU SM Cores')  # Script name
    mapped_data['gpu_power_consumption'] = hardware_data.get('GPUPower Consumption')  # Script name (note the typo)
    
    # Other fields
    mapped_data['region'] = hardware_data.get('region', 'US')
    mapped_data['timestamp'] = hardware_data.get('timestamp')
    
    return mapped_data


if __name__ == "__main__":
    create_pid_file()
    try:
        interval_days = settings.getfloat('hardware_spec_interval_days', 1)
        sleep_seconds = interval_days * 24 * 60 * 60        
        while True:
            try:
                hardware_data = get_static_specs()
                hardware_data['timestamp'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
                
                # Map to API expected format
                api_data = map_to_api_format(hardware_data)
                
                print("Original data:", hardware_data)
                print("API formatted data:", api_data)
                
                response = requests.post(f"{BACKEND_URL}/api/hardware-specs", json=api_data, timeout=30)
                print(f"API Response: {response.status_code} - {response.text}")
                
            except Exception as e:
                print(f"Error occurred: {str(e)}")
            time.sleep(sleep_seconds)
    finally:
        remove_pid_file()