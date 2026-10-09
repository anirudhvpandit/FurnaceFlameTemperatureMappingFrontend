"""
FastAPI Backend for FTM Anomaly Detection
Provides API endpoints for AI-based failure/abnormal operation prediction
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np
import logging
from datetime import datetime
import os

from data_cleaning import DataCleaningPipeline, clean_all_data
from feature_engineering import FeatureEngineer, engineer_all_features
from anomaly_detection import FTMAnomalyDetector
from database_loader import FTMDatabaseLoader, create_sample_data_for_testing
from exploratory_analysis import FTMExploratoryAnalysis, perform_comprehensive_eda

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="FTM Anomaly Detection API",
    description="AI-based failure/abnormal operation prediction for Furnace Temperature Mapping System",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and components
anomaly_detector: Optional[FTMAnomalyDetector] = None
feature_engineer: Optional[FeatureEngineer] = None
data_cleaner: Optional[DataCleaningPipeline] = None
model_loaded = False


# ============================================================================
# Pydantic Models for API
# ============================================================================

class FeatureValues(BaseModel):
    """Feature values for single prediction"""
    features: Dict[str, float] = Field(..., description="Dictionary of feature names and values")


class PredictionRequest(BaseModel):
    """Request for anomaly prediction"""
    run_data: Dict[str, Any] = Field(..., description="Run data for prediction")
    include_contributing_params: bool = Field(True, description="Include contributing parameters in response")


class BatchPredictionRequest(BaseModel):
    """Request for batch anomaly prediction"""
    runs_data: List[Dict[str, Any]] = Field(..., description="List of run data for batch prediction")
    include_contributing_params: bool = Field(True, description="Include contributing parameters in response")


class PredictionResponse(BaseModel):
    """Response for anomaly prediction"""
    is_anomaly: bool = Field(..., description="Whether the run is predicted as anomalous")
    anomaly_score: float = Field(..., description="Raw anomaly score from Isolation Forest")
    confidence_score: float = Field(..., description="Confidence score (0-1, higher = more confident normal)")
    anomaly_confidence: float = Field(..., description="Confidence that this is an anomaly (0-1)")
    contributing_parameters: List[Dict[str, Any]] = Field(default_factory=list, description="Top contributing parameters")
    timestamp: str = Field(..., description="Prediction timestamp")


class ModelInfoResponse(BaseModel):
    """Response with model information"""
    model_loaded: bool = Field(..., description="Whether the model is loaded")
    feature_count: int = Field(..., description="Number of features used by the model")
    contamination: float = Field(..., description="Contamination parameter used for training")
    feature_importance: List[Dict[str, float]] = Field(default_factory=list, description="Top feature importance")


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status")
    model_loaded: bool = Field(..., description="Whether the ML model is loaded")
    timestamp: str = Field(..., description="Current timestamp")


class TrainingResponse(BaseModel):
    """Response from model training"""
    success: bool = Field(..., description="Whether training was successful")
    message: str = Field(..., description="Training status message")
    training_metrics: Optional[Dict[str, Any]] = Field(None, description="Training metrics")
    model_path: Optional[str] = Field(None, description="Path where model was saved")


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=model_loaded,
        timestamp=datetime.now().isoformat()
    )


@app.get("/model/info")
async def get_model_info():
    """Get information about the loaded model"""
    if not model_loaded or anomaly_detector is None:
        return {
            "model_loaded": False,
            "feature_count": 0,
            "contamination": 0.0,
            "feature_importance": []
        }
    
    try:
        importance = anomaly_detector.get_feature_importance(top_n=10)
        return {
            "model_loaded": True,
            "feature_count": len(anomaly_detector.feature_names),
            "contamination": anomaly_detector.contamination,
            "feature_importance": importance
        }
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        return {
            "model_loaded": True,
            "feature_count": len(anomaly_detector.feature_names),
            "contamination": anomaly_detector.contamination,
            "feature_importance": [],
            "error": str(e)
        }


@app.post("/predict", response_model=PredictionResponse)
async def predict_anomaly(request: PredictionRequest):
    """
    Predict anomaly for a single run
    
    This endpoint takes run data and returns anomaly prediction with confidence scores
    and contributing parameters.
    """
    if not model_loaded or anomaly_detector is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Please train the model first.")
    
    try:
        # Extract features from run data (simplified - in production, use full feature engineering)
        features = extract_features_from_run_data(request.run_data)
        
        # Make prediction
        prediction = anomaly_detector.predict_single(features)
        
        return PredictionResponse(**prediction)
    
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predict/batch")
async def predict_anomalies_batch(request: BatchPredictionRequest):
    """
    Predict anomalies for multiple runs (batch processing)
    
    This endpoint takes multiple run data points and returns anomaly predictions
    for all of them.
    """
    if not model_loaded or anomaly_detector is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Please train the model first.")
    
    try:
        # Extract features for all runs
        all_features = []
        for run_data in request.runs_data:
            features = extract_features_from_run_data(run_data)
            all_features.append(features)
        
        # Create DataFrame for batch prediction
        feature_df = pd.DataFrame(all_features)
        feature_df['run_id'] = range(len(all_features))
        
        # Make batch prediction
        results = anomaly_detector.predict(feature_df)
        
        # Convert to response format
        predictions = []
        for _, row in results.iterrows():
            prediction = {
                'run_id': row['run_id'],
                'is_anomaly': bool(row['is_anomaly']),
                'anomaly_score': float(row['anomaly_score']),
                'confidence_score': float(row['confidence_score']),
                'anomaly_confidence': float(row['anomaly_confidence']),
                'contributing_parameters': row['contributing_parameters'] if request.include_contributing_params else [],
                'timestamp': datetime.now().isoformat()
            }
            predictions.append(prediction)
        
        return {
            'predictions': predictions,
            'total_runs': len(predictions),
            'anomaly_count': sum(p['is_anomaly'] for p in predictions),
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


@app.post("/model/train", response_model=TrainingResponse)
async def train_model(background_tasks: BackgroundTasks, contamination: float = 0.1, use_sample_data: bool = False):
    """
    Train the anomaly detection model
    
    This endpoint triggers model training using available data.
    Training runs in the background.
    
    Args:
        contamination: Expected proportion of outliers (default: 0.1)
        use_sample_data: Use sample data instead of database (default: False)
    """
    global anomaly_detector, feature_engineer, data_cleaner, model_loaded
    
    try:
        logger.info("Starting model training...")
        
        # Initialize components
        data_cleaner = DataCleaningPipeline()
        feature_engineer = FeatureEngineer()
        
        # Create anomaly detector
        anomaly_detector = FTMAnomalyDetector(contamination=contamination)
        
        # Load data from database or use sample data
        if use_sample_data:
            logger.info("Using sample data for training...")
            runs_df, boiler_df, coal_mill_df, profile_df, stats_df = create_sample_data_for_testing()
        else:
            logger.info("Loading data from database...")
            db_loader = FTMDatabaseLoader()
            
            if db_loader.test_connection():
                runs_df, boiler_df, coal_mill_df, profile_df, stats_df = db_loader.load_all_tables()
                db_loader.close_connection()
            else:
                logger.warning("Database connection failed, falling back to sample data")
                runs_df, boiler_df, coal_mill_df, profile_df, stats_df = create_sample_data_for_testing()
        
        # Apply data cleaning
        logger.info("Applying data cleaning pipeline...")
        (cleaned_runs, cleaned_boiler, cleaned_coal_mill, cleaned_profile, cleaned_stats), cleaning_report = clean_all_data(
            runs_df, boiler_df, coal_mill_df, profile_df, stats_df
        )
        
        logger.info(f"Data cleaning report: {cleaning_report}")
        
        # Apply feature engineering
        logger.info("Applying feature engineering...")
        feature_df, feature_metadata = engineer_all_features(
            cleaned_runs, cleaned_boiler, cleaned_coal_mill, cleaned_profile
        )
        
        logger.info(f"Feature engineering complete: {len(feature_df)} samples, {len(feature_df.columns) - 1} features")
        logger.info(f"Feature metadata: {feature_metadata}")
        
        # Train the model
        logger.info("Training Isolation Forest model...")
        training_metrics = anomaly_detector.train(feature_df)
        
        # Save the model
        model_path = "models/anomaly_detector.pkl"
        os.makedirs("models", exist_ok=True)
        anomaly_detector.save_model(model_path)
        
        model_loaded = True
        
        logger.info(f"Model training completed. Saved to {model_path}")
        
        return TrainingResponse(
            success=True,
            message="Model trained successfully",
            training_metrics=training_metrics,
            model_path=model_path
        )
    
    except Exception as e:
        logger.error(f"Model training error: {str(e)}")
        import traceback
        traceback.print_exc()
        return TrainingResponse(
            success=False,
            message=f"Model training failed: {str(e)}",
            training_metrics=None,
            model_path=None
        )


@app.post("/model/load")
async def load_model(model_path: str = "models/anomaly_detector.pkl"):
    """
    Load a pre-trained model from disk
    """
    global anomaly_detector, model_loaded
    
    try:
        if not os.path.exists(model_path):
            raise HTTPException(status_code=404, detail=f"Model file not found: {model_path}")
        
        anomaly_detector = FTMAnomalyDetector()
        anomaly_detector.load_model(model_path)
        model_loaded = True
        
        logger.info(f"Model loaded from {model_path}")
        
        return {
            'success': True,
            'message': f"Model loaded successfully from {model_path}",
            'feature_count': len(anomaly_detector.feature_names)
        }
    
    except Exception as e:
        logger.error(f"Model loading error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Model loading failed: {str(e)}")


@app.get("/analysis/historical")
async def analyze_historical_patterns():
    """
    Analyze historical patterns in the data
    
    This endpoint provides insights into historical anomaly patterns,
    temporal trends, and statistical summaries.
    """
    if not model_loaded or anomaly_detector is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Please train the model first.")
    
    try:
        # In production, load actual historical data
        # For demonstration, use synthetic data
        synthetic_features = create_sample_data_for_testing()[0]  # Get runs_df
        
        # Analyze patterns
        pattern_analysis = anomaly_detector.analyze_historical_patterns(synthetic_features)
        
        return {
            'analysis': pattern_analysis,
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Historical analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Historical analysis failed: {str(e)}")


@app.get("/analysis/eda")
async def perform_eda_analysis(use_sample_data: bool = True):
    """
    Perform comprehensive exploratory data analysis
    
    This endpoint provides statistical analysis, correlation analysis,
    cross-location comparison, and time-series trends.
    """
    try:
        logger.info("Starting EDA analysis...")
        
        # Load data
        if use_sample_data:
            logger.info("Using sample data for EDA...")
            runs_df, boiler_df, coal_mill_df, profile_df, stats_df = create_sample_data_for_testing()
        else:
            logger.info("Loading data from database for EDA...")
            db_loader = FTMDatabaseLoader()
            if db_loader.test_connection():
                runs_df, boiler_df, coal_mill_df, profile_df, stats_df = db_loader.load_all_tables()
                db_loader.close_connection()
            else:
                logger.warning("Database connection failed, using sample data")
                runs_df, boiler_df, coal_mill_df, profile_df, stats_df = create_sample_data_for_testing()
        
        # Apply data cleaning
        (cleaned_runs, cleaned_boiler, cleaned_coal_mill, cleaned_profile, cleaned_stats), _ = clean_all_data(
            runs_df, boiler_df, coal_mill_df, profile_df, stats_df
        )
        
        # Apply feature engineering
        feature_df, _ = engineer_all_features(
            cleaned_runs, cleaned_boiler, cleaned_coal_mill, cleaned_profile
        )
        
        # Perform comprehensive EDA
        eda_analyzer = perform_comprehensive_eda(
            feature_df, 
            location_col='location' if 'location' in feature_df.columns else None,
            date_col='date' if 'date' in feature_df.columns else None
        )
        
        # Generate summary report
        summary_report = eda_analyzer.generate_summary_report()
        
        # Save results
        eda_analyzer.save_analysis_results('eda_results.json')
        
        return {
            'success': True,
            'message': 'EDA analysis completed successfully',
            'analysis_results': eda_analyzer.analysis_results,
            'summary_report': summary_report,
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"EDA analysis error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'EDA analysis failed: {str(e)}',
            'analysis_results': None,
            'summary_report': None,
            'timestamp': datetime.now().isoformat()
        }


# ============================================================================
# Helper Functions
# ============================================================================

def extract_features_from_run_data(run_data: Dict[str, Any]) -> Dict[str, float]:
    """
    Extract features from raw run data
    
    This is a simplified version - in production, use the full feature engineering pipeline
    """
    features = {}
    
    # Extract temperature features
    if 'temperature_profile' in run_data:
        temp_profile = run_data['temperature_profile']
        features['avg_temperature'] = np.mean(temp_profile.get('temperatures', [1200]))
        features['temp_std'] = np.std(temp_profile.get('temperatures', [1200]))
        features['temp_range'] = np.max(temp_profile.get('temperatures', [1200])) - np.min(temp_profile.get('temperatures', [1200]))
    
    # Extract boiler parameters
    if 'boiler_params' in run_data:
        boiler = run_data['boiler_params']
        features['steam_pressure'] = boiler.get('steam_pressure', 100)
        features['steam_flow'] = boiler.get('steam_flow', 50)
        features['o2_level'] = boiler.get('o2_level', 4.0)
    
    # Extract coal mill parameters
    if 'coal_mill_params' in run_data:
        coal = run_data['coal_mill_params']
        features['total_coal_flow'] = sum(coal.get('coal_flows', [10]))
        features['total_pa_flow'] = sum(coal.get('pa_flows', [20]))
    
    # Extract derived parameters
    if 'total_coal_flow' in features and 'total_pa_flow' in features:
        features['air_fuel_ratio'] = features['total_pa_flow'] / max(features['total_coal_flow'], 1)
    
    # Fill missing features with defaults
    default_features = {
        'avg_temperature': 1200.0,
        'temp_std': 50.0,
        'temp_range': 100.0,
        'steam_pressure': 100.0,
        'steam_flow': 50.0,
        'o2_level': 4.0,
        'total_coal_flow': 40.0,
        'total_pa_flow': 80.0,
        'air_fuel_ratio': 2.0,
        'corner_temp_std': 30.0,
        'corner_temp_range': 60.0,
        'burner_tilt_mean': 0.0,
        'thermal_stress_index': 0.5,
        'combustion_efficiency_score': 0.85
    }
    
    for feature, default_value in default_features.items():
        if feature not in features or pd.isna(features[feature]):
            features[feature] = default_value
    
    return features





# ============================================================================
# Startup and Shutdown Events
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize service on startup"""
    logger.info("FTM Anomaly Detection API starting up...")
    
    # Try to load existing model if available
    model_path = "models/anomaly_detector.pkl"
    if os.path.exists(model_path):
        try:
            global anomaly_detector, model_loaded
            anomaly_detector = FTMAnomalyDetector()
            anomaly_detector.load_model(model_path)
            model_loaded = True
            logger.info(f"Loaded existing model from {model_path}")
        except Exception as e:
            logger.warning(f"Could not load existing model: {str(e)}")
            model_loaded = False
    else:
        logger.info("No existing model found. Train the model using /model/train endpoint")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("FTM Anomaly Detection API shutting down...")


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting FTM Anomaly Detection API server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")