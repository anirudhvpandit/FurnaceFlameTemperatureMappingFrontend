"""
Exploratory Data Analysis for FTM System
Provides statistical analysis, correlation analysis, and pattern detection
for cross-location comparison and time-series trends
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from typing import Dict, List, Tuple, Optional, Any
import logging
from datetime import datetime
import warnings

warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FTMExploratoryAnalysis:
    """
    Exploratory data analysis for FTM system
    """
    
    def __init__(self):
        self.analysis_results = {}
        self.figures = {}
        
    def statistical_summary(self, df: pd.DataFrame, group_by: Optional[str] = None) -> Dict:
        """
        Generate comprehensive statistical summary
        
        Args:
            df: DataFrame to analyze
            group_by: Optional column to group analysis by
            
        Returns:
            Dictionary with statistical summaries
        """
        logger.info("Generating statistical summary...")
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        if group_by and group_by in df.columns:
            # Grouped statistics
            grouped_stats = {}
            for group_name, group_df in df.groupby(group_by):
                grouped_stats[group_name] = {
                    col: {
                        'mean': group_df[col].mean(),
                        'std': group_df[col].std(),
                        'min': group_df[col].min(),
                        'max': group_df[col].max(),
                        'median': group_df[col].median(),
                        'q25': group_df[col].quantile(0.25),
                        'q75': group_df[col].quantile(0.75),
                        'skewness': stats.skew(group_df[col].dropna()),
                        'kurtosis': stats.kurtosis(group_df[col].dropna())
                    }
                    for col in numeric_cols if col != group_by
                }
            
            self.analysis_results['grouped_statistics'] = grouped_stats
            return grouped_stats
        else:
            # Overall statistics
            overall_stats = {
                col: {
                    'mean': df[col].mean(),
                    'std': df[col].std(),
                    'min': df[col].min(),
                    'max': df[col].max(),
                    'median': df[col].median(),
                    'q25': df[col].quantile(0.25),
                    'q75': df[col].quantile(0.75),
                    'skewness': stats.skew(df[col].dropna()),
                    'kurtosis': stats.kurtosis(df[col].dropna()),
                    'missing_pct': (df[col].isna().sum() / len(df)) * 100
                }
                for col in numeric_cols
            }
            
            self.analysis_results['overall_statistics'] = overall_stats
            return overall_stats
    
    def correlation_analysis(self, df: pd.DataFrame, method: str = 'pearson') -> Dict:
        """
        Perform correlation analysis on numerical features
        
        Args:
            df: DataFrame to analyze
            method: Correlation method ('pearson', 'spearman', 'kendall')
            
        Returns:
            Dictionary with correlation matrices and insights
        """
        logger.info(f"Performing correlation analysis ({method})...")
        
        numeric_df = df.select_dtypes(include=[np.number])
        
        # Calculate correlation matrix
        corr_matrix = numeric_df.corr(method=method)
        
        # Find high correlations
        high_correlations = []
        for i in range(len(corr_matrix.columns)):
            for j in range(i+1, len(corr_matrix.columns)):
                corr_value = corr_matrix.iloc[i, j]
                if abs(corr_value) > 0.7:  # High correlation threshold
                    high_correlations.append({
                        'feature1': corr_matrix.columns[i],
                        'feature2': corr_matrix.columns[j],
                        'correlation': corr_value,
                        'strength': 'very strong' if abs(corr_value) > 0.9 else 'strong'
                    })
        
        # Sort by absolute correlation
        high_correlations.sort(key=lambda x: abs(x['correlation']), reverse=True)
        
        correlation_insights = {
            'correlation_matrix': corr_matrix.to_dict(),
            'high_correlations': high_correlations[:20],  # Top 20
            'method': method,
            'total_features': len(corr_matrix.columns)
        }
        
        self.analysis_results['correlation_analysis'] = correlation_insights
        return correlation_insights
    
    def cross_location_comparison(self, df: pd.DataFrame, location_col: str = 'location') -> Dict:
        """
        Compare patterns across different locations (CSTPS, KPKD, BTPS)
        
        Args:
            df: DataFrame with location information
            location_col: Name of the location column
            
        Returns:
            Dictionary with cross-location comparison results
        """
        logger.info("Performing cross-location comparison...")
        
        if location_col not in df.columns:
            logger.warning(f"Location column '{location_col}' not found in data")
            return {}
        
        locations = df[location_col].unique()
        comparison_results = {}
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for location in locations:
            location_data = df[df[location_col] == location]
            comparison_results[location] = {
                'sample_size': len(location_data),
                'statistics': {
                    col: {
                        'mean': location_data[col].mean(),
                        'std': location_data[col].std(),
                        'median': location_data[col].median()
                    }
                    for col in numeric_cols
                }
            }
        
        # Perform ANOVA test for significant differences between locations
        anova_results = {}
        for col in numeric_cols:
            try:
                groups = [df[df[location_col] == loc][col].dropna() for loc in locations]
                if len(groups) > 1 and all(len(g) > 0 for g in groups):
                    f_stat, p_value = stats.f_oneway(*groups)
                    if p_value < 0.05:  # Significant difference
                        anova_results[col] = {
                            'f_statistic': f_stat,
                            'p_value': p_value,
                            'significant': True
                        }
            except Exception as e:
                logger.debug(f"ANOVA failed for {col}: {str(e)}")
        
        comparison_results['anova_significance'] = anova_results
        
        self.analysis_results['cross_location_comparison'] = comparison_results
        return comparison_results
    
    def time_series_analysis(self, df: pd.DataFrame, date_col: str = 'date', 
                           time_col: str = 'time', value_cols: Optional[List[str]] = None) -> Dict:
        """
        Analyze time-series trends and patterns
        
        Args:
            df: DataFrame with temporal information
            date_col: Name of the date column
            time_col: Name of the time column
            value_cols: List of columns to analyze for trends
            
        Returns:
            Dictionary with time-series analysis results
        """
        logger.info("Performing time-series analysis...")
        
        # Create datetime column
        if date_col in df.columns:
            df_copy = df.copy()
            df_copy['datetime'] = pd.to_datetime(df_copy[date_col])
            
            if time_col in df.columns:
                # Combine date and time
                df_copy['time_parsed'] = pd.to_datetime(df_copy[time_col], format='mixed', errors='coerce')
                df_copy['datetime'] = df_copy.apply(
                    lambda row: pd.datetime.combine(
                        row['datetime'].date(), 
                        row['time_parsed'].time() if pd.notna(row['time_parsed']) else pd.Timestamp('00:00:00').time()
                    ) if pd.notna(row['datetime']) else row['datetime'],
                    axis=1
                )
            
            df_copy = df_copy.sort_values('datetime')
            
            # Analyze trends for specified columns
            if value_cols is None:
                value_cols = df_copy.select_dtypes(include=[np.number]).columns.tolist()
                # Exclude id columns
                value_cols = [col for col in value_cols if 'id' not in col.lower()]
            
            trend_analysis = {}
            for col in value_cols[:10]:  # Limit to top 10 columns
                if col in df_copy.columns:
                    # Remove missing values
                    series = df_copy[col].dropna()
                    if len(series) > 2:
                        # Calculate trend using linear regression
                        x = np.arange(len(series))
                        slope, intercept, r_value, p_value, std_err = stats.linregress(x, series)
                        
                        trend_analysis[col] = {
                            'slope': slope,
                            'intercept': intercept,
                            'r_squared': r_value**2,
                            'p_value': p_value,
                            'trend': 'increasing' if slope > 0 else 'decreasing',
                            'significant': p_value < 0.05
                        }
            
            # Seasonal patterns (day of week, month)
            if 'datetime' in df_copy.columns:
                df_copy['day_of_week'] = df_copy['datetime'].dt.dayofweek
                df_copy['month'] = df_copy['datetime'].dt.month
                
                seasonal_patterns = {}
                for col in value_cols[:5]:  # Limit to top 5 columns
                    if col in df_copy.columns:
                        # Day of week patterns
                        dow_pattern = df_copy.groupby('day_of_week')[col].mean().to_dict()
                        # Month patterns
                        month_pattern = df_copy.groupby('month')[col].mean().to_dict()
                        
                        seasonal_patterns[col] = {
                            'day_of_week': dow_pattern,
                            'month': month_pattern
                        }
                
                trend_analysis['seasonal_patterns'] = seasonal_patterns
            
            time_series_results = {
                'trend_analysis': trend_analysis,
                'date_range': {
                    'start': str(df_copy['datetime'].min()),
                    'end': str(df_copy['datetime'].max()),
                    'duration_days': (df_copy['datetime'].max() - df_copy['datetime'].min()).days
                }
            }
            
            self.analysis_results['time_series_analysis'] = time_series_results
            return time_series_results
        
        else:
            logger.warning(f"Date column '{date_col}' not found in data")
            return {}
    
    def outlier_detection(self, df: pd.DataFrame, method: str = 'iqr') -> Dict:
        """
        Detect outliers in the data using various methods
        
        Args:
            df: DataFrame to analyze
            method: Outlier detection method ('iqr', 'zscore', 'isolation')
            
        Returns:
            Dictionary with outlier detection results
        """
        logger.info(f"Detecting outliers using {method} method...")
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        outlier_results = {}
        
        for col in numeric_cols:
            series = df[col].dropna()
            if len(series) < 4:  # Need minimum data points
                continue
            
            outliers = []
            outlier_indices = []
            
            if method == 'iqr':
                Q1 = series.quantile(0.25)
                Q3 = series.quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                outlier_mask = (series < lower_bound) | (series > upper_bound)
                outliers = series[outlier_mask].tolist()
                outlier_indices = series[outlier_mask].index.tolist()
                
            elif method == 'zscore':
                z_scores = np.abs(stats.zscore(series))
                outlier_mask = z_scores > 3
                outliers = series[outlier_mask].tolist()
                outlier_indices = series[outlier_mask].index.tolist()
            
            outlier_results[col] = {
                'outlier_count': len(outliers),
                'outlier_percentage': (len(outliers) / len(series)) * 100,
                'outlier_values': outliers[:10],  # Limit to first 10
                'outlier_indices': outlier_indices[:10]
            }
        
        self.analysis_results['outlier_detection'] = outlier_results
        return outlier_results
    
    def failure_precursor_analysis(self, df: pd.DataFrame, target_col: str = 'anomaly_score') -> Dict:
        """
        Identify potential failure precursors by analyzing patterns before anomalies
        
        Args:
            df: DataFrame with anomaly scores or labels
            target_col: Column indicating anomalies/failures
            
        Returns:
            Dictionary with failure precursor insights
        """
        logger.info("Analyzing failure precursors...")
        
        if target_col not in df.columns:
            logger.warning(f"Target column '{target_col}' not found")
            return {}
        
        # Separate normal and anomalous data
        # Assuming lower scores indicate anomalies (Isolation Forest convention)
        threshold = df[target_col].quantile(0.1)  # Bottom 10% as potential anomalies
        anomalous = df[df[target_col] <= threshold]
        normal = df[df[target_col] > threshold]
        
        precursor_analysis = {}
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            if col == target_col:
                continue
            
            try:
                # Compare distributions
                normal_values = normal[col].dropna()
                anomalous_values = anomalous[col].dropna()
                
                if len(normal_values) > 0 and len(anomalous_values) > 0:
                    # T-test for significant differences
                    t_stat, p_value = stats.ttest_ind(normal_values, anomalous_values)
                    
                    # Effect size (Cohen's d)
                    pooled_std = np.sqrt((normal_values.std()**2 + anomalous_values.std()**2) / 2)
                    cohens_d = (normal_values.mean() - anomalous_values.mean()) / pooled_std if pooled_std > 0 else 0
                    
                    if p_value < 0.05:  # Significant difference
                        precursor_analysis[col] = {
                            'normal_mean': normal_values.mean(),
                            'anomalous_mean': anomalous_values.mean(),
                            'difference': normal_values.mean() - anomalous_values.mean(),
                            't_statistic': t_stat,
                            'p_value': p_value,
                            'cohens_d': abs(cohens_d),
                            'effect_size': 'large' if abs(cohens_d) > 0.8 else 'medium' if abs(cohens_d) > 0.5 else 'small',
                            'direction': 'higher_in_normal' if normal_values.mean() > anomalous_values.mean() else 'higher_in_anomalous'
                        }
            except Exception as e:
                logger.debug(f"Precursor analysis failed for {col}: {str(e)}")
        
        # Sort by effect size
        sorted_precursors = sorted(
            precursor_analysis.items(),
            key=lambda x: abs(x[1]['cohens_d']),
            reverse=True
        )
        
        precursor_results = {
            'precursor_indicators': dict(sorted_precursors[:10]),  # Top 10
            'anomalous_count': len(anomalous),
            'normal_count': len(normal),
            'anomaly_threshold': threshold
        }
        
        self.analysis_results['failure_precursor_analysis'] = precursor_results
        return precursor_results
    
    def data_quality_assessment(self, df: pd.DataFrame) -> Dict:
        """
        Assess data quality including missing values, duplicates, inconsistencies
        
        Args:
            df: DataFrame to assess
            
        Returns:
            Dictionary with data quality metrics
        """
        logger.info("Assessing data quality...")
        
        quality_metrics = {
            'total_rows': len(df),
            'total_columns': len(df.columns),
            'missing_values': {},
            'duplicate_rows': df.duplicated().sum(),
            'data_types': df.dtypes.astype(str).to_dict(),
            'memory_usage_mb': df.memory_usage(deep=True).sum() / (1024 * 1024)
        }
        
        # Missing value analysis
        for col in df.columns:
            missing_count = df[col].isna().sum()
            missing_pct = (missing_count / len(df)) * 100
            quality_metrics['missing_values'][col] = {
                'count': int(missing_count),
                'percentage': float(missing_pct)
            }
        
        # Identify high missingness columns
        high_missingness = {
            col: info for col, info in quality_metrics['missing_values'].items()
            if info['percentage'] > 10
        }
        quality_metrics['high_missingness_columns'] = high_missingness
        
        self.analysis_results['data_quality'] = quality_metrics
        return quality_metrics
    
    def generate_summary_report(self) -> str:
        """
        Generate a comprehensive summary report of all analyses
        """
        report = []
        report.append("=" * 80)
        report.append("FTM EXPLORATORY DATA ANALYSIS SUMMARY REPORT")
        report.append("=" * 80)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # Data Quality
        if 'data_quality' in self.analysis_results:
            report.append("DATA QUALITY ASSESSMENT")
            report.append("-" * 40)
            dq = self.analysis_results['data_quality']
            report.append(f"Total rows: {dq['total_rows']}")
            report.append(f"Total columns: {dq['total_columns']}")
            report.append(f"Duplicate rows: {dq['duplicate_rows']}")
            report.append(f"Memory usage: {dq['memory_usage_mb']:.2f} MB")
            report.append(f"High missingness columns: {len(dq['high_missingness_columns'])}")
            report.append("")
        
        # Statistical Summary
        if 'overall_statistics' in self.analysis_results:
            report.append("STATISTICAL SUMMARY")
            report.append("-" * 40)
            stats = self.analysis_results['overall_statistics']
            report.append(f"Features analyzed: {len(stats)}")
            report.append("")
        
        # Correlation Analysis
        if 'correlation_analysis' in self.analysis_results:
            report.append("CORRELATION ANALYSIS")
            report.append("-" * 40)
            corr = self.analysis_results['correlation_analysis']
            report.append(f"Method: {corr['method']}")
            report.append(f"High correlations found: {len(corr['high_correlations'])}")
            report.append("Top correlations:")
            for i, corr_item in enumerate(corr['high_correlations'][:5]):
                report.append(f"  {i+1}. {corr_item['feature1']} ↔ {corr_item['feature2']}: {corr_item['correlation']:.3f}")
            report.append("")
        
        # Cross-Location Comparison
        if 'cross_location_comparison' in self.analysis_results:
            report.append("CROSS-LOCATION COMPARISON")
            report.append("-" * 40)
            loc_comp = self.analysis_results['cross_location_comparison']
            locations = [k for k in loc_comp.keys() if k != 'anova_significance']
            report.append(f"Locations analyzed: {', '.join(locations)}")
            report.append(f"Significant differences found: {len(loc_comp.get('anova_significance', {}))}")
            report.append("")
        
        # Time-Series Analysis
        if 'time_series_analysis' in self.analysis_results:
            report.append("TIME-SERIES ANALYSIS")
            report.append("-" * 40)
            ts = self.analysis_results['time_series_analysis']
            if 'date_range' in ts:
                dr = ts['date_range']
                report.append(f"Date range: {dr['start']} to {dr['end']}")
                report.append(f"Duration: {dr['duration_days']} days")
            if 'trend_analysis' in ts:
                trends = [k for k, v in ts['trend_analysis'].items() if isinstance(v, dict) and 'trend' in v]
                report.append(f"Significant trends found: {len(trends)}")
            report.append("")
        
        # Failure Precursor Analysis
        if 'failure_precursor_analysis' in self.analysis_results:
            report.append("FAILURE PRECURSOR ANALYSIS")
            report.append("-" * 40)
            fp = self.analysis_results['failure_precursor_analysis']
            report.append(f"Anomalous runs: {fp['anomalous_count']}")
            report.append(f"Normal runs: {fp['normal_count']}")
            report.append(f"Precursor indicators found: {len(fp['precursor_indicators'])}")
            report.append("Top precursors:")
            for i, (precursor, data) in enumerate(list(fp['precursor_indicators'].items())[:3]):
                report.append(f"  {i+1}. {precursor}: {data['effect_size']} effect size (p={data['p_value']:.4f})")
            report.append("")
        
        report.append("=" * 80)
        report.append("END OF REPORT")
        report.append("=" * 80)
        
        return "\n".join(report)
    
    def save_analysis_results(self, filepath: str = 'eda_results.json'):
        """
        Save analysis results to JSON file
        """
        import json
        
        # Convert numpy types to Python types for JSON serialization
        def convert_types(obj):
            if isinstance(obj, dict):
                return {k: convert_types(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_types(item) for item in obj]
            elif isinstance(obj, (np.integer, np.int64)):
                return int(obj)
            elif isinstance(obj, (np.floating, np.float64)):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif pd.isna(obj):
                return None
            else:
                return obj
        
        converted_results = convert_types(self.analysis_results)
        
        with open(filepath, 'w') as f:
            json.dump(converted_results, f, indent=2)
        
        logger.info(f"Analysis results saved to {filepath}")


def perform_comprehensive_eda(df: pd.DataFrame, location_col: str = 'location',
                              date_col: str = 'date', time_col: str = 'time') -> FTMExploratoryAnalysis:
    """
    Perform comprehensive exploratory data analysis
    
    Args:
        df: DataFrame to analyze
        location_col: Name of location column
        date_col: Name of date column
        time_col: Name of time column
        
    Returns:
        FTMExploratoryAnalysis object with all results
    """
    analyzer = FTMExploratoryAnalysis()
    
    # Data quality assessment
    analyzer.data_quality_assessment(df)
    
    # Statistical summary
    analyzer.statistical_summary(df)
    
    # Correlation analysis
    analyzer.correlation_analysis(df)
    
    # Cross-location comparison
    if location_col in df.columns:
        analyzer.cross_location_comparison(df, location_col)
    
    # Time-series analysis
    if date_col in df.columns:
        analyzer.time_series_analysis(df, date_col, time_col)
    
    # Outlier detection
    analyzer.outlier_detection(df)
    
    # Generate summary report
    report = analyzer.generate_summary_report()
    logger.info("\n" + report)
    
    return analyzer


if __name__ == "__main__":
    # Example usage
    logger.info("FTM Exploratory Data Analysis Module")