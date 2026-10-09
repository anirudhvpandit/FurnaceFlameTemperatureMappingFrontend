"""
Feature Engineering for FTM Anomaly Detection
Extracts meaningful features from temperature profiles and operational parameters
Handles aggregation of multi-record data (coal mills, profile points) per run
Creates derived parameters for ML model training
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
import logging
from scipy import stats

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FeatureEngineer:
    """
    Feature engineering for FTM system data
    """
    
    def __init__(self):
        self.feature_names = []
        self.derived_features = {}
    
    def extract_temperature_features(self, profile_df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract comprehensive temperature features from profile points
        """
        logger.info("Extracting temperature features...")
        
        if profile_df.empty:
            return pd.DataFrame()
        
        features = []
        
        # Group by run_id to extract features per run
        if 'run_id' in profile_df.columns:
            grouped = profile_df.groupby('run_id')
            
            for run_id, group in grouped:
                run_features = {'run_id': run_id}
                
                # Basic temperature statistics
                temp_cols = [col for col in group.columns if 'temp' in col.lower() or 'temperature' in col.lower()]
                
                for temp_col in temp_cols:
                    temps = group[temp_col].dropna()
                    if len(temps) > 0:
                        run_features[f'{temp_col}_mean'] = temps.mean()
                        run_features[f'{temp_col}_std'] = temps.std()
                        run_features[f'{temp_col}_min'] = temps.min()
                        run_features[f'{temp_col}_max'] = temps.max()
                        run_features[f'{temp_col}_range'] = temps.max() - temps.min()
                        run_features[f'{temp_col}_median'] = temps.median()
                        
                        # Percentiles
                        run_features[f'{temp_col}_p25'] = temps.quantile(0.25)
                        run_features[f'{temp_col}_p75'] = temps.quantile(0.75)
                        
                        # Advanced features
                        run_features[f'{temp_col}_skewness'] = stats.skew(temps) if len(temps) > 2 else 0
                        run_features[f'{temp_col}_kurtosis'] = stats.kurtosis(temps) if len(temps) > 3 else 0
                
                # Corner temperature differences (uniformity metrics)
                corner_cols = [col for col in group.columns if col.startswith('c') and col[1:].isdigit()]
                if len(corner_cols) >= 2:
                    corner_temps = group[corner_cols].dropna()
                    if not corner_temps.empty:
                        # Temperature uniformity across corners
                        corner_means = corner_temps.mean()
                        run_features['corner_temp_std'] = corner_means.std()
                        run_features['corner_temp_range'] = corner_means.max() - corner_means.min()
                        run_features['corner_temp_coeff_var'] = corner_means.std() / corner_means.mean() if corner_means.mean() > 0 else 0
                        
                        # Max corner difference
                        run_features['max_corner_diff'] = corner_temps.max().max() - corner_temps.min().min()
                
                # Elevation-based temperature gradient
                if 'elevation' in group.columns and 'avg_temperature' in group.columns:
                    elevation_temp = group[['elevation', 'avg_temperature']].dropna()
                    if len(elevation_temp) > 1:
                        # Calculate temperature gradient per meter
                        elevation_temp = elevation_temp.sort_values('elevation')
                        temp_gradient = np.gradient(elevation_temp['avg_temperature'], elevation_temp['elevation'])
                        run_features['temp_gradient_mean'] = np.mean(temp_gradient)
                        run_features['temp_gradient_std'] = np.std(temp_gradient)
                
                # Burner tilt analysis
                if 'burner_tilt_deg' in group.columns:
                    tilts = group['burner_tilt_deg'].dropna()
                    if len(tilts) > 0:
                        run_features['burner_tilt_mean'] = tilts.mean()
                        run_features['burner_tilt_std'] = tilts.std()
                        run_features['burner_tilt_range'] = tilts.max() - tilts.min()
                
                features.append(run_features)
        
        feature_df = pd.DataFrame(features)
        self.feature_names.extend([col for col in feature_df.columns if col != 'run_id'])
        
        logger.info(f"Extracted {len(feature_df.columns) - 1} temperature features for {len(feature_df)} runs")
        return feature_df
    
    def extract_boiler_features(self, boiler_df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract features from boiler parameters
        """
        logger.info("Extracting boiler features...")
        
        if boiler_df.empty:
            return pd.DataFrame()
        
        features = []
        
        if 'run_id' in boiler_df.columns:
            grouped = boiler_df.groupby('run_id')
            
            for run_id, group in grouped:
                run_features = {'run_id': run_id}
                
                # Steam parameters
                steam_cols = [col for col in group.columns if 'steam' in col.lower()]
                for col in steam_cols:
                    values = group[col].dropna()
                    if len(values) > 0:
                        run_features[f'{col}_mean'] = values.mean()
                        run_features[f'{col}_std'] = values.std()
                
                # Spray flow parameters
                spray_cols = [col for col in group.columns if 'spray' in col.lower()]
                for col in spray_cols:
                    values = group[col].dropna()
                    if len(values) > 0:
                        run_features[f'{col}_total'] = values.sum()
                        run_features[f'{col}_mean'] = values.mean()
                
                # O2 levels
                o2_cols = [col for col in group.columns if 'o2' in col.lower() or 'oxygen' in col.lower()]
                for col in o2_cols:
                    values = group[col].dropna()
                    if len(values) > 0:
                        run_features[f'{col}_mean'] = values.mean()
                        run_features[f'{col}_min'] = values.min()
                        run_features[f'{col}_max'] = values.max()
                
                # Differential pressures
                pressure_cols = [col for col in group.columns if 'pressure' in col.lower() and 'differential' in col.lower()]
                for col in pressure_cols:
                    values = group[col].dropna()
                    if len(values) > 0:
                        run_features[f'{col}_mean'] = values.mean()
                        run_features[f'{col}_std'] = values.std()
                
                # Flue gas temperatures
                flue_gas_cols = [col for col in group.columns if 'flue' in col.lower() or 'gas' in col.lower()]
                for col in flue_gas_cols:
                    values = group[col].dropna()
                    if len(values) > 0:
                        run_features[f'{col}_mean'] = values.mean()
                        run_features[f'{col}_max'] = values.max()
                
                # Derived efficiency metrics
                if 'steam_pressure' in group.columns and 'steam_flow' in group.columns:
                    steam_pressure = group['steam_pressure'].mean()
                    steam_flow = group['steam_flow'].mean()
                    if pd.notna(steam_pressure) and pd.notna(steam_flow):
                        run_features['steam_power'] = steam_pressure * steam_flow / 1000  # Simplified power calculation
                
                features.append(run_features)
        
        feature_df = pd.DataFrame(features)
        self.feature_names.extend([col for col in feature_df.columns if col != 'run_id'])
        
        logger.info(f"Extracted {len(feature_df.columns) - 1} boiler features for {len(feature_df)} runs")
        return feature_df
    
    def extract_coal_mill_features(self, coal_mill_df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract features from coal mill parameters with aggregation per run
        """
        logger.info("Extracting coal mill features...")
        
        if coal_mill_df.empty:
            return pd.DataFrame()
        
        features = []
        
        if 'run_id' in coal_mill_df.columns:
            grouped = coal_mill_df.groupby('run_id')
            
            for run_id, group in grouped:
                run_features = {'run_id': run_id}
                
                # Aggregate across multiple mills per run
                numeric_cols = group.select_dtypes(include=[np.number]).columns
                numeric_cols = [col for col in numeric_cols if col != 'run_id']
                
                for col in numeric_cols:
                    values = group[col].dropna()
                    if len(values) > 0:
                        # Summary statistics across all mills
                        run_features[f'{col}_mean'] = values.mean()
                        run_features[f'{col}_std'] = values.std()
                        run_features[f'{col}_min'] = values.min()
                        run_features[f'{col}_max'] = values.max()
                        run_features[f'{col}_sum'] = values.sum()
                        run_features[f'{col}_count'] = len(values)
                
                # Coal flow specific features
                if 'coal_flow' in group.columns or 'coal_flow_tph' in group.columns:
                    coal_col = 'coal_flow' if 'coal_flow' in group.columns else 'coal_flow_tph'
                    coal_values = group[coal_col].dropna()
                    if len(coal_values) > 0:
                        run_features['total_coal_flow'] = coal_values.sum()
                        run_features['avg_coal_flow_per_mill'] = coal_values.mean()
                        run_features['coal_flow_balance'] = coal_values.std() / coal_values.mean() if coal_values.mean() > 0 else 0
                
                # PA flow specific features
                if 'pa_flow' in group.columns or 'pa_flow_tph' in group.columns:
                    pa_col = 'pa_flow' if 'pa_flow' in group.columns else 'pa_flow_tph'
                    pa_values = group[pa_col].dropna()
                    if len(pa_values) > 0:
                        run_features['total_pa_flow'] = pa_values.sum()
                        run_features['avg_pa_flow_per_mill'] = pa_values.mean()
                
                # Mill differential pressure
                if 'mill_diff_pressure' in group.columns or 'differential_pressure' in group.columns:
                    pressure_col = 'mill_diff_pressure' if 'mill_diff_pressure' in group.columns else 'differential_pressure'
                    pressure_values = group[pressure_col].dropna()
                    if len(pressure_values) > 0:
                        run_features['avg_mill_pressure'] = pressure_values.mean()
                        run_features['max_mill_pressure'] = pressure_values.max()
                
                # Mill outlet temperature
                if 'outlet_temp' in group.columns or 'outlet_temperature' in group.columns:
                    temp_col = 'outlet_temp' if 'outlet_temp' in group.columns else 'outlet_temperature'
                    temp_values = group[temp_col].dropna()
                    if len(temp_values) > 0:
                        run_features['avg_outlet_temp'] = temp_values.mean()
                        run_features['outlet_temp_std'] = temp_values.std()
                
                # Mill current/power
                if 'mill_current' in group.columns or 'mill_power' in group.columns:
                    current_col = 'mill_current' if 'mill_current' in group.columns else 'mill_power'
                    current_values = group[current_col].dropna()
                    if len(current_values) > 0:
                        run_features['total_mill_current'] = current_values.sum()
                        run_features['avg_mill_current'] = current_values.mean()
                
                features.append(run_features)
        
        feature_df = pd.DataFrame(features)
        self.feature_names.extend([col for col in feature_df.columns if col != 'run_id'])
        
        logger.info(f"Extracted {len(feature_df.columns) - 1} coal mill features for {len(feature_df)} runs")
        return feature_df
    
    def create_derived_parameters(self, runs_df: pd.DataFrame, temp_features: pd.DataFrame,
                                  boiler_features: pd.DataFrame, coal_features: pd.DataFrame) -> pd.DataFrame:
        """
        Create derived parameters and thermal stress metrics
        """
        logger.info("Creating derived parameters...")
        
        # Merge all features
        if 'run_id' in runs_df.columns:
            merged = runs_df[['run_id']].copy()
        else:
            # If runs_df doesn't have run_id, create one
            merged = pd.DataFrame({'run_id': range(len(runs_df))})
        
        if not temp_features.empty:
            merged = merged.merge(temp_features, on='run_id', how='left')
        
        if not boiler_features.empty:
            merged = merged.merge(boiler_features, on='run_id', how='left')
        
        if not coal_features.empty:
            merged = merged.merge(coal_features, on='run_id', how='left')
        
        # Air-to-fuel ratio calculation
        if 'total_pa_flow' in merged.columns and 'total_coal_flow' in merged.columns:
            merged['air_fuel_ratio'] = merged['total_pa_flow'] / merged['total_coal_flow']
            merged['air_fuel_ratio'] = merged['air_fuel_ratio'].replace([np.inf, -np.inf], np.nan)
        
        # Thermal stress indicators
        if 'avg_temperature_mean' in merged.columns and 'corner_temp_range' in merged.columns:
            # High temperature + high non-uniformity = high thermal stress
            merged['thermal_stress_index'] = (
                (merged['avg_temperature_mean'] / 1400) * 0.6 +  # Temperature component
                (merged['corner_temp_range'] / 200) * 0.4       # Uniformity component
            )
        
        # Combustion efficiency indicators
        if 'o2_mean' in merged.columns and 'air_fuel_ratio' in merged.columns:
            # Optimal O2 is typically 3-5%, optimal AFR varies by coal type
            merged['combustion_efficiency_score'] = 1.0 - (
                abs(merged['o2_mean'] - 4) / 10 +  # O2 deviation from optimal
                abs(merged['air_fuel_ratio'] - 2.5) / 5  # AFR deviation from optimal
            )
            merged['combustion_efficiency_score'] = merged['combustion_efficiency_score'].clip(0, 1)
        
        # Temperature gradient stress
        if 'temp_gradient_mean' in merged.columns and 'temp_gradient_std' in merged.columns:
            merged['gradient_stress'] = np.sqrt(
                merged['temp_gradient_mean']**2 + merged['temp_gradient_std']**2
            )
        
        # Load-based performance metrics
        if 'load' in merged.columns:
            if 'total_coal_flow' in merged.columns:
                merged['coal_efficiency'] = merged['load'] / merged['total_coal_flow']
            if 'steam_flow_mean' in merged.columns:
                merged['steam_efficiency'] = merged['load'] / merged['steam_flow_mean']
        
        # Mill balance metrics
        if 'coal_flow_balance' in merged.columns:
            merged['mill_balance_score'] = 1.0 - merged['coal_flow_balance']
            merged['mill_balance_score'] = merged['mill_balance_score'].clip(0, 1)
        
        # Store derived feature names
        derived_cols = [col for col in merged.columns if col not in self.feature_names and col != 'run_id']
        self.derived_features['derived_parameters'] = derived_cols
        
        logger.info(f"Created {len(derived_cols)} derived parameters")
        return merged
    
    def calculate_run_aggregates(self, profile_df: pd.DataFrame, boiler_df: pd.DataFrame,
                                 coal_mill_df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
        """
        Calculate aggregate metrics per run from multi-record data
        """
        logger.info("Calculating run-level aggregates...")
        
        aggregates = {}
        
        # Profile point aggregates
        if 'run_id' in profile_df.columns:
            # Define aggregations for profile columns
            profile_agg_dict = {
                'elevation': ['mean', 'std', 'count'],
                'burner_tilt_deg': ['mean', 'std', 'min', 'max'],
            }
            
            # Add temperature aggregates
            temp_cols = [col for col in profile_df.columns if 'temp' in col.lower()]
            for col in temp_cols:
                if col in profile_df.columns:
                    profile_agg_dict[col] = ['mean', 'std', 'min', 'max']
            
            profile_agg = profile_df.groupby('run_id').agg(profile_agg_dict)
            profile_agg.columns = ['_'.join(col).strip() for col in profile_agg.columns.values]
            aggregates['profile_aggregates'] = profile_agg.reset_index()
        
        # Boiler parameter aggregates
        if 'run_id' in boiler_df.columns:
            numeric_cols = [col for col in boiler_df.select_dtypes(include=[np.number]).columns if col != 'run_id']
            boiler_agg_dict = {col: ['mean', 'std', 'min', 'max'] for col in numeric_cols}
            
            boiler_agg = boiler_df.groupby('run_id').agg(boiler_agg_dict)
            boiler_agg.columns = ['_'.join(col).strip() for col in boiler_agg.columns.values]
            aggregates['boiler_aggregates'] = boiler_agg.reset_index()
        
        # Coal mill aggregates (already handled in extract_coal_mill_features)
        if 'run_id' in coal_mill_df.columns:
            numeric_cols = [col for col in coal_mill_df.select_dtypes(include=[np.number]).columns if col != 'run_id']
            coal_agg_dict = {col: ['mean', 'std', 'min', 'max', 'sum', 'count'] for col in numeric_cols}
            
            coal_agg = coal_mill_df.groupby('run_id').agg(coal_agg_dict)
            coal_agg.columns = ['_'.join(col).strip() for col in coal_agg.columns.values]
            aggregates['coal_mill_aggregates'] = coal_agg.reset_index()
        
        logger.info(f"Created aggregates for {len(aggregates)} data types")
        return aggregates
    
    def normalize_features(self, feature_df: pd.DataFrame, method: str = 'standard') -> pd.DataFrame:
        """
        Normalize features for ML model training
        """
        logger.info(f"Normalizing features using {method} method...")
        
        numeric_cols = feature_df.select_dtypes(include=[np.number]).columns
        numeric_cols = [col for col in numeric_cols if col != 'run_id']
        
        normalized_df = feature_df.copy()
        
        for col in numeric_cols:
            values = feature_df[col].dropna()
            if len(values) > 0:
                if method == 'standard':
                    # Z-score normalization
                    mean, std = values.mean(), values.std()
                    if std > 0:
                        normalized_df[col] = (feature_df[col] - mean) / std
                elif method == 'minmax':
                    # Min-max normalization
                    min_val, max_val = values.min(), values.max()
                    if max_val > min_val:
                        normalized_df[col] = (feature_df[col] - min_val) / (max_val - min_val)
                elif method == 'robust':
                    # Robust scaling (median and IQR)
                    median, q75, q25 = values.median(), values.quantile(0.75), values.quantile(0.25)
                    iqr = q75 - q25
                    if iqr > 0:
                        normalized_df[col] = (feature_df[col] - median) / iqr
        
        logger.info(f"Normalized {len(numeric_cols)} features")
        return normalized_df
    
    def get_feature_importance_metadata(self) -> Dict:
        """
        Get metadata about extracted features for importance analysis
        """
        return {
            'temperature_features': [col for col in self.feature_names if 'temp' in col.lower()],
            'boiler_features': [col for col in self.feature_names if any(x in col.lower() for x in ['steam', 'spray', 'o2', 'pressure', 'flue'])],
            'coal_mill_features': [col for col in self.feature_names if any(x in col.lower() for x in ['coal', 'mill', 'pa_flow'])],
            'derived_features': self.derived_features.get('derived_parameters', []),
            'total_features': len(self.feature_names)
        }


def engineer_all_features(runs_df: pd.DataFrame, boiler_df: pd.DataFrame,
                         coal_mill_df: pd.DataFrame, profile_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
    """
    Complete feature engineering pipeline
    """
    engineer = FeatureEngineer()
    
    # Extract features from each data source
    temp_features = engineer.extract_temperature_features(profile_df)
    boiler_features = engineer.extract_boiler_features(boiler_df)
    coal_features = engineer.extract_coal_mill_features(coal_mill_df)
    
    # Create derived parameters
    final_features = engineer.create_derived_parameters(
        runs_df, temp_features, boiler_features, coal_features
    )
    
    # Calculate aggregates
    aggregates = engineer.calculate_run_aggregates(profile_df, boiler_df, coal_mill_df)
    
    # Get feature metadata
    metadata = engineer.get_feature_importance_metadata()
    
    return final_features, metadata


if __name__ == "__main__":
    # Example usage
    logger.info("Feature Engineering Pipeline for FTM System")