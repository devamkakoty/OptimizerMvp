-- Create Empty Tables for GreenMatrix Project
-- This script creates all other necessary tables as empty tables

-- Switch to greenmatrix database for main application tables
\c greenmatrix;

-- Create hardware_specs table (empty)
CREATE TABLE IF NOT EXISTS hardware_specs (
    id SERIAL PRIMARY KEY,
    hostname VARCHAR(255) NOT NULL UNIQUE,
    cpu_model VARCHAR(255),
    cpu_cores INTEGER,
    cpu_threads INTEGER,
    cpu_frequency_ghz REAL,
    total_memory_gb REAL,
    gpu_model VARCHAR(255),
    gpu_count INTEGER,
    gpu_memory_gb REAL,
    disk_total_gb REAL,
    disk_available_gb REAL,
    network_interfaces JSONB,
    operating_system VARCHAR(255),
    kernel_version VARCHAR(255),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create hardware_monitoring table (empty)
CREATE TABLE IF NOT EXISTS hardware_monitoring (
    id SERIAL PRIMARY KEY,
    hostname VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cpu_usage_percent REAL,
    memory_usage_percent REAL,
    memory_used_gb REAL,
    memory_available_gb REAL,
    disk_usage_percent REAL,
    disk_used_gb REAL,
    disk_available_gb REAL,
    network_bytes_sent BIGINT,
    network_bytes_recv BIGINT,
    gpu_usage_percent REAL,
    gpu_memory_usage_percent REAL,
    gpu_memory_used_mb REAL,
    gpu_temperature_celsius REAL,
    power_consumption_watts REAL,
    INDEX idx_hardware_monitoring_hostname_timestamp (hostname, timestamp)
);

-- Switch to Metrics_db for metrics tables
\c Metrics_db;

-- Create host_overall_metrics table (empty)
CREATE TABLE IF NOT EXISTS host_overall_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hostname VARCHAR(255) NOT NULL,
    cpu_usage_percent REAL,
    memory_usage_percent REAL,
    disk_usage_percent REAL,
    network_bytes_sent BIGINT,
    network_bytes_recv BIGINT,
    gpu_usage_percent REAL,
    gpu_memory_usage_mb REAL,
    power_consumption_watts REAL,
    temperature_celsius REAL,
    uptime_seconds BIGINT,
    load_average_1m REAL,
    load_average_5m REAL,
    load_average_15m REAL
);

-- Create host_process_metrics table (empty)
CREATE TABLE IF NOT EXISTS host_process_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    process_id INTEGER NOT NULL,
    process_name VARCHAR(255),
    username VARCHAR(255),
    status VARCHAR(50),
    start_time TIMESTAMP,
    cpu_usage_percent REAL,
    memory_usage_mb REAL,
    memory_usage_percent REAL,
    read_bytes BIGINT,
    write_bytes BIGINT,
    iops REAL,
    open_files INTEGER,
    gpu_memory_usage_mb REAL,
    gpu_utilization_percent REAL,
    estimated_power_watts REAL
);

-- Create vm_metrics table (empty)
CREATE TABLE IF NOT EXISTS vm_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vm_name VARCHAR(255) NOT NULL,
    hostname VARCHAR(255),
    cpu_usage_percent REAL,
    memory_usage_percent REAL,
    memory_used_mb REAL,
    disk_usage_percent REAL,
    disk_used_mb REAL,
    network_bytes_sent BIGINT,
    network_bytes_recv BIGINT,
    gpu_usage_percent REAL,
    gpu_memory_usage_mb REAL,
    power_consumption_watts REAL,
    uptime_seconds BIGINT,
    status VARCHAR(50)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_host_overall_metrics_timestamp_hostname ON host_overall_metrics (timestamp DESC, hostname);
CREATE INDEX IF NOT EXISTS idx_host_process_metrics_timestamp_process ON host_process_metrics (timestamp DESC, process_id);
CREATE INDEX IF NOT EXISTS idx_vm_metrics_timestamp_vm ON vm_metrics (timestamp DESC, vm_name);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'Empty tables created successfully!';
    RAISE NOTICE 'Created tables: hardware_specs, hardware_monitoring, host_overall_metrics, host_process_metrics, vm_metrics';
    RAISE NOTICE 'All tables are ready for data collection.';
END $$;