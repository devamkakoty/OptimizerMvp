#!/bin/bash

# Test VM Dashboard Setup Script
# This script sets up the environment to test the VM Process Metrics dashboard

set -e

echo "======================================"
echo "🧪 Testing VM Process Metrics Dashboard"
echo "======================================"

# Step 1: Start Docker containers
echo ""
echo "🐳 Starting Docker containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready (60 seconds)..."
sleep 60

# Step 2: Install Python dependencies for demo data script
echo ""
echo "📦 Installing Python dependencies..."
pip install psycopg2-binary || pip install psycopg2

# Step 3: Insert demo VM data
echo ""
echo "📊 Inserting demo VM process metrics data..."
python scripts/insert_demo_vm_data.py

# Step 4: Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd vite-project
npm install

# Step 5: Start frontend development server
echo ""
echo "🚀 Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "🌐 Access Points:"
echo "   Frontend:     http://localhost:5173 (or check npm output)"
echo "   Backend API:  http://localhost:8000"  
echo "   API Docs:     http://localhost:8000/docs"
echo ""
echo "📋 Test Steps:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Navigate to 'Dashboard' -> 'VM Process Metrics'"
echo "   3. Select a VM from the dropdown (production-web-01, ml-training-gpu-01, etc.)"
echo "   4. Observe real-time updates every 1 second"
echo ""
echo "🔍 Available Demo VMs:"
echo "   - production-web-01    (Web server processes)"
echo "   - ml-training-gpu-01   (GPU-intensive ML training)"
echo "   - analytics-db-01      (Database server)"
echo "   - dev-environment-01   (Development tools)"
echo "   - monitoring-01        (Monitoring and logging)"
echo ""
echo "💡 Demo Data Features:"
echo "   - Real-time metrics updates"
echo "   - Process-level resource usage"
echo "   - CPU, Memory, GPU utilization"
echo "   - Power consumption estimates"
echo "   - Interactive charts and tables"
echo ""
echo "🛑 To stop testing:"
echo "   - Press Ctrl+C to stop frontend server"
echo "   - Run: docker-compose down"
echo ""

# Keep script running to show frontend output
wait $FRONTEND_PID