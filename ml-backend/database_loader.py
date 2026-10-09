"""
Database Loader for FTM System
Handles connection to MySQL database and loading of the 5 tables:
- runs
- boiler_mill_params
- coal_mill_params
- profile_points
- stats
"""

import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import logging
import os
from dotenv import load_dotenv
from typing import Dict, Tuple, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class FTMDatabaseLoader:
    """
    Database loader for FTM system
    """
    
    def __init__(self):
        self.db_host = os.getenv('DB_HOST', 'localhost')
        self.db_port = os.getenv('DB_PORT', '3306')
        self.db_name = os.getenv('DB_NAME', 'ftm_database')
        self.db_user = os.getenv('DB_USER', 'root')
        self.db_password = os.getenv('DB_PASSWORD', '')
        
        self.engine = None
        self.connection_string = None
        
    def create_connection(self) -> bool:
        """
        Create database connection
        """
        try:
            self.connection_string = f"mysql+pymysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
            self.engine = create_engine(self.connection_string, pool_pre_ping=True)
            
            # Test connection
            with self.engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            
            logger.info(f"Successfully connected to database: {self.db_name}")
            return True
            
        except SQLAlchemyError as e:
            logger.error(f"Database connection failed: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error connecting to database: {str(e)}")
            return False
    
    def load_table(self, table_name: str, query: Optional[str] = None) -> pd.DataFrame:
        """
        Load a specific table from database
        
        Args:
            table_name: Name of the table to load
            query: Optional custom SQL query
            
        Returns:
            DataFrame with table data
        """
        if not self.engine:
            if not self.create_connection():
                raise Exception("Database connection not established")
        
        try:
            if query:
                df = pd.read_sql(query, self.engine)
            else:
                df = pd.read_sql(f"SELECT * FROM {table_name}", self.engine)
            
            logger.info(f"Loaded {len(df)} records from {table_name}")
            return df
            
        except SQLAlchemyError as e:
            logger.error(f"Failed to load table {table_name}: {str(e)}")
            return pd.DataFrame()
        except Exception as e:
            logger.error(f"Unexpected error loading table {table_name}: {str(e)}")
            return pd.DataFrame()
    
    def load_runs_data(self) -> pd.DataFrame:
        """
        Load runs table with enhanced query
        """
        query = """
        SELECT 
            run_id, date, time, timestamp, location, unit, station_id, load,
            unit_id, created_at, updated_at
        FROM runs
        ORDER BY date, time
        """
        return self.load_table('runs', query)
    
    def load_boiler_params(self) -> pd.DataFrame:
        """
        Load boiler_mill_params table
        """
        query = """
        SELECT 
            run_id, steam_pressure, steam_flow, 
            spray_flow_1, spray_flow_2, total_spray_flow,
            o2_level, differential_pressure, flue_gas_temperature,
            total_air_flow_tph, oil_guns_in_service,
            created_at, updated_at
        FROM boiler_mill_params
        ORDER BY run_id
        """
        return self.load_table('boiler_mill_params', query)
    
    def load_coal_mill_params(self) -> pd.DataFrame:
        """
        Load coal_mill_params table
        """
        query = """
        SELECT 
            run_id, mill_id, coal_flow, coal_flow_tph,
            pa_flow, pa_flow_tph, mill_differential_pressure,
            outlet_temperature, outlet_temp, mill_current, mill_power,
            created_at, updated_at
        FROM coal_mill_params
        ORDER BY run_id, mill_id
        """
        return self.load_table('coal_mill_params', query)
    
    def load_profile_points(self) -> pd.DataFrame:
        """
        Load profile_points table
        """
        query = """
        SELECT 
            run_id, elevation, elevation_label, burner_tilt_deg,
            c1, c2, c3, c4, c5, c6, c7, c8,
            avg_temperature, temperature_avg,
            created_at, updated_at
        FROM profile_points
        ORDER BY run_id, elevation
        """
        return self.load_table('profile_points', query)
    
    def load_stats_data(self) -> pd.DataFrame:
        """
        Load stats table
        """
        query = """
        SELECT 
            run_id, stat_name, stat_value, stat_type,
            created_at, updated_at
        FROM stats
        ORDER BY run_id
        """
        return self.load_table('stats', query)
    
    def load_all_tables(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Load all 5 tables
        
        Returns:
            Tuple of (runs_df, boiler_df, coal_mill_df, profile_df, stats_df)
        """
        logger.info("Loading all FTM database tables...")
        
        runs_df = self.load_runs_data()
        boiler_df = self.load_boiler_params()
        coal_mill_df = self.load_coal_mill_params()
        profile_df = self.load_profile_points()
        stats_df = self.load_stats_data()
        
        logger.info(f"Loaded data summary:")
        logger.info(f"  - Runs: {len(runs_df)} records")
        logger.info(f"  - Boiler params: {len(boiler_df)} records")
        logger.info(f"  - Coal mill params: {len(coal_mill_df)} records")
        logger.info(f"  - Profile points: {len(profile_df)} records")
        logger.info(f"  - Stats: {len(stats_df)} records")
        
        return runs_df, boiler_df, coal_mill_df, profile_df, stats_df
    
    def get_data_summary(self) -> Dict:
        """
        Get summary statistics of loaded data
        """
        if not self.engine:
            return {}
        
        summary = {}
        
        try:
            with self.engine.connect() as connection:
                # Get table row counts
                tables = ['runs', 'boiler_mill_params', 'coal_mill_params', 'profile_points', 'stats']
                for table in tables:
                    result = connection.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    summary[table] = result.fetchone()[0]
                
                # Get date range
                result = connection.execute(text("SELECT MIN(date), MAX(date) FROM runs"))
                date_range = result.fetchone()
                summary['date_range'] = {
                    'min': str(date_range[0]) if date_range[0] else None,
                    'max': str(date_range[1]) if date_range[1] else None
                }
                
                # Get unique locations
                result = connection.execute(text("SELECT DISTINCT location FROM runs"))
                summary['locations'] = [row[0] for row in result.fetchall()]
                
                # Get unique units
                result = connection.execute(text("SELECT DISTINCT unit FROM runs"))
                summary['units'] = [row[0] for row in result.fetchall()]
                
        except SQLAlchemyError as e:
            logger.error(f"Failed to get data summary: {str(e)}")
        
        return summary
    
    def test_connection(self) -> bool:
        """
        Test database connection and return basic info
        """
        try:
            if not self.create_connection():
                return False
            
            summary = self.get_data_summary()
            logger.info("Database connection test successful")
            logger.info(f"Data summary: {summary}")
            
            return True
            
        except Exception as e:
            logger.error(f"Database connection test failed: {str(e)}")
            return False
    
    def close_connection(self):
        """
        Close database connection
        """
        if self.engine:
            self.engine.dispose()
            logger.info("Database connection closed")


def create_sample_data_for_testing() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Create sample data for testing when database is not available
    This simulates the structure of the actual FTM database
    """
    logger.info("Creating sample data for testing...")
    
    np.random.seed(42)
    n_runs = 100
    
    # Runs data
    runs_data = {
        'run_id': range(1, n_runs + 1),
        'date': pd.date_range('2024-01-01', periods=n_runs, freq='D'),
        'time': [f'{h:02d}:00' for h in np.random.randint(0, 24, n_runs)],
        'location': np.random.choice(['CSTPS', 'KPKD', 'BTPS'], n_runs),
        'unit': np.random.choice(['Unit1', 'Unit2', 'Unit3'], n_runs),
        'station_id': [f'ST{i:03d}' for i in range(1, n_runs + 1)],
        'load': np.random.normal(150, 20, n_runs),
        'unit_id': range(1, n_runs + 1)
    }
    runs_df = pd.DataFrame(runs_data)
    
    # Boiler parameters
    boiler_data = []
    for run_id in range(1, n_runs + 1):
        boiler_data.append({
            'run_id': run_id,
            'steam_pressure': np.random.normal(100, 10),
            'steam_flow': np.random.normal(50, 5),
            'spray_flow_1': np.random.normal(5, 1),
            'spray_flow_2': np.random.normal(5, 1),
            'total_spray_flow': np.random.normal(10, 2),
            'o2_level': np.random.normal(4.0, 0.5),
            'differential_pressure': np.random.normal(200, 20),
            'flue_gas_temperature': np.random.normal(150, 15),
            'total_air_flow_tph': np.random.normal(80, 10),
            'oil_guns_in_service': np.random.choice([0, 1, 2], 1)[0]
        })
    boiler_df = pd.DataFrame(boiler_data)
    
    # Coal mill parameters (2-10 mills per run)
    coal_mill_data = []
    for run_id in range(1, n_runs + 1):
        num_mills = np.random.randint(2, 11)
        for mill_id in range(1, num_mills + 1):
            coal_mill_data.append({
                'run_id': run_id,
                'mill_id': f'M{mill_id}',
                'coal_flow_tph': np.random.normal(12, 2),
                'pa_flow_tph': np.random.normal(20, 3),
                'mill_differential_pressure': np.random.normal(50, 5),
                'outlet_temperature': np.random.normal(70, 5),
                'mill_current': np.random.normal(30, 3)
            })
    coal_mill_df = pd.DataFrame(coal_mill_data)
    
    # Profile points (4-8 elevation points per run)
    profile_data = []
    elevations = [56.4, 62.8, 69.2, 75.6, 82.0, 88.4, 94.8, 101.2]
    
    for run_id in range(1, n_runs + 1):
        num_elevations = np.random.randint(4, 9)
        selected_elevations = elevations[:num_elevations]
        burner_tilt = np.random.normal(0, 5)
        
        for i, elevation in enumerate(selected_elevations):
            # Generate corner temperatures
            corner_temps = np.random.normal(1200 + i * 30, 50, 8)
            
            profile_data.append({
                'run_id': run_id,
                'elevation': elevation,
                'elevation_label': str(elevation),
                'burner_tilt_deg': burner_tilt + np.random.normal(0, 2),
                'c1': corner_temps[0],
                'c2': corner_temps[1],
                'c3': corner_temps[2],
                'c4': corner_temps[3],
                'c5': corner_temps[4],
                'c6': corner_temps[5],
                'c7': corner_temps[6],
                'c8': corner_temps[7],
                'avg_temperature': np.mean(corner_temps)
            })
    profile_df = pd.DataFrame(profile_data)
    
    # Stats data
    stats_data = []
    for run_id in range(1, n_runs + 1):
        stats_data.extend([
            {'run_id': run_id, 'stat_name': 'efficiency', 'stat_value': np.random.normal(0.85, 0.05), 'stat_type': 'performance'},
            {'run_id': run_id, 'stat_name': 'availability', 'stat_value': np.random.normal(0.95, 0.02), 'stat_type': 'operational'},
            {'run_id': run_id, 'stat_name': 'heat_rate', 'stat_value': np.random.normal(2500, 100), 'stat_type': 'performance'}
        ])
    stats_df = pd.DataFrame(stats_data)
    
    logger.info(f"Created sample data: {len(runs_df)} runs, {len(boiler_df)} boiler records, {len(coal_mill_df)} coal mill records, {len(profile_df)} profile points, {len(stats_df)} stats")
    
    return runs_df, boiler_df, coal_mill_df, profile_df, stats_df


if __name__ == "__main__":
    # Test database connection
    loader = FTMDatabaseLoader()
    
    if loader.test_connection():
        # Load actual data
        runs_df, boiler_df, coal_mill_df, profile_df, stats_df = loader.load_all_tables()
        loader.close_connection()
    else:
        # Use sample data for testing
        logger.warning("Database connection failed, using sample data for testing")
        runs_df, boiler_df, coal_mill_df, profile_df, stats_df = create_sample_data_for_testing()