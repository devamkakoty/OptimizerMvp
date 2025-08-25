#!/bin/bash

# GreenMatrix Docker Startup Script
# This script starts all services and validates the database setup

set -e

echo "======================================"
echo "🚀 Starting GreenMatrix Services"  
echo "======================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📁 Creating .env file from .env.docker template..."
    cp .env.docker .env
    echo "✅ .env file created successfully!"
    echo "💡 You can customize database passwords and ports in .env if needed"
fi

# Start services
echo ""
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to start up (this may take 60-90 seconds)..."
sleep 30

echo "🔍 Checking service health..."
docker-compose ps

# Wait a bit more for database initialization
echo ""
echo "⏳ Waiting for database initialization to complete..."
sleep 30

# Validate database setup
echo ""
echo "🔍 Validating database setup..."
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    echo "❌ Python not found. Please install Python to run validation."
    exit 1
fi

# Install required Python packages if not present
$PYTHON_CMD -c "import psycopg2" 2>/dev/null || {
    echo "📦 Installing required Python packages..."
    pip install psycopg2-binary || pip install psycopg2
}

# Run validation
$PYTHON_CMD scripts/validate_database_setup.py

echo ""
echo "======================================"
echo "🎉 GreenMatrix is ready!"
echo "======================================"
echo ""
echo "🌐 Access Points:"
echo "   Frontend:     http://localhost:3000"
echo "   Backend API:  http://localhost:8000"  
echo "   API Docs:     http://localhost:8000/docs"
echo "   Airflow:      http://localhost:8080"
echo "   PostgreSQL:   localhost:5432"
echo "   TimescaleDB:  localhost:5433"
echo ""
echo "🔐 Default Credentials:"
echo "   Airflow:      airflow / airflow"
echo "   PostgreSQL:   postgres / password" 
echo ""
echo "📊 Database Status:"
echo "   ✅ cost_models table: Pre-populated with pricing data"
echo "   ✅ Hardware_table: Pre-populated with hardware configs"
echo "   ✅ Model_table: Pre-populated with ML model data"
echo "   ✅ Other tables: Created empty, ready for data collection"
echo ""
echo "📖 For more information, see DOCKER_DATABASE_SETUP.md"