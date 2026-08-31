/**
 * AI Prediction Scene Component
 *
 * Renders 3D overlays for AI-powered furnace predictions:
 * - Temperature prediction hotspots (spheres + labels)
 * - Failure prediction indicators (torus rings + labels)
 * - Optimization recommendations (sidebar labels)
 *
 * Design language: dark industrial dashboard with emissive 3D
 * materials, glass-morphism HTML overlays, SVG line icons,
 * colour-coded risk levels, and CSS pulse animations.
 */

import { useMemo, useEffect } from "react";
import { useFurnaceStore } from "../state/FurnaceStore";
import { temperatureToColor } from "../utils/temperatureScale";
import { Html } from "@react-three/drei";

// ============================================================================
// SVG ICONS — minimal line icons for AI overlays
// ============================================================================

const IconPrediction = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L14 8H20L13 12L15.5 19L12 15.5L8.5 19L11 12L4 8H10L12 2Z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconWarning = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.29 3.87C10.72 3.37 11.26 3.21 12 3.21C12.74 3.21 13.28 3.37 13.71 3.87L21.07 12.29C21.5 12.77 21.73 13.39 21.73 14.05C21.73 14.91 21.16 15.69 20.25 15.91L4.57 19.69C3.51 19.96 2.44 19.84 1.67 19.31C0.9 18.78 0.5 18 0.5 17.06C0.5 16.36 0.77 15.72 1.25 15.27L10.29 3.87Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 8V12" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <circle cx="12" cy="15" r="1" fill="currentColor"/>
  </svg>
);

const IconRecommendation = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9C5 12.38 9.06 17.31 11.17 19.67C11.65 20.19 12.35 20.19 12.83 19.67C14.94 17.31 19 12.38 19 9C19 5.13 15.87 2 12 2Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12V16" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M12 8H12.01" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
  </svg>
);

const IconTarget = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke="currentColor"/>
    <circle cx="12" cy="12" r="6" strokeWidth="1.5" stroke="currentColor"/>
    <circle cx="12" cy="12" r="2" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5"/>
  </svg>
);

// ============================================================================
// Colour helpers — maps risk levels / priorities to theme colours
// ============================================================================

function getRiskColor(riskLevel) {
  switch (riskLevel) {
    case "CRITICAL": return "#ef4444";
    case "HIGH": return "#f59e0b";
    case "MODERATE": return "#22d3ee";
    default: return "#6b7280";
  }
}

function getFailureColor(prob) {
  return prob > 0.5 ? "#ef4444" : "#f59e0b";
}

function getRecColor(priority) {
  switch (priority) {
    case "HIGH": return "#f59e0b";
    case "MEDIUM": return "#22d3ee";
    default: return "#22d3ee";
  }
}

// ============================================================================
// SUB-COMPONENT: PredictionMarker — sphere + halo + Html label
// =========================================================================

function PredictionMarker({ pred }) {
  const sphereColor = temperatureToColor(pred.predictedTemp);
  const riskColor = getRiskColor(pred.riskLevel);

  return (
    <group position={[pred.position.x, pred.position.z, pred.position.y]}>
      {/* Halo sphere (larger, transparent) */}
      <mesh>
        <sphereGeometry args={[1.6, 16, 16]} />
        <meshBasicMaterial
          color={riskColor}
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>

      {/* Prediction sphere */}
      <mesh>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color={sphereColor}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>

      {/* Prediction label */}
      <Html position={[0, 1.5, 0]} style={{ pointerEvents: "none" }} occlude={false}>
        <div style={{ ...styles.predictionCard, borderColor: riskColor }}>
          <div style={{ ...styles.predictionHeader, color: riskColor }}>
            <span style={styles.predictionHeaderIcon}><IconPrediction /></span>
            <span>AI PREDICTION</span>
          </div>
          <div style={styles.predictionRow}>
            <span style={styles.predictionRowLabel}>Current:</span>
            <span style={styles.predictionRowValue}>{pred.currentTemp.toFixed(0)}°C</span>
          </div>
          <div style={styles.predictionRow}>
            <span style={styles.predictionRowLabel}>Predicted:</span>
            <span style={{ ...styles.predictionRowValue, color: riskColor }}>{pred.predictedTemp.toFixed(0)}°C</span>
          </div>
          <div style={styles.predictionRow}>
            <span style={styles.predictionRowLabel}>Risk:</span>
            <span style={{ ...styles.predictionRowValue, color: riskColor }}>{pred.riskLevel} ({Math.round(pred.confidence * 100)}%)</span>
          </div>
          {/* Confidence bar */}
          <div style={styles.confidenceBarContainer}>
            <div style={{ ...styles.confidenceBarFill, width: `${pred.confidence * 100}%`, background: `linear-gradient(90deg, ${riskColor} 0%, ${riskColor}80 100%)` }} />
          </div>
          <div style={styles.confidenceLabel}>Confidence: {Math.round(pred.confidence * 100)}%</div>
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// SUB-COMPONENT: FailureMarker — torus ring + Html label
// =========================================================================

function FailureMarker({ failure, model }) {
  const burner = model.layers.flatMap((l) => l.burners).find((b) => b.id === failure.burnerId);
  if (!burner) return null;

  const failColor = getFailureColor(failure.probability);
  const pct = Math.round(failure.probability * 100);

  return (
    <group position={[burner.position.x, burner.position.z, burner.position.y]}>
      {/* Torus ring */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.8, 0.06, 8, 32]} />
        <meshBasicMaterial
          color={failColor}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>

      {/* Inner glow ring */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.8, 0.03, 8, 32]} />
        <meshBasicMaterial
          color={failColor}
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>

      {/* Failure label */}
      <Html position={[0, 2.2, 0]} style={{ pointerEvents: "none" }} occlude={false}>
        <div style={{ ...styles.failureCard, borderColor: failColor }}>
          <div style={{ ...styles.failureHeader, color: failColor }}>
            <span style={styles.failureHeaderIcon}><IconWarning /></span>
            <span>FAILURE RISK</span>
          </div>
          <div style={styles.failureBody}>
            <div style={styles.failureComponent}>Burner Nozzle</div>
            <div style={{ ...styles.failureProbability, color: failColor }}>{pct}%</div>
            <div style={styles.failureTime}>{failure.estimatedTimeToFailure}</div>
          </div>
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// SUB-COMPONENT: RecommendationOverlay — Html sidebar label
// =========================================================================

function RecommendationOverlay({ rec, model, idx }) {
  const layer = model.layers.find((l) => l.id === rec.layer);
  if (!layer) return null;

  const recColor = getRecColor(rec.priority);

  return (
    <Html
      key={`rec-${idx}`}
      position={[model.dimensions.width / 2 + 2, layer.z, 0]}
      style={{ pointerEvents: "none" }}
      occlude={false}
    >
      <div style={{ ...styles.recommendationCard, borderColor: recColor }}>
        <div style={{ ...styles.recommendationHeader, background: recColor, color: "#ffffff" }}>
          <span style={styles.recommendationHeaderIcon}><IconRecommendation /></span>
          <span>AI RECOMMENDATION</span>
          <span style={styles.recommendationPriority}>{rec.priority} PRIORITY</span>
        </div>
        <div style={styles.recommendationMessage}>{rec.message}</div>
        <div style={styles.recommendationFooter}>
          <span style={{ ...styles.recommendationType, color: recColor }}>{rec.type}</span>
        </div>
      </div>
    </Html>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AIPrediction({ model }) {
  const { state } = useFurnaceStore();
  if (!state.showAIOverlay || !model) return null;

  // Generate AI predictions for temperature hotspots
  const predictions = useMemo(() => {
    const preds = [];

    model.layers.forEach((layer) => {
      layer.burners.forEach((burner) => {
        if (burner.temperature && burner.temperature > 1250) {
          const predictedTemp = burner.temperature * (1 + Math.random() * 0.1);
          const riskLevel = predictedTemp > 1350 ? "CRITICAL" : predictedTemp > 1300 ? "HIGH" : "MODERATE";

          preds.push({
            id: `pred-${burner.id}`,
            position: { ...burner.position },
            currentTemp: burner.temperature,
            predictedTemp,
            riskLevel,
            confidence: 0.75 + Math.random() * 0.2,
            timeframe: "15-30 min",
          });
        }
      });
    });

    return preds;
  }, [model]);

  // Generate optimization recommendations
  const recommendations = useMemo(() => {
    const recs = [];

    model.layers.forEach((layer) => {
      if (layer.temperature.avg) {
        if (layer.temperature.avg > 1320) {
          recs.push({
            type: "TEMPERATURE",
            layer: layer.id,
            message: `Reduce coal flow at elevation ${layer.label}M to prevent overheating`,
            priority: "HIGH",
          });
        }
        if (layer.temperature.avg < 1100) {
          recs.push({
            type: "EFFICIENCY",
            layer: layer.id,
            message: `Increase combustion efficiency at elevation ${layer.label}M`,
            priority: "MEDIUM",
          });
        }
      }
    });

    return recs;
  }, [model]);

  // Predict failure probabilities
  const failurePredictions = useMemo(() => {
    const failures = [];

    model.layers.forEach((layer) => {
      layer.burners.forEach((burner) => {
        if (burner.temperature) {
          const tempStress = Math.max(0, (burner.temperature - 1200) / 200);
          const failureProb = Math.min(0.95, tempStress * 0.3);

          if (failureProb > 0.1) {
            failures.push({
              burnerId: burner.id,
              component: "Burner Nozzle",
              probability: failureProb,
              estimatedTimeToFailure: `${Math.floor(720 / failureProb)} hours`,
              recommendedAction: failureProb > 0.5 ? "Schedule maintenance" : "Monitor closely",
            });
          }
        }
      });
    });

    return failures.sort((a, b) => b.probability - a.probability).slice(0, 5);
  }, [model]);

  // Inject global CSS for pulse animations
  useEffect(() => {
    if (typeof document === "undefined") return;

    const styleEl = document.createElement("style");
    styleEl.textContent =`
      @keyframes aiPulse {
        0%, 100% { opacity: 0.9; }
        50% { opacity: 1; }
      }
      @keyframes aiPulseGentle {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 0.95; }
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      if (document.head.contains(styleEl)) document.head.removeChild(styleEl);
    };
  }, []);

  return (
    <group>
      {/* Temperature prediction hotspots */}
      {predictions.map((pred) => (
        <PredictionMarker key={pred.id} pred={pred} />
      ))}

      {/* Failure prediction indicators */}
      {failurePredictions.map((failure, idx) => (
        <FailureMarker key={`fail-${failure.burnerId}-${idx}`} failure={failure} model={model} />
      ))}

      {/* Optimization recommendations overlay */}
      {recommendations.slice(0, 3).map((rec, idx) => (
        <RecommendationOverlay key={`rec-${idx}`} rec={rec} model={model} idx={idx} />
      ))}
    </group>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  // ── Prediction Card ──
  predictionCard: {
    background: "rgba(15, 23, 45, 0.85)",
    border: "1px solid rgba(167, 139, 250, 0.5)",
    borderLeft: "3px solid rgba(167, 139, 250, 0.5)",
    borderRadius: "8px",
    padding: "8px 12px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "10px",
    color: "#ffffff",
    minWidth: "160px",
    whiteSpace: "nowrap",
    backdropFilter: "blur(12px) saturate(180%)",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
    animation: "aiPulse 3s ease-in-out infinite",
  },
  predictionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontWeight: 700,
    marginBottom: "4px",
    fontSize: "9px",
    letterSpacing: "0.05em",
  },
  predictionHeaderIcon: {
    display: "flex",
    alignItems: "center",
  },
  predictionRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "2px",
  },
  predictionRowLabel: {
    color: "rgba(200, 220, 255, 0.5)",
    fontFamily: "'DM Mono', monospace",
  },
  predictionRowValue: {
    fontWeight: 700,
    fontFamily: "'DM Mono', monospace",
  },

  // ── Confidence Bar ──
  confidenceBarContainer: {
    width: "100%",
    height: "3px",
    background: "rgba(255, 255, 255, 0.08)",
    borderRadius: "2px",
    overflow: "hidden",
    marginTop: "6px",
    marginBottom: "2px",
  },
  confidenceBarFill: {
    height: "100%",
    borderRadius: "2px",
    transition: "width 0.3s ease",
  },
  confidenceLabel: {
    fontSize: "8px",
    color: "rgba(200, 220, 255, 0.4)",
    fontFamily: "'DM Mono', monospace",
    textAlign: "right",
  },

  // ── Failure Card ──
  failureCard: {
    background: "rgba(15, 23, 45, 0.9)",
    border: "1px solid rgba(248, 113, 113, 0.5)",
    borderLeft: "3px solid rgba(248, 113, 113, 0.5)",
    borderRadius: "6px",
    padding: "6px 10px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "9px",
    color: "#ffffff",
    minWidth: "140px",
    whiteSpace: "nowrap",
    backdropFilter: "blur(12px) saturate(180%)",
    boxShadow: "0 0 12px rgba(239, 68, 68, 0.25)",
    animation: "aiPulse 4s ease-in-out infinite",
  },
  failureHeader: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontWeight: 700,
    marginBottom: "4px",
    fontSize: "8px",
    letterSpacing: "0.05em",
  },
  failureHeaderIcon: {
    display: "flex",
    alignItems: "center",
  },
  failureBody: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  failureComponent: {
    color: "rgba(220, 220, 250, 0.7)",
    fontSize: "8px",
  },
  failureProbability: {
    fontWeight: 800,
    fontSize: "10px",
    fontFamily: "'DM Mono', monospace",
  },
  failureTime: {
    color: "rgba(200, 220, 255, 0.5)",
    fontSize: "8px",
    fontFamily: "'DM Mono', monospace",
  },

  // ── Recommendation Card ──
  recommendationCard: {
    background: "rgba(15, 23, 45, 0.9)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    borderLeft: "3px solid rgba(59, 130, 246, 0.5)",
    borderRadius: "6px",
    padding: "8px 10px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "9px",
    color: "#ffffff",
    maxWidth: "200px",
    backdropFilter: "blur(12px) saturate(180%)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
    animation: "aiPulseGentle 5s ease-in-out infinite",
  },
  recommendationHeader: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 6px",
    borderRadius: "4px",
    fontWeight: 700,
    fontSize: "8px",
    letterSpacing: "0.05em",
    marginBottom: "4px",
    textTransform: "uppercase",
  },
  recommendationHeaderIcon: {
    display: "flex",
    alignItems: "center",
  },
  recommendationPriority: {
    marginLeft: "auto",
    fontSize: "7px",
    opacity: 0.8,
  },
  recommendationMessage: {
    color: "rgba(200, 220, 255, 0.8)",
    lineHeight: 1.4,
    marginBottom: "4px",
  },
  recommendationFooter: {
    display: "flex",
    justifyContent: "flex-end",
  },
  recommendationType: {
    fontSize: "8px",
    fontWeight: 700,
    fontFamily: "'DM Mono', monospace",
    textTransform: "uppercase",
  },
};
