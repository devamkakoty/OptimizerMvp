#!/bin/bash

# GreenMatrix Airflow Initialization Script
# This script sets up Airflow connections and configurations for GreenMatrix monitoring

set -e

echo "🚀 Initializing GreenMatrix Airflow setup..."

# Wait for Airflow to be ready
echo "⏳ Waiting for Airflow to be ready..."
until curl -f http://localhost:8080/health > /dev/null 2>&1; do
    echo "Waiting for Airflow webserver..."
    sleep 5
done

echo "✅ Airflow is ready!"

# Create database connections
echo "🔗 Setting up database connections..."

# GreenMatrix main database connection
airflow connections add 'greenmatrix_db' \
    --conn-type 'postgres' \
    --conn-host '${GREENMATRIX_DB_HOST:-greenmatrix-postgres}' \
    --conn-port '${GREENMATRIX_DB_PORT:-5432}' \
    --conn-login '${GREENMATRIX_DB_USER:-postgres}' \
    --conn-password '${GREENMATRIX_DB_PASSWORD:-postgres}' \
    --conn-schema '${GREENMATRIX_DB_NAME:-greenmatrix}'

# Model database connection
airflow connections add 'model_db' \
    --conn-type 'postgres' \
    --conn-host '${MODEL_DB_HOST:-greenmatrix-postgres}' \
    --conn-port '${MODEL_DB_PORT:-5432}' \
    --conn-login '${MODEL_DB_USER:-postgres}' \
    --conn-password '${MODEL_DB_PASSWORD:-postgres}' \
    --conn-schema '${MODEL_DB_NAME:-Model_Recommendation_DB}'

# Metrics database connection
airflow connections add 'metrics_db' \
    --conn-type 'postgres' \
    --conn-host '${METRICS_DB_HOST:-greenmatrix-postgres}' \
    --conn-port '${METRICS_DB_PORT:-5432}' \
    --conn-login '${METRICS_DB_USER:-postgres}' \
    --conn-password '${METRICS_DB_PASSWORD:-postgres}' \
    --conn-schema '${METRICS_DB_NAME:-Metrics_db}'

echo "✅ Database connections created!"

# Create email connection for notifications
echo "📧 Setting up email connection..."
airflow connections add 'email_default' \
    --conn-type 'email' \
    --conn-host '${SMTP_HOST:-localhost}' \
    --conn-port '${SMTP_PORT:-587}' \
    --conn-login '${SMTP_USER:-}' \
    --conn-password '${SMTP_PASSWORD:-}' \
    --conn-extra '{"from_email": "'${SMTP_FROM:-admin@greenmatrix.com}'"}'

echo "✅ Email connection created!"

# Set up variables for configuration
echo "⚙️ Setting up Airflow variables..."

airflow variables set greenmatrix_api_base_url "${GREENMATRIX_API_BASE_URL:-http://greenmatrix-backend:8000}"
airflow variables set monitoring_email "${MONITORING_EMAIL:-admin@greenmatrix.com}"
airflow variables set alert_email "${ALERT_EMAIL:-alerts@greenmatrix.com}"

# Monitoring thresholds
airflow variables set cpu_warning_threshold "${CPU_WARNING_THRESHOLD:-80}"
airflow variables set cpu_critical_threshold "${CPU_CRITICAL_THRESHOLD:-90}"
airflow variables set memory_warning_threshold "${MEMORY_WARNING_THRESHOLD:-80}"
airflow variables set memory_critical_threshold "${MEMORY_CRITICAL_THRESHOLD:-90}"
airflow variables set disk_warning_threshold "${DISK_WARNING_THRESHOLD:-80}"
airflow variables set disk_critical_threshold "${DISK_CRITICAL_THRESHOLD:-90}"

# Data quality thresholds
airflow variables set min_records_per_hour "${MIN_RECORDS_PER_HOUR:-10}"
airflow variables set max_data_gap_minutes "${MAX_DATA_GAP_MINUTES:-10}"
airflow variables set max_query_time_seconds "${MAX_QUERY_TIME_SECONDS:-5}"

# Retention settings
airflow variables set backup_retention_days "${BACKUP_RETENTION_DAYS:-7}"
airflow variables set log_retention_days "${LOG_RETENTION_DAYS:-7}"
airflow variables set metrics_retention_days "${METRICS_RETENTION_DAYS:-30}"

echo "✅ Airflow variables set!"

# Enable DAGs (they start paused by default)
echo "🔄 Enabling GreenMatrix monitoring DAGs..."

airflow dags unpause greenmatrix_data_pipeline_monitoring
airflow dags unpause greenmatrix_database_health_monitoring
airflow dags unpause greenmatrix_api_health_monitoring
airflow dags unpause greenmatrix_data_quality_validation
airflow dags unpause greenmatrix_maintenance_and_cleanup

echo "✅ All DAGs enabled!"

# Test connections
echo "🧪 Testing database connections..."

airflow connections test greenmatrix_db
airflow connections test model_db
airflow connections test metrics_db

echo "✅ Connection tests completed!"

echo ""
echo "🎉 GreenMatrix Airflow setup completed successfully!"
echo ""
echo "📊 Access the Airflow UI at: http://localhost:8080"
echo "👤 Default credentials: airflow / airflow"
echo ""
echo "📈 Monitoring DAGs:"
echo "  - Data Pipeline Monitoring (every 15 minutes)"
echo "  - Database Health Monitoring (every hour)"
echo "  - API Health Monitoring (every 10 minutes)"
echo "  - Data Quality Validation (every 6 hours)"
echo "  - Maintenance and Cleanup (daily at 2 AM)"
echo ""
echo "🔔 Monitoring alerts will be sent to: ${MONITORING_EMAIL:-admin@greenmatrix.com}"
echo ""
echo "Happy monitoring! 🚀"