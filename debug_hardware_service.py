#!/usr/bin/env python3
"""
Debug script for hardware specs collection service
"""
import configparser
import os
import requests
import json

print("=== Hardware Specs Service Debug ===")
print()

# Check working directory
print(f"Current working directory: {os.getcwd()}")
print()

# Check config file
script_dir = os.path.dirname(os.path.realpath(__file__))
config_path = os.path.join(script_dir, 'config.ini')
print(f"Script directory: {script_dir}")
print(f"Config path: {config_path}")
print(f"Config exists: {os.path.exists(config_path)}")
print()

if os.path.exists(config_path):
    with open(config_path, 'r') as f:
        print("Config file contents:")
        print(f.read())
    print()

# Test config parsing
try:
    config = configparser.ConfigParser()
    config.read(config_path)
    print(f"Config sections: {config.sections()}")
    
    if 'Settings' in config.sections():
        settings = config['Settings']
        backend_url = settings.get('backend_api_url', 'NOT_FOUND')
        hardware_interval = settings.getfloat('hardware_spec_interval_days', -1)
        
        print(f"Backend URL: {backend_url}")
        print(f"Hardware interval (days): {hardware_interval}")
        print(f"Sleep seconds: {hardware_interval * 24 * 60 * 60}")
        print()
        
        # Test API endpoint
        print("=== Testing API Endpoint ===")
        try:
            # Test API health first
            health_url = f"{backend_url}/health"
            print(f"Testing health endpoint: {health_url}")
            response = requests.get(health_url, timeout=10)
            print(f"Health check: {response.status_code} - {response.text}")
            print()
            
            # Test hardware specs endpoint
            api_url = f"{backend_url}/api/hardware-specs"
            print(f"Testing hardware specs endpoint: {api_url}")
            
            # Create sample data
            sample_data = {
                "os_name": "Linux",
                "os_version": "5.15.0-153-generic",
                "os_architecture": "64bit",
                "cpu_brand": "TestCPU",
                "cpu_model": "Test CPU Model",
                "cpu_physical_cores": 4,
                "cpu_total_cores": 4,
                "cpu_threads_per_core": 1.0,
                "total_ram_gb": 8.0,
                "total_storage_gb": 100.0,
                "region": "US"
            }
            
            print(f"Sample data: {json.dumps(sample_data, indent=2)}")
            
            response = requests.post(api_url, json=sample_data, timeout=30)
            print(f"API Response: {response.status_code}")
            print(f"Response body: {response.text}")
            
        except Exception as e:
            print(f"API test error: {str(e)}")
            
except Exception as e:
    print(f"Config parsing error: {str(e)}")

print()
print("=== PID File Check ===")
pid_file = '/opt/greenmatrix/hardware_collector.pid'
print(f"PID file path: {pid_file}")
print(f"PID file exists: {os.path.exists(pid_file)}")
if os.path.exists(pid_file):
    with open(pid_file, 'r') as f:
        pid_content = f.read().strip()
        print(f"PID file content: {pid_content}")
        
        # Check if process is running
        try:
            import psutil
            if psutil.pid_exists(int(pid_content)):
                proc = psutil.Process(int(pid_content))
                print(f"Process {pid_content} is running: {proc.name()}")
            else:
                print(f"Process {pid_content} is not running (stale PID file)")
        except:
            print("Could not check process status")

print()
print("=== Debug Complete ===")