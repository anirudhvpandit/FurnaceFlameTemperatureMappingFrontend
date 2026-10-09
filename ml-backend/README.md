# FTM ML Backend

AI-based failure/abnormal operation prediction backend for the Furnace Temperature Mapping (FTM) system.

## Overview

This backend provides machine learning capabilities for detecting anomalies and predicting potential failures in furnace operations using unsupervised learning (Isolation Forest).

## Features

- **Data Cleaning Pipeline**: Handles data quality issues including missing values, format inconsistencies, and data contamination
- **Feature Engineering**: Extracts meaningful features from temperature profiles, boiler parameters, and coal mill data
- **Anomaly Detection**: Uses Isolation Forest for unsupervised anomaly detection
- **Real-time Prediction**: Provides API endpoints for single and batch predictions
- **Confidence Scoring**: Returns confidence scores and contributing parameters for each prediction
- **Historical Analysis**: Analyzes historical patterns and temporal trends

## Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Usage

### Start the API Server

```bash
python main.py
```

The API will be available at `http://localhost:8000`

### API Endpoints

#### Health Check
```bash
GET /health
```

#### Model Information
```bash
GET /model/info
```

#### Train Model
```bash
POST /model/train
```

#### Load Model
```bash
POST /model/load
```

#### Single Prediction
```bash
POST /predict
Content-Type: application/json

{
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
}
```

#### Batch Prediction
```bash
POST /predict/batch
Content-Type: application/json

{
  "runs_data": [
    { ... run data 1 ... },
    { ... run data 2 ... }
  ],
  "include_contributing_params": true
}
```

#### Historical Analysis
```bash
GET /analysis/historical
```

## API Documentation

Once the server is running, visit `http://localhost:8000/docs` for interactive API documentation (Swagger UI).

## Project Structure

```
ml-backend/
├── main.py                 # FastAPI application and endpoints
├── data_cleaning.py        # Data cleaning pipeline
├── feature_engineering.py  # Feature engineering
├── anomaly_detection.py    # Isolation Forest implementation
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── models/                # Trained model storage
└── README.md              # This file
```

## Data Pipeline

1. **Data Cleaning**: Handles missing values, format issues, and data contamination
2. **Feature Engineering**: Extracts temperature, boiler, and coal mill features
3. **Model Training**: Trains Isolation Forest on historical data
4. **Prediction**: Provides real-time anomaly detection with confidence scores

## Model Training

The system uses Isolation Forest for unsupervised anomaly detection:

- **Contamination Parameter**: Expected proportion of outliers (default: 0.1 = 10%)
- **Feature Importance**: Calculated using permutation importance
- **Confidence Scoring**: Based on anomaly scores and threshold
- **Contributing Parameters**: Top features contributing to anomaly detection

## Integration with Frontend

The frontend can integrate with this backend using the existing API client structure:

```javascript
// In the frontend API client
const mlApi = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 30000,
});

// Example prediction call
async function predictAnomaly(runData) {
  const response = await mlApi.post('/predict', {
    run_data: runData,
    include_contributing_params: true
  });
  return response.data;
}
```

## Development

### Running Tests

```bash
# Add test commands when tests are implemented
python -m pytest tests/
```

### Code Style

```bash
# Format code
black .

# Lint code
flake8 .
```

## Deployment

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "main.py"]
```

Build and run:

```bash
docker build -t ftm-ml-backend .
docker run -p 8000:8000 ftm-ml-backend
```

### Production Considerations

- Use proper database connection pooling
- Implement authentication/authorization
- Add rate limiting
- Set up monitoring and logging
- Use HTTPS in production
- Implement proper error handling
- Add caching for frequently accessed data

## Troubleshooting

### Model Not Loading

If the model fails to load, check:
1. Model file exists at the specified path
2. All dependencies are installed
3. File permissions are correct

### Prediction Errors

If predictions fail:
1. Check that input data has all required features
2. Verify data types are correct
3. Check model is loaded (`/health` endpoint)

### Database Connection Issues

If database connection fails:
1. Verify database credentials in `.env`
2. Check database server is running
3. Verify network connectivity

## License

[Specify your license here]

## Support

For issues and questions, please contact the development team.