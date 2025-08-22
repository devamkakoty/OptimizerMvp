# GreenMatrix Airflow Monitoring

This directory contains the Apache Airflow setup for monitoring the GreenMatrix application infrastructure, data pipelines, and overall system health.

## Overview

The Airflow monitoring system provides comprehensive oversight of:

- **Data Pipeline Monitoring**: Ensures metrics and hardware collection scripts are running properly
- **Database Health Monitoring**: Monitors database connectivity, performance, and integrity
- **API Health Monitoring**: Tracks API endpoint availability and performance
- **Data Quality Validation**: Validates data completeness, accuracy, and consistency
- **Maintenance and Cleanup**: Automated maintenance tasks and system cleanup

## Architecture

```
airflow/
├── dags/                           # Airflow DAGs
│   ├── data_pipeline_monitoring.py # Data collection monitoring
│   ├── database_health_monitoring.py # Database health checks
│   ├── api_health_monitoring.py    # API endpoint monitoring
│   ├── data_quality_validation.py  # Data quality validation
│   └── maintenance_and_cleanup.py  # System maintenance
├── plugins/                        # Custom Airflow plugins
├── logs/                          # Airflow logs (created by Docker)
├── docker-compose.yml             # Docker Compose configuration
├── Dockerfile                     # Custom Airflow image
├── requirements.txt               # Python dependencies
├── airflow.cfg                    # Airflow configuration
├── .env                          # Environment variables
├── init-airflow.sh               # Initialization script
└── README.md                     # This file
```

## DAGs Overview

### 1. Data Pipeline Monitoring (`data_pipeline_monitoring.py`)
- **Schedule**: Every 15 minutes
- **Purpose**: Monitor data collection scripts and database ingestion
- **Checks**:
  - Metrics collection process health
  - Hardware collection process health
  - Recent data availability in database
  - Database connectivity
  - Automatic restart of failed processes

### 2. Database Health Monitoring (`database_health_monitoring.py`)
- **Schedule**: Every hour
- **Purpose**: Monitor database performance and integrity
- **Checks**:
  - Database connections across all schemas
  - Table sizes and growth patterns
  - Data integrity constraints
  - Performance metrics (active connections, long-running queries)
  - Disk space utilization

### 3. API Health Monitoring (`api_health_monitoring.py`)
- **Schedule**: Every 10 minutes
- **Purpose**: Monitor API endpoint health and performance
- **Checks**:
  - Endpoint availability and response times
  - Functional testing of API responses
  - Rate limiting behavior
  - Response data validation

### 4. Data Quality Validation (`data_quality_validation.py`)
- **Schedule**: Every 6 hours
- **Purpose**: Validate data quality across all sources
- **Checks**:
  - Data freshness and completeness
  - Value validity and constraints
  - Anomaly detection in data patterns
  - Data consistency and duplicate detection

### 5. Maintenance and Cleanup (`maintenance_and_cleanup.py`)
- **Schedule**: Daily at 2 AM
- **Purpose**: Automated system maintenance
- **Tasks**:
  - Old data cleanup (30+ days)
  - Log file cleanup (7+ days)
  - Database optimization (VACUUM, ANALYZE)
  - Critical data backups
  - System resource monitoring
  - Temporary file cleanup

## Setup Instructions

### Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM and 2 CPU cores recommended
- 10GB+ disk space available

### Quick Start

1. **Create the external network** (if not already created):
   ```bash
   docker network create greenmatrix-airflow-network
   ```

2. **Set environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your specific configuration
   ```

3. **Build and start Airflow**:
   ```bash
   docker-compose up --build -d
   ```

4. **Initialize Airflow setup**:
   ```bash
   docker-compose exec airflow-webserver bash init-airflow.sh
   ```

5. **Access Airflow UI**:
   - URL: http://localhost:8080
   - Username: `airflow`
   - Password: `airflow`

### Configuration

#### Database Connections

The following database connections are automatically configured:

- `greenmatrix_db`: Main GreenMatrix application database
- `model_db`: Model recommendation database
- `metrics_db`: Metrics collection database

#### Environment Variables

Key environment variables (see `.env` file):

```bash
# Database Configuration
GREENMATRIX_DB_HOST=greenmatrix-postgres
GREENMATRIX_DB_NAME=greenmatrix
GREENMATRIX_DB_USER=postgres
GREENMATRIX_DB_PASSWORD=postgres

# API Configuration
GREENMATRIX_API_BASE_URL=http://greenmatrix-backend:8000

# Monitoring Settings
MONITORING_EMAIL=admin@greenmatrix.com
CPU_WARNING_THRESHOLD=80
MEMORY_WARNING_THRESHOLD=80
DISK_WARNING_THRESHOLD=80

# Data Quality Thresholds
MIN_RECORDS_PER_HOUR=10
MAX_DATA_GAP_MINUTES=10
```

#### Alerting

Email alerts are sent for:
- Critical system failures
- Database connection issues
- API endpoint failures
- Data quality issues
- Resource exhaustion warnings

## Monitoring Dashboard

Access the Airflow UI to monitor:

1. **DAG Status**: Overall health of monitoring workflows
2. **Task Logs**: Detailed logs for troubleshooting
3. **Variables**: Configuration values and thresholds
4. **Connections**: Database and external service connections

## Health Scoring

Each monitoring DAG calculates health scores:

- **100/100**: All systems operating normally
- **80-99**: Minor issues or warnings
- **60-79**: Moderate issues requiring attention
- **<60**: Critical issues requiring immediate action

## Maintenance

### Log Management

- Airflow logs are retained for 30 days
- Application logs are cleaned up after 7 days
- Database maintenance logs are kept for backup purposes

### Data Retention

- Metrics data: 30 days (configurable)
- Backup files: 7 days
- System monitoring data: 90 days

### Scaling

To scale monitoring:

1. **Increase check frequency**: Modify DAG schedules
2. **Add more checks**: Create additional tasks in existing DAGs
3. **Custom monitoring**: Add new DAGs for specific requirements
4. **Resource scaling**: Increase Docker container resources

## Troubleshooting

### Common Issues

1. **DAGs not appearing**:
   - Check DAG syntax: `python -m py_compile dags/dag_name.py`
   - Verify file permissions
   - Check Airflow logs

2. **Database connection failures**:
   - Verify network connectivity
   - Check database credentials in `.env`
   - Ensure databases are running

3. **Email notifications not working**:
   - Configure SMTP settings in `.env`
   - Test email connection in Airflow UI

4. **Performance issues**:
   - Monitor system resources
   - Increase Docker memory/CPU allocation
   - Optimize DAG scheduling

### Log Locations

- Airflow logs: `./logs/`
- Docker logs: `docker-compose logs service-name`
- Database logs: Check database container logs

## Security Considerations

- Change default Airflow credentials
- Use strong database passwords
- Secure email credentials
- Limit network access to Airflow UI
- Regular security updates for base images

## Integration with GreenMatrix

This monitoring system integrates with:

- **Backend API**: Health checks and data validation
- **Database**: Direct monitoring of data stores
- **Data Collection Scripts**: Process monitoring and restart
- **Docker Infrastructure**: Container and network monitoring

## Support

For issues related to:
- Airflow configuration: Check official Airflow documentation
- GreenMatrix integration: Refer to main project documentation
- Database monitoring: Review database-specific guides
- Custom requirements: Modify DAGs and configurations as needed