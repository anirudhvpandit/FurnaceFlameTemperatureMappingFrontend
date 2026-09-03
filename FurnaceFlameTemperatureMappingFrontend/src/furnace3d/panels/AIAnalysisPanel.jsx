/**
 * AI Analysis Panel Component
 * 
 * Provides comprehensive AI-powered analysis for furnace flame temperature mapping.
 * Features include:
 * - Overall health score calculation with visual indicators
 * - Failure predictions with probability estimates and risk levels
 * - Temperature forecasting with trend analysis
 * - Optimization recommendations with priority levels
 * - Anomaly detection with severity indicators
 * - Animated loading states and smooth transitions
 */

import { useState, useEffect } from "react";
import { useFurnaceStore } from "../state/FurnaceStore";
import { runAIAnalysis, aiHooks } from "../utils/aiIntegration";
import { panelStyles as S } from "./panelStyles";

export default function AIAnalysisPanel({ model }) {
  const { 
    state, 
    setAIAnalysis, 
    setAIAnalysisLoading, 
    setAIAnalysisError 
  } = useFurnaceStore();
  
  const [isRunning, setIsRunning] = useState(false);
  const [mlBackendEnabled, setMLBackendEnabled] = useState(true);
  const [mlBackendStatus, setMLBackendStatus] = useState({ healthy: false, modelLoaded: false });
  const [showMLSettings, setShowMLSettings] = useState(false);
  
  // Add CSS animations for enhanced UI effects
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `;
      document.head.appendChild(style);
      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, []);

  // Check ML backend status on mount
  useEffect(() => {
    const checkMLStatus = async () => {
      try {
        const status = await aiHooks.checkMLBackendHealth();
        setMLBackendStatus(status);
        
        // If ML backend is not healthy, disable it
        if (!status.healthy) {
          setMLBackendEnabled(false);
          aiHooks.setMLBackendEnabled(false);
        }
      } catch (error) {
        console.warn('ML backend status check failed:', error);
        setMLBackendStatus({ healthy: false, modelLoaded: false, error: error.message });
        setMLBackendEnabled(false);
        aiHooks.setMLBackendEnabled(false);
      }
    };

    checkMLStatus();
  }, []);

  // Toggle ML backend usage
  const toggleMLBackend = async () => {
    const newEnabled = !mlBackendEnabled;
    setMLBackendEnabled(newEnabled);
    aiHooks.setMLBackendEnabled(newEnabled);
    
    if (newEnabled) {
      // Re-check status when enabling
      try {
        const status = await aiHooks.checkMLBackendHealth();
        setMLBackendStatus(status);
        if (!status.healthy) {
          console.warn('ML backend is not healthy, but enabling anyway');
        }
      } catch (error) {
        console.warn('ML backend status check failed:', error);
      }
    }
  };
  
  /**
   * Executes comprehensive AI analysis with multiple analysis modules
   */
  const runAnalysis = async () => {
    setIsRunning(true);
    setAIAnalysisLoading(true);
    setAIAnalysisError(null);
    
    try {
      const analysis = await runAIAnalysis(model, {
        includePredictions: true,
        includeFailures: true,
        includeOptimizations: true,
        includeAnomalies: true,
        historicalData: state.historicalRuns,
      });
      
      setAIAnalysis(analysis);
    } catch (error) {
      console.error('AI analysis failed:', error);
      setAIAnalysisError(error.message);
    } finally {
      setIsRunning(false);
      setAIAnalysisLoading(false);
    }
  };

  const analysis = state.aiAnalysis;

  return (
    <div style={S.section}>
      <div style={S.sectionLabel}>AI ANALYSIS</div>
      
      <MLBackendStatus 
        status={mlBackendStatus}
        enabled={mlBackendEnabled}
        onToggle={toggleMLBackend}
        onShowSettings={() => setShowMLSettings(!showMLSettings)}
      />
      
      {showMLSettings && <MLBackendSettings />}
      
      <AnalysisButton 
        isRunning={isRunning} 
        onClick={runAnalysis} 
      />
      
      <StatusIndicators 
        isLoading={state.aiAnalysisLoading}
        error={state.aiAnalysisError}
      />
      
      {analysis && <AnalysisResults analysis={analysis} />}
      
      {!analysis && !state.aiAnalysisLoading && <HelperText />}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Main analysis trigger button with enhanced loading state and visual feedback
 */
function AnalysisButton({ isRunning, onClick }) {
  return (
    <button 
      style={{
        ...styles.analysisButton,
        ...(isRunning ? styles.analysisButtonLoading : {}),
        ...(isRunning ? {} : styles.analysisButtonHover)
      }}
      onClick={onClick}
      disabled={isRunning}
      onMouseEnter={(e) => {
        if (!isRunning) {
          e.target.style.background = styles.analysisButtonHover.background;
          e.target.style.transform = styles.analysisButtonHover.transform;
          e.target.style.boxShadow = styles.analysisButtonHover.boxShadow;
        }
      }}
      onMouseLeave={(e) => {
        if (!isRunning) {
          e.target.style.background = styles.analysisButton.background;
          e.target.style.transform = styles.analysisButton.transform;
          e.target.style.boxShadow = styles.analysisButton.boxShadow;
        }
      }}
    >
      {isRunning ? (
        <span style={styles.buttonContent}>
          <span style={styles.loadingSpinner}>⏳</span>
          RUNNING ANALYSIS...
        </span>
      ) : (
        <span style={styles.buttonContent}>
          <span style={styles.buttonIcon}>🤖</span>
          RUN COMPREHENSIVE AI ANALYSIS
        </span>
      )}
    </button>
  );
}

/**
 * Enhanced loading and error status indicators with animations
 */
function StatusIndicators({ isLoading, error }) {
  if (isLoading) {
    return (
      <div style={styles.loadingIndicator}>
        <div style={styles.loadingAnimation}>
          <span style={{ ...styles.loadingDot, animationDelay: "0s" }}>●</span>
          <span style={{ ...styles.loadingDot, animationDelay: "0.2s" }}>●</span>
          <span style={{ ...styles.loadingDot, animationDelay: "0.4s" }}>●</span>
        </div>
        <div style={styles.loadingText}>Analyzing furnace data patterns...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={styles.errorIndicator}>
        <div style={styles.errorIcon}>⚠️</div>
        <div style={styles.errorText}>{error}</div>
      </div>
    );
  }
  
  return null;
}

/**
 * Main analysis results display with all analysis modules
 */
function AnalysisResults({ analysis }) {
  return (
    <div style={styles.resultsContainer}>
      <HealthScoreCard score={analysis.overallHealthScore} />
      
      {analysis.failurePredictions?.length > 0 && (
        <FailurePredictions predictions={analysis.failurePredictions} />
      )}
      
      {analysis.temperaturePredictions?.length > 0 && (
        <TemperaturePredictions predictions={analysis.temperaturePredictions} />
      )}
      
      {analysis.optimizationRecommendations?.length > 0 && (
        <OptimizationRecommendations recommendations={analysis.optimizationRecommendations} />
      )}
      
      {analysis.anomalies?.length > 0 && (
        <DetectedAnomalies anomalies={analysis.anomalies} />
      )}
    </div>
  );
}

/**
 * Enhanced overall health score display with visual indicators and status badges
 */
function HealthScoreCard({ score }) {
  const scoreColor = getHealthScoreColor(score);
  const scoreStatus = getHealthScoreStatus(score);
  const scoreIcon = getHealthScoreIcon(score);
  
  return (
    <div style={{
      ...styles.healthScoreCard,
      borderColor: scoreColor,
      background: getHealthScoreBackground(score)
    }}>
      <div style={styles.healthScoreHeader}>
        <span style={styles.healthScoreLabel}>OVERALL HEALTH SCORE</span>
        <span style={styles.healthScoreIcon}>{scoreIcon}</span>
      </div>
      <div style={styles.healthScoreValueContainer}>
        <div style={{ ...styles.healthScoreValue, color: scoreColor }}>
          {score.toFixed(0)}%
        </div>
        <div style={{ ...styles.healthScoreStatus, color: scoreColor }}>
          {scoreStatus}
        </div>
      </div>
      <div style={styles.healthScoreBar}>
        <div 
          style={{
            ...styles.healthScoreBarFill,
            width: `${score}%`,
            background: scoreColor
          }}
        />
      </div>
    </div>
  );
}

/**
 * Failure predictions with probability and time-to-failure estimates
 */
function FailurePredictions({ predictions }) {
  return (
    <div style={styles.section}>
      <div style={S.fieldLabel}>FAILURE PREDICTIONS</div>
      {predictions.slice(0, 3).map((failure, idx) => (
        <div 
          key={idx} 
          style={styles.failureCard}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "none";
          }}
        >
          <div style={styles.cardHeader}>
            <span style={styles.componentName}>{failure.componentId}</span>
            <span style={styles.probability}>
              {(failure.probability * 100).toFixed(0)}%
            </span>
          </div>
          <div style={styles.cardDetail}>{failure.failureMode}</div>
          <div style={styles.cardDetail}>
            ETTF: {failure.estimatedTimeToFailure}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Temperature predictions with risk levels
 */
function TemperaturePredictions({ predictions }) {
  return (
    <div style={styles.section}>
      <div style={S.fieldLabel}>TEMPERATURE PREDICTIONS</div>
      {predictions.slice(0, 2).map((prediction, idx) => (
        <div 
          key={idx} 
          style={styles.temperatureCard}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "none";
          }}
        >
          <div style={styles.predictionTime}>{prediction.time}</div>
          {prediction.layers.slice(0, 2).map((layer, lIdx) => (
            <div key={lIdx} style={styles.layerDetail}>
              <span>{layer.layerId}</span>
              <span>
                {layer.predictedAvg.toFixed(0)}°C ({layer.risk.level})
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Optimization recommendations with priority levels
 */
function OptimizationRecommendations({ recommendations }) {
  return (
    <div style={styles.section}>
      <div style={S.fieldLabel}>OPTIMIZATION RECOMMENDATIONS</div>
      {recommendations.slice(0, 3).map((recommendation, idx) => (
        <div 
          key={idx} 
          style={{
            ...styles.recommendationCard,
            ...(recommendation.priority === "HIGH" 
              ? styles.highPriorityCard 
              : styles.normalPriorityCard)
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "none";
          }}
        >
          <div style={styles.cardHeader}>
            <span style={styles.recommendationType}>{recommendation.type}</span>
            <span style={{
              ...styles.priorityBadge,
              color: recommendation.priority === "HIGH" ? "#fbbf24" : "#22d3ee"
            }}>
              {recommendation.priority}
            </span>
          </div>
          <div style={styles.cardDetail}>{recommendation.description}</div>
          <div style={styles.improvementText}>
            {recommendation.expectedImprovement}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Detected anomalies with severity levels
 */
function DetectedAnomalies({ anomalies }) {
  return (
    <div style={styles.section}>
      <div style={S.fieldLabel}>DETECTED ANOMALIES</div>
      {anomalies.slice(0, 3).map((anomaly, idx) => (
        <div 
          key={idx} 
          style={{
            ...styles.anomalyCard,
            ...(anomaly.severity === "HIGH" 
              ? styles.highSeverityCard 
              : styles.normalSeverityCard)
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "none";
          }}
        >
          <div style={styles.cardHeader}>
            <span style={styles.locationName}>{anomaly.location}</span>
            <span style={{
              ...styles.severityBadge,
              color: anomaly.severity === "HIGH" ? "#fca5a5" : "#9ca3af"
            }}>
              {anomaly.severity}
            </span>
          </div>
          <div style={styles.cardDetail}>
            Current: {anomaly.currentValue?.toFixed(0)}°C
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Helper text when no analysis has been run
 */
function HelperText() {
  return (
    <div style={S.helperText}>
      Run comprehensive AI analysis to get temperature predictions, 
      failure forecasts, optimization recommendations, and anomaly detection.
    </div>
  );
}

/**
 * ML Backend Status Indicator
 */
function MLBackendStatus({ status, enabled, onToggle, onShowSettings }) {
  const getStatusColor = () => {
    if (!enabled) return '#9ca3af'; // Gray when disabled
    if (status.healthy && status.modelLoaded) return '#22c55e'; // Green when healthy and loaded
    if (status.healthy) return '#f59e0b'; // Amber when healthy but no model
    return '#ef4444'; // Red when unhealthy
  };

  const getStatusText = () => {
    if (!enabled) return 'ML Backend: Disabled';
    if (status.healthy && status.modelLoaded) return 'ML Backend: Active';
    if (status.healthy) return 'ML Backend: No Model';
    return 'ML Backend: Offline';
  };

  return (
    <div style={{
      ...styles.mlStatusContainer,
      borderColor: getStatusColor()
    }}>
      <div style={styles.mlStatusHeader}>
        <span style={{ ...styles.mlStatusText, color: getStatusColor() }}>
          {getStatusText()}
        </span>
        <button 
          onClick={onToggle}
          style={styles.mlToggleBtn}
          title={enabled ? 'Disable ML Backend' : 'Enable ML Backend'}
        >
          {enabled ? '🔗' : '🔌'}
        </button>
        <button 
          onClick={onShowSettings}
          style={styles.mlSettingsBtn}
          title="ML Settings"
        >
          ⚙️
        </button>
      </div>
      {enabled && !status.healthy && status.error && (
        <div style={styles.mlStatusError}>
          {status.error}
        </div>
      )}
    </div>
  );
}

/**
 * ML Backend Settings Panel
 */
function MLBackendSettings() {
  return (
    <div style={styles.mlSettingsPanel}>
      <div style={styles.settingsTitle}>ML Backend Configuration</div>
      <div style={styles.settingsItem}>
        <span style={styles.settingsLabel}>API URL:</span>
        <span style={styles.settingsValue}>
          {import.meta.env.VITE_ML_API_URL || 'http://localhost:8000'}
        </span>
      </div>
      <div style={styles.settingsItem}>
        <span style={styles.settingsLabel}>Model Status:</span>
        <span style={styles.settingsValue}>Check via health endpoint</span>
      </div>
      <div style={styles.settingsNote}>
        Configure ML backend URL in .env file as VITE_ML_API_URL
      </div>
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Returns color based on health score
 */
function getHealthScoreColor(score) {
  if (score > 80) return "#22c55e";      // Green - Excellent
  if (score > 60) return "#22d3ee";      // Cyan - Good
  if (score > 40) return "#f59e0b";      // Amber - Fair
  return "#ef4444";                      // Red - Poor
}

/**
 * Returns status text based on health score
 */
function getHealthScoreStatus(score) {
  if (score > 80) return "EXCELLENT";
  if (score > 60) return "GOOD";
  if (score > 40) return "FAIR";
  return "POOR";
}

/**
 * Returns icon based on health score
 */
function getHealthScoreIcon(score) {
  if (score > 80) return "✨";
  if (score > 60) return "👍";
  if (score > 40) return "⚠️";
  return "🚨";
}

/**
 * Returns background color based on health score
 */
function getHealthScoreBackground(score) {
  if (score > 80) return "rgba(34, 197, 94, 0.12)";
  if (score > 60) return "rgba(34, 211, 238, 0.12)";
  if (score > 40) return "rgba(245, 158, 11, 0.12)";
  return "rgba(239, 68, 68, 0.12)";
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  resultsContainer: {
    marginTop: "12px"
  },
  
  // Enhanced analysis button
  analysisButton: {
    width: "100%",
    padding: "14px 20px",
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 14px -2px rgba(59, 130, 246, 0.5)",
    transform: "translateY(0)"
  },
  analysisButtonHover: {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    transform: "translateY(-2px)",
    boxShadow: "0 6px 20px -2px rgba(59, 130, 246, 0.6)"
  },
  analysisButtonLoading: {
    opacity: 0.7,
    cursor: "not-allowed",
    transform: "none"
  },
  buttonContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  },
  buttonIcon: {
    fontSize: "16px"
  },
  loadingSpinner: {
    fontSize: "16px",
    animation: "spin 1s linear infinite"
  },
  
  // Enhanced status indicators
  loadingIndicator: {
    marginTop: "12px",
    padding: "14px",
    background: "rgba(37, 99, 198, 0.12)",
    borderRadius: "10px",
    border: "1px solid rgba(77, 141, 232, 0.3)",
    backdropFilter: "blur(10px)"
  },
  loadingAnimation: {
    display: "flex",
    gap: "4px",
    marginBottom: "8px",
    justifyContent: "center"
  },
  loadingDot: {
    color: "#3b82f6",
    fontSize: "12px",
    animation: "pulse 1.5s ease-in-out infinite"
  },
  loadingText: {
    fontFamily: "Inter",
    fontSize: "12px",
    color: "#e0e7ff",
    textAlign: "center",
    fontWeight: 500
  },
  errorIndicator: {
    marginTop: "12px",
    padding: "14px",
    background: "rgba(239, 68, 68, 0.12)",
    borderRadius: "10px",
    border: "1px solid rgba(248, 113, 113, 0.3)",
    backdropFilter: "blur(10px)",
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  errorIcon: {
    fontSize: "18px"
  },
  errorText: {
    fontFamily: "Inter",
    fontSize: "12px",
    color: "#fca5a5",
    fontWeight: 500
  },
  
  // Enhanced health score card
  healthScoreCard: {
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "12px",
    border: "2px solid",
    backdropFilter: "blur(10px)",
    transition: "all 0.3s ease"
  },
  healthScoreHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px"
  },
  healthScoreLabel: {
    fontFamily: "Inter",
    fontSize: "12px",
    fontWeight: 700,
    color: "#e2e8f0",
    letterSpacing: "0.5px"
  },
  healthScoreIcon: {
    fontSize: "20px"
  },
  healthScoreValueContainer: {
    display: "flex",
    alignItems: "baseline",
    gap: "12px",
    marginBottom: "12px"
  },
  healthScoreValue: {
    fontSize: "32px",
    fontWeight: 800,
    lineHeight: 1
  },
  healthScoreStatus: {
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "1px"
  },
  healthScoreBar: {
    height: "6px",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "3px",
    overflow: "hidden"
  },
  healthScoreBarFill: {
    height: "100%",
    borderRadius: "3px",
    transition: "width 0.8s ease-out",
    boxShadow: "0 0 10px currentColor"
  },
  
  // Section containers
  section: {
    marginBottom: "12px"
  },
  
  // Enhanced failure predictions
  failureCard: {
    padding: "12px",
    background: "rgba(239, 68, 68, 0.08)",
    borderRadius: "10px",
    border: "1px solid rgba(248, 113, 113, 0.25)",
    marginBottom: "8px",
    backdropFilter: "blur(8px)",
    transition: "all 0.2s ease"
  },
  
  // Enhanced temperature predictions
  temperatureCard: {
    padding: "12px",
    background: "rgba(245, 158, 11, 0.08)",
    borderRadius: "10px",
    border: "1px solid rgba(251, 191, 36, 0.25)",
    marginBottom: "8px",
    backdropFilter: "blur(8px)",
    transition: "all 0.2s ease"
  },
  predictionTime: {
    color: "#fff",
    fontSize: "12px",
    fontWeight: 700,
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  layerDetail: {
    display: "flex",
    justifyContent: "space-between",
    color: "rgba(200, 220, 255, 0.8)",
    fontSize: "11px",
    padding: "4px 0",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
  },
  
  // Enhanced optimization recommendations
  recommendationCard: {
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "8px",
    backdropFilter: "blur(8px)",
    transition: "all 0.2s ease"
  },
  highPriorityCard: {
    background: "rgba(245, 158, 11, 0.08)",
    border: "1px solid rgba(251, 191, 36, 0.25)"
  },
  normalPriorityCard: {
    background: "rgba(34, 211, 238, 0.08)",
    border: "1px solid rgba(103, 232, 249, 0.25)"
  },
  recommendationType: {
    color: "#fff",
    fontSize: "12px",
    fontWeight: 700
  },
  improvementText: {
    color: "#22c55e",
    fontSize: "11px",
    fontWeight: 700,
    marginTop: "6px",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  
  // Enhanced anomalies
  anomalyCard: {
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "8px",
    backdropFilter: "blur(8px)",
    transition: "all 0.2s ease"
  },
  highSeverityCard: {
    background: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(248, 113, 113, 0.25)"
  },
  normalSeverityCard: {
    background: "rgba(156, 163, 175, 0.08)",
    border: "1px solid rgba(209, 213, 219, 0.25)"
  },
  locationName: {
    color: "#fff",
    fontSize: "12px",
    fontWeight: 700
  },
  
  // Enhanced common card elements
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px"
  },
  componentName: {
    color: "#fff",
    fontSize: "12px",
    fontWeight: 700
  },
  probability: {
    color: "#fca5a5",
    fontSize: "12px",
    fontWeight: 700,
    background: "rgba(239, 68, 68, 0.15)",
    padding: "2px 8px",
    borderRadius: "4px"
  },
  priorityBadge: {
    fontSize: "10px",
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  
  // ML Backend Status
  mlStatusContainer: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid",
    marginBottom: "12px",
    background: "rgba(0, 0, 0, 0.2)",
    backdropFilter: "blur(8px)"
  },
  mlStatusHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px"
  },
  mlStatusText: {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.5px"
  },
  mlToggleBtn: {
    background: "rgba(255, 255, 255, 0.1)",
    border: "none",
    borderRadius: "4px",
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: "12px",
    transition: "all 0.2s ease"
  },
  mlSettingsBtn: {
    background: "rgba(255, 255, 255, 0.1)",
    border: "none",
    borderRadius: "4px",
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: "12px",
    transition: "all 0.2s ease"
  },
  mlStatusError: {
    marginTop: "8px",
    fontSize: "10px",
    color: "#fca5a5",
    fontFamily: "Inter",
    fontWeight: 500
  },
  
  // ML Settings Panel
  mlSettingsPanel: {
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "12px",
    background: "rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.1)"
  },
  settingsTitle: {
    color: "#fff",
    fontSize: "12px",
    fontWeight: 700,
    marginBottom: "8px"
  },
  settingsItem: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
    fontSize: "11px"
  },
  settingsLabel: {
    color: "rgba(200, 220, 255, 0.7)",
    fontWeight: 500
  },
  settingsValue: {
    color: "rgba(200, 220, 255, 0.9)",
    fontFamily: "monospace"
  },
  settingsNote: {
    marginTop: "8px",
    fontSize: "10px",
    color: "rgba(200, 220, 255, 0.5)",
    fontStyle: "italic"
  },
  severityBadge: {
    fontSize: "10px",
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  cardDetail: {
    color: "rgba(200, 220, 255, 0.8)",
    fontSize: "11px",
    lineHeight: "1.5"
  }
};