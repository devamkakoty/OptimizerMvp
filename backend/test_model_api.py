import requests
import json
from datetime import datetime, timedelta

# Base URL for the API
BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test health check endpoint"""
    print("Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_get_model_data():
    """Test get model data endpoint"""
    print("\nTesting get model data...")
    try:
        payload = {
            "model_type": "bert",
            "task_type": "inference"
        }
        response = requests.post(f"{BASE_URL}/api/model/get-model-data", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_simulate_performance():
    """Test simulate performance endpoint"""
    print("\nTesting simulate performance...")
    try:
        payload = {
            "Model": "BERT",
            "Framework": "PyTorch",
            "Total_Parameters_Millions": 109.51,
            "Model_Size_MB": 840.09,
            "Architecture_type": "BertForMaskedLM",
            "Model_Type": "bert",
            "Number_of_hidden_Layers": 12,
            "Precision": "FP32",
            "Vocabulary_Size": 30522,
            "Number_of_Attention_Layers": 12,
            "Activation_Function": "gelu",
            "FLOPs": 1024.0
        }
        response = requests.post(f"{BASE_URL}/api/model/simulate-performance", json=payload)
        print(f"Status Code: {response.status_code}")
        response_data = response.json()
        print(f"Response: {response_data}")
        
        # Check if response contains performance_results
        if response.status_code == 200 and "performance_results" in response_data:
            results = response_data["performance_results"]
            print(f"Found {len(results)} hardware configurations")
            for i, result in enumerate(results):
                print(f"  {i+1}. {result.get('hardware', 'N/A')} - {result.get('full_name', 'N/A')}")
                print(f"     Latency: {result.get('latency_ms', 0):.2f} ms")
                print(f"     Throughput: {result.get('throughput_qps', 0):.2f} QPS")
                print(f"     Cost per 1000: ${result.get('cost_per_1000', 0):.4f}")
                print(f"     Memory: {result.get('memory_gb', 0):.1f} GB")
        
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_get_all_hardware():
    """Test get all hardware endpoint"""
    print("\nTesting get all hardware...")
    try:
        response = requests.get(f"{BASE_URL}/api/hardware/")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        print("--------------------------------","Hardware Get Point Tested","--------------------------------")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_get_hardware_by_id():
    """Test get hardware by ID endpoint"""
    print("\nTesting get hardware by ID...")
    try:
        response = requests.get(f"{BASE_URL}/api/hardware/1")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        print("--------------------------------","Hardware Get Point Tested","--------------------------------")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_push_metrics_data():
    """Test push metrics data endpoint"""
    print("\nTesting push metrics data...")
    try:
        payload = {
            "hardware_id": 1,
            "cpu_usage_percent": 45.5,
            "gpu_usage_percent": 78.2,
            "memory_usage_percent": 62.3,
            "temperature_cpu": 65.0,
            "temperature_gpu": 72.5,
            "power_consumption_watts": 125.0,
            "network_usage_mbps": 15.5,
            "disk_usage_percent": 45.2,
            "additional_metrics": {
                "process_count": 156,
                "active_connections": 23
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        response = requests.post(f"{BASE_URL}/api/monitoring/push-metrics", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        print("--------------------------------","Monitoring Push Metrics Point Tested","--------------------------------")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_push_metrics_batch():
    """Test push metrics batch endpoint"""
    print("\nTesting push metrics batch...")
    try:
        payload = {
            "metrics_data": [
                {
                    "hardware_id": 1,
                    "cpu_usage_percent": 45.5,
                    "gpu_usage_percent": 78.2,
                    "memory_usage_percent": 62.3,
                    "timestamp": datetime.utcnow().isoformat()
                },
                {
                    "hardware_id": 2,
                    "cpu_usage_percent": 32.1,
                    "gpu_usage_percent": 45.8,
                    "memory_usage_percent": 58.9,
                    "timestamp": datetime.utcnow().isoformat()
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/monitoring/push-metrics-batch", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        print("--------------------------------","Monitoring Push Metrics Batch Point Tested","--------------------------------")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_get_metrics_data():
    """Test get metrics data endpoint"""
    print("\nTesting get metrics data...")
    try:
        # Get metrics from last 24 hours
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=24)
        
        params = {
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "limit": 100
        }
        response = requests.get(f"{BASE_URL}/api/monitoring/metrics", params=params)
        print(f"Status Code: {response.status_code}")
        response_data = response.json()
        print(f"Response: {response_data}")
        print("--------------------------------","Monitoring Get Metrics Point Tested","--------------------------------")
        
        if response.status_code == 200 and "metrics" in response_data:
            print(f"Found {response_data['count']} metrics records")
        
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_get_metrics_summary():
    """Test get metrics summary endpoint"""
    print("\nTesting get metrics summary...")
    try:
        # Get summary from last 24 hours
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=24)
        
        params = {
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat()
        }
        response = requests.get(f"{BASE_URL}/api/monitoring/metrics-summary", params=params)
        print(f"Status Code: {response.status_code}")
        response_data = response.json()
        print(f"Response: {response_data}")
        
        if response.status_code == 200 and "summary" in response_data:
            summary = response_data["summary"]
            print(f"Total records: {summary.get('total_records', 0)}")
            print(f"Avg CPU usage: {summary.get('avg_cpu_usage', 0):.2f}%")
            print(f"Avg GPU usage: {summary.get('avg_gpu_usage', 0):.2f}%")
            print(f"Avg Memory usage: {summary.get('avg_memory_usage', 0):.2f}%")
        print("--------------------------------","Monitoring Get Metrics Summary Point Tested","--------------------------------")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_get_buffer_status():
    """Test get buffer status endpoint"""
    print("\nTesting get buffer status...")
    try:
        response = requests.get(f"{BASE_URL}/api/monitoring/buffer-status")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        print("--------------------------------","Monitoring Get Buffer Status Point Tested","--------------------------------")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_post_deployment_optimization():
    """Test post-deployment optimization endpoint"""
    print("\nTesting post-deployment optimization...")
    try:
        payload = {
            "cpu_usage_percent": 75.5,
            "gpu_usage_percent": 85.2,
            "memory_usage_percent": 68.3,
            "temperature_cpu": 65.0,
            "temperature_gpu": 78.5,
            "power_consumption_watts": 450.0,
            "network_usage_mbps": 125.5,
            "disk_usage_percent": 45.2,
            "current_latency_ms": 150.0,
            "current_throughput_qps": 25.5,
            "current_memory_gb": 12.5,
            "current_cost_per_1000": 2.5,
            "target_fp16_performance": True,
            "optimization_priority": "balanced"
        }
        response = requests.post(f"{BASE_URL}/api/deployment/post-deployment-optimization", json=payload)
        print(f"Status Code: {response.status_code}")
        response_data = response.json()
        print(f"Response: {response_data}")
        
        # Check if response contains optimization_results
        if response.status_code == 200 and "optimization_results" in response_data:
            results = response_data["optimization_results"]
            print(f"Found {len(results)} optimized hardware configurations")
            for i, result in enumerate(results):
                print(f"  {i+1}. {result.get('hardware', 'N/A')} - {result.get('full_name', 'N/A')}")
                print(f"     Overall Score: {result.get('optimization_scores', {}).get('overall_score', 0):.2f}")
                print(f"     Memory Score: {result.get('optimization_scores', {}).get('memory_score', 0):.2f}")
                print(f"     Latency Score: {result.get('optimization_scores', {}).get('latency_score', 0):.2f}")
                print(f"     FP16 Score: {result.get('optimization_scores', {}).get('fp16_score', 0):.2f}")
                
                projected = result.get('projected_performance', {})
                print(f"     Projected Latency: {projected.get('latency_ms', 0):.2f} ms")
                print(f"     Projected Memory: {projected.get('memory_gb', 0):.1f} GB")
                print(f"     Projected Cost: ${projected.get('cost_per_1000', 0):.4f}")
                print(f"     FP16 Support: {projected.get('fp16_support', False)}")
                
                improvements = result.get('current_vs_projected', {})
                print(f"     Latency Improvement: {improvements.get('latency_improvement_percent', 0):.1f}%")
                print(f"     Memory Improvement: {improvements.get('memory_improvement_percent', 0):.1f}%")
                print(f"     Cost Improvement: {improvements.get('cost_improvement_percent', 0):.1f}%")
        print("--------------------------------","Deployment Post Deployment Optimization Point Tested","--------------------------------")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_pre_deployment_optimization():
    """Test pre-deployment optimization endpoint"""
    print("\nTesting pre-deployment optimization...")
    try:
        payload = {
            "model_type": "bert",
            "framework": "PyTorch",
            "task_type": "inference",
            "model_size_mb": 840.09,
            "parameters_millions": 109.51,
            "flops_billions": 1024.0,
            "batch_size": 32,
            "latency_requirement_ms": 100.0,
            "throughput_requirement_qps": 50.0,
            "target_fp16_performance": True,
            "optimization_priority": "balanced"
        }
        response = requests.post(f"{BASE_URL}/api/deployment/post-deployment-optimization", json=payload)
        print(f"Status Code: {response.status_code}")
        response_data = response.json()
        print(f"Response: {response_data}")
        
        # Check if response contains optimization_results
        if response.status_code == 200 and "optimization_results" in response_data:
            results = response_data["optimization_results"]
            print(f"Found {len(results)} optimized hardware configurations")
            for i, result in enumerate(results):
                print(f"  {i+1}. {result.get('hardware', 'N/A')} - {result.get('full_name', 'N/A')}")
                print(f"     Overall Score: {result.get('optimization_scores', {}).get('overall_score', 0):.2f}")
                print(f"     Memory Score: {result.get('optimization_scores', {}).get('memory_score', 0):.2f}")
                print(f"     Latency Score: {result.get('optimization_scores', {}).get('latency_score', 0):.2f}")
                print(f"     FP16 Score: {result.get('optimization_scores', {}).get('fp16_score', 0):.2f}")
                print(f"     Cost Score: {result.get('optimization_scores', {}).get('cost_score', 0):.2f}")
                
                projected = result.get('projected_performance', {})
                print(f"     Projected Latency: {projected.get('latency_ms', 0):.2f} ms")
                print(f"     Projected Memory: {projected.get('memory_gb', 0):.1f} GB")
                print(f"     Projected Cost: ${projected.get('cost_per_1000', 0):.4f}")
                print(f"     Projected Throughput: {projected.get('throughput_qps', 0):.2f} QPS")
                print(f"     FP16 Support: {projected.get('fp16_support', False)}")
                
                requirements = result.get('requirements_met', {})
                print(f"     Meets Latency Requirement: {requirements.get('latency_requirement', False)}")
                print(f"     Meets Throughput Requirement: {requirements.get('throughput_requirement', False)}")
        print("--------------------------------","Deployment Pre Deployment Optimization Point Tested","--------------------------------")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_vm_metrics_endpoints():
    """Test VM metrics endpoints"""
    print("\n=== Testing VM Metrics Endpoints ===")
    
    # Test push VM metrics
    vm_metrics_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "VMName": "test-vm-1",
        "CPUUsage": 75,
        "AverageMemoryUsage": 8192
    }
    
    response = requests.post(f"{BASE_URL}/api/vm-metrics/push", json=vm_metrics_data)
    print(f"Push VM metrics: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {response.json()}")
    else:
        print(f"Error: {response.text}")
    
    # Test push VM metrics batch
    vm_metrics_batch = {
        "vm_metrics": [
            {
                "timestamp": datetime.utcnow().isoformat(),
                "VMName": "test-vm-2",
                "CPUUsage": 60,
                "AverageMemoryUsage": 4096
            },
            {
                "timestamp": datetime.utcnow().isoformat(),
                "VMName": "test-vm-3",
                "CPUUsage": 90,
                "AverageMemoryUsage": 16384
            }
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/vm-metrics/push-batch", json=vm_metrics_batch)
    print(f"Push VM metrics batch: {response.status_code}")
    if response.status_code == 200:
        print("--------------------------------","VM Metrics Push Batch Point Tested","--------------------------------")
        print(f"Response: {response.json()}")
    else:
        print(f"Error: {response.text}")
    
    # Test get VM metrics
    response = requests.get(f"{BASE_URL}/api/vm-metrics?limit=10")
    print(f"Get VM metrics: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Retrieved {data.get('count', 0)} VM metrics records")
    else:
        print(f"Error: {response.text}")
    
    # Test get VM metrics summary
    response = requests.get(f"{BASE_URL}/api/vm-metrics/summary")
    print(f"Get VM metrics summary: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Summary: {data}")
    else:
        print(f"Error: {response.text}")

def test_host_process_metrics_endpoints():
    """Test Host Process metrics endpoints"""
    print("\n=== Testing Host Process Metrics Endpoints ===")
    
    # Test push host process metrics
    host_process_metrics_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "process_name": "python.exe",
        "process_id": 1234,
        "username": "testuser",
        "status": "running",
        "cpu_usage_percent": 25.5,
        "memory_usage_mb": 512.0,
        "gpu_memory_usage_mb": 1024.0,
        "gpu_utilization_percent": 45.2
    }
    
    response = requests.post(f"{BASE_URL}/api/host-process-metrics/push", json=host_process_metrics_data)
    print(f"Push host process metrics: {response.status_code}")
    if response.status_code == 200:
        print("--------------------------------","Host Process Metrics Push Point Tested","--------------------------------")
        print(f"Response: {response.json()}")
    else:
        print(f"Error: {response.text}")
    
    # Test push host process metrics batch
    host_process_metrics_batch = {
        "host_process_metrics": [
            {
                "timestamp": datetime.utcnow().isoformat(),
                "process_name": "chrome.exe",
                "process_id": 5678,
                "username": "testuser",
                "status": "running",
                "cpu_usage_percent": 15.3,
                "memory_usage_mb": 1024.0,
                "gpu_memory_usage_mb": 2048.0,
                "gpu_utilization_percent": 30.1
            },
            {
                "timestamp": datetime.utcnow().isoformat(),
                "process_name": "firefox.exe",
                "process_id": 9012,
                "username": "testuser",
                "status": "running",
                "cpu_usage_percent": 20.7,
                "memory_usage_mb": 768.0,
                "gpu_memory_usage_mb": 1536.0,
                "gpu_utilization_percent": 35.8
            }
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/host-process-metrics/push-batch", json=host_process_metrics_batch)
    print(f"Push host process metrics batch: {response.status_code}")
    if response.status_code == 200:
        print("--------------------------------","Host Process Metrics Push Batch Point Tested","--------------------------------")
        print(f"Response: {response.json()}")
    else:
        print(f"Error: {response.text}")
    
    # Test get host process metrics
    response = requests.get(f"{BASE_URL}/api/host-process-metrics?limit=10")
    print(f"Get host process metrics: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Retrieved {data.get('count', 0)} host process metrics records")
    else:
        print(f"Error: {response.text}")
    
    # Test get host process metrics summary
    response = requests.get(f"{BASE_URL}/api/host-process-metrics/summary")
    print(f"Get host process metrics summary: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Summary: {data}")
    else:
        print(f"Error: {response.text}")

def test_get_model_by_type_and_task():
    """Test getting model data by model type and task type"""
    print("\n=== Testing Get Model by Type and Task ===")
    
    # Test with valid model type and task type
    response = requests.get(f"{BASE_URL}/api/models/get-model-data?model_type=bert&task_type=masked_language_modeling")
    print(f"Get model by type and task (BERT): {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("--------------------------------","Model Get Point Tested","--------------------------------")
        print(f"Model data: {data}")
    else:
        print(f"Error: {response.text}")
    
    # Test with another valid combination
    response = requests.get(f"{BASE_URL}/api/models/get-model-data?model_type=llama&task_type=text_generation")
    print(f"Get model by type and task (LLaMA): {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("--------------------------------","Model Get Point Tested","--------------------------------")
        print(f"Model data: {data}")
    else:
        print(f"Error: {response.text}")
    
    # Test with image classification
    response = requests.get(f"{BASE_URL}/api/models/get-model-data?model_type=resnet50&task_type=image_classification")
    print(f"Get model by type and task (ResNet50): {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Model data: {data}")
    else:
        print(f"Error: {response.text}")
    
    # Test with invalid combination
    response = requests.get(f"{BASE_URL}/api/models/get-model-data?model_type=invalid&task_type=invalid")
    print(f"Get model by type and task (Invalid): {response.status_code}")
    if response.status_code == 404:
        print("Correctly returned 404 for invalid combination")
    else:
        print(f"Unexpected response: {response.text}")

def test_available_models():
    """Test getting available models"""
    print("\nTesting available models...")
    try:
        response = requests.get(f"{BASE_URL}/api/model/available-models")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Available models: {data}")
            return True
        else:
            print(f"✗ Failed to get available models: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Error testing available models: {str(e)}")
        return False

def test_model_inference():
    """Test model inference"""
    print("\nTesting model inference...")
    
    # Test data for inference
    inference_request = {
        "model_type": "bert",
        "task_type": "inference",
        "hardware_type": "NVIDIA",
        "input_data": {
            "batch_size": 1,
            "sequence_length": 512
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/model/inference",
            json=inference_request
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Inference successful: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"✗ Inference failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error testing inference: {str(e)}")
        return False

def test_model_training():
    """Test model training simulation"""
    print("\nTesting model training...")
    
    # Test data for training
    training_request = {
        "model_type": "bert",
        "hardware_type": "NVIDIA",
        "training_parameters": {
            "batch_size": 16,
            "learning_rate": 0.001,
            "epochs": 10
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/model/training",
            json=training_request
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Training successful: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"✗ Training failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error testing training: {str(e)}")
        return False

def test_simulate_performance_with_inference():
    """Test the updated simulate performance endpoint with actual inference"""
    print("\nTesting simulate performance with inference...")
    
    # Test data for simulation
    simulation_request = {
        "Model": "BERT-Base",
        "Framework": "PyTorch",
        "Task Type": "inference",
        "Total Parameters (Millions)": 110.0,
        "Model Size (MB)": 420.0,
        "Architecture type": "Transformer",
        "Model Type": "bert",
        "Embedding Vector Dimension (Hidden Size)": 768,
        "Precision": "FP32",
        "Vocabulary Size": 30522,
        "FFN (MLP) Dimension": 3072,
        "Activation Function": "GELU",
        "FLOPs": 2.3e9
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/model/simulate-performance",
            json=simulation_request
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Simulation successful: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"✗ Simulation failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error testing simulation: {str(e)}")
        return False

def test_reload_models():
    """Test reloading models"""
    print("\nTesting model reload...")
    
    try:
        response = requests.post(f"{BASE_URL}/api/model/reload-models")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Model reload successful: {data}")
            return True
        else:
            print(f"✗ Model reload failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error testing model reload: {str(e)}")
        return False

def test_optimization_recommendation():
    """Test the model optimization recommendation endpoint"""
    print("\n🧪 Testing Model Optimization Recommendation")
    print("=" * 50)
    
    # Test data matching the expected input format
    test_data = {
        "Model_Name": "RESNET18",
        "Framework": "PyTorch",
        "Total_Parameters_Millions": 11.69,
        "Model_Size_MB": 44.59,
        "Architecture_type": "resnet18",
        "Model_Type": "resnet18",
        "Number_of_hidden_Layers": 18,
        "Precision": "FP32",
        "Vocabulary_Size": 1000,
        "Number_of_Attention_Layers": 0,
        "Activation_Function": "silu"
    }
    
    try:
        print(f"📤 Sending optimization request...")
        print(f"Request data: {json.dumps(test_data, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/api/model/optimization-recommendation",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📥 Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success!")
            print(f"Response: {json.dumps(result, indent=2)}")
            
            # Validate response structure
            if "recommended_method" in result and "recommended_precision" in result:
                print(f"✅ Response contains required fields:")
                print(f"   - Recommended Method: {result['recommended_method']}")
                print(f"   - Recommended Precision: {result['recommended_precision']}")
                return True
            else:
                print(f"❌ Response missing required fields")
                return False
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to server at {BASE_URL}")
        print(f"   Make sure the server is running with: python run.py")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

def test_optimization_with_different_models():
    """Test optimization recommendation with different model configurations"""
    print("\n🧪 Testing with Different Model Configurations")
    print("=" * 50)
    
    test_cases = [
        {
            "name": "BERT Base",
            "data": {
                "Model_Name": "BERT_BASE",
                "Framework": "PyTorch",
                "Total_Parameters_Millions": 110.0,
                "Model_Size_MB": 420.0,
                "Architecture_type": "transformer",
                "Model_Type": "bert",
                "Number_of_hidden_Layers": 12,
                "Precision": "FP16",
                "Vocabulary_Size": 30522,
                "Number_of_Attention_Layers": 12,
                "Activation_Function": "gelu"
            }
        },
        {
            "name": "ResNet50",
            "data": {
                "Model_Name": "RESNET50",
                "Framework": "TensorFlow",
                "Total_Parameters_Millions": 25.6,
                "Model_Size_MB": 98.0,
                "Architecture_type": "resnet50",
                "Model_Type": "resnet50",
                "Number_of_hidden_Layers": 50,
                "Precision": "FP32",
                "Vocabulary_Size": 1000,
                "Number_of_Attention_Layers": 0,
                "Activation_Function": "relu"
            }
        }
    ]
    
    success_count = 0
    total_count = len(test_cases)
    
    for test_case in test_cases:
        print(f"\n📋 Testing: {test_case['name']}")
        try:
            response = requests.post(
                f"{BASE_URL}/api/model/optimization-recommendation",
                json=test_case['data'],
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ {test_case['name']}: SUCCESS")
                print(f"   Method: {result.get('recommended_method', 'N/A')}")
                print(f"   Precision: {result.get('recommended_precision', 'N/A')}")
                success_count += 1
            else:
                print(f"❌ {test_case['name']}: FAILED (Status: {response.status_code})")
                print(f"   Error: {response.text}")
                
        except Exception as e:
            print(f"❌ {test_case['name']}: ERROR - {str(e)}")
    
    print(f"\n📊 Results: {success_count}/{total_count} test cases passed")
    return success_count == total_count

def test_error_handling():
    """Test error handling with invalid input"""
    print("\n🧪 Testing Error Handling")
    print("=" * 50)
    
    # Test with missing required fields
    invalid_data = {
        "Model_Name": "TEST_MODEL",
        "Framework": "PyTorch"
        # Missing other required fields
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/model/optimization-recommendation",
            json=invalid_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 422:  # Validation error
            print("✅ Properly handled invalid input (422 status)")
            return True
        else:
            print(f"❌ Unexpected response for invalid input: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error handling test failed: {str(e)}")
        return False

def main():
    """Run all API tests"""
    print("Starting API tests...")
    
    # Test basic endpoints
    test_health_check()
    test_get_model_data()
    test_get_model_by_type_and_task()
    test_simulate_performance()
    test_get_all_hardware()
    test_get_hardware_by_id()
    test_push_metrics_data()
    test_push_metrics_batch()
    test_get_metrics_data()
    test_get_metrics_summary()
    test_get_buffer_status()
    test_post_deployment_optimization()
    test_pre_deployment_optimization()
    
    # Test new metric endpoints
    test_vm_metrics_endpoints()
    test_host_process_metrics_endpoints()
    
    # Test model inference endpoints
    test_available_models()
    test_model_inference()
    test_model_training()
    test_simulate_performance_with_inference()
    test_reload_models()
    
    # Test optimization recommendation endpoints
    test_optimization_recommendation()
    test_optimization_with_different_models()
    test_error_handling()
    
    print("\nAll tests completed!")

if __name__ == "__main__":
    main() 