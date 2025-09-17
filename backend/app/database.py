from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
MODEL_DB_URL = os.getenv("MODEL_DB_URL", "postgresql://postgres:@localhost:5432/Model_Recommendation_DB")
METRICS_DB_URL = os.getenv("METRICS_DB_URL", "postgresql://postgres:@localhost:5432/Metrics_db")
TIMESCALEDB_URL = os.getenv("TIMESCALEDB_URL", "postgresql://postgres:@localhost:5433/vm_metrics_ts")

# Create engines with simple configuration
model_engine = create_engine(
    MODEL_DB_URL,
    pool_pre_ping=True,
    echo=False
)

metrics_engine = create_engine(
    METRICS_DB_URL,
    pool_pre_ping=True,
    echo=False
)

timescaledb_engine = create_engine(
    TIMESCALEDB_URL,
    pool_pre_ping=True,
    echo=False
)

# Create session factories
ModelSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=model_engine)
MetricsSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=metrics_engine)
TimescaleDBSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=timescaledb_engine)

# Legacy engine for backward compatibility
engine = model_engine
SessionLocal = ModelSessionLocal

# Create base class for models
Base = declarative_base()

def get_db():
    """Dependency to get model database session"""
    db = ModelSessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_metrics_db():
    """Dependency to get metrics database session"""
    db = MetricsSessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_timescaledb():
    """Dependency to get TimescaleDB session for VM and host metrics"""
    db = TimescaleDBSessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_host_metrics_db():
    """Dependency to get TimescaleDB session specifically for host metrics"""
    # Host metrics now go to TimescaleDB instead of regular metrics DB
    return get_timescaledb()

def init_db():
    """Initialize the database with all tables"""
    try:
        # Create tables in Model_Recommendation_DB
        from app.models import ModelInfo, HardwareInfo
        ModelInfo.__table__.create(bind=model_engine, checkfirst=True)
        HardwareInfo.__table__.create(bind=model_engine, checkfirst=True)
        
        # Create tables in Metrics_db (only non-time-series tables)
        from app.models import HardwareMonitoring, VMMetric, HardwareSpecs, CostModel
        HardwareMonitoring.__table__.create(bind=metrics_engine, checkfirst=True)
        VMMetric.__table__.create(bind=metrics_engine, checkfirst=True)
        HardwareSpecs.__table__.create(bind=metrics_engine, checkfirst=True)
        CostModel.__table__.create(bind=metrics_engine, checkfirst=True)
        
        # Create tables in TimescaleDB (ALL time-series tables)
        from app.models.vm_process_metrics import VMProcessMetric
        from app.models.host_process_metrics import HostProcessMetric
        from app.models.host_overall_metrics import HostOverallMetric
        VMProcessMetric.__table__.create(bind=timescaledb_engine, checkfirst=True)
        HostProcessMetric.__table__.create(bind=timescaledb_engine, checkfirst=True)
        HostOverallMetric.__table__.create(bind=timescaledb_engine, checkfirst=True)
        
        # Create TimescaleDB hypertables for time-series data
        try:
            with timescaledb_engine.connect() as conn:
                # Create hypertables for VM and host metrics (all time-series data goes to TimescaleDB)
                conn.execute(text("SELECT create_hypertable('vm_process_metrics', 'timestamp', if_not_exists => TRUE);"))
                conn.execute(text("SELECT create_hypertable('host_process_metrics', 'timestamp', if_not_exists => TRUE);"))
                conn.execute(text("SELECT create_hypertable('host_overall_metrics', 'timestamp', if_not_exists => TRUE);"))
                conn.commit()
                print("✓ TimescaleDB hypertables created successfully")
        except Exception as e:
            print(f"⚠ TimescaleDB hypertable creation failed (this is normal if TimescaleDB is not installed): {e}")
        
        # Create hypertables in regular metrics DB for non-host tables (if TimescaleDB extension is available)
        try:
            with metrics_engine.connect() as conn:
                conn.execute(text("SELECT create_hypertable('hardware_monitoring_table', 'timestamp', if_not_exists => TRUE);"))
                conn.execute(text("SELECT create_hypertable('vm_metrics_table', 'timestamp', if_not_exists => TRUE);"))
                conn.commit()
                print("✓ Additional hypertables created in metrics database")
        except Exception as e:
            print(f"⚠ Additional hypertable creation failed (this is normal): {e}")
        
        print("✓ Database tables created successfully")
        return True
    except Exception as e:
        print(f"✗ Error creating database tables: {e}")
        return False

def get_db_stats():
    """Get database statistics"""
    try:
        # Check model database
        with model_engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            
            result = conn.execute(text("SELECT current_database();"))
            model_db_name = result.fetchone()[0]
        
        # Check metrics database
        with metrics_engine.connect() as conn:
            result = conn.execute(text("SELECT current_database();"))
            metrics_db_name = result.fetchone()[0]
        
        return {
            "status": "connected",
            "model_database": model_db_name,
            "metrics_database": metrics_db_name,
            "version": version
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

def check_db_connection():
    """Check if database connections are working"""
    try:
        # Check model database
        with model_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        # Check metrics database
        with metrics_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        # Check TimescaleDB database
        with timescaledb_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        return True
    except Exception:
        return False 