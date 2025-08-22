-- GreenMatrix Database Initialization Script
-- This script creates the necessary databases and extensions

-- Create databases
CREATE DATABASE IF NOT EXISTS greenmatrix;
CREATE DATABASE IF NOT EXISTS Model_Recommendation_DB;
CREATE DATABASE IF NOT EXISTS Metrics_db;

-- Connect to main database and create extensions
\c greenmatrix;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable TimescaleDB extension (if available)
-- CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Connect to Model_Recommendation_DB
\c Model_Recommendation_DB;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Connect to Metrics_db  
\c Metrics_db;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable TimescaleDB extension (if available)
-- CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create basic indexes for performance
-- These will be created by SQLAlchemy models, but we can add additional ones here

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE greenmatrix TO postgres;
GRANT ALL PRIVILEGES ON DATABASE Model_Recommendation_DB TO postgres;
GRANT ALL PRIVILEGES ON DATABASE Metrics_db TO postgres;