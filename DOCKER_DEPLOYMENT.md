# GreenMatrix Docker Deployment Guide

This guide explains how to deploy the complete GreenMatrix FinOps platform as a standalone containerized application.

## Prerequisites

- Docker Engine 20.10+ 
- Docker Compose 2.0+
- At least 4GB RAM available
- For GPU monitoring: NVIDIA Docker runtime (optional)

## Quick Start

1. **Clone and navigate to the project directory:**
```bash
git clone <repository-url>
cd GreenMatrix
```

2. **Create environment configuration:**
```bash
cp .env.example .env
# Edit .env file with your preferred settings
```

3. **Start all services:**
```bash
docker-compose up -d
```

4. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Services Architecture

The Docker deployment consists of:

- **postgres**: PostgreSQL database with multiple databases
- **redis**: Redis cache for session management
- **backend**: FastAPI backend with FinOps APIs
- **frontend**: React frontend with Nginx reverse proxy
- **data-collector**: System metrics collection service
- **db-setup**: One-time database initialization

## Configuration

### Environment Variables (.env)

```env
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_PORT=5432

# Application Ports
BACKEND_PORT=8000
FRONTEND_PORT=3000

# FinOps Configuration
COST_PER_KWH=0.12
CURRENCY_SYMBOL=$
CPU_TDP_WATTS=125
CURRENT_REGION=US

# Data Collection
COLLECTION_INTERVAL_MINUTES=5
```

### Volume Mounts

The following directories are mounted as volumes:
- `./Pickel Models`: ML models directory
- `./sample_data`: Sample hardware data
- `./config.ini`: Application configuration

## GPU Monitoring (Optional)

For GPU power monitoring, ensure NVIDIA Docker runtime is installed:

```bash
# Install nvidia-docker2
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker
```

## Database Schema

The application automatically creates three databases:
- `greenmatrix`: Main application database
- `Model_Recommendation_DB`: ML model recommendations
- `Metrics_db`: Time-series metrics and cost models

## Health Checks

All services include health checks:
- Backend: `GET /health`
- Frontend: `GET /health`  
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in `.env` file
2. **Permission issues**: Ensure Docker daemon is running
3. **Memory issues**: Increase Docker memory limit
4. **GPU access**: Check NVIDIA runtime installation

### Logs

View service logs:
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs data-collector
```

### Database Access

Connect to database:
```bash
docker-compose exec postgres psql -U postgres -d greenmatrix
```

## Development Mode

For development with live reload:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Production Deployment

For production:
1. Use strong passwords in `.env`
2. Configure SSL certificates
3. Set up proper backup strategy
4. Monitor resource usage

## Data Persistence

Data persists in Docker volumes:
- `postgres_data`: Database files
- `redis_data`: Redis persistence
- `backend_logs`: Application logs
- `collector_logs`: Collection service logs

## Scaling

Scale individual services:
```bash
docker-compose up -d --scale backend=2
```

## Security

- All services run as non-root users
- Network isolation between services
- Security headers in Nginx configuration
- Environment variable based secrets management

## Support

For issues and questions:
1. Check service logs: `docker-compose logs <service>`
2. Verify health checks: `docker-compose ps`
3. Review configuration files
4. Consult application documentation