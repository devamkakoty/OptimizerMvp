# GreenMatrix Docker Database Setup Guide

## Overview

The GreenMatrix project has been configured to automatically set up all required databases and tables when running in Docker containers. This eliminates the need for manual PostgreSQL or TimescaleDB installation on the host system.

## Database Architecture

### Databases Created

1. **PostgreSQL Main Database** (Port 5432)
   - `greenmatrix` - Main application database
   - `Model_Recommendation_DB` - ML model information database
   - `Metrics_db` - Metrics and cost data database

2. **TimescaleDB** (Port 5433)
   - `vm_metrics_ts` - Time-series VM metrics database
   - `vm_process_metrics` - Process-level VM metrics database

3. **Airflow Database** (Internal)
   - `airflow` - Airflow metadata database

### Table Setup Strategy

#### Tables with Pre-seeded Data
These tables are populated with essential data during container initialization:

- **`cost_models`** (Metrics_db)
  - Regional pricing data for CPU, GPU, Memory, Storage
  - Multi-currency support (USD, EUR, CAD, GBP, JPY)
  - Pre-populated with realistic cost models for different regions

- **`Hardware_table`** (Model_Recommendation_DB) 
  - Hardware specification data
  - CPU and GPU configurations
  - Power consumption information
  - Pre-populated with common server configurations

- **`Model_table`** (Model_Recommendation_DB)
  - ML model metadata
  - Framework information (PyTorch, HuggingFace)
  - Model parameters and characteristics
  - Pre-populated with popular models (BERT, RoBERTa, ResNet, etc.)

#### Empty Tables (Created Automatically)
These tables are created empty and populated during runtime:

- **`hardware_specs`** - Runtime hardware specifications
- **`hardware_monitoring`** - Real-time hardware metrics
- **`host_overall_metrics`** - Host-level system metrics
- **`host_process_metrics`** - Process-level metrics
- **`vm_metrics`** - Virtual machine metrics
- **`vm_process_metrics`** - VM process metrics (TimescaleDB hypertable)

## Quick Start

### 1. Copy Environment File
```bash
cp .env.docker .env
```

### 2. Start All Services
```bash
docker-compose up -d
```

### 3. Validate Setup
```bash
# Wait for services to start (30-60 seconds)
python scripts/validate_database_setup.py
```

### 4. Access Services
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Airflow**: http://localhost:8080 (airflow/airflow)
- **PostgreSQL**: localhost:5432 (postgres/password)
- **TimescaleDB**: localhost:5433 (postgres/password)

## Database Initialization Sequence

The Docker setup automatically executes these initialization scripts in order:

1. **01-init.sql** - Creates databases and extensions
2. **02-create-multiple-databases.sh** - Sets up multiple databases
3. **03-seed-hardware-table.sql** - Populates Hardware_table with data
4. **04-seed-model-table.sql** - Populates Model_table with data  
5. **05-seed-cost-models.sql** - Populates cost_models with data
6. **06-create-empty-tables.sql** - Creates empty tables for runtime data

## Verification Commands

### Check Database Connections
```bash
# PostgreSQL
psql -h localhost -U postgres -d greenmatrix -c "\l"

# TimescaleDB  
psql -h localhost -p 5433 -U postgres -d vm_metrics_ts -c "\l"
```

### Check Table Counts
```bash
# Check seeded tables
psql -h localhost -U postgres -d Model_Recommendation_DB -c "SELECT COUNT(*) FROM \"Hardware_table\";"
psql -h localhost -U postgres -d Model_Recommendation_DB -c "SELECT COUNT(*) FROM \"Model_table\";"
psql -h localhost -U postgres -d Metrics_db -c "SELECT COUNT(*) FROM cost_models;"
```

### Sample Queries
```sql
-- View hardware configurations
SELECT cpu, gpu, num_gpu, cpu_power_consumption, gpu_power_consumption 
FROM "Hardware_table" LIMIT 5;

-- View model information
SELECT model_name, framework, task_type, total_parameters_millions 
FROM "Model_table" LIMIT 5;

-- View cost models
SELECT resource_name, region, cost_per_unit, currency 
FROM cost_models ORDER BY region, resource_name;
```

## Troubleshooting

### Services Not Starting
```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs postgres
docker-compose logs timescaledb
docker-compose logs backend
```

### Database Connection Issues
```bash
# Wait for health checks to pass
docker-compose logs postgres | grep "ready to accept connections"

# Test manual connection
docker exec -it greenmatrix-postgres psql -U postgres -d greenmatrix
```

### Missing Data
```bash
# Re-run database validation
python scripts/validate_database_setup.py

# Check initialization logs
docker-compose logs postgres | grep -i "seed\|init"
```

## Customization

### Adding More Seed Data

1. Edit the files in `docker-init-data/`:
   - `03-seed-hardware-table.sql` - Add more hardware configurations
   - `04-seed-model-table.sql` - Add more ML models
   - `05-seed-cost-models.sql` - Add more cost models/regions

2. Regenerate seed data:
```bash
python scripts/export_seed_data.py
```

3. Restart containers:
```bash
docker-compose down
docker volume rm greenmatrix_postgres_data
docker-compose up -d
```

### Environment Variables

Key environment variables in `.env`:

```bash
# Database credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Service ports  
POSTGRES_PORT=5432
TIMESCALEDB_PORT=5433
BACKEND_PORT=8000
FRONTEND_PORT=3000

# Cost configuration
COST_PER_KWH=0.12
CURRENT_REGION=US
```

## Data Persistence

- Database data is persisted in Docker volumes
- Volumes: `postgres_data`, `timescaledb_data`, `airflow_postgres_data`
- To reset all data: `docker-compose down -v`

## Production Considerations

1. **Security**: Change default passwords in production
2. **Backup**: Set up regular database backups
3. **Monitoring**: Use included Airflow DAGs for monitoring
4. **Scaling**: Consider read replicas for high-load scenarios
5. **SSL**: Enable SSL/TLS for database connections

## Support

If you encounter issues:

1. Run the validation script: `python scripts/validate_database_setup.py`
2. Check Docker logs: `docker-compose logs`
3. Verify network connectivity between containers
4. Ensure sufficient disk space and memory
5. Check firewall settings for required ports