-- VM Metrics TimescaleDB Initialization Script
-- This script creates the hypertable for storing VM process metrics
-- with TimescaleDB time-series optimizations

-- Create TimescaleDB extension if not exists
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create the VM process metrics table with the same schema as host_process_metrics
-- but with an additional vm_name column for VM identification
CREATE TABLE IF NOT EXISTS vm_process_metrics (
    -- Composite primary key
    timestamp TIMESTAMPTZ NOT NULL,
    process_id INTEGER NOT NULL,
    vm_name VARCHAR(255) NOT NULL, -- Additional column for VM identification
    
    -- Process metadata
    process_name VARCHAR(255),
    username VARCHAR(255),
    status VARCHAR(50),
    start_time TIMESTAMPTZ,
    
    -- Resource usage metrics
    cpu_usage_percent REAL,
    memory_usage_mb REAL,
    memory_usage_percent REAL,
    
    -- I/O metrics
    read_bytes BIGINT,
    write_bytes BIGINT,
    iops REAL,
    open_files INTEGER,
    
    -- GPU metrics
    gpu_memory_usage_mb REAL,
    gpu_utilization_percent REAL,
    
    -- Power estimation
    estimated_power_watts REAL,
    
    -- NEW: VM-level memory information
    vm_total_ram_gb REAL,
    vm_available_ram_gb REAL,
    vm_used_ram_gb REAL,
    vm_ram_usage_percent REAL,
    
    -- NEW: VM-level GPU memory information
    vm_total_vram_gb REAL,
    vm_used_vram_gb REAL,
    vm_free_vram_gb REAL,
    vm_vram_usage_percent REAL,
    gpu_count INTEGER,
    gpu_names TEXT, -- JSON string of GPU names array
    
    -- NEW: Overall VM-level utilization metrics (not per-process aggregation)
    vm_overall_cpu_percent REAL, -- Overall VM CPU usage
    vm_overall_gpu_utilization REAL, -- Overall VM GPU usage
    
    -- Composite primary key including vm_name for proper partitioning
    PRIMARY KEY (timestamp, process_id, vm_name)
);

-- Create hypertable for time-series optimization
-- Partition by time with 7-day chunks for optimal performance
SELECT create_hypertable(
    'vm_process_metrics', 
    'timestamp',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Add space partitioning by vm_name for better query performance
-- This allows TimescaleDB to optimize queries filtered by VM
SELECT add_dimension(
    'vm_process_metrics',
    'vm_name',
    number_partitions => 4,
    if_not_exists => TRUE
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_vm_process_metrics_vm_name_time 
    ON vm_process_metrics (vm_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_vm_process_metrics_process_name_time 
    ON vm_process_metrics (process_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_vm_process_metrics_username_time 
    ON vm_process_metrics (username, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_vm_process_metrics_vm_process_time 
    ON vm_process_metrics (vm_name, process_name, timestamp DESC);

-- Create index for high resource usage queries
CREATE INDEX IF NOT EXISTS idx_vm_process_metrics_high_cpu 
    ON vm_process_metrics (timestamp DESC) 
    WHERE cpu_usage_percent > 50;

CREATE INDEX IF NOT EXISTS idx_vm_process_metrics_high_memory 
    ON vm_process_metrics (timestamp DESC) 
    WHERE memory_usage_percent > 75;

CREATE INDEX IF NOT EXISTS idx_vm_process_metrics_high_gpu
    ON vm_process_metrics (timestamp DESC)
    WHERE gpu_utilization_percent > 50;

-- NEW: Indexes for VM-level memory fields
CREATE INDEX IF NOT EXISTS idx_vm_process_metrics_vm_ram
    ON vm_process_metrics (vm_name, vm_ram_usage_percent DESC, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_vm_process_metrics_vm_vram
    ON vm_process_metrics (vm_name, vm_vram_usage_percent DESC, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_vm_process_metrics_high_vm_ram
    ON vm_process_metrics (timestamp DESC)
    WHERE vm_ram_usage_percent > 80;

CREATE INDEX IF NOT EXISTS idx_vm_process_metrics_high_vm_vram
    ON vm_process_metrics (timestamp DESC)
    WHERE vm_vram_usage_percent > 80;

-- =====================================================================
-- ADDITIONAL INDEXES (from Migration 001 - integrated for fresh deploys)
-- =====================================================================

-- High VM RAM usage partial index (from Migration 001)
-- Speeds up queries for VMs with high RAM usage (>80%)
CREATE INDEX IF NOT EXISTS idx_vm_process_high_ram_usage
    ON vm_process_metrics (timestamp DESC, vm_ram_usage_percent)
    WHERE vm_ram_usage_percent > 80;

-- High VM VRAM usage partial index (from Migration 001)
-- Speeds up queries for VMs with high VRAM usage (>80%)
CREATE INDEX IF NOT EXISTS idx_vm_process_high_vram_usage
    ON vm_process_metrics (timestamp DESC, vm_vram_usage_percent)
    WHERE vm_vram_usage_percent > 80;

-- Create a view for latest metrics per VM
CREATE OR REPLACE VIEW vm_process_metrics_latest AS
SELECT DISTINCT ON (vm_name, process_id)
    vm_name,
    process_id,
    process_name,
    username,
    status,
    timestamp,
    cpu_usage_percent,
    memory_usage_mb,
    memory_usage_percent,
    gpu_memory_usage_mb,
    gpu_utilization_percent,
    estimated_power_watts,
    iops,
    -- NEW: VM-level memory fields
    vm_total_ram_gb,
    vm_available_ram_gb,
    vm_used_ram_gb,
    vm_ram_usage_percent,
    vm_total_vram_gb,
    vm_used_vram_gb,
    vm_free_vram_gb,
    vm_vram_usage_percent,
    gpu_count,
    gpu_names,
    -- NEW: Overall VM-level utilization metrics
    vm_overall_cpu_percent,
    vm_overall_gpu_utilization
FROM vm_process_metrics
ORDER BY vm_name, process_id, timestamp DESC;

-- Create a view for VM-level aggregated metrics
CREATE OR REPLACE VIEW vm_metrics_summary AS
SELECT 
    vm_name,
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as process_count,
    AVG(cpu_usage_percent) as avg_cpu_usage,
    MAX(cpu_usage_percent) as max_cpu_usage,
    SUM(memory_usage_mb) as total_memory_mb,
    AVG(memory_usage_percent) as avg_memory_usage,
    SUM(gpu_memory_usage_mb) as total_gpu_memory_mb,
    AVG(gpu_utilization_percent) as avg_gpu_usage,
    SUM(estimated_power_watts) as total_power_watts,
    SUM(iops) as total_iops,
    -- NEW: VM-level memory aggregations (these should be consistent across processes)
    AVG(vm_total_ram_gb) as vm_total_ram_gb,
    AVG(vm_available_ram_gb) as vm_available_ram_gb,
    AVG(vm_used_ram_gb) as vm_used_ram_gb,
    AVG(vm_ram_usage_percent) as vm_ram_usage_percent,
    AVG(vm_total_vram_gb) as vm_total_vram_gb,
    AVG(vm_used_vram_gb) as vm_used_vram_gb,
    AVG(vm_free_vram_gb) as vm_free_vram_gb,
    AVG(vm_vram_usage_percent) as vm_vram_usage_percent,
    MAX(gpu_count) as gpu_count,
    -- NEW: Overall VM-level utilization metrics (these should be consistent across processes)
    AVG(vm_overall_cpu_percent) as vm_overall_cpu_percent,
    AVG(vm_overall_gpu_utilization) as vm_overall_gpu_utilization
FROM vm_process_metrics
GROUP BY vm_name, DATE_TRUNC('hour', timestamp)
ORDER BY vm_name, hour DESC;

-- Create a continuous aggregate for daily VM metrics
-- This pre-computes daily aggregations for faster dashboard queries
SELECT add_continuous_aggregate_policy('vm_metrics_daily',
    start_offset => INTERVAL '1 month',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Create materialized view for daily aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS vm_metrics_daily
WITH (timescaledb.continuous) AS
SELECT 
    vm_name,
    time_bucket('1 day', timestamp) as day,
    COUNT(*) as total_processes,
    AVG(cpu_usage_percent) as avg_cpu_usage,
    MAX(cpu_usage_percent) as peak_cpu_usage,
    AVG(memory_usage_percent) as avg_memory_usage,
    MAX(memory_usage_percent) as peak_memory_usage,
    AVG(gpu_utilization_percent) as avg_gpu_usage,
    MAX(gpu_utilization_percent) as peak_gpu_usage,
    SUM(estimated_power_watts) as total_power_consumption,
    AVG(estimated_power_watts) as avg_power_per_process,
    -- NEW: VM-level memory daily aggregations
    AVG(vm_ram_usage_percent) as avg_vm_ram_usage,
    MAX(vm_ram_usage_percent) as peak_vm_ram_usage,
    AVG(vm_vram_usage_percent) as avg_vm_vram_usage,
    MAX(vm_vram_usage_percent) as peak_vm_vram_usage,
    AVG(vm_total_ram_gb) as vm_total_ram_gb,
    AVG(vm_total_vram_gb) as vm_total_vram_gb,
    MAX(gpu_count) as gpu_count,
    -- NEW: Overall VM-level daily aggregations
    AVG(vm_overall_cpu_percent) as avg_vm_overall_cpu_percent,
    MAX(vm_overall_cpu_percent) as peak_vm_overall_cpu_percent,
    AVG(vm_overall_gpu_utilization) as avg_vm_overall_gpu_utilization,
    MAX(vm_overall_gpu_utilization) as peak_vm_overall_gpu_utilization
FROM vm_process_metrics
GROUP BY vm_name, time_bucket('1 day', timestamp)
WITH NO DATA;

-- Set up data retention policy (keep data for 90 days)
SELECT add_retention_policy('vm_process_metrics', INTERVAL '90 days', if_not_exists => TRUE);

-- Create a function to get VM health status
CREATE OR REPLACE FUNCTION get_vm_health_status(vm_name_param VARCHAR)
RETURNS TABLE (
    vm_name VARCHAR,
    status VARCHAR,
    avg_cpu_usage REAL,
    avg_memory_usage REAL,
    avg_gpu_usage REAL,
    process_count BIGINT,
    last_seen TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vpm.vm_name,
        CASE 
            WHEN MAX(vpm.timestamp) < NOW() - INTERVAL '10 minutes' THEN 'OFFLINE'
            WHEN AVG(vpm.cpu_usage_percent) > 90 OR AVG(vpm.memory_usage_percent) > 90 THEN 'CRITICAL'
            WHEN AVG(vpm.cpu_usage_percent) > 75 OR AVG(vpm.memory_usage_percent) > 75 THEN 'WARNING'
            ELSE 'HEALTHY'
        END as status,
        ROUND(AVG(vpm.cpu_usage_percent)::NUMERIC, 2)::REAL as avg_cpu_usage,
        ROUND(AVG(vpm.memory_usage_percent)::NUMERIC, 2)::REAL as avg_memory_usage,
        ROUND(AVG(vpm.gpu_utilization_percent)::NUMERIC, 2)::REAL as avg_gpu_usage,
        COUNT(DISTINCT vpm.process_id) as process_count,
        MAX(vpm.timestamp) as last_seen
    FROM vm_process_metrics vpm
    WHERE vpm.vm_name = vm_name_param
      AND vpm.timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY vpm.vm_name;
END;
$$ LANGUAGE plpgsql;

-- Create indexes on the materialized view
CREATE INDEX IF NOT EXISTS idx_vm_metrics_daily_vm_day 
    ON vm_metrics_daily (vm_name, day DESC);

-- Grant appropriate permissions
-- Note: In production, you should create specific users with limited permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON vm_process_metrics TO PUBLIC;
GRANT SELECT ON vm_process_metrics_latest TO PUBLIC;
GRANT SELECT ON vm_metrics_summary TO PUBLIC;
GRANT SELECT ON vm_metrics_daily TO PUBLIC;

-- Create a notification function for high resource usage
CREATE OR REPLACE FUNCTION notify_high_resource_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify if CPU usage is very high
    IF NEW.cpu_usage_percent > 95 THEN
        PERFORM pg_notify('vm_high_cpu', json_build_object(
            'vm_name', NEW.vm_name,
            'process_name', NEW.process_name,
            'process_id', NEW.process_id,
            'cpu_usage', NEW.cpu_usage_percent,
            'timestamp', NEW.timestamp
        )::text);
    END IF;
    
    -- Notify if memory usage is very high
    IF NEW.memory_usage_percent > 95 THEN
        PERFORM pg_notify('vm_high_memory', json_build_object(
            'vm_name', NEW.vm_name,
            'process_name', NEW.process_name,
            'process_id', NEW.process_id,
            'memory_usage', NEW.memory_usage_percent,
            'timestamp', NEW.timestamp
        )::text);
    END IF;
    
    -- NEW: Notify if VM RAM usage is very high
    IF NEW.vm_ram_usage_percent > 90 THEN
        PERFORM pg_notify('vm_high_ram', json_build_object(
            'vm_name', NEW.vm_name,
            'vm_ram_usage_percent', NEW.vm_ram_usage_percent,
            'vm_total_ram_gb', NEW.vm_total_ram_gb,
            'vm_used_ram_gb', NEW.vm_used_ram_gb,
            'timestamp', NEW.timestamp
        )::text);
    END IF;
    
    -- NEW: Notify if VM VRAM usage is very high
    IF NEW.vm_vram_usage_percent > 90 THEN
        PERFORM pg_notify('vm_high_vram', json_build_object(
            'vm_name', NEW.vm_name,
            'vm_vram_usage_percent', NEW.vm_vram_usage_percent,
            'vm_total_vram_gb', NEW.vm_total_vram_gb,
            'vm_used_vram_gb', NEW.vm_used_vram_gb,
            'gpu_count', NEW.gpu_count,
            'timestamp', NEW.timestamp
        )::text);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for high resource usage notifications
DROP TRIGGER IF EXISTS trigger_high_resource_usage ON vm_process_metrics;
CREATE TRIGGER trigger_high_resource_usage
    AFTER INSERT ON vm_process_metrics
    FOR EACH ROW
    EXECUTE FUNCTION notify_high_resource_usage();

-- Print setup completion message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===================================================================';
    RAISE NOTICE '✅ VM Metrics TimescaleDB Initialization Completed Successfully!';
    RAISE NOTICE '===================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Created hypertable: vm_process_metrics';
    RAISE NOTICE 'Created views: vm_process_metrics_latest, vm_metrics_summary';
    RAISE NOTICE 'Created materialized view: vm_metrics_daily';
    RAISE NOTICE '';
    RAISE NOTICE 'Added 10+ performance indexes including:';
    RAISE NOTICE '  - VM name + timestamp indexes';
    RAISE NOTICE '  - Process name + timestamp indexes';
    RAISE NOTICE '  - High CPU, memory, GPU partial indexes';
    RAISE NOTICE '  - VM RAM/VRAM usage indexes (from Migration 001)';
    RAISE NOTICE '';
    RAISE NOTICE 'Configured policies:';
    RAISE NOTICE '  - Data retention: 90 days';
    RAISE NOTICE '  - Daily aggregation policy';
    RAISE NOTICE '';
    RAISE NOTICE 'Created function: get_vm_health_status()';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready to accept VM monitoring data!';
    RAISE NOTICE '';
    RAISE NOTICE '===================================================================';
    RAISE NOTICE '';
END $$;