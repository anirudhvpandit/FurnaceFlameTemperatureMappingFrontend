"""
Isolation Forest Anomaly Detection for FTM System
Implements unsupervised anomaly detection for failure prediction
Provides confidence scores and contributing parameters for each prediction
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import silhouette_score, calinski_harabasz_score
from typing import Dict, List, Tuple, Optional, Any
import logging
import joblib
import os
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FTMAnomalyDetector:
    """
    Anomaly detection system for FTM using Isolation Forest
    """
    
    def __init__(self, contamination: float = 0.1, random_state: int = 42):
        """
        Initialize the anomaly detector
        
        Args:
            contamination: Expected proportion of outliers in the dataset
            random_state: Random seed for reproducibility
        """
        self.contamination = contamination
        self.random_state = random_state
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = []
        self.feature_importance = {}
        self.threshold = None
        self.is_fitted = False
        
        logger.info(f"Initialized FTMAnomalyDetector with contamination={contamination}")
    
    def prepare_data(self, feature_df: pd.DataFrame, run_id_col: str = 'run_id') -> Tuple[np.ndarray, List]:
        """
        Prepare data for anomaly detection
        
        Args:
            feature_df: DataFrame with engineered features
            run_id_col: Name of the run ID column
            
        Returns:
            Tuple of (features array, run_ids)
        """
        logger.info("Preparing data for anomaly detection...")
        
        # Remove run_id and non-numeric columns
        X = feature_df.drop(columns=[run_id_col], errors='ignore')
        X = X.select_dtypes(include=[np.number])
        
        # Store feature names
        self.feature_names = X.columns.tolist()
        
        # Handle missing values
        X = X.fillna(X.mean())
        
        # Store run IDs
        run_ids = feature_df[run_id_col].tolist() if run_id_col in feature_df.columns else list(range(len(feature_df)))
        
        logger.info(f"Prepared {len(X)} samples with {len(self.feature_names)} features")
        return X.values, run_ids
    
    def train(self, feature_df: pd.DataFrame, run_id_col: str = 'run_id',
              validation_split: float = 0.2) -> Dict[str, Any]:
        """
        Train the Isolation Forest model
        
        Args:
            feature_df: DataFrame with engineered features
            run_id_col: Name of the run ID column
            validation_split: Proportion of data to use for validation
            
        Returns:
            Training metrics and results
        """
        logger.info("Training Isolation Forest model...")
        
        # Prepare data
        X, run_ids = self.prepare_data(feature_df, run_id_col)
        
        # Split data for validation
        if validation_split > 0:
            X_train, X_val, run_ids_train, run_ids_val = train_test_split(
                X, run_ids, test_size=validation_split, random_state=self.random_state
            )
        else:
            X_train, X_val, run_ids_train, run_ids_val = X, None, run_ids, None
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        # Initialize and train Isolation Forest
        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=100,
            max_samples='auto',
            n_jobs=-1
        )
        
        self.model.fit(X_train_scaled)
        self.is_fitted = True
        
        # Calculate anomaly threshold (using offset from decision function)
        # In Isolation Forest, threshold is typically 0 for decision function
        self.threshold = 0
        
        # Evaluate on training data
        train_predictions = self.model.predict(X_train_scaled)
        train_scores = self.model.score_samples(X_train_scaled)
        
        # Calculate feature importance using permutation importance
        self._calculate_feature_importance(X_train_scaled, train_scores)
        
        # Evaluate on validation data if available
        validation_metrics = {}
        if X_val is not None:
            X_val_scaled = self.scaler.transform(X_val)
            val_predictions = self.model.predict(X_val_scaled)
            val_scores = self.model.score_samples(X_val_scaled)
            
            validation_metrics = {
                'validation_anomaly_rate': np.mean(val_predictions == -1),
                'validation_mean_score': np.mean(val_scores),
                'validation_std_score': np.std(val_scores)
            }
        
        training_metrics = {
            'training_anomaly_rate': np.mean(train_predictions == -1),
            'training_mean_score': np.mean(train_scores),
            'training_std_score': np.std(train_scores),
            'threshold': self.threshold,
            'feature_count': len(self.feature_names),
            'sample_count': len(X_train),
            'validation_metrics': validation_metrics
        }
        
        logger.info(f"Model trained. Training anomaly rate: {training_metrics['training_anomaly_rate']:.2%}")
        return training_metrics
    
    def _calculate_feature_importance(self, X: np.ndarray, scores: np.ndarray) -> None:
        """
        Calculate feature importance using permutation importance
        """
        logger.info("Calculating feature importance...")
        
        baseline_score = np.mean(scores)
        importance_scores = {}
        
        for i, feature_name in enumerate(self.feature_names):
            # Permute feature and measure impact on anomaly scores
            X_permuted = X.copy()
            X_permuted[:, i] = np.random.permutation(X_permuted[:, i])
            
            permuted_scores = self.model.score_samples(X_permuted)
            permuted_score = np.mean(permuted_scores)
            
            # Importance = absolute change in mean score
            importance = abs(permuted_score - baseline_score)
            importance_scores[feature_name] = importance
        
        # Normalize importance scores
        total_importance = sum(importance_scores.values())
        if total_importance > 0:
            self.feature_importance = {
                k: v / total_importance 
                for k, v in importance_scores.items()
            }
        
        logger.info(f"Calculated importance for {len(self.feature_importance)} features")
    
    def predict(self, feature_df: pd.DataFrame, run_id_col: str = 'run_id') -> pd.DataFrame:
        """
        Predict anomalies for new data
        
        Args:
            feature_df: DataFrame with engineered features
            run_id_col: Name of the run ID column
            
        Returns:
            DataFrame with anomaly predictions and confidence scores
        """
        if not self.is_fitted:
            raise ValueError("Model must be trained before prediction")
        
        logger.info("Predicting anomalies...")
        
        # Prepare data
        X, run_ids = self.prepare_data(feature_df, run_id_col)
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Get predictions and scores
        predictions = self.model.predict(X_scaled)
        scores = self.model.score_samples(X_scaled)
        
        # Calculate confidence scores (higher = more confident it's normal)
        confidence_scores = (scores - self.threshold) / abs(self.threshold)
        confidence_scores = np.clip(confidence_scores, 0, 1)
        
        # For anomalies, invert confidence to show anomaly confidence
        anomaly_confidence = 1 - confidence_scores
        
        # Get contributing parameters for each prediction
        contributing_params = []
        for i in range(len(X_scaled)):
            params = self._get_contributing_parameters(X_scaled[i], predictions[i])
            contributing_params.append(params)
        
        # Create results DataFrame
        results = pd.DataFrame({
            'run_id': run_ids,
            'is_anomaly': predictions == -1,
            'anomaly_score': scores,
            'confidence_score': confidence_scores,
            'anomaly_confidence': anomaly_confidence,
            'contributing_parameters': contributing_params
        })
        
        anomaly_count = np.sum(predictions == -1)
        logger.info(f"Prediction complete. Found {anomaly_count} anomalies ({anomaly_count/len(predictions):.2%})")
        
        return results
    
    def _get_contributing_parameters(self, sample: np.ndarray, prediction: int) -> List[Dict[str, float]]:
        """
        Get contributing parameters for a specific prediction
        
        Args:
            sample: Single sample features
            prediction: Anomaly prediction (-1 or 1)
            
        Returns:
            List of contributing parameters with their contributions
        """
        # Calculate contribution of each feature
        contributions = []
        
        for i, feature_name in enumerate(self.feature_names):
            feature_value = sample[i]
            importance = self.feature_importance.get(feature_name, 0)
            
            # Calculate deviation from mean (approximate using training data statistics)
            # This is a simplified approach - in production, use actual training statistics
            deviation = abs(feature_value)  # Since data is scaled
            
            contribution = {
                'parameter': feature_name,
                'value': float(feature_value),
                'importance': float(importance),
                'deviation': float(deviation)
            }
            contributions.append(contribution)
        
        # Sort by importance and return top contributors
        contributions.sort(key=lambda x: x['importance'], reverse=True)
        return contributions[:5]  # Return top 5 contributing parameters
    
    def predict_single(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Predict anomaly for a single run
        
        Args:
            features: Dictionary of feature names and values
            
        Returns:
            Prediction result with confidence and contributing parameters
        """
        if not self.is_fitted:
            raise ValueError("Model must be trained before prediction")
        
        # Prepare feature vector
        feature_vector = np.zeros(len(self.feature_names))
        for i, feature_name in enumerate(self.feature_names):
            if feature_name in features:
                feature_vector[i] = features[feature_name]
            else:
                feature_vector[i] = 0  # Default to 0 for missing features
        
        # Scale
        feature_vector_scaled = self.scaler.transform([feature_vector])
        
        # Predict
        prediction = self.model.predict(feature_vector_scaled)[0]
        score = self.model.score_samples(feature_vector_scaled)[0]
        
        # Calculate confidence
        confidence = (score - self.threshold) / abs(self.threshold)
        confidence = np.clip(confidence, 0, 1)
        anomaly_confidence = 1 - confidence
        
        # Get contributing parameters
        contributing_params = self._get_contributing_parameters(feature_vector_scaled[0], prediction)
        
        return {
            'is_anomaly': prediction == -1,
            'anomaly_score': float(score),
            'confidence_score': float(confidence),
            'anomaly_confidence': float(anomaly_confidence),
            'contributing_parameters': contributing_params,
            'timestamp': datetime.now().isoformat()
        }
    
    def get_feature_importance(self, top_n: int = 10) -> List[Dict[str, float]]:
        """
        Get top feature importance scores
        
        Args:
            top_n: Number of top features to return
            
        Returns:
            List of feature importance dictionaries
        """
        sorted_features = sorted(
            self.feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [
            {'feature': name, 'importance': score}
            for name, score in sorted_features[:top_n]
        ]
    
    def analyze_historical_patterns(self, feature_df: pd.DataFrame, 
                                   run_id_col: str = 'run_id') -> Dict[str, Any]:
        """
        Analyze historical patterns in the data
        
        Args:
            feature_df: DataFrame with engineered features
            run_id_col: Name of the run ID column
            
        Returns:
            Historical pattern analysis results
        """
        logger.info("Analyzing historical patterns...")
        
        if not self.is_fitted:
            raise ValueError("Model must be trained before analysis")
        
        # Get predictions for all data
        results = self.predict(feature_df, run_id_col)
        
        # Analyze anomaly patterns
        anomalies = results[results['is_anomaly']]
        normal = results[~results['is_anomaly']]
        
        pattern_analysis = {
            'total_runs': len(results),
            'anomaly_count': len(anomalies),
            'normal_count': len(normal),
            'anomaly_rate': len(anomalies) / len(results),
            'anomaly_score_stats': {
                'mean': results['anomaly_score'].mean(),
                'std': results['anomaly_score'].std(),
                'min': results['anomaly_score'].min(),
                'max': results['anomaly_score'].max()
            },
            'confidence_stats': {
                'mean': results['confidence_score'].mean(),
                'std': results['confidence_score'].std()
            }
        }
        
        # Temporal patterns if date information is available
        if 'date' in feature_df.columns:
            feature_df_with_results = feature_df.merge(results, on=run_id_col)
            feature_df_with_results['date'] = pd.to_datetime(feature_df_with_results['date'])
            
            temporal_patterns = self._analyze_temporal_patterns(feature_df_with_results)
            pattern_analysis['temporal_patterns'] = temporal_patterns
        
        logger.info("Historical pattern analysis complete")
        return pattern_analysis
    
    def _analyze_temporal_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyze temporal patterns in anomalies
        """
        df = df.sort_values('date')
        df['month'] = df['date'].dt.month
        df['day_of_week'] = df['date'].dt.dayofweek
        
        monthly_anomaly_rate = df.groupby('month')['is_anomaly'].mean()
        daily_anomaly_rate = df.groupby('day_of_week')['is_anomaly'].mean()
        
        return {
            'monthly_anomaly_rates': monthly_anomaly_rate.to_dict(),
            'daily_anomaly_rates': daily_anomaly_rate.to_dict(),
            'trend': 'increasing' if df['is_anomaly'].tail(10).mean() > df['is_anomaly'].head(10).mean() else 'stable'
        }
    
    def save_model(self, filepath: str) -> None:
        """
        Save the trained model to disk
        
        Args:
            filepath: Path to save the model
        """
        if not self.is_fitted:
            raise ValueError("Model must be trained before saving")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'feature_importance': self.feature_importance,
            'threshold': self.threshold,
            'contamination': self.contamination,
            'random_state': self.random_state
        }
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(model_data, filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str) -> None:
        """
        Load a trained model from disk
        
        Args:
            filepath: Path to load the model from
        """
        model_data = joblib.load(filepath)
        
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.feature_names = model_data['feature_names']
        self.feature_importance = model_data['feature_importance']
        self.threshold = model_data['threshold']
        self.contamination = model_data['contamination']
        self.random_state = model_data['random_state']
        self.is_fitted = True
        
        logger.info(f"Model loaded from {filepath}")


def train_anomaly_detector(feature_df: pd.DataFrame, contamination: float = 0.1,
                          output_path: str = 'models/anomaly_detector.pkl') -> FTMAnomalyDetector:
    """
    Train and save an anomaly detector
    
    Args:
        feature_df: DataFrame with engineered features
        contamination: Expected proportion of outliers
        output_path: Path to save the trained model
        
    Returns:
        Trained anomaly detector
    """
    detector = FTMAnomalyDetector(contamination=contamination)
    detector.train(feature_df)
    detector.save_model(output_path)
    return detector


if __name__ == "__main__":
    # Example usage
    logger.info("FTM Anomaly Detection System")