#!/bin/bash
echo "=== Testing GreenMatrix Hardware Specs API ==="
echo

# Test health endpoint first
echo "1. Testing health endpoint:"
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:8000/health
echo
echo

# Test hardware specs GET endpoint
echo "2. Testing GET /api/hardware-specs:"
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:8000/api/hardware-specs
echo
echo

# Test hardware specs POST endpoint with sample data
echo "3. Testing POST /api/hardware-specs with sample data:"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "os_name": "Linux",
    "os_version": "5.15.0-153-generic", 
    "os_architecture": "64bit",
    "cpu_brand": "TestBrand",
    "cpu_model": "Test CPU Model",
    "cpu_physical_cores": 4,
    "cpu_total_cores": 4,
    "cpu_threads_per_core": 1.0,
    "total_ram_gb": 8.0,
    "total_storage_gb": 100.0,
    "region": "US"
  }' \
  http://localhost:8000/api/hardware-specs

echo
echo
echo "=== API Test Complete ==="