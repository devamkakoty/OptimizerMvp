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

-- Insert cost model data
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('CPU', 'US', 0.12, 'USD', 'CPU cost per kWh in US') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('GPU', 'US', 0.12, 'USD', 'GPU cost per kWh in US') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('Memory', 'US', 0.05, 'USD', 'Memory cost per GB-hour in US') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('Storage', 'US', 0.1, 'USD', 'Storage cost per GB-month in US') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('CPU', 'CA', 0.08, 'CAD', 'CPU cost per kWh in Canada') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('GPU', 'CA', 0.08, 'CAD', 'GPU cost per kWh in Canada') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('CPU', 'EU', 0.2, 'EUR', 'CPU cost per kWh in EU') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('GPU', 'EU', 0.2, 'EUR', 'GPU cost per kWh in EU') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('CPU', 'AP', 0.15, 'USD', 'CPU cost per kWh in Asia Pacific') ON CONFLICT (resource_name, region) DO NOTHING;
INSERT INTO cost_models (resource_name, region, cost_per_unit, currency, description) VALUES ('GPU', 'AP', 0.15, 'USD', 'GPU cost per kWh in Asia Pacific') ON CONFLICT (resource_name, region) DO NOTHING;
