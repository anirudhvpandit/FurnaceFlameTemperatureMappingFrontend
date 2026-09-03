/**
 * Combustion Controls Panel Component
 * 
 * Provides advanced combustion modeling controls for realistic flame simulation.
 * Features include:
 * - Stoichiometric ratio adjustment
 * - Excess air percentage control
 * - Combustion efficiency tuning
 * - Turbulence intensity settings
 * - Mixing efficiency optimization
 * - Real-time combustion analysis with efficiency and emissions metrics
 * - Health score calculation based on combustion parameters
 */

import { useFurnaceStore } from "../state/FurnaceStore";
import { COMBUSTION_DEFAULTS } from "../config/furnaceConfig";
import { panelStyles as S } from "./panelStyles";
import { calculateCombustionEfficiency, calculateEmissions, getCombustionHealthScore } from "../utils/combustionModel";
import { useEffect } from "react";

export default function CombustionControls({ model }) {
  return model ? <CombustionControlsContent model={model} /> : null;
}

function CombustionControlsContent({ model }) {
  const { 
    state, 
    setCombustionParams, 
    toggleAdvancedCombustion 
  } = useFurnaceStore();
  
  // Add custom slider styling
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          background: linear-gradient(135deg, #fff 0%, #e2e8f0 100%);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          margin-top: -6px;
          transition: transform 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        input[type="range"]::-webkit-slider-runnable-track {
          width: 100%;
          height: 6px;
          background: transparent;
          border-radius: 3px;
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: linear-gradient(135deg, #fff 0%, #e2e8f0 100%);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          border: none;
          transition: transform 0.2s ease;
        }
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.1);
        }
        input[type="range"]::-moz-range-track {
          width: 100%;
          height: 6px;
          background: transparent;
          border-radius: 3px;
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

  const params = state.combustionParams;
  const efficiency = calculateCombustionEfficiency(params);
  const emissions = calculateEmissions(params);
  const healthScore = getCombustionHealthScore(params);

  const handleParamChange = (key, value) => {
    setCombustionParams({ [key]: value });
  };

  return (
    <div style={S.section}>
      <div style={S.sectionLabel}>COMBUSTION MODEL</div>
      
      <AdvancedModeToggle 
        isEnabled={state.enableAdvancedCombustion}
        onToggle={toggleAdvancedCombustion}
      />
      
      {state.enableAdvancedCombustion ? (
        <AdvancedControls 
          params={params}
          onParamChange={handleParamChange}
          efficiency={efficiency}
          emissions={emissions}
          healthScore={healthScore}
        />
      ) : (
        <HelperText />
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Enhanced toggle button for advanced combustion mode with visual feedback
 */
function AdvancedModeToggle({ isEnabled, onToggle }) {
  return (
    <div style={styles.toggleContainer}>
      <button 
        style={{
          ...styles.toggleButton,
          ...(isEnabled ? styles.toggleButtonActive : styles.toggleButtonInactive)
        }}
        onClick={onToggle}
        onMouseEnter={(e) => {
          e.target.style.transform = "translateY(-2px)";
          e.target.style.boxShadow = isEnabled 
            ? styles.toggleButtonActiveHover.boxShadow
            : styles.toggleButtonInactiveHover.boxShadow;
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = isEnabled 
            ? styles.toggleButtonActive.boxShadow
            : styles.toggleButtonInactive.boxShadow;
        }}
      >
        <span style={styles.toggleButtonContent}>
          <span style={styles.toggleButtonIcon}>
            {isEnabled ? "🔥" : "💡"}
          </span>
          <span>{isEnabled ? "ADVANCED ON" : "ADVANCED OFF"}</span>
        </span>
      </button>
    </div>
  );
}

/**
 * Advanced combustion controls with parameter sliders and analysis
 */
function AdvancedControls({ params, onParamChange, efficiency, emissions, healthScore }) {
  return (
    <>
      <ParameterSlider
        label="STOICHIOMETRIC RATIO"
        value={params.stoichiometricRatio}
        min={0.8}
        max={2.0}
        step={0.05}
        onChange={(value) => onParamChange("stoichiometricRatio", value)}
        formatValue={(val) => val.toFixed(2)}
      />

      <ParameterSlider
        label="EXCESS AIR (%)"
        value={params.excessAirPercentage}
        min={5}
        max={50}
        step={1}
        onChange={(value) => onParamChange("excessAirPercentage", value)}
        formatValue={(val) => `${val.toFixed(0)}%`}
      />

      <ParameterSlider
        label="COMBUSTION EFFICIENCY"
        value={params.combustionEfficiency}
        min={0.7}
        max={0.98}
        step={0.01}
        onChange={(value) => onParamChange("combustionEfficiency", value)}
        formatValue={(val) => `${(val * 100).toFixed(1)}%`}
      />

      <ParameterSlider
        label="TURBULENCE INTENSITY"
        value={params.turbulenceIntensity}
        min={0.05}
        max={0.4}
        step={0.01}
        onChange={(value) => onParamChange("turbulenceIntensity", value)}
        formatValue={(val) => `${(val * 100).toFixed(0)}%`}
      />

      <ParameterSlider
        label="MIXING EFFICIENCY"
        value={params.mixingEfficiency}
        min={0.6}
        max={0.98}
        step={0.01}
        onChange={(value) => onParamChange("mixingEfficiency", value)}
        formatValue={(val) => `${(val * 100).toFixed(1)}%`}
      />

      <CombustionAnalysis 
        efficiency={efficiency}
        emissions={emissions}
        healthScore={healthScore}
      />
    </>
  );
}

/**
 * Enhanced parameter slider with label, value display, and visual feedback
 */
function ParameterSlider({ label, value, min, max, step, onChange, formatValue }) {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div style={styles.sliderContainer}>
      <div style={styles.sliderHeader}>
        <div style={S.fieldLabel}>{label}</div>
        <div style={styles.sliderValue}>{formatValue(value)}</div>
      </div>
      <div style={styles.sliderWrapper}>
        <div style={styles.sliderTrack}>
          <div 
            style={{
              ...styles.sliderFill,
              width: `${percentage}%`
            }}
          />
        </div>
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step} 
          value={value} 
          onChange={(e) => onChange(Number(e.target.value))} 
          style={styles.slider}
        />
      </div>
    </div>
  );
}

/**
 * Enhanced combustion analysis display with efficiency, emissions, and health score
 */
function CombustionAnalysis({ efficiency, emissions, healthScore }) {
  const healthScoreColor = getHealthScoreColor(healthScore.status);
  const healthScoreIcon = getHealthScoreIcon(healthScore.status);
  const healthScoreBackground = getHealthScoreBackground(healthScore.status);
  
  return (
    <div style={styles.analysisCard}>
      <div style={styles.analysisHeader}>
        <span style={styles.analysisTitle}>COMBUSTION ANALYSIS</span>
        <span style={styles.analysisIcon}>📊</span>
      </div>
      
      <div style={styles.metricsGrid}>
        <MetricCard 
          label="Efficiency"
          value={`${(efficiency * 100).toFixed(1)}%`}
          icon="⚡"
          color="#22c55e"
        />
        
        <MetricCard 
          label="NOx Emission"
          value={emissions.nox.toFixed(2)}
          icon="💨"
          color="#f59e0b"
        />
        
        <MetricCard 
          label="CO Emission"
          value={emissions.co.toFixed(2)}
          icon="☁️"
          color="#ef4444"
        />
      </div>
      
      <div style={{
        ...styles.healthScoreCard,
        borderColor: healthScoreColor,
        background: healthScoreBackground
      }}>
        <div style={styles.healthScoreHeader}>
          <span style={styles.healthScoreLabel}>Health Score</span>
          <span style={styles.healthScoreIcon}>{healthScoreIcon}</span>
        </div>
        <div style={styles.healthScoreValueContainer}>
          <div style={{ ...styles.healthScoreValue, color: healthScoreColor }}>
            {healthScore.overall.toFixed(0)}%
          </div>
          <div style={{ ...styles.healthScoreStatus, color: healthScoreColor }}>
            {healthScore.status}
          </div>
        </div>
        <div style={styles.healthScoreBar}>
          <div 
            style={{
              ...styles.healthScoreBarFill,
              width: `${healthScore.overall}%`,
              background: healthScoreColor
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Enhanced metric card for displaying individual combustion metrics
 */
function MetricCard({ label, value, icon, color }) {
  return (
    <div 
      style={styles.metricCard}
      onMouseEnter={(e) => {
        e.target.style.transform = "translateY(-2px)";
        e.target.style.boxShadow = `0 4px 12px ${color}20`;
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = "translateY(0)";
        e.target.style.boxShadow = "none";
      }}
    >
      <div style={{ ...styles.metricIcon, color }}>{icon}</div>
      <div style={styles.metricLabel}>{label}</div>
      <div style={{ ...styles.metricValue, color }}>{value}</div>
    </div>
  );
}

/**
 * Single analysis metric row (legacy, kept for compatibility)
 */
function AnalysisRow({ label, value }) {
  return (
    <div style={styles.analysisRow}>
      <span style={styles.label}>{label}:</span>
      <span style={styles.value}>{value}</span>
    </div>
  );
}

/**
 * Enhanced helper text when advanced mode is disabled
 */
function HelperText() {
  return (
    <div style={styles.helperText}>
      <div style={styles.helperTextIcon}>🔬</div>
      <div style={styles.helperTextContent}>
        Enable advanced combustion modeling to simulate realistic flame behavior, 
        efficiency, and emissions based on thermodynamic parameters.
      </div>
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Returns color based on health score status
 */
function getHealthScoreColor(status) {
  switch (status) {
    case "EXCELLENT":
      return "#22c55e";  // Green
    case "GOOD":
      return "#22d3ee";  // Cyan
    case "FAIR":
      return "#f59e0b";  // Amber
    case "POOR":
      return "#ef4444";  // Red
    default:
      return "#9ca3af";  // Gray
  }
}

/**
 * Returns icon based on health score status
 */
function getHealthScoreIcon(status) {
  switch (status) {
    case "EXCELLENT":
      return "✨";
    case "GOOD":
      return "👍";
    case "FAIR":
      return "⚠️";
    case "POOR":
      return "🚨";
    default:
      return "📊";
  }
}

/**
 * Returns background color based on health score status
 */
function getHealthScoreBackground(status) {
  switch (status) {
    case "EXCELLENT":
      return "rgba(34, 197, 94, 0.12)";
    case "GOOD":
      return "rgba(34, 211, 238, 0.12)";
    case "FAIR":
      return "rgba(245, 158, 11, 0.12)";
    case "POOR":
      return "rgba(239, 68, 68, 0.12)";
    default:
      return "rgba(156, 163, 175, 0.12)";
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  toggleContainer: {
    display: "flex",
    gap: "6px",
    marginBottom: "16px"
  },
  
  // Enhanced toggle button
  toggleButton: {
    flex: 1,
    padding: "12px 20px",
    border: "none",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease",
    transform: "translateY(0)"
  },
  toggleButtonInactive: {
    background: "rgba(100, 116, 139, 0.2)",
    color: "#94a3b8",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    boxShadow: "none"
  },
  toggleButtonInactiveHover: {
    boxShadow: "0 4px 12px rgba(100, 116, 139, 0.3)"
  },
  toggleButtonActive: {
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "#fff",
    border: "1px solid rgba(245, 158, 11, 0.5)",
    boxShadow: "0 4px 14px rgba(245, 158, 11, 0.4)"
  },
  toggleButtonActiveHover: {
    boxShadow: "0 6px 20px rgba(245, 158, 11, 0.5)"
  },
  toggleButtonContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  },
  toggleButtonIcon: {
    fontSize: "16px"
  },
  
  // Enhanced slider container
  sliderContainer: {
    marginBottom: "16px"
  },
  sliderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px"
  },
  sliderWrapper: {
    position: "relative"
  },
  sliderTrack: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: "6px",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "3px",
    overflow: "hidden",
    transform: "translateY(-50%)",
    pointerEvents: "none"
  },
  sliderFill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    background: "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)",
    borderRadius: "3px",
    transition: "width 0.2s ease",
    boxShadow: "0 0 10px rgba(59, 130, 246, 0.5)"
  },
  slider: {
    width: "100%",
    height: "16px",
    appearance: "none",
    background: "transparent",
    cursor: "pointer",
    position: "relative",
    zIndex: 1,
    margin: "0"
  },
  sliderValue: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#e2e8f0",
    background: "rgba(59, 130, 246, 0.2)",
    padding: "2px 8px",
    borderRadius: "4px",
    minWidth: "50px",
    textAlign: "center"
  },
  
  // Enhanced analysis card
  analysisCard: {
    marginTop: "20px",
    padding: "16px",
    background: "rgba(30, 41, 59, 0.6)",
    borderRadius: "12px",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    backdropFilter: "blur(10px)"
  },
  analysisHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px"
  },
  analysisTitle: {
    fontFamily: "Inter",
    fontSize: "12px",
    fontWeight: 700,
    color: "#e2e8f0",
    letterSpacing: "0.5px"
  },
  analysisIcon: {
    fontSize: "18px"
  },
  
  // Metrics grid
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginBottom: "16px"
  },
  metricCard: {
    padding: "12px",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    textAlign: "center",
    transition: "all 0.2s ease",
    transform: "translateY(0)"
  },
  metricIcon: {
    fontSize: "20px",
    marginBottom: "6px"
  },
  metricLabel: {
    fontSize: "10px",
    color: "rgba(200, 220, 255, 0.7)",
    marginBottom: "4px",
    fontWeight: 500
  },
  metricValue: {
    fontSize: "14px",
    fontWeight: 700
  },
  
  // Enhanced health score card
  healthScoreCard: {
    padding: "14px",
    borderRadius: "10px",
    border: "2px solid",
    marginTop: "12px",
    backdropFilter: "blur(10px)",
    transition: "all 0.3s ease"
  },
  healthScoreHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px"
  },
  healthScoreLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#e2e8f0",
    letterSpacing: "0.5px"
  },
  healthScoreIcon: {
    fontSize: "18px"
  },
  healthScoreValueContainer: {
    display: "flex",
    alignItems: "baseline",
    gap: "10px",
    marginBottom: "10px"
  },
  healthScoreValue: {
    fontSize: "28px",
    fontWeight: 800,
    lineHeight: 1
  },
  healthScoreStatus: {
    fontSize: "13px",
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
  
  // Legacy styles for compatibility
  analysisRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "4px"
  },
  healthScoreRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "8px",
    paddingTop: "8px",
    borderTop: "1px solid rgba(77, 141, 232, 0.2)"
  },
  label: {
    color: "rgba(200, 220, 255, 0.7)",
    fontSize: "10px"
  },
  value: {
    color: "#fff",
    fontSize: "10px",
    fontWeight: 700
  },
  healthScoreValue: {
    fontSize: "11px",
    fontWeight: 800
  },
  
  // Enhanced helper text
  helperText: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "14px",
    background: "rgba(100, 116, 139, 0.1)",
    borderRadius: "10px",
    border: "1px solid rgba(148, 163, 184, 0.2)"
  },
  helperTextIcon: {
    fontSize: "24px",
    flexShrink: 0
  },
  helperTextContent: {
    fontSize: "11px",
    color: "rgba(200, 220, 255, 0.7)",
    lineHeight: "1.5",
    margin: 0
  }
};