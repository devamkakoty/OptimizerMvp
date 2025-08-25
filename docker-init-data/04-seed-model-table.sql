-- Model Table Seed Data
-- Switch to Model_Recommendation_DB database
\c Model_Recommendation_DB;


-- Create Model_table if not exists
CREATE TABLE IF NOT EXISTS "Model_table" (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    framework VARCHAR(100) NOT NULL,
    task_type VARCHAR(100) NOT NULL,
    total_parameters_millions REAL,
    model_size_mb REAL,
    architecture_type VARCHAR(255),
    model_type VARCHAR(100),
    embedding_vector_dimension INTEGER,
    precision VARCHAR(50),
    vocabulary_size INTEGER,
    ffn_dimension INTEGER,
    activation_function VARCHAR(100),
    flops REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert model data
INSERT INTO "Model_table" (model_name, framework, task_type, total_parameters_millions, model_size_mb, architecture_type, model_type, embedding_vector_dimension, precision, vocabulary_size, ffn_dimension, activation_function) VALUES ('BERT', 'PyTorch', 'Inference', 109.51, 840.09, 'BertForMaskedLM', 'bert', 768, 'FP32', 30522, 3072, 'gelu');
INSERT INTO "Model_table" (model_name, framework, task_type, total_parameters_millions, model_size_mb, architecture_type, model_type, embedding_vector_dimension, precision, vocabulary_size, ffn_dimension, activation_function) VALUES ('RoBERTa', 'PyTorch', 'Inference', 124.7, 951.42, 'RobertaForMaskedLM', 'roberta', 768, 'FP32', 50265, 3072, 'gelu');
INSERT INTO "Model_table" (model_name, framework, task_type, total_parameters_millions, model_size_mb, architecture_type, model_type, embedding_vector_dimension, precision, vocabulary_size, ffn_dimension, activation_function) VALUES ('resnet50', 'PyTorch', 'Inference', 25.56, 97.49, 'resnet50', 'resnet50', 2048, 'FP32', 1000, 2048, 'relu');
INSERT INTO "Model_table" (model_name, framework, task_type, total_parameters_millions, model_size_mb, architecture_type, model_type, embedding_vector_dimension, precision, vocabulary_size, ffn_dimension, activation_function) VALUES ('GPT-2', 'HuggingFace', 'Training', 117.0, 548.0, 'GPT2LMHeadModel', 'gpt2', 768, 'FP32', 50257, 3072, 'gelu');
