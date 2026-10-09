/**
 * Legend Panel Component
 *
 * A horizontal legend bar displaying:
 * - Temperature colour scale gradient with tick marks
 * - Burner status indicator chips
 * - Active data mode badge (simulation vs real)
 * - Currently selected furnace element
 *
 * Design language: dark industrial dashboard with glass-morphism
 * panels, SVG line icons, gradient accents, and consistent
 * typography with the rest of the 3D panel suite.
 */

import { useFurnaceStore } from "../state/FurnaceStore";
import { DATA_MODES, BURNER_STATUS, BURNER_STATUS_COLOR } from "../config/furnaceConfig";
import { TEMPERATURE_SCALE_STOPS, temperatureToColor } from "../utils/temperatureScale";
import { panelStyles as S } from "./panelStyles";

// ============================================================================
// SVG ICONS — minimal line icons consistent with InspectionPanel / LayerControls
// ============================================================================

const IconThermometer = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C9.79 2 8 3.79 8 6C8 8.44 10.14 10.28 12.04 10.86C12.01 10.58 12 10.29 12 10C12 6.69 14.69 4 18 4C21.31 4 24 6.69 24 10C24 12.46 22.27 14.5 19.65 14.91C19.66 14.94 19.66 14.97 19.65 15C19.66 15.03 19.66 15.06 19.65 15.09C19.66 15.06 19.66 15.03 19.65 15C19.66 10.58 16.25 7 12 7C7.58 7 4 10.58 4 15C4 19.42 7.58 23 12 23C16.42 23 20 19.42 20 15C20 11.34 16.97 8.15 14 6.69C13.64 7.97 12.87 9.12 11.79 10C10.05 12.25 10 15.07 11.89 17.82C11.96 17.93 12 18.06 12 18.2C12 20.31 10.31 22 8 22C5.79 22 4 20.21 4 18C4 16.53 4.75 15.23 5.91 14.38C5.96 14.35 6 14.32 6 14.28C6 14.24 5.96 14.21 5.91 14.18C4.75 13.33 4 12.04 4 10.5C4 7.41 6.41 4.86 9.28 4.18C8.84 3.79 8.5 3.28 8.31 2.71C8.21 2.44 8.13 2.17 8.09 1.89C8.06 1.67 8.04 1.45 8.03 1.22C8.02 0.94 8.03 0.66 8.08 0.38C8.13 0.11 8.22 -0.16 8.41 -0.38" transform="translate(1 1)" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconFlame = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C12 2 8 7 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 7 12 2 12 2Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16V22" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 20H15" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconDatabase = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 7V17C3 18.1 3.9 19 5 20V8C3.9 7.67 3.28 7.23 3 6.72V7Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 7V17C21 18.1 20.1 19 19 20V8C20.1 7.67 20.72 7.23 21 6.72V7Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 12L12 17L21 12" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconSparkles = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L13.5 8.5H20L13 12.5L15.5 19L12 15.5L8.5 19L11 12.5L4 8.5H10.5L12 2Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ============================================================================
// SUB-COMPONENT: TemperatureGradientBar
// ============================================================================

function TemperatureGradientBar({ thresholds }) {
  // FIX: TEMPERATURE_SCALE_STOPS is a function, not a plain array.
  // Call it with default thresholds to get the actual stop data.
  const stops = TEMPERATURE_SCALE_STOPS(thresholds?.alert, thresholds?.warn);
  const min = stops[0]?.t ?? 0;
  const max = stops[stops.length - 1]?.t ?? 1;

  // Build a valid CSS gradient string from the stops
  const gradientStops = stops
    .map((s, i) => {
      const pct = i === 0 ? 0 : i === stops.length - 1 ? 100 : ((s.t - min) / (max - min)) * 100;
      return `rgb(${s.color.join(",")}) ${pct.toFixed(0)}%`;
    })
    .join(", ");

  // Compute tick percentage positions
  const tickData = stops.map((s, i) => {
    const pct = i === 0 ? 0 : i === stops.length - 1 ? 100 : ((s.t - min) / (max - min)) * 100;
    return { temp: s.t, pct: pct.toFixed(1), color: `rgb(${s.color.join(",")})` };
  });

  // Threshold marker lines (warn / alert) on the gradient
  const warnPct = ((thresholds?.warn ?? 1300) - min) / (max - min) * 100;
  const alertPct = ((thresholds?.alert ?? 1350) - min) / (max - min) * 100;

  return (
    <div style={styles.tempScaleGroup}>
      <div style={styles.tempScaleHeader}>
        <span style={styles.legendCaption}>
          <span style={styles.legendCaptionIcon}><IconThermometer /></span>
          TEMPERATURE SCALE
        </span>
        <span style={styles.legendMinMax}>
          <span style={styles.minMaxLabel}>{min}°C</span>
          <span style={styles.minMaxDivider}>—</span>
          <span style={styles.minMaxLabel}>{max}°C</span>
        </span>
      </div>

      <div style={styles.gradientContainerTall}>
        {/* Tick marks */}
        {tickData.map((tick) => (
          <div
            key={tick.temp}
            style={{ ...styles.gradientTick, left: `${tick.pct}%` }}
          >
            <div style={styles.gradientTickLine} />
            <span style={{ ...styles.gradientTickLabel, color: tick.color }}>
              {tick.temp}°
            </span>
          </div>
        ))}

        {/* Threshold marker lines */}
        <div style={{ ...styles.thresholdLine, left: `${warnPct}%`, borderColor: "rgba(245, 158, 11, 0.6)" }} />
        <div style={{ ...styles.thresholdLine, left: `${alertPct}%`, borderColor: "rgba(239, 68, 68, 0.7)" }} />
        <span style={{ ...styles.thresholdLabel, left: `${warnPct}%` }}>WARN {thresholds?.warn ?? 1300}°C</span>
        <span style={{ ...styles.thresholdLabel, left: `${alertPct}%` }}>ALERT {thresholds?.alert ?? 1350}°C</span>

        {/* The gradient bar itself */}
        <div
          style={{
            ...styles.legendGradientTall,
            background: `linear-gradient(90deg, ${gradientStops})`,
          }}
        />
      </div>

      {/* Status legend beneath the gradient */}
      <div style={styles.statusLegendRow}>
        {STATUS_BANDS(thresholds).map((band) => (
          <span key={band.label} style={styles.statusLegendItem}>
            <span style={{ ...styles.statusLegendDot, background: band.color }} />
            {band.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Temperature status bands that match the colour scale stops.
 * Provides a human-readable label for each point on the gradient.
 */
function STATUS_BANDS(thresholds) {
  return [
    { label: "Cool",     temp: 800,  color: temperatureToColor(800, thresholds?.alert, thresholds?.warn) },
    { label: "Normal",   temp: 1000, color: temperatureToColor(1000, thresholds?.alert, thresholds?.warn) },
    { label: "Warm",     temp: 1100, color: temperatureToColor(1100, thresholds?.alert, thresholds?.warn) },
    { label: "WARN",     temp: thresholds?.warn ?? 1300,  color: temperatureToColor(thresholds?.warn ?? 1300, thresholds?.alert, thresholds?.warn) },
    { label: "ALERT",    temp: thresholds?.alert ?? 1350, color: temperatureToColor(thresholds?.alert ?? 1350, thresholds?.alert, thresholds?.warn) },
    { label: "Critical", temp: 1400, color: temperatureToColor(1400, thresholds?.alert, thresholds?.warn) },
    { label: "Hot",      temp: 1500, color: temperatureToColor(1500, thresholds?.alert, thresholds?.warn) },
  ];
}

// ============================================================================
// SUB-COMPONENT: StatusChips
// ============================================================================

function StatusChips() {
  const statusEntries = Object.entries(BURNER_STATUS_COLOR);

  return (
    <div style={styles.statusChips}>
      {statusEntries.map(([status, color]) => (
        <span key={status} style={styles.statusChip}>
          <span style={{ ...styles.statusChipDot, background: color }} />
          <span style={{ ...styles.statusChipLabel, color }}>{status}</span>
        </span>
      ))}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: ModeBadge
// ============================================================================

function ModeBadge() {
  const { state } = useFurnaceStore();
  const isSimulation = state.mode === DATA_MODES.SIMULATION;

  return (
    <span style={{
      ...styles.modeBadge,
      ...(isSimulation ? styles.modeBadgeSim : styles.modeBadgeReal),
    }}>
      <span style={styles.modeBadgeIcon}>
        {isSimulation ? <IconSparkles /> : <IconDatabase />}
      </span>
      <span>{isSimulation ? "SIMULATION MODE" : "REAL FTM DATA"}</span>
    </span>
  );
}

// ============================================================================
// SUB-COMPONENT: CornerTemperatureScale
// ============================================================================

function CornerTemperatureScale({ thresholds }) {
    const stops = [
    { temp: 800, color: temperatureToColor(800, thresholds.alert, thresholds.warn), label: "Cool" },
    { temp: 1000, color: temperatureToColor(1000, thresholds.alert, thresholds.warn), label: "Normal" },
    { temp: 1100, color: temperatureToColor(1100, thresholds.alert, thresholds.warn), label: "Warm" },
    { temp: thresholds.warn, color: temperatureToColor(thresholds.warn, thresholds.alert, thresholds.warn), label: "WARN" },
    { temp: thresholds.alert, color: temperatureToColor(thresholds.alert, thresholds.alert, thresholds.warn), label: "ALERT" },
    { temp: 1400, color: temperatureToColor(1400, thresholds.alert, thresholds.warn), label: "Critical" },
  ];

  return (
    <div style={styles.cornerScaleGroup}>
      <span style={styles.legendCaption}>
        <span style={styles.legendCaptionIcon}><IconFlame /></span>
        COLOR SCALE
      </span>
      <div style={styles.cornerScaleContainer}>
        {stops.map((stop) => (
          <div key={stop.temp} style={styles.cornerScaleItem}>
            <div
              style={{
                ...styles.cornerScaleColor,
                backgroundColor: stop.color,
                width: "18px",
                height: "18px",
                borderRadius: "4px",
                border: "1px solid rgba(255,255,255,0.3)",
                boxShadow: `0 0 6px ${stop.color}`,
              }}
            />
            <span style={{ ...styles.cornerScaleLabel, color: stop.color, fontWeight: 700 }}>
              {stop.temp}°C
            </span>
            <span style={styles.cornerScaleStatus}>{stop.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: SelectedDisplay
// ============================================================================

function SelectedDisplay() {
  const { state } = useFurnaceStore();
  const type = state.selection.type;
  const id = state.selection.id;

  const label = type
    ? `${type.toUpperCase()} • ${id}`
    : "None selected";

  const iconColor = type
    ? type === "burner" ? "#3b82f6" : type === "layer" ? "#8b5cf6" : "#e2e8f0"
    : "rgba(107, 114, 128, 0.6)";

  return (
    <div style={styles.selectedDisplay}>
      <span style={{ ...styles.selectedDisplayIcon, color: iconColor }}>
        {type ? <IconFlame /> : <IconSparkles />}
      </span>
      <span style={{ ...styles.selectedDisplayLabel, color: type ? "#e2e8f0" : "rgba(107, 114, 128, 0.6)" }}>
        {label}
      </span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Legend() {
  const { state } = useFurnaceStore();

  return (
    <div style={S.legendBar}>
      {/* Temperature Scale */}
      <TemperatureGradientBar thresholds={state.thresholds} />

      {/* Corner Temperature Scale */}
      <CornerTemperatureScale thresholds={state.thresholds} />

      {/* Burner Status */}
      <div style={styles.legendGroup}>
        <span style={styles.legendCaption}>
          <span style={styles.legendCaptionIcon}><IconFlame /></span>
          BURNER STATUS
        </span>
        <StatusChips />
      </div>

      {/* Mode Badge */}
      <div style={styles.legendGroup}>
        <ModeBadge />
      </div>

      {/* Selected Item */}
      <div style={styles.legendGroup}>
        <span style={styles.legendCaption}>SELECTED</span>
        <SelectedDisplay />
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  // ── Legend Groups ──
  legendGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    alignItems: "flex-start",
  },

  // ── Temperature Scale Group ──
  tempScaleGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    alignItems: "flex-start",
    minWidth: "220px",
  },

  // ── Corner Temperature Scale ──
  cornerScaleGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    alignItems: "flex-start",
  },
  cornerScaleContainer: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
  },
  cornerScaleItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  cornerScaleColor: {
    width: "12px",
    height: "12px",
    borderRadius: "2px",
    border: "1px solid rgba(255,255,255,0.2)",
  },
  cornerScaleLabel: {
    fontSize: "9px",
    fontFamily: "'DM Mono', monospace",
    color: "rgba(200, 220, 255, 0.7)",
    fontWeight: 600,
  },
  cornerScaleStatus: {
    fontSize: "9px",
    fontFamily: "'Inter', sans-serif",
    color: "rgba(200, 220, 255, 0.5)",
    fontWeight: 500,
  },

  // ── Section Caption ──
  legendCaption: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "rgba(180, 210, 255, 0.55)",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  legendCaptionIcon: {
    display: "flex",
    alignItems: "center",
    opacity: 0.7,
  },

  // ── Min / Max Labels ──
  legendMinMax: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "'DM Mono', monospace",
    fontSize: "10px",
    color: "rgba(200, 220, 255, 0.6)",
  },
  minMaxLabel: {
    fontSize: "10px",
    fontWeight: 700,
  },
  minMaxDivider: {
    color: "rgba(200, 220, 255, 0.3)",
    fontSize: "11px",
  },

  // ── Temperature Scale Header ──
  tempScaleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
    width: "100%",
  },

  // ── Gradient Container (holds bar + ticks) ──
  gradientContainer: {
    position: "relative",
    width: "140px",
    height: "12px",
  },

  // ── Temperature Gradient Bar ──
  legendGradient: {
    width: "100%",
    height: "100%",
    borderRadius: "6px",
    boxShadow: "0 0 10px rgba(59, 130, 246, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    transition: "box-shadow 0.2s ease",
  },

  // ── Tall Gradient Container & Bar (enhanced temp scale) ──
  gradientContainerTall: {
    position: "relative",
    width: "220px",
    height: "22px",
    marginTop: "4px",
    marginBottom: "2px",
  },
  legendGradientTall: {
    width: "100%",
    height: "100%",
    borderRadius: "5px",
    boxShadow: "0 0 14px rgba(59, 130, 246, 0.4)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
  },

  // ── Threshold Marker Lines ──
  thresholdLine: {
    position: "absolute",
    top: 0,
    width: "0px",
    height: "22px",
    borderLeft: "2px dashed",
    zIndex: 2,
  },
  thresholdLabel: {
    position: "absolute",
    top: "26px",
    transform: "translateX(-50%)",
    fontSize: "8px",
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
    color: "rgba(200, 220, 255, 0.8)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
  },

  // ── Status Legend (below gradient) ──
  statusLegendRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "4px",
  },
  statusLegendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    fontSize: "8px",
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
    color: "rgba(200, 220, 255, 0.75)",
    whiteSpace: "nowrap",
  },
  statusLegendDot: {
    width: "8px",
    height: "8px",
    borderRadius: "2px",
    boxShadow: "0 0 4px currentColor",
  },

  // ── Gradient Tick Mark ──
  gradientTick: {
    position: "absolute",
    top: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    pointerEvents: "none",
  },
  gradientTickLine: {
    width: "2px",
    height: "6px",
    background: "rgba(255, 255, 255, 0.4)",
    borderRadius: "1px",
    marginBottom: "2px",
  },
  gradientTickLabel: {
    fontSize: "8px",
    fontFamily: "'DM Mono', monospace",
    whiteSpace: "nowrap",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
  },

  // ── Status Chips ──
  statusChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center",
  },
  statusChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    padding: "3px 8px",
    borderRadius: "5px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(255, 255, 255, 0.03)",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
  },
  statusChipDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    boxShadow: "0 0 4px currentColor",
  },
  statusChipLabel: {
    lineHeight: 1.2,
  },

  // ── Mode Badge ──
  modeBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    padding: "5px 12px",
    borderRadius: "12px",
    border: "1px solid",
    backdropFilter: "blur(4px)",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
  },
  modeBadgeSim: {
    background: "linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(71, 86, 217, 0.15) 100%)",
    borderColor: "rgba(167, 139, 250, 0.4)",
    color: "#ddd6fe",
    boxShadow: "0 0 10px rgba(124, 58, 237, 0.2)",
  },
  modeBadgeReal: {
    background: "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.12) 100%)",
    borderColor: "rgba(74, 222, 128, 0.4)",
    color: "#bbf7d0",
    boxShadow: "0 0 10px rgba(34, 197, 94, 0.15)",
  },
  modeBadgeIcon: {
    display: "flex",
    alignItems: "center",
    opacity: 0.9,
  },

  // ── Selected Display ──
  selectedDisplay: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "11px",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
  },
  selectedDisplayIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  selectedDisplayLabel: {
    lineHeight: 1.3,
  },
};
