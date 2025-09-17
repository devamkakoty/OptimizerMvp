-- Create Model Table with schema matching Model_Info.csv  
-- This script creates the Model_table with correct column names and types

\c Model_Recommendation_DB;

-- Drop existing table if it exists
DROP TABLE IF EXISTS "Model_table";

-- Create Model_table with CSV-matching schema
CREATE TABLE "Model_table" (
    id SERIAL PRIMARY KEY,
    "Model Name" VARCHAR(255),
    "Framework" VARCHAR(100),
    "Task Type" VARCHAR(100),
    "Total Parameters (Millions)" REAL,
    "Model Size (MB)" REAL,
    "Architecture type" VARCHAR(255),
    "Model Type" VARCHAR(100),
    "Embedding Vector Dimension (Hidden Size)" INTEGER,
    "Precision" VARCHAR(50),
    "Vocabulary Size" INTEGER,
    "FFN (MLP) Dimension" INTEGER,
    "Activation Function" VARCHAR(100),
    "GFLOPs (Billions)" REAL,
    "Number of hidden Layers" INTEGER,
    "Number of Attention Layers" INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance  
CREATE INDEX IF NOT EXISTS idx_model_name_framework ON "Model_table"("Model Name", "Framework");