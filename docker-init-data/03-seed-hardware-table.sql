-- Hardware Table Seed Data
-- Switch to Model_Recommendation_DB database
\c Model_Recommendation_DB;


-- Create Hardware_table if not exists
CREATE TABLE IF NOT EXISTS "Hardware_table" (
    id SERIAL PRIMARY KEY,
    cpu VARCHAR(255) NOT NULL,
    gpu VARCHAR(255),
    num_gpu INTEGER,
    gpu_memory_total_vram_mb INTEGER,
    gpu_graphics_clock REAL,
    gpu_memory_clock REAL,
    gpu_sm_cores INTEGER,
    gpu_cuda_cores INTEGER,
    cpu_total_cores INTEGER,
    cpu_threads_per_core INTEGER,
    cpu_base_clock_ghz REAL,
    cpu_max_frequency_ghz REAL,
    l1_cache INTEGER,
    cpu_power_consumption INTEGER,
    gpu_power_consumption INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert hardware data
INSERT INTO "Hardware_table" (cpu, gpu, num_gpu, gpu_memory_total_vram_mb, gpu_graphics_clock, gpu_memory_clock, gpu_sm_cores, gpu_cuda_cores, cpu_total_cores, cpu_threads_per_core, cpu_base_clock_ghz, cpu_max_frequency_ghz, l1_cache, cpu_power_consumption, gpu_power_consumption) VALUES ('Intel(R) Xeon', 'Tesla T4', 1, 16000, 1.5, 1.2, 40, 2560, 12, 2, 2.0, 3.9, 80, 350, 70);
INSERT INTO "Hardware_table" (cpu, gpu, num_gpu, gpu_memory_total_vram_mb, gpu_graphics_clock, gpu_memory_clock, gpu_sm_cores, gpu_cuda_cores, cpu_total_cores, cpu_threads_per_core, cpu_base_clock_ghz, cpu_max_frequency_ghz, l1_cache, cpu_power_consumption, gpu_power_consumption) VALUES ('Intel(R) Xeon', 'NVIDIA A100', 1, 40000, 1.41, 1.215, 108, 6912, 12, 2, 2.0, 3.9, 80, 350, 250);
INSERT INTO "Hardware_table" (cpu, gpu, num_gpu, gpu_memory_total_vram_mb, gpu_graphics_clock, gpu_memory_clock, gpu_sm_cores, gpu_cuda_cores, cpu_total_cores, cpu_threads_per_core, cpu_base_clock_ghz, cpu_max_frequency_ghz, l1_cache, cpu_power_consumption, gpu_power_consumption) VALUES ('Intel(R) Xeon', 'NVIDIA L4', 1, 24000, 2.04, 1.56, 60, 7680, 12, 2, 2.0, 3.9, 80, 350, 72);
INSERT INTO "Hardware_table" (cpu, gpu, num_gpu, gpu_memory_total_vram_mb, gpu_graphics_clock, gpu_memory_clock, gpu_sm_cores, gpu_cuda_cores, cpu_total_cores, cpu_threads_per_core, cpu_base_clock_ghz, cpu_max_frequency_ghz, l1_cache, cpu_power_consumption, gpu_power_consumption) VALUES ('AMD EPYC 7742', 'NVIDIA RTX 4090', 2, 24000, 2.52, 1.31, 128, 16384, 64, 2, 2.25, 3.4, 64, 225, 450);
