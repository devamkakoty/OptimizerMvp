-- Cost Models Seed Data
-- Switch to Metrics_db database
\c Metrics_db;


-- Create cost_models table if not exists
CREATE TABLE IF NOT EXISTS cost_models (
    id SERIAL PRIMARY KEY,
    resource_name VARCHAR(100) NOT NULL,
    cost_per_unit REAL NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    region VARCHAR(100) NOT NULL,
    description TEXT,
    effective_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_resource_region UNIQUE (resource_name, region)
);

-- Insert ELECTRICITY_KWH cost model data (primary resource for power cost calculations)
-- These are realistic commercial/industrial electricity rates by specific regions based on 2024 data

-- United States (commercial rates vary significantly by state)
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'us-east-1', 0.095, 'USD', 'Virginia commercial electricity rate - major data center hub') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'us-east-2', 0.087, 'USD', 'Ohio commercial electricity rate') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'us-west-1', 0.195, 'USD', 'Northern California commercial electricity rate') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'us-west-2', 0.082, 'USD', 'Oregon commercial electricity rate - hydroelectric power') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'us-central-1', 0.078, 'USD', 'Texas commercial electricity rate - low cost energy') ON CONFLICT (resource_name, region) DO NOTHING;

-- Europe (commercial/industrial rates)
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'eu-west-1', 0.28, 'EUR', 'Ireland commercial electricity rate - major cloud region') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'eu-central-1', 0.32, 'EUR', 'Germany commercial electricity rate') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'eu-west-2', 0.22, 'GBP', 'UK commercial electricity rate') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'eu-west-3', 0.18, 'EUR', 'France commercial electricity rate - nuclear power') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'eu-north-1', 0.12, 'EUR', 'Sweden commercial electricity rate - renewable energy') ON CONFLICT (resource_name, region) DO NOTHING;

-- Asia Pacific
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'ap-south-1', 7.8, 'INR', 'Mumbai commercial electricity rate - major data center hub') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'ap-south-2', 6.9, 'INR', 'Hyderabad commercial electricity rate - growing tech hub') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'ap-southeast-1', 0.18, 'USD', 'Singapore commercial electricity rate') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'ap-southeast-2', 0.25, 'AUD', 'Sydney commercial electricity rate') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'ap-northeast-1', 24.5, 'JPY', 'Tokyo commercial electricity rate') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'ap-northeast-2', 0.09, 'USD', 'Seoul commercial electricity rate') ON CONFLICT (resource_name, region) DO NOTHING;

-- Canada
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'ca-central-1', 0.08, 'CAD', 'Ontario commercial electricity rate') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'ca-west-1', 0.12, 'CAD', 'British Columbia commercial electricity rate') ON CONFLICT (resource_name, region) DO NOTHING;

-- South America
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'sa-east-1', 0.58, 'BRL', 'São Paulo commercial electricity rate') ON CONFLICT (resource_name, region) DO NOTHING;

-- Middle East & Africa
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'me-south-1', 0.03, 'USD', 'Bahrain commercial electricity rate - subsidized energy') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('ELECTRICITY_KWH', 'af-south-1', 0.08, 'USD', 'Cape Town commercial electricity rate') ON CONFLICT (resource_name, region) DO NOTHING;
