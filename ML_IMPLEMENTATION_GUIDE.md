# ML Implementation Guide for FTM Anomaly Detection

## Project Overview

This document describes the implementation of AI-based failure/abnormal operation prediction for the Furnace Temperature Mapping (FTM) system. The implementation uses unsupervised machine learning (Isolation Forest) to detect anomalies in furnace operations without requiring labeled failure data.

## Architecture

### Components

1. **ML Backend** (`ml-backend/`)
   - Python-based FastAPI service for ML processing
   - Data cleaning pipeline
   - Feature engineering
   - Isolation Forest anomaly detection
   - REST API endpoints for predictions

2. **Frontend Integration** (`FurnaceFlameTemperatureMappingFrontend/src/`)
   - ML API client service
   - Enhanced AI integration utilities
   - Updated AI Analysis Panel with ML backend status
   - Fallback to rule-based analysis when ML backend unavailable

### Data Flow

```
Furnace Data → Frontend → ML API → Data Cleaning → Feature Engineering → Isolation Forest → Prediction → Frontend Display
```

## Implementation Status

### ✅ Completed Components

#### Phase 1: Data Cleaning & Feature Engineering
- **Data Cleaning Pipeline** (`ml-backend/data_cleaning.py`)
  - Handles missing values (load 12%, coal_flow 14%, time 48%, total_air_flow_tph 51%, oil_guns_in_service 60%)
  - Fixes data contamination (oil_guns_in_service containing burner tilt data)
  - Standardizes datetime formats
  - Removes test/dummy data
  - Fixes referential integrity issues

- **Feature Engineering** (`ml-backend/feature_engineering.py`)
  - Temperature feature extraction (mean, std, min, max, range, skewness, kurtosis)
  - Corner temperature analysis (uniformity metrics)
  - Boiler parameter features (steam, spray, O2, pressure, flue gas)
  - Coal mill aggregation (handles 2-10 mills per run)
  - Derived parameters (air-fuel ratio, thermal stress, combustion efficiency)
  - Per-run aggregation of multi-record data

#### Phase 3: ML Model Development
- **Anomaly Detection** (`ml-backend/anomaly_detection.py`)
  - Isolation Forest implementation
  - Confidence scoring
  - Feature importance analysis (permutation importance)
  - Contributing parameter identification
  - Historical pattern analysis
  - Model persistence (save/load)

#### Phase 4: Backend API Development
- **FastAPI Backend** (`ml-backend/main.py`)
  - Health check endpoint
  - Model information endpoint
  - Model training endpoint
  - Model loading endpoint
  - Single prediction endpoint
  - Batch prediction endpoint
  - Historical analysis endpoint
  - CORS support for frontend integration

#### Phase 4: Frontend Integration
- **ML API Client** (`src/furnace3d/services/mlApi.js`)
  - Axios-based API client
  - Error handling and logging
  - Furnace model to ML format conversion
  - ML prediction to frontend format conversion
  - Health check and model info methods

- **Enhanced AI Integration** (`src/furnace3d/utils/aiIntegration.js`)
  - ML backend integration with fallback to rule-based
  - Health check functionality
  - Model information retrieval
  - Toggle for ML backend usage

- **Updated AI Analysis Panel** (`src/furnace3d/panels/AIAnalysisPanel.jsx`)
  - ML backend status indicator
  - ML backend settings panel
  - Toggle for ML backend usage
  - Enhanced UI with status colors

### 🔄 Pending Components

#### Phase 2: Exploratory Data Analysis
- Statistical analysis and correlation analysis
- Cross-location comparison (CSTPS, KPKD, BTPS)
- Time-series trend analysis
- Identification of failure precursors

#### Phase 3: Model Training & Evaluation
- Training on actual FTM data (615 runs)
- Hyperparameter tuning
- Validation against domain knowledge
- Performance metrics calculation

#### Phase 4: Testing & Performance Optimization
- Integration testing
- Performance optimization
- Error handling refinement
- Production deployment

## Setup Instructions

### ML Backend Setup

1. **Navigate to ML backend directory:**
```bash
cd ml-backend
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Start the ML backend:**
```bash
python main.py
```

The ML backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Configure ML backend URL:**
```bash
cd FurnaceFlameTemperatureMappingFrontend
cp .env.example .env
# Set VITE_ML_API_URL=http://localhost:8000
```

2. **Start the frontend:**
```bash
npm install
npm run dev
```

3. **Access the application:**
- Frontend: `http://localhost:5173`
- ML API docs: `http://localhost:8000/docs`

## API Usage

### Train Model

```bash
curl -X POST "http://localhost:8000/model/train?contamination=0.1"
```

### Single Prediction

```bash
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "run_data": {
      "temperature_profile": {
        "temperatures": [1180, 1240, 1310, 1265]
      },
      "boiler_params": {
        "steam_pressure": 100,
        "steam_flow": 50,
        "o2_level": 4.0
      },
      "coal_mill_params": {
        "coal_flows": [12, 11, 13, 10],
        "pa_flows": [20, 19, 21, 18]
      }
    },
    "include_contributing_params": true
  }'
```

### Health Check

```bash
curl "http://localhost:8000/health"
```

## Integration with Existing Data

### Database Connection

To connect the ML backend to the existing MySQL database:

1. **Install MySQL connector:**
```bash
pip install pymysql sqlalchemy
```

2. **Configure database credentials in `.env`:**
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ftm_database
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

3. **Implement data loading functions:**
Add database connection logic to load data from the 5 tables:
- `runs`
- `boiler_mill_params`
- `coal_mill_params`
- `profile_points`
- `stats`

### Example Data Loading

```python
from sqlalchemy import create_engine
import pandas as pd

def load_data_from_database():
    engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    
    runs_df = pd.read_sql("SELECT * FROM runs", engine)
    boiler_df = pd.read_sql("SELECT * FROM boiler_mill_params", engine)
    coal_mill_df = pd.read_sql("SELECT * FROM coal_mill_params", engine)
    profile_df = pd.read_sql("SELECT * FROM profile_points", engine)
    stats_df = pd.read_sql("SELECT * FROM stats", engine)
    
    return runs_df, boiler_df, coal_mill_df, profile_df, stats_df
```

## Feature Documentation

### Temperature Features
- `avg_temperature_mean`: Average temperature across all layers
- `temp_std`: Standard deviation of temperatures
- `temp_range`: Temperature range (max - min)
- `corner_temp_std`: Standard deviation of corner temperatures
- `corner_temp_range`: Range of corner temperatures
- `temp_gradient_mean`: Temperature gradient per elevation
- `burner_tilt_mean`: Average burner tilt angle

### Boiler Features
- `steam_pressure_mean`: Average steam pressure
- `steam_flow_mean`: Average steam flow rate
- `o2_level_mean`: Average oxygen level
- `total_spray_flow`: Total spray flow

### Coal Mill Features
- `total_coal_flow`: Sum of coal flows across all mills
- `total_pa_flow`: Sum of primary air flows
- `avg_coal_flow_per_mill`: Average coal flow per mill
- `coal_flow_balance`: Balance metric across mills

### Derived Parameters
- `air_fuel_ratio`: Air-to-fuel ratio
- `thermal_stress_index`: Combined temperature and uniformity stress
- `combustion_efficiency_score`: Efficiency metric based on O2 and AFR
- `gradient_stress`: Temperature gradient stress

## Model Training Process

### 1. Data Preparation
```python
from data_cleaning import clean_all_data
from feature_engineering import engineer_all_features

# Load and clean data
runs_df, boiler_df, coal_mill_df, profile_df, stats_df = load_data_from_database()
cleaned_data, cleaning_report = clean_all_data(runs_df, boiler_df, coal_mill_df, profile_df, stats_df)

# Engineer features
feature_df, metadata = engineer_all_features(*cleaned_data)
```

### 2. Model Training
```python
from anomaly_detection import FTMAnomalyDetector

detector = FTMAnomalyDetector(contamination=0.1)
training_metrics = detector.train(feature_df)
detector.save_model('models/anomaly_detector.pkl')
```

### 3. Model Evaluation
```python
# Get feature importance
importance = detector.get_feature_importance(top_n=10)

# Analyze historical patterns
patterns = detector.analyze_historical_patterns(feature_df)
```

## Troubleshooting

### ML Backend Not Starting
- Check Python version (3.9+ recommended)
- Verify all dependencies are installed
- Check port 8000 is not in use
- Review `.env` configuration

### Frontend Cannot Connect to ML Backend
- Verify ML backend is running
- Check `VITE_ML_API_URL` in frontend `.env`
- Check CORS configuration in ML backend
- Review browser console for CORS errors

### Model Training Fails
- Verify data loading is working
- Check data quality and missing values
- Review feature engineering output
- Check sufficient data (50+ samples recommended)

### Predictions Return Errors
- Verify model is loaded (`/model/info` endpoint)
- Check input data format matches expected structure
- Review feature extraction logic
- Check ML backend logs

## Performance Considerations

### Optimization Opportunities
1. **Batch Processing**: Use batch prediction endpoint for multiple runs
2. **Caching**: Implement prediction caching for repeated queries
3. **Async Processing**: Use background tasks for long-running operations
4. **Model Optimization**: Reduce n_estimators for faster inference
5. **Feature Selection**: Use only top-k important features

### Scalability
- Deploy ML backend as separate microservice
- Use load balancing for multiple ML backend instances
- Implement database connection pooling
- Use Redis for caching and session management

## Security Considerations

1. **Authentication**: Add API authentication (JWT tokens)
2. **Rate Limiting**: Implement rate limiting on API endpoints
3. **Input Validation**: Validate all input data
4. **Database Security**: Use environment variables for credentials
5. **HTTPS**: Use HTTPS in production

## Next Steps

### Immediate Tasks
1. **Database Integration**: Connect ML backend to MySQL database
2. **Data Loading**: Implement data loading from 5 tables
3. **Model Training**: Train on actual 615 runs
4. **Validation**: Validate results with domain experts

### Short-term Tasks
1. **EDA Implementation**: Complete exploratory data analysis
2. **Hyperparameter Tuning**: Optimize Isolation Forest parameters
3. **Performance Testing**: Test with production data volumes
4. **Error Handling**: Improve error handling and logging

### Long-term Tasks
1. **Advanced Models**: Experiment with other anomaly detection algorithms
2. **Real-time Monitoring**: Implement real-time prediction pipeline
3. **Alerting System**: Add automated alerting for detected anomalies
4. **Dashboard**: Create dedicated ML monitoring dashboard

## Success Criteria Evaluation

Current implementation addresses the following success criteria:

- ✅ **Identify abnormal operation patterns**: Isolation Forest with confidence scoring
- ✅ **Provide failure predictions with confidence scores**: Anomaly confidence in API response
- ✅ **Show contributing parameters**: Top 5 contributing parameters in predictions
- 🔄 **Real-time analysis capability**: API endpoints support real-time predictions
- ✅ **Integration with existing FTM frontend**: Enhanced AI panel with ML integration

## Support and Maintenance

### Monitoring
- Monitor ML backend health (`/health` endpoint)
- Track prediction latency and error rates
- Monitor model performance over time
- Log prediction results for analysis

### Maintenance
- Regular model retraining with new data
- Update feature engineering based on new insights
- Monitor data quality and drift
- Update dependencies regularly

### Documentation
- Keep API documentation updated
- Document model changes and versions
- Maintain data dictionary for features
- Update this guide with new learnings

## Contact

For questions or issues related to this implementation, please contact the development team.