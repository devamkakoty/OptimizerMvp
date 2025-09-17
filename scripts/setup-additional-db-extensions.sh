#!/bin/bash
# Script to set up extensions for additional databases after they are created

set -e

echo "Setting up extensions for additional databases..."

# Wait for PostgreSQL to be ready
until pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 2
done

# Set up Model_Recommendation_DB extensions
echo "Setting up Model_Recommendation_DB extensions..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "Model_Recommendation_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

# Set up Metrics_db extensions  
echo "Setting up Metrics_db extensions..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "Metrics_db" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

echo "Extensions setup completed for additional databases!"