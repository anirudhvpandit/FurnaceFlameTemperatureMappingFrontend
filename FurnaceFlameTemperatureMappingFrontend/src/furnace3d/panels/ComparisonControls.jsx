/**
 * Comparison Controls Panel Component
 * 
 * Provides functionality to load and compare different furnace runs.
 * Features include:
 * - Loading comparison runs for side-by-side analysis
 * - Demo mode with simulated temperature variations
 * - Production-ready structure for fetching real run data
 * - Visual feedback and loading states
 * - Modern UI with enhanced interactions
 * 
 * In production, this would fetch actual historical runs by run ID
 * instead of generating demo comparisons.
 */

import { useState, useEffect } from "react";
import { useFurnaceStore } from "../state/FurnaceStore";
import { panelStyles as S } from "./panelStyles";

export default function ComparisonControls({ model }) {
  const { state, setModel, setComparisonModel } = useFurnaceStore();
  const [isLoading, setIsLoading] = useState(false);
  
  // Add CSS animation for loading spinner (must be before conditional returns)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
  
  if (!model) return null;

  const loadComparison = () => {
    setIsLoading(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const comparisonModel = createComparisonModel(model);
      // Set comparison model instead of replacing the main model
      setComparisonModel(comparisonModel);
      setIsLoading(false);
    }, 800);
  };
  
  const clearComparison = () => {
    setComparisonModel(null);
  };

  return (
    <div style={S.section}>
      <div style={S.sectionLabel}>COMPARE RUNS</div>
      
      <ComparisonButton 
        onClick={loadComparison} 
        isLoading={isLoading}
        hasComparison={!!state.comparisonModel}
        onClear={clearComparison}
      />
      <HelperText />
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Enhanced button to trigger comparison run loading with visual feedback
 */
function ComparisonButton({ onClick, isLoading, hasComparison, onClear }) {
  return (
    <div style={styles.buttonContainer}>
      <button 
        style={{
          ...styles.comparisonButton,
          ...(isLoading ? styles.comparisonButtonLoading : styles.comparisonButtonNormal),
          ...(hasComparison ? styles.comparisonButtonActive : {})
        }}
        onClick={onClick}
        disabled={isLoading}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.target.style.background = hasComparison 
              ? styles.comparisonButtonActiveHover.background
              : styles.comparisonButtonHover.background;
            e.target.style.transform = styles.comparisonButtonHover.transform;
            e.target.style.boxShadow = styles.comparisonButtonHover.boxShadow;
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading) {
            e.target.style.background = hasComparison 
              ? styles.comparisonButtonActive.background
              : styles.comparisonButton.background;
            e.target.style.transform = styles.comparisonButton.transform;
            e.target.style.boxShadow = styles.comparisonButton.boxShadow;
          }
        }}
      >
        {isLoading ? (
          <span style={styles.buttonContent}>
            <span style={styles.loadingSpinner}>⏳</span>
            LOADING COMPARISON...
          </span>
        ) : hasComparison ? (
          <span style={styles.buttonContent}>
            <span style={styles.buttonIcon}>✅</span>
            COMPARISON ACTIVE
          </span>
        ) : (
          <span style={styles.buttonContent}>
            <span style={styles.buttonIcon}>🔄</span>
            LOAD COMPARISON RUN
          </span>
        )}
      </button>
      
      {hasComparison && (
        <button 
          style={styles.clearButton}
          onClick={onClear}
          onMouseEnter={(e) => {
            e.target.style.background = styles.clearButtonHover.background;
          }}
          onMouseLeave={(e) => {
            e.target.style.background = styles.clearButton.background;
          }}
        >
          <span style={styles.clearButtonContent}>
            <span style={styles.clearButtonIcon}>❌</span>
            CLEAR
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * Enhanced helper text explaining the comparison functionality
 */
function HelperText() {
  return (
    <div style={styles.helperTextContainer}>
      <div style={styles.helperTextIcon}>📊</div>
      <div style={styles.helperTextContent}>
        <div style={styles.helperTextTitle}>Side-by-Side Comparison</div>
        <div style={styles.helperTextDescription}>
          This loads a second furnace model (demo) for side‑by‑side comparison. 
          The comparison model will appear next to the original model with modified temperatures.
          In production, this would fetch another historical run by ID.
        </div>
        <div style={styles.helperTextFeatures}>
          <FeatureItem icon="🔍" text="Visual comparison" />
          <FeatureItem icon="📈" text="Performance analysis" />
          <FeatureItem icon="⚡" text="Quick insights" />
        </div>
      </div>
    </div>
  );
}

/**
 * Individual feature item for helper text
 */
function FeatureItem({ icon, text }) {
  return (
    <div style={styles.featureItem}>
      <span style={styles.featureIcon}>{icon}</span>
      <span style={styles.featureText}>{text}</span>
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a comparison model by modifying the original model's temperatures.
 * This is a demo implementation that reduces temperatures by 15% to simulate
 * a different operational scenario.
 * 
 * @param {Object} originalModel - The original furnace model
 * @returns {Object} A modified model for comparison
 */
function createComparisonModel(originalModel) {
  return {
    ...originalModel,
    layers: originalModel.layers.map(layer => ({
      ...layer,
      temperature: {
        ...layer.temperature,
        avg: (layer.temperature?.avg || 0) * 0.85
      }
    }))
  };
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  // Enhanced comparison button
  buttonContainer: {
    display: "flex",
    gap: "8px"
  },
  comparisonButton: {
    flex: 1,
    padding: "14px 20px",
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease",
    transform: "translateY(0)"
  },
  comparisonButtonNormal: {
    background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
    color: "#fff",
    boxShadow: "0 4px 14px rgba(139, 92, 246, 0.4)"
  },
  comparisonButtonHover: {
    background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
    transform: "translateY(-2px)",
    boxShadow: "0 6px 20px rgba(139, 92, 246, 0.5)"
  },
  comparisonButtonLoading: {
    background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    opacity: 0.7,
    cursor: "not-allowed",
    transform: "none"
  },
  comparisonButtonActive: {
    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
    color: "#fff",
    boxShadow: "0 4px 14px rgba(34, 197, 94, 0.4)"
  },
  comparisonButtonActiveHover: {
    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
    transform: "translateY(-2px)",
    boxShadow: "0 6px 20px rgba(34, 197, 94, 0.5)"
  },
  clearButton: {
    padding: "14px 16px",
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)"
  },
  clearButtonHover: {
    background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
    transform: "translateY(-2px)",
    boxShadow: "0 6px 20px rgba(239, 68, 68, 0.5)"
  },
  clearButtonContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px"
  },
  clearButtonIcon: {
    fontSize: "14px"
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
  
  // Enhanced helper text
  helperTextContainer: {
    display: "flex",
    gap: "12px",
    padding: "16px",
    background: "rgba(139, 92, 246, 0.1)",
    borderRadius: "12px",
    border: "1px solid rgba(139, 92, 246, 0.2)",
    backdropFilter: "blur(10px)"
  },
  helperTextIcon: {
    fontSize: "32px",
    flexShrink: 0
  },
  helperTextContent: {
    flex: 1
  },
  helperTextTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#e2e8f0",
    marginBottom: "6px"
  },
  helperTextDescription: {
    fontSize: "11px",
    color: "rgba(200, 220, 255, 0.7)",
    lineHeight: "1.5",
    marginBottom: "12px"
  },
  helperTextFeatures: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap"
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  featureIcon: {
    fontSize: "14px"
  },
  featureText: {
    fontSize: "10px",
    color: "rgba(200, 220, 255, 0.6)",
    fontWeight: 500
  }
};