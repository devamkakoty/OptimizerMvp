-- Create Empty Tables for GreenMatrix Project
-- This script creates all other necessary tables as empty tables

-- Switch to greenmatrix database for main application tables
\c greenmatrix;

-- Create hardware_specs table (empty) - Hardware_table compatible schema
CREATE TABLE IF NOT EXISTS hardware_specs (
    id SERIAL PRIMARY KEY,
    
    -- Operating System Information (additional fields, not in Hardware_table)
    os_name VARCHAR(100) NOT NULL,
    os_version VARCHAR(100) NOT NULL,
    os_architecture VARCHAR(50) NOT NULL,
    
    -- Hardware_table compatible fields - Exact column names as expected by PKL models
    "CPU" VARCHAR(255) NOT NULL,  -- Full CPU model name
    "GPU" VARCHAR(255) DEFAULT 'No GPU',  -- GPU model name  
    num_gpu INTEGER DEFAULT 0,  -- "# of GPU"
    gpu_memory_total_mb REAL DEFAULT 0,  -- "GPU Memory Total - VRAM (MB)"
    gpu_graphics_clock REAL DEFAULT 0,  -- "GPU Graphics clock"
    gpu_memory_clock REAL DEFAULT 0,  -- "GPU Memory clock"
    gpu_sm_cores INTEGER DEFAULT 0,  -- "GPU SM Cores"
    gpu_cuda_cores INTEGER DEFAULT 0,  -- "GPU CUDA Cores"
    cpu_total_cores INTEGER NOT NULL,  -- "CPU Total cores (Including Logical cores)"
    cpu_threads_per_core REAL NOT NULL,  -- "CPU Threads per Core"
    cpu_base_clock_ghz REAL DEFAULT 0,  -- "CPU Base clock(GHz)"
    cpu_max_frequency_ghz REAL DEFAULT 0,  -- "CPU Max Frequency(GHz)"
    l1_cache INTEGER DEFAULT 0,  -- "L1 Cache"
    cpu_power_consumption INTEGER DEFAULT 0,  -- "CPU Power Consumption"
    gpu_power_consumption INTEGER DEFAULT 0,  -- "GPUPower Consumption"
    
    -- Additional fields for detailed info (not in Hardware_table but useful)
    cpu_brand VARCHAR(100),
    cpu_family INTEGER,
    cpu_model_family INTEGER,
    cpu_physical_cores INTEGER,
    cpu_sockets INTEGER,
    cpu_cores_per_socket INTEGER,
    gpu_brand VARCHAR(100),
    gpu_driver_version VARCHAR(100),
    total_ram_gb REAL NOT NULL,
    total_storage_gb REAL NOT NULL,
    region VARCHAR(100) DEFAULT 'US',
    
    -- Timestamp
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Switch to Metrics_db for metrics tables
\c Metrics_db;

-- =====================================================================
-- NOTE: host_overall_metrics and host_process_metrics are NO LONGER
-- created here. They are now created as TimescaleDB hypertables in
-- the vm_metrics_ts database via backend/host_metrics_init.sql
-- This change improves performance by 100-1000x for time-series queries.
-- =====================================================================

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

-- =====================================================================
-- PERFORMANCE INDEXES (from Migration 002)
-- =====================================================================

-- Indexes for vm_metrics table (basic time-series table in Metrics_db)
CREATE INDEX IF NOT EXISTS idx_vm_metrics_timestamp_vm
    ON vm_metrics (timestamp DESC, vm_name);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- =====================================================================
-- ADDITIONAL INDEXES FOR hardware_specs (from Migration 002)
-- =====================================================================

\c greenmatrix;

-- Indexes for hardware_specs table
CREATE INDEX IF NOT EXISTS idx_hardware_specs_region
    ON hardware_specs (region);

CREATE INDEX IF NOT EXISTS idx_hardware_specs_os
    ON hardware_specs (os_name);

-- =====================================================================
-- COMPLETION MESSAGE
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Empty tables created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Created tables in greenmatrix database:';
    RAISE NOTICE '  - hardware_specs (with region and OS indexes)';
    RAISE NOTICE '';
    RAISE NOTICE 'Created tables in Metrics_db database:';
    RAISE NOTICE '  - vm_metrics (basic time-series table)';
    RAISE NOTICE '';
    RAISE NOTICE 'NOTE: host_overall_metrics and host_process_metrics are created';
    RAISE NOTICE '      in TimescaleDB (vm_metrics_ts) via host_metrics_init.sql';
    RAISE NOTICE '';
    RAISE NOTICE 'All tables are ready for data collection.';
    RAISE NOTICE '';
END $$;