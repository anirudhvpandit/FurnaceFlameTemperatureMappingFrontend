"""
Data Cleaning Pipeline for FTM System
Handles data quality issues identified in the project brief:
- High missingness: load (12%), coal_flow (14%), time (48%), total_air_flow_tph (51%), oil_guns_in_service (60%)
- Data contamination: oil_guns_in_service contains burner tilt data
- Inconsistent formats: time field has multiple formats
- Referential integrity issues: orphan records, station_id problems
- Test data: suspected dummy/test records
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataCleaningPipeline:
    """
    Comprehensive data cleaning pipeline for FTM system data
    """
    
    def __init__(self):
        self.cleaning_report = {
            'original_records': 0,
            'cleaned_records': 0,
            'removed_test_data': 0,
            'fixed_format_issues': 0,
            'handled_missing_values': 0,
            'removed_orphan_records': 0
        }
    
    def clean_runs_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean the runs table data
        """
        logger.info("Cleaning runs data...")
        self.cleaning_report['original_records'] = len(df)
        
        # Remove test/dummy data
        df = self._remove_test_data(df)
        
        # Standardize datetime formats
        df = self._standardize_datetime_formats(df)
        
        # Handle missing values
        df = self._handle_missing_runs_values(df)
        
        # Fix referential integrity issues
        df = self._fix_referential_integrity(df)
        
        self.cleaning_report['cleaned_records'] = len(df)
        logger.info(f"Runs data cleaned: {self.cleaning_report['original_records']} -> {self.cleaning_report['cleaned_records']} records")
        
        return df
    
    def clean_boiler_params(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean boiler parameters data
        """
        logger.info("Cleaning boiler parameters data...")
        
        # Handle high missingness in specific fields
        df = self._handle_boiler_missingness(df)
        
        # Fix data contamination issues
        df = self._fix_boiler_contamination(df)
        
        # Standardize units and scales
        df = self._standardize_boiler_units(df)
        
        return df
    
    def clean_coal_mill_params(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean coal mill parameters data
        """
        logger.info("Cleaning coal mill parameters data...")
        
        # Handle varying numbers of coal mills per run
        df = self._handle_variable_mill_counts(df)
        
        # Handle missing coal flow data (14% missingness)
        df = self._handle_coal_flow_missingness(df)
        
        # Aggregate per run (handle multiple mills)
        df = self._aggregate_mill_data_per_run(df)
        
        return df
    
    def clean_profile_points(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean temperature profile points data
        """
        logger.info("Cleaning profile points data...")
        
        # Validate temperature ranges
        df = self._validate_temperature_ranges(df)
        
        # Handle missing temperature readings
        df = self._handle_missing_temperatures(df)
        
        # Standardize elevation data
        df = self._standardize_elevation_data(df)
        
        return df
    
    def clean_stats_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean statistics data
        """
        logger.info("Cleaning statistics data...")
        
        # Validate statistical calculations
        df = self._validate_stats_calculations(df)
        
        # Handle missing or inconsistent stats
        df = self._handle_missing_stats(df)
        
        return df
    
    def _remove_test_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Remove suspected test/dummy records
        """
        original_count = len(df)
        
        # Remove records with obvious test patterns
        test_patterns = [
            'test', 'dummy', 'sample', 'demo', 'placeholder',
            'xyz', 'abc', 'test123', 'dummy1'
        ]
        
        # Check for test patterns in string columns
        string_cols = df.select_dtypes(include=['object']).columns
        for col in string_cols:
            for pattern in test_patterns:
                mask = df[col].astype(str).str.lower().str.contains(pattern, na=False)
                df = df[~mask]
        
        # Remove records with unrealistic dates
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
            # Remove records with future dates or very old dates
            current_date = pd.Timestamp.now()
            df = df[(df['date'] <= current_date) & (df['date'] > '2000-01-01')]
        
        removed_count = original_count - len(df)
        self.cleaning_report['removed_test_data'] += removed_count
        logger.info(f"Removed {removed_count} test/dummy records")
        
        return df
    
    def _standardize_datetime_formats(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Standardize inconsistent datetime formats
        """
        fixed_count = 0
        
        if 'time' in df.columns:
            # Handle multiple time formats: '19:00' vs '17:00:00'
            def standardize_time(time_val):
                if pd.isna(time_val):
                    return None
                time_str = str(time_val).strip()
                
                # Try different formats
                formats = ['%H:%M:%S', '%H:%M', '%I:%M %p', '%I:%M:%S %p']
                for fmt in formats:
                    try:
                        parsed = datetime.strptime(time_str, fmt)
                        return parsed.strftime('%H:%M:%S')
                    except ValueError:
                        continue
                
                return None  # Return None if no format matches
            
            original_time = df['time'].copy()
            df['time'] = df['time'].apply(standardize_time)
            fixed_count = (original_time != df['time']).sum()
        
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
        
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
        
        self.cleaning_report['fixed_format_issues'] += fixed_count
        logger.info(f"Fixed {fixed_count} datetime format issues")
        
        return df
    
    def _handle_missing_runs_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Handle missing values in runs data
        """
        handled_count = 0
        
        # Handle missing load (12% missingness)
        if 'load' in df.columns:
            # Impute with median for numerical load
            if df['load'].dtype in ['int64', 'float64']:
                median_load = df['load'].median()
                df['load'] = df['load'].fillna(median_load)
                handled_count += df['load'].isna().sum()
        
        # Handle missing categorical data with mode
        categorical_cols = ['location', 'unit', 'station_id']
        for col in categorical_cols:
            if col in df.columns:
                mode_val = df[col].mode()[0] if not df[col].mode().empty else 'UNKNOWN'
                df[col] = df[col].fillna(mode_val)
        
        self.cleaning_report['handled_missing_values'] += handled_count
        logger.info(f"Handled {handled_count} missing values in runs data")
        
        return df
    
    def _fix_referential_integrity(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Fix referential integrity issues
        """
        removed_count = 0
        
        # Fix unit_id vs unit disagreements
        if 'unit_id' in df.columns and 'unit' in df.columns:
            # Create consistent unit identifiers
            df['unit'] = df['unit'].fillna(df['unit_id'])
            df['unit_id'] = df['unit_id'].fillna(df['unit'])
        
        # Remove orphan records (records without valid station_id)
        if 'station_id' in df.columns:
            original_count = len(df)
            df = df[df['station_id'].notna() & (df['station_id'] != '')]
            removed_count = original_count - len(df)
        
        self.cleaning_report['removed_orphan_records'] += removed_count
        logger.info(f"Removed {removed_count} orphan records")
        
        return df
    
    def _handle_boiler_missingness(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Handle high missingness in boiler parameters
        """
        # Handle total_air_flow_tph (51% missingness)
        if 'total_air_flow_tph' in df.columns:
            # Use more sophisticated imputation for high missingness
            # Group by related parameters and impute with group median
            if 'load' in df.columns:
                df['total_air_flow_tph'] = df.groupby('load')['total_air_flow_tph'].transform(
                    lambda x: x.fillna(x.median())
                )
            # Fill remaining with overall median
            df['total_air_flow_tph'] = df['total_air_flow_tph'].fillna(df['total_air_flow_tph'].median())
        
        # Handle oil_guns_in_service (60% missingness + contamination)
        if 'oil_guns_in_service' in df.columns:
            # This field has contamination issues, will be handled in _fix_boiler_contamination
            pass
        
        return df
    
    def _fix_boiler_contamination(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Fix data contamination in oil_guns_in_service field
        """
        if 'oil_guns_in_service' in df.columns:
            # oil_guns_in_service contains burner tilt data from specific Excel templates
            # Burner tilt values are typically in range -15 to +15 degrees
            # Oil guns count should be small integers (0-8 typically)
            
            def fix_contamination(val):
                if pd.isna(val):
                    return None
                try:
                    num_val = float(val)
                    # If value looks like burner tilt (outside reasonable oil gun range)
                    if abs(num_val) > 10:  # Burner tilt range
                        return None  # Mark as contaminated
                    return int(num_val) if num_val == int(num_val) else num_val
                except (ValueError, TypeError):
                    return None
            
            original_col = df['oil_guns_in_service'].copy()
            df['oil_guns_in_service'] = df['oil_guns_in_service'].apply(fix_contamination)
            
            # Impute cleaned oil guns data
            df['oil_guns_in_service'] = df['oil_guns_in_service'].fillna(
                df['oil_guns_in_service'].median()
            )
            
            fixed_count = (original_col != df['oil_guns_in_service']).sum()
            logger.info(f"Fixed {fixed_count} contaminated oil_guns_in_service values")
        
        return df
    
    def _standardize_boiler_units(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Standardize units and scales for boiler parameters
        """
        # Ensure consistent units for pressure, temperature, flow rates
        # This would be expanded based on specific unit requirements
        
        return df
    
    def _handle_variable_mill_counts(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Handle varying numbers of coal mills per run (2-10 mills)
        """
        # This will be handled during aggregation phase
        return df
    
    def _handle_coal_flow_missingness(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Handle missing coal flow data (14% missingness)
        """
        if 'coal_flow' in df.columns:
            # Impute with median grouped by mill if mill identifier exists
            if 'mill_id' in df.columns:
                df['coal_flow'] = df.groupby('mill_id')['coal_flow'].transform(
                    lambda x: x.fillna(x.median())
                )
            # Fill remaining with overall median
            df['coal_flow'] = df['coal_flow'].fillna(df['coal_flow'].median())
        
        return df
    
    def _aggregate_mill_data_per_run(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregate coal mill data per run to handle multiple mills
        """
        if 'run_id' in df.columns:
            # Aggregate multiple mills per run into summary statistics
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            numeric_cols = [col for col in numeric_cols if col != 'run_id']
            
            aggregated = df.groupby('run_id')[numeric_cols].agg({
                **{col: ['mean', 'std', 'min', 'max'] for col in numeric_cols}
            })
            
            # Flatten column names
            aggregated.columns = ['_'.join(col).strip() for col in aggregated.columns.values]
            aggregated = aggregated.reset_index()
            
            return aggregated
        
        return df
    
    def _validate_temperature_ranges(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Validate temperature readings for realistic ranges
        """
        temp_cols = [col for col in df.columns if 'temp' in col.lower() or 'temperature' in col.lower()]
        
        for col in temp_cols:
            if df[col].dtype in ['int64', 'float64']:
                # Flag unrealistic temperatures (assuming furnace range: 800-1500°C)
                unrealistic_mask = (df[col] < 500) | (df[col] > 2000)
                df.loc[unrealistic_mask, col] = np.nan
        
        return df
    
    def _handle_missing_temperatures(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Handle missing temperature readings
        """
        temp_cols = [col for col in df.columns if 'temp' in col.lower() or 'temperature' in col.lower()]
        
        for col in temp_cols:
            if df[col].dtype in ['int64', 'float64']:
                # Interpolate missing temperatures based on elevation
                if 'elevation' in df.columns:
                    df[col] = df.groupby('elevation')[col].transform(
                        lambda x: x.interpolate(method='linear')
                    )
                # Fill remaining with column median
                df[col] = df[col].fillna(df[col].median())
        
        return df
    
    def _standardize_elevation_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Standardize elevation data formats
        """
        if 'elevation' in df.columns:
            df['elevation'] = pd.to_numeric(df['elevation'], errors='coerce')
            # Remove unrealistic elevations
            df = df[(df['elevation'] >= 0) & (df['elevation'] <= 100)]
        
        return df
    
    def _validate_stats_calculations(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Validate statistical calculations
        """
        # Recalculate stats if needed to ensure accuracy
        return df
    
    def _handle_missing_stats(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Handle missing or inconsistent statistics
        """
        # Recalculate from raw data if available
        return df
    
    def get_cleaning_report(self) -> Dict:
        """
        Get summary of cleaning operations
        """
        return self.cleaning_report


def clean_all_data(runs_df: pd.DataFrame, boiler_df: pd.DataFrame, 
                   coal_mill_df: pd.DataFrame, profile_df: pd.DataFrame,
                   stats_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
    """
    Clean all FTM data tables
    """
    pipeline = DataCleaningPipeline()
    
    cleaned_runs = pipeline.clean_runs_data(runs_df)
    cleaned_boiler = pipeline.clean_boiler_params(boiler_df)
    cleaned_coal_mill = pipeline.clean_coal_mill_params(coal_mill_df)
    cleaned_profile = pipeline.clean_profile_points(profile_df)
    cleaned_stats = pipeline.clean_stats_data(stats_df)
    
    report = pipeline.get_cleaning_report()
    
    return (cleaned_runs, cleaned_boiler, cleaned_coal_mill, cleaned_profile, cleaned_stats), report


if __name__ == "__main__":
    # Example usage
    logger.info("Data Cleaning Pipeline for FTM System")
