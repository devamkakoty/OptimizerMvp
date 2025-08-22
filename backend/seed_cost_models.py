#!/usr/bin/env python3
"""
Seed script to populate initial cost models for testing the FinOps features.
This script adds electricity pricing for different regions.
Updated for Docker environment.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models.cost_models import CostModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database URL from environment
METRICS_DB_URL = os.getenv('METRICS_DB_URL', 'postgresql://postgres:password@localhost:5432/Metrics_db')

# Default cost models data for different regions and resources
SAMPLE_COST_MODELS = [
    # North America
    {"resource_name": "CPU", "region": "US", "cost_per_unit": 0.12, "unit": "kWh", "currency": "USD"},
    {"resource_name": "GPU", "region": "US", "cost_per_unit": 0.12, "unit": "kWh", "currency": "USD"},
    {"resource_name": "Memory", "region": "US", "cost_per_unit": 0.05, "unit": "GB-hour", "currency": "USD"},
    {"resource_name": "Storage", "region": "US", "cost_per_unit": 0.10, "unit": "GB-month", "currency": "USD"},
    
    {"resource_name": "CPU", "region": "CA", "cost_per_unit": 0.08, "unit": "kWh", "currency": "CAD"},
    {"resource_name": "GPU", "region": "CA", "cost_per_unit": 0.08, "unit": "kWh", "currency": "CAD"},
    {"resource_name": "Memory", "region": "CA", "cost_per_unit": 0.04, "unit": "GB-hour", "currency": "CAD"},
    {"resource_name": "Storage", "region": "CA", "cost_per_unit": 0.08, "unit": "GB-month", "currency": "CAD"},
    
    # Europe
    {"resource_name": "CPU", "region": "EU", "cost_per_unit": 0.20, "unit": "kWh", "currency": "EUR"},
    {"resource_name": "GPU", "region": "EU", "cost_per_unit": 0.20, "unit": "kWh", "currency": "EUR"},
    {"resource_name": "Memory", "region": "EU", "cost_per_unit": 0.06, "unit": "GB-hour", "currency": "EUR"},
    {"resource_name": "Storage", "region": "EU", "cost_per_unit": 0.12, "unit": "GB-month", "currency": "EUR"},
    
    {"resource_name": "CPU", "region": "UK", "cost_per_unit": 0.18, "unit": "kWh", "currency": "GBP"},
    {"resource_name": "GPU", "region": "UK", "cost_per_unit": 0.18, "unit": "kWh", "currency": "GBP"},
    {"resource_name": "Memory", "region": "UK", "cost_per_unit": 0.05, "unit": "GB-hour", "currency": "GBP"},
    {"resource_name": "Storage", "region": "UK", "cost_per_unit": 0.11, "unit": "GB-month", "currency": "GBP"},
    
    # Asia Pacific
    {"resource_name": "CPU", "region": "AP", "cost_per_unit": 0.15, "unit": "kWh", "currency": "USD"},
    {"resource_name": "GPU", "region": "AP", "cost_per_unit": 0.15, "unit": "kWh", "currency": "USD"},
    {"resource_name": "Memory", "region": "AP", "cost_per_unit": 0.07, "unit": "GB-hour", "currency": "USD"},
    {"resource_name": "Storage", "region": "AP", "cost_per_unit": 0.13, "unit": "GB-month", "currency": "USD"},
    
    {"resource_name": "CPU", "region": "JP", "cost_per_unit": 0.25, "unit": "kWh", "currency": "JPY"},
    {"resource_name": "GPU", "region": "JP", "cost_per_unit": 0.25, "unit": "kWh", "currency": "JPY"},
    {"resource_name": "Memory", "region": "JP", "cost_per_unit": 0.08, "unit": "GB-hour", "currency": "JPY"},
    {"resource_name": "Storage", "region": "JP", "cost_per_unit": 0.15, "unit": "GB-month", "currency": "JPY"},
]

def seed_cost_models():
    """Seed the database with default cost models for different regions"""
    
    try:
        # Create engine and session
        engine = create_engine(METRICS_DB_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        logger.info("Starting cost models seeding...")
        
        # Check if cost_models table exists and create if not
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'cost_models'
                );
            """))
            table_exists = result.scalar()
            
            if not table_exists:
                logger.info("Creating cost_models table...")
                # Import here to ensure models are loaded
                from app.models.cost_models import Base
                Base.metadata.create_all(engine)
        
        # Clear existing data
        session.execute(text("DELETE FROM cost_models"))
        session.commit()
        logger.info("Cleared existing cost models")
        
        # Insert default cost models
        for model_data in SAMPLE_COST_MODELS:
            cost_model = CostModel(**model_data)
            session.add(cost_model)
        
        session.commit()
        logger.info(f"Successfully seeded {len(SAMPLE_COST_MODELS)} cost models")
        
        # Verify seeding
        count = session.query(CostModel).count()
        logger.info(f"Total cost models in database: {count}")
        
    except Exception as e:
        logger.error(f"Error seeding cost models: {e}")
        if 'session' in locals():
            session.rollback()
        sys.exit(1)
    finally:
        if 'session' in locals():
            session.close()

if __name__ == "__main__":
    print("=" * 60)
    print("GreenMatrix FinOps Cost Model Seeding Script")
    print("=" * 60)
    seed_cost_models()
    print("[OK] Cost models seeding completed successfully!")