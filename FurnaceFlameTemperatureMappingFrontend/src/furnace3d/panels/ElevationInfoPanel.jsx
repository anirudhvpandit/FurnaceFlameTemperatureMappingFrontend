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
  
  if (!model || !state.focusedLayerId || !state.isFocusedView) return null;
  
  const layer = model.layers.find(l => l.id === state.focusedLayerId);
  if (!layer) return null;
  
  const layerIndex = model.layers.findIndex(l => l.id === state.focusedLayerId);
  const prevLayer = layerIndex > 0 ? model.layers[layerIndex - 1] : null;
  const nextLayer = layerIndex < model.layers.length - 1 ? model.layers[layerIndex + 1] : null;
  
  return (
    <div style={S.section}>
      <div style={S.sectionLabel}>ELEVATION DETAILS</div>
      
      <ElevationHeader 
        layer={layer} 
        onExit={clearFocusedLayer}
      />
      
      <TemperatureStats layer={layer} />
      
      <BurnerList burners={layer.burners} />
      
      <AdjacentComparison 
        current={layer} 
        prev={prevLayer} 
        next={nextLayer} 
      />
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Header section with elevation info and exit button
 */
function ElevationHeader({ layer, onExit }) {
  const tempColor = getTemperatureColor(layer.temperature.avg);
  const statusIcon = getTemperatureStatusIcon(layer.temperature.avg);
  
  return (
    <div style={styles.headerContainer}>
      <div style={styles.headerInfo}>
        <div style={styles.headerTitle}>
          <span style={styles.headerIcon}>{statusIcon}</span>
          <span>{layer.label}M Elevation</span>
        </div>
        <div style={styles.headerSubtitle}>
          Height: {layer.z.toFixed(1)}m | Layer {layer.index + 1}
        </div>
      </div>
      <button
        onClick={onExit}
        style={styles.exitButton}
        title="Exit focused view (ESC)"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Temperature statistics display
 */
function TemperatureStats({ layer }) {
  const tempData = layer.temperature;
  if (!tempData || tempData.avg == null) return null;
  
  const alertColor = getTemperatureColor(tempData.avg);
  const status = getTemperatureStatus(tempData.avg);
  
  return (
    <div style={styles.statsContainer}>
      <div style={styles.statsHeader}>
        <span style={styles.statsLabel}>TEMPERATURE ANALYSIS</span>
        <span style={{ ...styles.statusBadge, color: alertColor, borderColor: alertColor }}>
          {status}
        </span>
      </div>
      
      <div style={styles.statsGrid}>
        <StatCard 
          label="Average" 
          value={`${tempData.avg.toFixed(0)}°C`} 
          color={alertColor}
          icon="🌡️"
        />
        <StatCard 
          label="Minimum" 
          value={`${tempData.min?.toFixed(0) || "N/A"}°C`} 
          color="#3b82f6"
          icon="❄️"
        />
        <StatCard 
          label="Maximum" 
          value={`${tempData.max?.toFixed(0) || "N/A"}°C`} 
          color="#ef4444"
          icon="🔥"
        />
      </div>
      
      <TemperatureBar 
        current={tempData.avg} 
        min={tempData.min} 
        max={tempData.max} 
      />
    </div>
  );
}

/**
 * Individual burner list with detailed information
 */
function BurnerList({ burners }) {
  return (
    <div style={styles.burnerContainer}>
      <div style={styles.burnerHeader}>
        <span style={styles.burnerLabel}>BURNERS ({burners.length})</span>
      </div>
      
      <div style={styles.burnerList}>
        {burners.map((burner, idx) => (
          <BurnerCard key={burner.id} burner={burner} index={idx} />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual burner card
 */
function BurnerCard({ burner, index }) {
  const tempColor = getTemperatureColor(burner.temperature);
  const statusIcon = getBurnerStatusIcon(burner.status);
  
  return (
    <div 
      style={styles.burnerCard}
      onMouseEnter={(e) => {
        e.target.style.transform = "translateY(-2px)";
        e.target.style.boxShadow = `0 4px 12px ${tempColor}20`;
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = "translateY(0)";
        e.target.style.boxShadow = "none";
      }}
    >
      <div style={styles.burnerCardHeader}>
        <div style={styles.burnerCorner}>
          <span style={styles.burnerIcon}>{statusIcon}</span>
          <span style={styles.burnerCornerName}>{burner.corner}</span>
        </div>
        <div style={{ ...styles.burnerTemp, color: tempColor }}>
          {burner.temperature?.toFixed(0) || "N/A"}°C
        </div>
      </div>
      
      <div style={styles.burnerDetails}>
        <div style={styles.burnerDetail}>
          <span style={styles.detailLabel}>Angle:</span>
          <span style={styles.detailValue}>{burner.angleDeg?.toFixed(0) || "0"}°</span>
        </div>
        <div style={styles.burnerDetail}>
          <span style={styles.detailLabel}>Tilt:</span>
          <span style={styles.detailValue}>{burner.tiltDeg?.toFixed(0) || "0"}°</span>
        </div>
        {burner.mill && (
          <div style={styles.burnerDetail}>
            <span style={styles.detailLabel}>Mill:</span>
            <span style={styles.detailValue}>{burner.mill.mill}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Comparison with adjacent elevations
 */
function AdjacentComparison({ current, prev, next }) {
  return (
    <div style={styles.comparisonContainer}>
      <div style={styles.comparisonHeader}>
        <span style={styles.comparisonLabel}>ADJACENT ELEVATIONS</span>
      </div>
      
      <div style={styles.comparisonGrid}>
        {prev && (
          <ComparisonCard 
            label="Below" 
            layer={prev} 
            comparisonTo={current}
            direction="down"
          />
        )}
        
        <div style={styles.currentIndicator}>
          <span style={styles.currentLabel}>CURRENT</span>
          <span style={styles.currentValue}>
            {current.temperature.avg?.toFixed(0) || "N/A"}°C
          </span>
        </div>
        
        {next && (
          <ComparisonCard 
            label="Above" 
            layer={next} 
            comparisonTo={current}
            direction="up"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Comparison card for adjacent elevation
 */
function ComparisonCard({ label, layer, comparisonTo, direction }) {
  const tempDiff = layer.temperature.avg && comparisonTo.temperature.avg
    ? layer.temperature.avg - comparisonTo.temperature.avg
    : null;
  
  const diffColor = tempDiff > 0 ? "#ef4444" : tempDiff < 0 ? "#22c55e" : "#9ca3af";
  const diffIcon = tempDiff > 0 ? "🔺" : tempDiff < 0 ? "🔻" : "➖";
  
  return (
    <div style={styles.comparisonCard}>
      <div style={styles.comparisonLabel}>{label}</div>
      <div style={styles.comparisonValue}>
        {layer.temperature.avg?.toFixed(0) || "N/A"}°C
      </div>
      {tempDiff !== null && (
        <div style={{ ...styles.comparisonDiff, color: diffColor }}>
          {diffIcon} {Math.abs(tempDiff).toFixed(0)}°C
        </div>
      )}
    </div>
  );
}

/**
 * Simple stat card component
 */
function StatCard({ label, value, color, icon }) {
  return (
    <div 
      style={styles.statCard}
      onMouseEnter={(e) => {
        e.target.style.transform = "translateY(-2px)";
        e.target.style.boxShadow = `0 4px 12px ${color}20`;
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = "translateY(0)";
        e.target.style.boxShadow = "none";
      }}
    >
      <div style={{ ...styles.statIcon, color }}>{icon}</div>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color }}>{value}</div>
    </div>
  );
}

/**
 * Temperature range bar visualization
 */
function TemperatureBar({ current, min, max }) {
  if (!current || !min || !max) return null;
  
  const range = max - min || 1;
  const position = ((current - min) / range) * 100;
  const color = getTemperatureColor(current);
  
  return (
    <div style={styles.tempBarContainer}>
      <div style={styles.tempBarTrack}>
        <div 
          style={{
            ...styles.tempBarFill,
            left: `${position}%`,
            background: color
          }}
        />
      </div>
      <div style={styles.tempBarLabels}>
        <span style={styles.tempBarLabel}>{min.toFixed(0)}°C</span>
        <span style={styles.tempBarLabel}>{max.toFixed(0)}°C</span>
      </div>
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
  // Header
  headerContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    padding: "12px",
    background: "rgba(139, 92, 246, 0.1)",
    borderRadius: "8px",
    border: "1px solid rgba(139, 92, 246, 0.2)"
  },
  headerInfo: {
    flex: 1
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 700,
    color: "#c4b5fd",
    marginBottom: "4px"
  },
  headerIcon: {
    fontSize: "16px"
  },
  headerSubtitle: {
    fontSize: "10px",
    color: "rgba(200, 220, 255, 0.6)",
    fontWeight: 500
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
  
  // Stats
  statsContainer: {
    marginBottom: "16px",
    padding: "12px",
    background: "rgba(30, 41, 59, 0.5)",
    borderRadius: "8px",
    border: "1px solid rgba(59, 130, 246, 0.12)"
  },
  statsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px"
  },
  statsLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#e2e8f0",
    letterSpacing: "0.5px"
  },
  statusBadge: {
    fontSize: "9px",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "4px",
    border: "1px solid",
    background: "rgba(255, 255, 255, 0.05)"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    marginBottom: "12px"
  },
  statCard: {
    padding: "10px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "6px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    textAlign: "center",
    transition: "all 0.2s ease",
    transform: "translateY(0)"
  },
  statIcon: {
    fontSize: "18px",
    marginBottom: "6px"
  },
  statLabel: {
    fontSize: "9px",
    color: "rgba(200, 220, 255, 0.6)",
    marginBottom: "4px",
    fontWeight: 500
  },
  statValue: {
    fontSize: "12px",
    fontWeight: 700
  },
  
  // Temperature bar
  tempBarContainer: {
    marginTop: "8px"
  },
  tempBarTrack: {
    position: "relative",
    height: "6px",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "3px",
    overflow: "hidden"
  },
  tempBarFill: {
    position: "absolute",
    top: 0,
    height: "100%",
    width: "4px",
    borderRadius: "2px",
    boxShadow: "0 0 8px currentColor"
  },
  tempBarLabels: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "4px"
  },
  tempBarLabel: {
    fontSize: "9px",
    color: "rgba(200, 220, 255, 0.5)",
    fontWeight: 500
  },
  
  // Burner list
  burnerContainer: {
    marginBottom: "16px"
  },
  burnerHeader: {
    marginBottom: "8px"
  },
  burnerLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#e2e8f0",
    letterSpacing: "0.5px"
  },
  burnerList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  burnerCard: {
    padding: "10px",
    background: "rgba(30, 41, 59, 0.4)",
    borderRadius: "6px",
    border: "1px solid rgba(59, 130, 246, 0.1)",
    transition: "all 0.2s ease",
    transform: "translateY(0)"
  },
  burnerCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px"
  },
  burnerCorner: {
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  burnerIcon: {
    fontSize: "12px"
  },
  burnerCornerName: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#e2e8f0"
  },
  burnerTemp: {
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: "'DM Mono', monospace"
  },
  burnerDetails: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap"
  },
  burnerDetail: {
    display: "flex",
    gap: "4px"
  },
  detailLabel: {
    fontSize: "9px",
    color: "rgba(200, 220, 255, 0.5)",
    fontWeight: 500
  },
  detailValue: {
    fontSize: "10px",
    color: "#e2e8f0",
    fontWeight: 600
  },
  
  // Comparison
  comparisonContainer: {
    padding: "12px",
    background: "rgba(30, 41, 59, 0.4)",
    borderRadius: "8px",
    border: "1px solid rgba(59, 130, 246, 0.1)"
  },
  comparisonHeader: {
    marginBottom: "10px"
  },
  comparisonLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#e2e8f0",
    letterSpacing: "0.5px"
  },
  comparisonGrid: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: "8px",
    alignItems: "center"
  },
  comparisonCard: {
    padding: "8px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "6px",
    textAlign: "center"
  },
  comparisonValue: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#e2e8f0",
    margin: "4px 0"
  },
  comparisonDiff: {
    fontSize: "9px",
    fontWeight: 600
  },
  currentIndicator: {
    padding: "10px",
    background: "rgba(139, 92, 246, 0.15)",
    borderRadius: "6px",
    border: "1px solid rgba(139, 92, 246, 0.3)",
    textAlign: "center"
  },
  currentLabel: {
    fontSize: "9px",
    color: "#c4b5fd",
    fontWeight: 600,
    marginBottom: "4px"
  },
  currentValue: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#c4b5fd"
  }
};