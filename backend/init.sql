-- GreenMatrix Database Initialization Script
-- This script sets up the main greenmatrix database only
-- Additional databases are created by the multiple database script

-- Connect to main database and create extensions
\c greenmatrix;

-- Enable UUID extension for main database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Extensions for other databases (Model_Recommendation_DB, Metrics_db) 
-- will be created by a separate script that runs after database creation