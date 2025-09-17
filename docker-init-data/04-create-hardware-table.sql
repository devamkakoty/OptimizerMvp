-- Create Hardware Table with schema matching Available_HardwareHPE.csv
-- This script creates the Hardware_table with correct column names and types

\c Model_Recommendation_DB;

-- Drop existing table if it exists
DROP TABLE IF EXISTS "Hardware_table";

-- Create Hardware_table with CSV-matching schema
CREATE TABLE "Hardware_table" (
    id SERIAL PRIMARY KEY,
    "CPU" VARCHAR(255),
    "GPU" VARCHAR(255),
    "# of GPU" INTEGER,
    "GPU Memory Total - VRAM (MB)" REAL,
    "GPU Graphics clock" REAL,
    "GPU Memory clock" REAL,
    "GPU SM Cores" INTEGER,
    "GPU CUDA Cores" INTEGER,
    "CPU Total cores (Including Logical cores)" INTEGER,
    "CPU Threads per Core" INTEGER,
    "CPU Base clock(GHz)" REAL,
    "CPU Max Frequency(GHz)" REAL,
    "L1 Cache" INTEGER,
    "CPU Power Consumption" INTEGER,
    "GPUPower Consumption" INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_hardware_cpu_gpu ON "Hardware_table"("CPU", "GPU");