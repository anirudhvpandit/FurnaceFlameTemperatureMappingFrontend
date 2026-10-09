/**
 * Elevation Info Panel Component
 *
 * Displays detailed information about a focused elevation in the furnace 3D view.
 * Features include:
 * - Elevation details (value, label, height position)
 * - Temperature data (min, max, average)
 * - Burner information with corner positions, temperatures, status indicators
 * - Visual indicators with temperature color coding and status badges
 * - Comparison with adjacent elevations
 * - Beautiful UI with animations and hover effects
 */

import { useFurnaceStore } from "../state/FurnaceStore";
import { panelStyles as S } from "./panelStyles";
import { temperatureToColor } from "../utils/temperatureScale";

export default function ElevationInfoPanel({ model }) {
  const { state, clearFocusedLayer } = useFurnaceStore();
  
  if (!model) return null;
  
  // Panel removed as requested by user
  return null;
}

// ============================================================================
// ALL TEMPERATURES DISPLAY
// ============================================================================

/**
 * Display all elevations and all individual temperatures
 */
function AllTemperaturesDisplay({ model, onExit }) {
  return (
    <div style={styles.allContainer}>
      {onExit && (
        <div style={styles.headerRow}>
          <button
            onClick={onExit}
            style={styles.exitButton}
            title="Exit focused view (ESC)"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Removed layer information and corner temperatures as requested */}
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getTemperatureColor(temperature) {
  if (temperature == null) return "#9ca3af";
  if (temperature > 1400) return "#ef4444";
  if (temperature > 1200) return "#f97316";
  if (temperature > 1000) return "#fbbf24";
  if (temperature > 800) return "#22d3ee";
  return "#3b82f6";
}

function getTemperatureStatus(temperature) {
  if (temperature == null) return "Unknown";
  if (temperature > 1400) return "CRITICAL";
  if (temperature > 1200) return "HIGH";
  if (temperature > 1000) return "MEDIUM";
  if (temperature > 800) return "NORMAL";
  return "COOL";
}

function getTemperatureStatusIcon(temperature) {
  if (temperature == null) return "❓";
  if (temperature > 1400) return "🔥";
  if (temperature > 1200) return "⚠️";
  if (temperature > 1000) return "🌡️";
  if (temperature > 800) return "✅";
  return "❄️";
}

function getBurnerStatusIcon(status) {
  switch (status) {
    case "ACTIVE": return "🟢";
    case "INACTIVE": return "⚫";
    case "WARNING": return "🟡";
    case "FAULT": return "🔴";
    case "SIMULATED": return "🟣";
    default: return "⚪";
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  allContainer: {
    padding: "12px",
    background: "rgba(30, 41, 59, 0.4)",
    borderRadius: "8px",
    border: "1px solid rgba(59, 130, 246, 0.1)",
    maxHeight: "500px",
    overflowY: "auto"
  },
  headerRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "12px"
  },
  exitButton: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    background: "rgba(139, 92, 246, 0.2)",
    border: "1px solid rgba(139, 92, 246, 0.4)",
    color: "#c4b5fd",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  elevationsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  elevationBlock: {
    background: "transparent",
    borderRadius: "6px",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    overflow: "hidden"
  },
  elevationHeader: {
    padding: "8px 12px",
    background: "rgba(59, 130, 246, 0.1)",
    borderBottom: "1px solid rgba(59, 130, 246, 0.2)"
  },
  elevationLabel: {
    fontSize: "16px",
    fontWeight: 900,
    color: "#ffffff",
    textShadow: "0 0 8px rgba(59, 130, 246, 0.8)"
  },
  temperaturesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: "6px",
    padding: "8px"
  },
  tempCell: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "6px 8px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "4px",
    border: "1px solid rgba(255, 255, 255, 0.06)"
  },
  cornerLabel: {
    fontSize: "10px",
    fontWeight: 600,
    color: "rgba(200, 220, 255, 0.7)"
  },
  tempValue: {
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: "'DM Mono', monospace"
  }
};