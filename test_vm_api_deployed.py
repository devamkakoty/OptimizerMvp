"""
Test the deployed VM-level API to debug the issue
"""
import requests
import json

def test_deployed_vm_api():
    """Test the deployed VM-level API"""
    
    # Use the actual VM endpoint (corrected with /api prefix)
    url = "http://10.25.41.86:8000/api/deployment/post-deployment-optimization"
    
    # Sample data from your console (same as what frontend sends)
    vm_data = {
        'Activation Function': 'silu',
        'Architecture type': 'efficientnet_b0', 
        'Framework': 'PyTorch',
        'Model Name': 'EFFICIENTNET-B0',
        'Model Size (MB)': 20.17,
        'Model Type': 'efficientnet_b0',
        'Precision': 'FP32',
        'Total Parameters (Millions)': 5.29,
        'Vocabulary Size': 1000,
        'cpu_memory_usage': 1.29,
        'cpu_utilization': 22,
        'current_hardware_id': 'A100 + Intel(R) Xeon',  # From your console
        'deployment_type': 'vm-level',  # KEY: This should trigger VM-level path
        'disk_iops': 1625.6,
        'gpu_memory_usage': 22,
        'gpu_utilization': 44,
        'network_bandwidth': 5,
        'vm_gpu_count': 0,
        'vm_name': 'greenmatrix-vm2-Linux',
        'vm_ram_usage_percent': 3.200000047683716,
        'vm_total_ram_gb': '31.3GB',
        'vm_total_vram_gb': 'No GPU',
        'vm_vram_usage_percent': 0
    }
    
    print("=== Testing Deployed VM-Level API ===")
    print(f"URL: {url}")
    print(f"deployment_type: {vm_data['deployment_type']}")
    print(f"Key fields: gpu_utilization={vm_data['gpu_utilization']}, gpu_memory_usage={vm_data['gpu_memory_usage']}, current_hardware_id={vm_data['current_hardware_id']}")
    
    try:
        response = requests.post(url, json=vm_data, timeout=30)
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"\nResponse Data:")
            print(json.dumps(result, indent=2))
            
            # Check response format
            if result.get('analysis_type') == 'vm_level_optimization':
                print("\nSUCCESS: Got VM-level response format!")
                print(f"  - analysis_type: {result.get('analysis_type')}")
                print(f"  - recommendation: {result.get('recommendation', {}).get('primary_recommendation', 'NOT_SET')}")
            else:
                print("\nPROBLEM: Got bare-metal response format instead of VM-level!")
                print(f"  - workflow_type: {result.get('workflow_type', 'NOT_SET')}")
                print(f"  - recommendation: {result.get('recommendation', 'NOT_SET')}")
                print(f"  - This means the VM-level path is NOT being triggered on the server!")
                
        else:
            print(f"ERROR: Response ({response.status_code}): {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to the deployed backend!")
        print("  - Check if the backend is running on the VM")
        print("  - Check if port 8000 is accessible")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_deployed_vm_api()