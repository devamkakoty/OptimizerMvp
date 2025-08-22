import time
import configparser, psutil, cpuinfo, platform, requests, datetime, os, re, subprocess

if platform.system() == 'Windows':
    import wmi
    from pynvml import *

# --- PID File Management ---
PID_FILE = 'hardware_collector.pid'


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


def get_static_specs():
    specs = {}
    os_name = platform.system()
    specs['os_name'], specs['os_version'] = os_name, platform.version() if os_name == 'Windows' else platform.release()
    specs['os_architecture'] = platform.architecture()[0]

    cpu_info = cpuinfo.get_cpu_info()
    specs.update({
        'cpu_brand': cpu_info.get('vendor_id_raw', 'N/A'), 'cpu_model': cpu_info.get('brand_raw', 'N/A'),
        'cpu_family': cpu_info.get('family', 'N/A'), 'cpu_model_family': cpu_info.get('model', 'N/A'),
        'cpu_physical_cores': psutil.cpu_count(logical=False), 'cpu_total_cores': psutil.cpu_count(logical=True)
    })

    if os_name == 'Windows':
        try:
            c = wmi.WMI()
            processors = c.Win32_Processor()
            specs['cpu_sockets'] = len(processors)
            total_cores = sum(p.NumberOfCores for p in processors)
            specs['cpu_cores_per_socket'] = total_cores // specs['cpu_sockets'] if specs['cpu_sockets'] > 0 else 'N/A'
            specs['cpu_threads_per_core'] = specs['cpu_total_cores'] / total_cores if total_cores > 0 else 'N/A'
        except Exception:
            specs.update({'cpu_sockets': 'N/A', 'cpu_cores_per_socket': 'N/A', 'cpu_threads_per_core': 'N/A'})
    elif os_name == 'Linux':
        try:
            result = subprocess.run(['lscpu'], stdout=subprocess.PIPE, text=True)
            lscpu = {k.strip(): v.strip() for k, v in
                     (line.split(':', 1) for line in result.stdout.splitlines() if ':' in line)}
            specs.update({'cpu_threads_per_core': lscpu.get('Thread(s) per core', 'N/A'),
                          'cpu_cores_per_socket': lscpu.get('Core(s) per socket', 'N/A'),
                          'cpu_sockets': lscpu.get('Socket(s)', 'N/A')})
        except FileNotFoundError:
            specs.update({'cpu_threads_per_core': 'N/A', 'cpu_cores_per_socket': 'N/A', 'cpu_sockets': 'N/A'})

    specs['total_ram_gb'] = round(psutil.virtual_memory().total / (1024 ** 3), 2)
    try:
        specs['total_storage_gb'] = round(psutil.disk_usage('/').total / (1024 ** 3), 2)
    except Exception:
        specs['total_storage_gb'] = 0

    specs.update({'gpu_brand': 'N/A', 'gpu_model': "N/A", 'gpu_driver_version': "N/A", 'gpu_vram_total_mb': 0})
    if os_name == 'Windows':
        try:
            nvmlInit()
            handle = nvmlDeviceGetHandleByIndex(0)
            gpu_name = nvmlDeviceGetName(handle)
            if 'nvidia' in gpu_name.lower(): specs['gpu_brand'] = 'NVIDIA'
            specs.update({'gpu_model': gpu_name, 'gpu_driver_version': nvmlSystemGetDriverVersion(),
                          'gpu_vram_total_mb': round(nvmlDeviceGetMemoryInfo(handle).total / (1024 ** 2), 2)})
            nvmlShutdown()
        except (NameError, NVMLError):
            pass
    
    # Add region information
    specs['region'] = CURRENT_REGION
    return specs


if __name__ == "__main__":
    create_pid_file()
    try:
        interval_days = settings.getint('hardware_spec_interval_days', 1)
        sleep_seconds = interval_days * 24 * 60 * 60
        while True:
            try:
                hardware_data = get_static_specs()
                hardware_data['timestamp'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
                requests.post(f"{BACKEND_URL}/api/hardware-specs", json=hardware_data, timeout=30)
            except Exception as e:
                pass
            time.sleep(sleep_seconds)
    finally:
        remove_pid_file()