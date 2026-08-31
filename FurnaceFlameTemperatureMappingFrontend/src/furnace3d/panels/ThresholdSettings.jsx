/**
 * Threshold Settings Panel Component
 *
 * Allows users to configure critical (alert) and warning temperature
 * thresholds for furnace monitoring.
 *
 * Features:
 * - SVG icons for critical (alert) and warning thresholds
 * - Colour-coded number inputs (red for critical, amber for warning)
 * - Mini temperature scale preview with threshold markers
 * - Save / Cancel / Reset buttons with SVG icons
 * - Input validation (warn cannot exceed alert)
 */

import { useState } from "react";
import { useFurnaceStore } from "../state/FurnaceStore";
import { DEFAULT_TEMPERATURE_ALERT_C, DEFAULT_TEMPERATURE_WARN_C } from "../config/furnaceConfig";
import { TEMPERATURE_SCALE_STOPS } from "../utils/temperatureScale";
import { panelStyles as S } from "./panelStyles";

// ============================================================================
// SVG ICONS
// ============================================================================

const IconThermometer = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9C5 12.38 9.06 17.31 11.17 19.67C11.65 20.19 12.35 20.19 12.83 19.67C14.94 17.31 19 12.38 19 9C19 5.13 15.87 2 12 2Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16V22" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M9 20H15" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
  </svg>
);

const IconAlertCircle = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" strokeWidth="1.5" stroke="currentColor"/>
    <path d="M12 7V11" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <circle cx="12" cy="15" r="1" fill="currentColor"/>
  </svg>
);

const IconWarning = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.29 3.87C10.72 3.37 11.26 3.21 12 3.21C12.74 3.21 13.28 3.37 13.71 3.87L21.07 12.29C21.5 12.77 21.73 13.39 21.73 14.05C21.73 14.91 21.16 15.69 20.25 15.91L4.57 19.69C3.51 19.96 2.44 19.84 1.67 19.31C0.9 18.78 0.5 18 0.5 17.06C0.5 16.36 0.77 15.72 1.25 15.27L10.29 3.87Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 8V12" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M12 16H12.01" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M6 6L18 18" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
  </svg>
);

const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 12C4 7.58 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M4 4L8 8M8 8L12 4M8 8V4" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ============================================================================
// SUB-COMPONENT: TemperatureScalePreview — mini gradient bar with threshold markers
// ============================================================================

function TemperatureScalePreview({ alert, warn }) {
  // FIX: TEMPERATURE_SCALE_STOPS is a function
  const stops = TEMPERATURE_SCALE_STOPS();
  const min = stops[0]?.t ?? 0;
  const max = stops[stops.length - 1]?.t ?? 1;

  const gradientStops = stops
    .map((s, i) => {
      const pct = i === 0 ? 0 : i === stops.length - 1 ? 100 : ((s.t - min) / (max - min)) * 100;
      return `rgb(${s.color.join(",")}) ${pct.toFixed(0)}%`;
    })
    .join(", ");

  // Calculate threshold positions on the scale
  const alertPct = ((alert - min) / (max - min)) * 100;
  const warnPct = ((warn - min) / (max - min)) * 100;

  return (
    <div style={styles.scaleContainer}>
      <div style={styles.scaleBar}>
        <div
          style={{
            ...styles.scaleGradient,
            background: `linear-gradient(90deg, ${gradientStops})`,
          }}
        />
        {/* Threshold markers */}
        <div style={{ ...styles.scaleMarker, left: `${Math.min(100, Math.max(0, warnPct))}%` }}>
          <div style={{ ...styles.scaleMarkerLine, background: "#f59e0b" }} />
          <span style={{ ...styles.scaleMarkerLabel, color: "#f59e0b" }}>{warn}°C</span>
        </div>
        <div style={{ ...styles.scaleMarker, left: `${Math.min(100, Math.max(0, alertPct))}%` }}>
          <div style={{ ...styles.scaleMarkerLine, background: "#ef4444" }} />
          <span style={{ ...styles.scaleMarkerLabel, color: "#ef4444" }}>{alert}°C</span>
        </div>
      </div>
      <div style={styles.scaleMinMax}>
        <span style={styles.scaleMin}>{min}°C</span>
        <span style={styles.scaleMax}>{max}°C</span>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: ThresholdInput — colour-coded number input
// ============================================================================

function ThresholdInput({ label, value, onChange, icon, color, unit, min, max, description }) {
  return (
    <div style={styles.thresholdInputGroup}>
      <div style={styles.thresholdFieldHeader}>
        <label style={{ ...styles.thresholdLabel, color }}>
          <span style={styles.thresholdLabelIcon}>{icon}</span>
          {label}
        </label>
        <span style={styles.thresholdUnit}>{unit}</span>
      </div>
      <div style={{ ...styles.thresholdInputContainer, borderColor: color }}>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ ...styles.thresholdInput, color, caretColor: color }}
        />
        <span style={{ ...styles.thresholdInputSuffix, color }}>°C</span>
      </div>
      {description && <span style={styles.thresholdDescription}>{description}</span>}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ThresholdSettings({ onClose }) {
  const { state, setThresholds } = useFurnaceStore();
  const [alert, setAlert] = useState(state.thresholds.alert || DEFAULT_TEMPERATURE_ALERT_C);
  const [warn, setWarn] = useState(state.thresholds.warn || DEFAULT_TEMPERATURE_WARN_C);

  const save = () => {
    setThresholds({ alert, warn });
    onClose();
  };

  const reset = () => {
    setAlert(DEFAULT_TEMPERATURE_ALERT_C);
    setWarn(DEFAULT_TEMPERATURE_WARN_C);
  };

  const isWarnExceedsAlert = warn >= alert;

  return (
    <div style={S.section}>
      {/* ── Header with icon ── */}
      <div style={{ ...S.sectionLabel, gap: "6px" }}>
        <span style={{ display: "flex", alignItems: "center", opacity: 0.7 }}><IconThermometer /></span>
        ALERT THRESHOLDS
      </div>

      {/* ── Temperature Scale Preview ── */}
      <TemperatureScalePreview alert={alert} warn={warn} />

      {/* ── Critical Threshold Input ── */}
      <div style={{ marginTop: "14px" }}>
        <ThresholdInput
          label="CRITICAL (max)"
          icon={<IconAlertCircle />}
          value={alert}
          onChange={setAlert}
          color="#ef4444"
          unit="Maximum safe operating temperature"
          min={warn + 1}
          max={1500}
          description={isWarnExceedsAlert ? "Must be higher than warning threshold" : undefined}
        />
      </div>

      {/* ── Warning Threshold Input ── */}
      <div style={{ marginTop: "12px" }}>
        <ThresholdInput
          label="WARNING"
          icon={<IconWarning />}
          value={warn}
          onChange={setWarn}
          color="#f59e0b"
          unit="Temperature at which warnings begin"
          min={600}
          max={alert - 1}
          description={isWarnExceedsAlert ? "Must be lower than critical threshold" : undefined}
        />
      </div>

      {/* ── Validation Warning ── */}
      {isWarnExceedsAlert && (
        <div style={styles.validationWarning}>
          <span style={styles.validationWarningIcon}><IconAlertCircle /></span>
          <span>Warning threshold must be lower than critical threshold.</span>
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div style={styles.actionRow}>
        <button
          style={{ ...S.primaryBtn, ...styles.saveBtn }}
          onClick={save}
          disabled={isWarnExceedsAlert}
        >
          <span style={styles.btnIcon}><IconCheck /></span>
          <span>SAVE</span>
        </button>
        <button
          style={{ ...S.secondaryBtn, ...styles.cancelBtn }}
          onClick={onClose}
        >
          <span style={styles.btnIcon}><IconX /></span>
          <span>CANCEL</span>
        </button>
        <button
          style={{ ...S.secondaryBtn, ...styles.resetBtn }}
          onClick={reset}
        >
          <span style={styles.btnIcon}><IconRefresh /></span>
          <span>RESET</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  // ── Temperature Scale Preview ──
  scaleContainer: {
    marginTop: "12px",
    marginBottom: "8px",
  },
  scaleBar: {
    position: "relative",
    height: "16px",
    width: "100%",
    marginBottom: "4px",
  },
  scaleGradient: {
    position: "absolute",
    top: "6px",
    left: 0,
    right: 0,
    height: "6px",
    borderRadius: "3px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  scaleMarker: {
    position: "absolute",
    top: 0,
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    pointerEvents: "none",
  },
  scaleMarkerLine: {
    width: "2px",
    height: "10px",
    borderRadius: "1px",
    boxShadow: "0 0 4px currentColor",
  },
  scaleMarkerLabel: {
    fontSize: "8px",
    fontFamily: "'DM Mono', monospace",
    marginTop: "2px",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
    fontWeight: 700,
  },
  scaleMinMax: {
    display: "flex",
    justifyContent: "space-between",
    fontFamily: "'DM Mono', monospace",
    fontSize: "9px",
    color: "rgba(200, 220, 255, 0.4)",
  },
  scaleMin: {},
  scaleMax: {},

  // ── Threshold Input ──
  thresholdInputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  thresholdFieldHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  thresholdLabel: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "rgba(200, 220, 255, 0.8)",
    textTransform: "uppercase",
  },
  thresholdLabelIcon: {
    display: "flex",
    alignItems: "center",
  },
  thresholdUnit: {
    fontSize: "8px",
    color: "rgba(200, 220, 255, 0.4)",
    fontFamily: "'DM Mono', monospace",
  },
  thresholdInputContainer: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    width: "100%",
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid",
    borderLeft: "3px solid",
    background: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(4px)",
    transition: "all 0.2s ease",
  },
  thresholdInput: {
    flex: 1,
    border: "none",
    background: "transparent",
    outline: "none",
    fontFamily: "'DM Mono', monospace",
    fontSize: "14px",
    fontWeight: 700,
    color: "#e2e8f0",
  },
  thresholdInputSuffix: {
    fontSize: "12px",
    fontWeight: 800,
    fontFamily: "'DM Mono', monospace",
  },
  thresholdDescription: {
    fontSize: "8px",
    color: "rgba(200, 220, 255, 0.4)",
    fontFamily: "'Inter', sans-serif",
    fontStyle: "italic",
  },

  // ── Validation Warning ──
  validationWarning: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "8px",
    padding: "6px 10px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "6px",
  },
  validationWarningIcon: {
    display: "flex",
    alignItems: "center",
    color: "#ef4444",
  },

  // ── Action Row ──
  actionRow: {
    display: "flex",
    gap: "8px",
    marginTop: "14px",
  },
  saveBtn: {
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  cancelBtn: {
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  resetBtn: {
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  btnIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
};
