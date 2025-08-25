-- VM Process Metrics Dummy Data
-- This script populates the VM process metrics table with realistic dummy data
-- for demonstration purposes

-- Switch to TimescaleDB database
\c vm_metrics_ts;

-- Insert dummy VM process metrics data for multiple VMs and processes
-- Data spans last 24 hours with various timestamps

-- VM 1: production-web-01 (High CPU usage web server)
INSERT INTO vm_process_metrics (
    timestamp, process_id, vm_name, process_name, username, status, start_time,
    cpu_usage_percent, memory_usage_mb, memory_usage_percent,
    read_bytes, write_bytes, iops, open_files,
    gpu_memory_usage_mb, gpu_utilization_percent, estimated_power_watts
) VALUES 
-- Recent data (last few minutes)
(NOW() - INTERVAL '1 minute', 1234, 'production-web-01', 'nginx', 'www-data', 'running', NOW() - INTERVAL '5 hours', 
 85.2, 512.5, 12.3, 1048576, 524288, 45.2, 128, 0, 0, 15.4),
(NOW() - INTERVAL '1 minute', 1235, 'production-web-01', 'php-fpm', 'www-data', 'running', NOW() - INTERVAL '4 hours',
 72.1, 1024.8, 24.6, 2097152, 1048576, 67.8, 256, 0, 0, 22.1),
(NOW() - INTERVAL '1 minute', 1236, 'production-web-01', 'mysql', 'mysql', 'running', NOW() - INTERVAL '6 hours',
 45.7, 2048.3, 49.2, 4194304, 2097152, 123.4, 512, 0, 0, 18.9),

(NOW() - INTERVAL '2 minutes', 1234, 'production-web-01', 'nginx', 'www-data', 'running', NOW() - INTERVAL '5 hours', 
 82.8, 511.2, 12.2, 1048576, 524288, 43.1, 128, 0, 0, 14.9),
(NOW() - INTERVAL '2 minutes', 1235, 'production-web-01', 'php-fpm', 'www-data', 'running', NOW() - INTERVAL '4 hours',
 69.4, 1022.1, 24.5, 2097152, 1048576, 65.2, 256, 0, 0, 21.3),
(NOW() - INTERVAL '2 minutes', 1236, 'production-web-01', 'mysql', 'mysql', 'running', NOW() - INTERVAL '6 hours',
 43.2, 2046.8, 49.1, 4194304, 2097152, 119.8, 512, 0, 0, 17.8),

-- VM 2: ml-training-gpu-01 (GPU-intensive ML training)
(NOW() - INTERVAL '1 minute', 2001, 'ml-training-gpu-01', 'python3', 'ubuntu', 'running', NOW() - INTERVAL '2 hours',
 95.6, 8192.4, 51.2, 1073741824, 536870912, 234.7, 1024, 15360.5, 87.3, 285.6),
(NOW() - INTERVAL '1 minute', 2002, 'ml-training-gpu-01', 'tensorboard', 'ubuntu', 'running', NOW() - INTERVAL '2 hours',
 12.3, 512.7, 3.2, 104857600, 52428800, 15.6, 64, 0, 0, 8.4),
(NOW() - INTERVAL '1 minute', 2003, 'ml-training-gpu-01', 'jupyter-lab', 'ubuntu', 'running', NOW() - INTERVAL '3 hours',
 8.9, 1024.3, 6.4, 209715200, 104857600, 22.1, 128, 0, 0, 5.7),

(NOW() - INTERVAL '2 minutes', 2001, 'ml-training-gpu-01', 'python3', 'ubuntu', 'running', NOW() - INTERVAL '2 hours',
 94.2, 8190.1, 51.1, 1073741824, 536870912, 229.3, 1024, 15298.7, 85.9, 282.1),
(NOW() - INTERVAL '2 minutes', 2002, 'ml-training-gpu-01', 'tensorboard', 'ubuntu', 'running', NOW() - INTERVAL '2 hours',
 11.8, 511.9, 3.2, 104857600, 52428800, 14.9, 64, 0, 0, 8.1),
(NOW() - INTERVAL '2 minutes', 2003, 'ml-training-gpu-01', 'jupyter-lab', 'ubuntu', 'running', NOW() - INTERVAL '3 hours',
 9.2, 1023.8, 6.4, 209715200, 104857600, 21.7, 128, 0, 0, 5.9),

-- VM 3: analytics-db-01 (Database server)
(NOW() - INTERVAL '1 minute', 3001, 'analytics-db-01', 'postgres', 'postgres', 'running', NOW() - INTERVAL '12 hours',
 35.8, 4096.7, 25.6, 8589934592, 4294967296, 456.8, 2048, 0, 0, 42.3),
(NOW() - INTERVAL '1 minute', 3002, 'analytics-db-01', 'pgbouncer', 'postgres', 'running', NOW() - INTERVAL '12 hours',
 5.2, 64.3, 0.4, 1048576, 524288, 12.4, 32, 0, 0, 3.1),
(NOW() - INTERVAL '1 minute', 3003, 'analytics-db-01', 'redis-server', 'redis', 'running', NOW() - INTERVAL '8 hours',
 15.6, 1024.8, 6.4, 2097152, 1048576, 67.9, 128, 0, 0, 12.8),

(NOW() - INTERVAL '2 minutes', 3001, 'analytics-db-01', 'postgres', 'postgres', 'running', NOW() - INTERVAL '12 hours',
 37.1, 4098.2, 25.7, 8589934592, 4294967296, 461.2, 2048, 0, 0, 43.7),
(NOW() - INTERVAL '2 minutes', 3002, 'analytics-db-01', 'pgbouncer', 'postgres', 'running', NOW() - INTERVAL '12 hours',
 4.9, 64.1, 0.4, 1048576, 524288, 11.8, 32, 0, 0, 2.9),
(NOW() - INTERVAL '2 minutes', 3003, 'analytics-db-01', 'redis-server', 'redis', 'running', NOW() - INTERVAL '8 hours',
 16.2, 1025.3, 6.4, 2097152, 1048576, 69.4, 128, 0, 0, 13.4),

-- VM 4: dev-environment-01 (Development server)
(NOW() - INTERVAL '1 minute', 4001, 'dev-environment-01', 'vscode-server', 'developer', 'running', NOW() - INTERVAL '1 hour',
 25.4, 1536.7, 9.6, 524288000, 262144000, 89.3, 512, 0, 0, 18.7),
(NOW() - INTERVAL '1 minute', 4002, 'dev-environment-01', 'node', 'developer', 'running', NOW() - INTERVAL '30 minutes',
 42.8, 512.3, 3.2, 104857600, 52428800, 34.6, 128, 0, 0, 14.2),
(NOW() - INTERVAL '1 minute', 4003, 'dev-environment-01', 'docker', 'root', 'running', NOW() - INTERVAL '2 hours',
 18.9, 2048.9, 12.8, 1073741824, 536870912, 156.7, 256, 0, 0, 22.4),

(NOW() - INTERVAL '2 minutes', 4001, 'dev-environment-01', 'vscode-server', 'developer', 'running', NOW() - INTERVAL '1 hour',
 24.1, 1534.2, 9.6, 524288000, 262144000, 87.8, 512, 0, 0, 17.9),
(NOW() - INTERVAL '2 minutes', 4002, 'dev-environment-01', 'node', 'developer', 'running', NOW() - INTERVAL '30 minutes',
 41.3, 511.8, 3.2, 104857600, 52428800, 33.2, 128, 0, 0, 13.6),
(NOW() - INTERVAL '2 minutes', 4003, 'dev-environment-01', 'docker', 'root', 'running', NOW() - INTERVAL '2 hours',
 19.6, 2047.1, 12.8, 1073741824, 536870912, 154.3, 256, 0, 0, 21.8),

-- VM 5: monitoring-01 (Monitoring and logging)
(NOW() - INTERVAL '1 minute', 5001, 'monitoring-01', 'prometheus', 'prometheus', 'running', NOW() - INTERVAL '6 hours',
 28.7, 3072.4, 19.2, 2147483648, 1073741824, 234.5, 1024, 0, 0, 29.8),
(NOW() - INTERVAL '1 minute', 5002, 'monitoring-01', 'grafana-server', 'grafana', 'running', NOW() - INTERVAL '6 hours',
 12.4, 512.8, 3.2, 209715200, 104857600, 45.7, 256, 0, 0, 9.6),
(NOW() - INTERVAL '1 minute', 5003, 'monitoring-01', 'elasticsearch', 'elastic', 'running', NOW() - INTERVAL '8 hours',
 55.8, 6144.7, 38.4, 4294967296, 2147483648, 567.9, 2048, 0, 0, 78.4),

(NOW() - INTERVAL '2 minutes', 5001, 'monitoring-01', 'prometheus', 'prometheus', 'running', NOW() - INTERVAL '6 hours',
 27.3, 3069.8, 19.2, 2147483648, 1073741824, 229.1, 1024, 0, 0, 28.4),
(NOW() - INTERVAL '2 minutes', 5002, 'monitoring-01', 'grafana-server', 'grafana', 'running', NOW() - INTERVAL '6 hours',
 11.9, 512.1, 3.2, 209715200, 104857600, 43.2, 256, 0, 0, 9.1),
(NOW() - INTERVAL '2 minutes', 5003, 'monitoring-01', 'elasticsearch', 'elastic', 'running', NOW() - INTERVAL '8 hours',
 54.2, 6142.3, 38.4, 4294967296, 2147483648, 561.4, 2048, 0, 0, 76.8);

-- Add some historical data for trend analysis
INSERT INTO vm_process_metrics (
    timestamp, process_id, vm_name, process_name, username, status, start_time,
    cpu_usage_percent, memory_usage_mb, memory_usage_percent,
    read_bytes, write_bytes, iops, open_files,
    gpu_memory_usage_mb, gpu_utilization_percent, estimated_power_watts
) VALUES 
-- 5 minutes ago data
(NOW() - INTERVAL '5 minutes', 1234, 'production-web-01', 'nginx', 'www-data', 'running', NOW() - INTERVAL '5 hours', 
 78.3, 508.7, 12.1, 1048576, 524288, 41.8, 128, 0, 0, 14.2),
(NOW() - INTERVAL '5 minutes', 2001, 'ml-training-gpu-01', 'python3', 'ubuntu', 'running', NOW() - INTERVAL '2 hours',
 91.8, 8185.2, 51.0, 1073741824, 536870912, 221.7, 1024, 15145.3, 82.4, 275.8),
(NOW() - INTERVAL '5 minutes', 3001, 'analytics-db-01', 'postgres', 'postgres', 'running', NOW() - INTERVAL '12 hours',
 32.4, 4089.5, 25.5, 8589934592, 4294967296, 445.2, 2048, 0, 0, 38.9),

-- 10 minutes ago data
(NOW() - INTERVAL '10 minutes', 1234, 'production-web-01', 'nginx', 'www-data', 'running', NOW() - INTERVAL '5 hours', 
 75.1, 505.3, 12.0, 1048576, 524288, 39.4, 128, 0, 0, 13.6),
(NOW() - INTERVAL '10 minutes', 2001, 'ml-training-gpu-01', 'python3', 'ubuntu', 'running', NOW() - INTERVAL '2 hours',
 89.2, 8178.9, 50.9, 1073741824, 536870912, 215.3, 1024, 14987.6, 79.8, 268.4),
(NOW() - INTERVAL '10 minutes', 3001, 'analytics-db-01', 'postgres', 'postgres', 'running', NOW() - INTERVAL '12 hours',
 29.7, 4082.1, 25.4, 8589934592, 4294967296, 432.8, 2048, 0, 0, 36.2);

-- Create a function to generate ongoing dummy data (for continuous updates)
CREATE OR REPLACE FUNCTION generate_vm_metrics_data() RETURNS VOID AS $$
DECLARE
    vm_names TEXT[] := ARRAY['production-web-01', 'ml-training-gpu-01', 'analytics-db-01', 'dev-environment-01', 'monitoring-01'];
    vm_name TEXT;
    base_timestamp TIMESTAMPTZ;
BEGIN
    base_timestamp := NOW();
    
    FOREACH vm_name IN ARRAY vm_names
    LOOP
        -- Insert current data for each VM with slight variations
        IF vm_name = 'production-web-01' THEN
            INSERT INTO vm_process_metrics (
                timestamp, process_id, vm_name, process_name, username, status, start_time,
                cpu_usage_percent, memory_usage_mb, memory_usage_percent,
                read_bytes, write_bytes, iops, open_files,
                gpu_memory_usage_mb, gpu_utilization_percent, estimated_power_watts
            ) VALUES 
            (base_timestamp, 1234, vm_name, 'nginx', 'www-data', 'running', base_timestamp - INTERVAL '5 hours',
             80 + (RANDOM() * 20), 500 + (RANDOM() * 100), 12 + (RANDOM() * 3),
             1048576, 524288, 40 + (RANDOM() * 20), 128, 0, 0, 14 + (RANDOM() * 4));
        ELSIF vm_name = 'ml-training-gpu-01' THEN
            INSERT INTO vm_process_metrics (
                timestamp, process_id, vm_name, process_name, username, status, start_time,
                cpu_usage_percent, memory_usage_mb, memory_usage_percent,
                read_bytes, write_bytes, iops, open_files,
                gpu_memory_usage_mb, gpu_utilization_percent, estimated_power_watts
            ) VALUES 
            (base_timestamp, 2001, vm_name, 'python3', 'ubuntu', 'running', base_timestamp - INTERVAL '2 hours',
             90 + (RANDOM() * 10), 8000 + (RANDOM() * 500), 50 + (RANDOM() * 5),
             1073741824, 536870912, 200 + (RANDOM() * 50), 1024,
             15000 + (RANDOM() * 1000), 80 + (RANDOM() * 15), 270 + (RANDOM() * 30));
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON vm_process_metrics TO PUBLIC;
GRANT EXECUTE ON FUNCTION generate_vm_metrics_data() TO PUBLIC;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'VM Process Metrics dummy data inserted successfully!';
    RAISE NOTICE 'Created data for VMs: production-web-01, ml-training-gpu-01, analytics-db-01, dev-environment-01, monitoring-01';
    RAISE NOTICE 'Data includes recent timestamps and realistic process metrics';
    RAISE NOTICE 'Use: SELECT * FROM vm_process_metrics ORDER BY timestamp DESC LIMIT 20; to view latest data';
END $$;