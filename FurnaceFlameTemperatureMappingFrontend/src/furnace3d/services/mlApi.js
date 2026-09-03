// src/furnace3d/services/mlApi.js
/**
 * ML Backend API Client
 * Handles communication with the ML anomaly detection backend
 */

import axios from 'axios';

// ML Backend URL - configure based on deployment
const ML_BASE_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

const mlApi = axios.create({
  baseURL: ML_BASE_URL,
  timeout: 30000, // 30 second timeout for ML operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
mlApi.interceptors.request.use(
  (config) => {
    console.log(`ML API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('ML API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
mlApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('ML API Response Error:', error);
    
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          console.error('ML API: Unauthorized access');
          break;
        case 404:
          console.error('ML API: Resource not found');
          break;
        case 503:
          console.error('ML API: Service unavailable - model not loaded');
          break;
        default:
          console.error(`ML API: Server error ${status}`);
      }
      
      return Promise.reject({
        status,
        message: data?.message || data?.detail || 'ML API error',
        isMLError: true,
      });
    } else if (error.request) {
      // Request made but no response received
      console.error('ML API: No response received - server may be down');
      return Promise.reject({
        status: 0,
        message: 'ML backend server is not responding',
        isMLError: true,
      });
    } else {
      // Error in request configuration
      console.error('ML API: Request configuration error', error.message);
      return Promise.reject({
        status: -1,
        message: error.message,
        isMLError: true,
      });
    }
  }
);

/**
 * ML API Service
 */
export const mlApiService = {
  /**
   * Check ML backend health
   */
  async checkHealth() {
    try {
      const response = await mlApi.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  /**
   * Get model information
   */
  async getModelInfo() {
    try {
      const response = await mlApi.get('/model/info');
      return response.data;
    } catch (error) {
      console.error('Get model info failed:', error);
      throw error;
    }
  },

  /**
   * Train the anomaly detection model
   */
  async trainModel(contamination = 0.1) {
    try {
      const response = await mlApi.post('/model/train', null, {
        params: { contamination }
      });
      return response.data;
    } catch (error) {
      console.error('Model training failed:', error);
      throw error;
    }
  },

  /**
   * Load a pre-trained model
   */
  async loadModel(modelPath = 'models/anomaly_detector.pkl') {
    try {
      const response = await mlApi.post('/model/load', null, {
        params: { model_path: modelPath }
      });
      return response.data;
    } catch (error) {
      console.error('Model loading failed:', error);
      throw error;
    }
  },

  /**
   * Predict anomaly for a single run
   */
  async predictAnomaly(runData, options = {}) {
    try {
      const payload = {
        run_data: runData,
        include_contributing_params: options.includeContributingParams !== false,
      };
      
      const response = await mlApi.post('/predict', payload);
      return response.data;
    } catch (error) {
      console.error('Anomaly prediction failed:', error);
      throw error;
    }
  },

  /**
   * Predict anomalies for multiple runs (batch)
   */
  async predictAnomaliesBatch(runsData, options = {}) {
    try {
      const payload = {
        runs_data: runsData,
        include_contributing_params: options.includeContributingParams !== false,
      };
      
      const response = await mlApi.post('/predict/batch', payload);
      return response.data;
    } catch (error) {
      console.error('Batch anomaly prediction failed:', error);
      throw error;
    }
  },

  /**
   * Analyze historical patterns
   */
  async analyzeHistoricalPatterns() {
    try {
      const response = await mlApi.get('/analysis/historical');
      return response.data;
    } catch (error) {
      console.error('Historical analysis failed:', error);
      throw error;
    }
  },

  /**
   * Convert furnace model to ML API format
   */
  convertFurnaceModelToMLFormat(model) {
    if (!model || !model.layers) {
      throw new Error('Invalid furnace model');
    }

    // Extract temperature profile
    const temperatures = model.layers.map(layer => layer.temperature?.avg || 1200);
    const tempProfile = {
      temperatures,
      mean: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
      std: Math.sqrt(temperatures.reduce((sum, temp) => sum + Math.pow(temp - (temperatures.reduce((a, b) => a + b, 0) / temperatures.length), 2), 0) / temperatures.length),
      range: Math.max(...temperatures) - Math.min(...temperatures),
    };

    // Extract corner temperatures for uniformity analysis
    const cornerTemps = [];
    model.layers.forEach(layer => {
      layer.burners.forEach(burner => {
        if (burner.temperature) {
          cornerTemps.push(burner.temperature);
        }
      });
    });

    // Extract burner tilts
    const burnerTilts = model.layers.map(layer => layer.tiltDeg || 0);

    // Extract coal mill data
    const coalFlows = [];
    const paFlows = [];
    model.layers.forEach(layer => {
      layer.burners.forEach(burner => {
        if (burner.mill) {
          if (burner.mill.coalFlowTph) coalFlows.push(burner.mill.coalFlowTph);
          if (burner.mill.paFlowTph) paFlows.push(burner.mill.paFlowTph);
        }
      });
    });

    // Construct ML API format
    return {
      temperature_profile: tempProfile,
      corner_temperatures: cornerTemps,
      boiler_params: {
        steam_pressure: 100, // Default - would come from actual data
        steam_flow: 50,      // Default - would come from actual data
        o2_level: 4.0,       // Default - would come from actual data
      },
      coal_mill_params: {
        coal_flows: coalFlows.length > 0 ? coalFlows : [10, 11, 12, 10],
        pa_flows: paFlows.length > 0 ? paFlows : [20, 19, 21, 18],
      },
      burner_tilts: burnerTilts,
      corner_temp_std: Math.sqrt(cornerTemps.reduce((sum, temp) => sum + Math.pow(temp - (cornerTemps.reduce((a, b) => a + b, 0) / cornerTemps.length), 2), 0) / cornerTemps.length),
      corner_temp_range: cornerTemps.length > 0 ? Math.max(...cornerTemps) - Math.min(...cornerTemps) : 0,
      burner_tilt_mean: burnerTilts.reduce((a, b) => a + b, 0) / burnerTilts.length,
    };
  },

  /**
   * Convert ML prediction result to frontend format
   */
  convertMLPredictionToFrontendFormat(mlPrediction) {
    return {
      is_anomaly: mlPrediction.is_anomaly,
      anomaly_score: mlPrediction.anomaly_score,
      confidence_score: mlPrediction.confidence_score,
      anomaly_confidence: mlPrediction.anomaly_confidence,
      contributing_parameters: mlPrediction.contributing_parameters,
      timestamp: mlPrediction.timestamp,
      
      // Additional fields for compatibility with existing frontend
      risk_level: mlPrediction.is_anomaly ? 'HIGH' : 'LOW',
      probability: mlPrediction.anomaly_confidence,
      failure_mode: mlPrediction.is_anomaly ? 'Anomalous operation detected' : 'Normal operation',
      estimated_time_to_failure: mlPrediction.is_anomaly ? 'Review required' : 'N/A',
      recommended_actions: mlPrediction.is_anomaly ? [
        'Review operational parameters',
        'Check temperature uniformity',
        'Verify combustion efficiency',
        'Inspect equipment if needed'
      ] : ['Continue normal monitoring'],
    };
  },
};

export default mlApi;