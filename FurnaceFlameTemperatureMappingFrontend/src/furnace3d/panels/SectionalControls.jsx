/**
 * Sectional Controls Panel Component
 *
 * Provides advanced 3D view controls for sectional inspection of the
 * furnace:
 * - Multi-clip toggle with per-axis cutting planes (X, Y, Z)
 * - Per-axis enable/disable and offset positioning
 * - Exploded view toggle with adjustable separation factor
 *
 * Features:
 * - Card-based axis controls with temperature-coloured accents
 * - Custom toggle switches replacing native checkboxes
 * - Gradient sliders with tick marks and value bubbles
 * - SVG icons for all controls
 * - Visual feedback for enabled / disabled states
 */

import { useEffect } from "react";
import { useFurnaceStore } from "../state/FurnaceStore";
import { panelStyles as S } from "./panelStyles";

// ============================================================================
// SVG ICONS — minimal line icons for sectional controls
// ============================================================================

const IconClipSlice = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 12H21" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M12 3V21" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
  </svg>
);

const IconXAxis = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 12H20" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M9 7L4 12L9 17" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 7L20 12L15 17" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconYAxis = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4V20" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M7 9L12 4L17 9" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 15L12 20L17 15" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconZAxis = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="5" width="14" height="14" rx="2" strokeWidth="1.5" stroke="currentColor"/>
    <path d="M9 9L15 15M15 9L9 15" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
  </svg>
);

const IconExploded = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="17" width="4" height="4" rx="1" strokeWidth="1.5" stroke="currentColor"/>
    <rect x="15" y="17" width="4" height="4" rx="1" strokeWidth="1.5" stroke="currentColor"/>
    <rect x="10" y="7" width="4" height="4" rx="1" strokeWidth="1.5" stroke="currentColor"/>
    <path d="M7 17L10 11" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M9 11L12 7" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M14 7L17 11" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M15 11L17 17" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
  </svg>
);

const IconCrosshair = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" strokeWidth="1.5" stroke="currentColor"/>
    <path d="M12 2V6" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M12 18V22" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M2 12H6" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M18 12H22" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
  </svg>
);

const IconCTScan = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke="currentColor" fill="none"/>
    <path d="M12 5V19M5 12H19" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>
);

// ============================================================================
// SUB-COMPONENT: PillToggle — compact on/off toggle button
// ============================================================================

function PillToggle({ active, onClick, icon, label, activeColor = "#3b82f6" }) {
  const activeStyle = {
    background: `linear-gradient(135deg, ${activeColor} 0%, #60a5fa 100%)`,
    boxShadow: `0 0 12px ${activeColor}40`,
    color: "#ffffff",
    borderColor: `${activeColor}80`,
  };
  const inactiveStyle = {
    background: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(59, 130, 246, 0.25)",
    color: "rgba(200, 220, 255, 0.6)",
    boxShadow: "none",
  };

  return (
    <button
      style={{
        ...styles.pillToggle,
        ...(active ? activeStyle : inactiveStyle),
      }}
      onClick={onClick}
    >
      <span style={styles.pillToggleIcon}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ============================================================================
// SUB-COMPONENT: CompactToggle — small toggle switch
// ============================================================================

function CompactToggle({ checked, onChange }) {
  return (
    <div
      style={{
        ...styles.compactToggleTrack,
        ...(checked ? styles.compactToggleOn : styles.compactToggleOff),
      }}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <div style={{
        ...styles.compactToggleThumb,
        ...(checked ? styles.compactToggleThumbOn : styles.compactToggleThumbOff),
      }} />
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: AxisSlider — slider with gradient fill and value bubble
// ============================================================================

function AxisSlider({ label, icon, axisColor, value, onChange, enabled, min = 0, max = 1, step = 0.01 }) {
  const pct = ((value - min) / (max - min)) * 100;
  const displayValue = `${Math.round(value * 100)}%`;
  const isEnabled = enabled !== undefined ? enabled : true;

  return (
    <div style={{ ...styles.axisSliderContainer, opacity: isEnabled ? 1 : 0.5 }}>
      {/* Header: label + icon + value */}
      <div style={styles.axisSliderHeader}>
        <div style={styles.axisSliderLabel}>
          <span style={{ ...styles.axisSliderIcon, color: axisColor }}>{icon}</span>
          <span style={{ color: axisColor, fontWeight: 700 }}>{label}</span>
        </div>
        <div style={{ ...styles.axisSliderValue, color: axisColor }}>
          {displayValue}
        </div>
      </div>

      {/* Track with fill */}
      <div style={styles.axisSliderTrackWrapper}>
        {/* Gradient fill */}
        <div style={{
          ...styles.axisSliderFill,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${axisColor} 0%, ${axisColor}80 100%)`,
        }} />
        {/* Track background */}
        <div style={styles.axisSliderTrackBg} />
        {/* Range input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={!isEnabled}
          className="sectional-slider"
          style={styles.axisSliderInput}
        />
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: AxisCutCard — card for a single axis clip plane
// =========================================================================

function AxisCutCard({ axis, icon, axisColor, axisName, clipPlane, onToggle, onOffsetChange }) {
  return (
    <div style={{ ...styles.axisCard, borderBottom: `1px solid ${axisColor}30` }}>
      <div style={styles.axisCardHeader}>
        <div style={styles.axisCardTitle}>
          <span style={{ ...styles.axisCardIcon, color: axisColor }}>{icon}</span>
          <span>{axisName}</span>
        </div>
        <CompactToggle
          checked={clipPlane.enabled}
          onChange={onToggle}
        />
      </div>

      <AxisSlider
        label={axisName}
        icon={icon}
        axisColor={axisColor}
        value={clipPlane.offset}
        onChange={onOffsetChange}
        enabled={clipPlane.enabled}
      />
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: FocusedViewIndicator — shows when focused view is active
// ============================================================================

function FocusedViewIndicator({ layerId, model, onExitFocus }) {
  const layer = model?.layers.find(l => l.id === layerId);
  
  if (!layer) return null;

  return (
    <div style={styles.focusedViewContainer}>
      <div style={styles.focusedViewHeader}>
        <div style={styles.focusedViewTitle}>
          <span style={styles.focusedViewIcon}>🎯</span>
          <span>FOCUSED VIEW</span>
        </div>
        <button
          onClick={onExitFocus}
          style={styles.exitFocusButton}
          title="Exit focused view (ESC)"
          onMouseEnter={(e) => {
            e.target.style.background = "rgba(139, 92, 246, 0.4)";
            e.target.style.borderColor = "rgba(139, 92, 246, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "rgba(139, 92, 246, 0.2)";
            e.target.style.borderColor = "rgba(139, 92, 246, 0.4)";
          }}
        >
          ✕ EXIT
        </button>
      </div>
      <div style={styles.focusedViewContent}>
        <div style={styles.focusedLayerInfo}>
          <span style={styles.focusedLayerLabel}>Elevation:</span>
          <span style={styles.focusedLayerValue}>{layer.label}M</span>
        </div>
        <div style={styles.focusedLayerInfo}>
          <span style={styles.focusedLayerLabel}>Temperature:</span>
          <span style={styles.focusedLayerValue}>
            {layer.temperature.avg?.toFixed(0) || "N/A"}°C
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SectionalControls({ model }) {
  return model ? <SectionalControlsContent model={model} /> : null;
}

function SectionalControlsContent({ model }) {
  const { state, setMultiClipEnabled, setClipPlane, toggleExplodedView, setExplosionFactor, clearFocusedLayer, setCTScanMode } = useFurnaceStore();

  const { multiClipEnabled, explodedView, clipPlanes, explosionFactor, isFocusedView, focusedLayerId, ctScanMode } = state;

  // Inject global CSS for custom range sliders
  useEffect(() => {
    if (typeof document === "undefined") return;

    const styleEl = document.createElement("style");
    styleEl.textContent =`
      .sectional-slider::-webkit-slider-thumb {
        appearance: none;
        width: 12px;
        height: 12px;
        background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
        border: 2px solid rgba(59, 130, 246, 0.4);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
        margin-top: -3px;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .sectional-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
      }
      .sectional-slider::-webkit-slider-runnable-track {
        width: 100%;
        height: 5px;
        background: transparent;
        border-radius: 3px;
      }
      .sectional-slider::-moz-range-thumb {
        width: 12px;
        height: 12px;
        background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
        border: 2px solid rgba(59, 130, 246, 0.4);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
        border: none;
      }
      .sectional-slider::-moz-range-track {
        width: 100%;
        height: 5px;
        background: transparent;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      if (document.head.contains(styleEl)) document.head.removeChild(styleEl);
    };
  }, []);

  // Axis configuration: icon, name, colour, state key
  const AXIS_CONFIG = [
    {
      key: "x",
      icon: <IconXAxis />,
      name: "X-AXIS CUT",
      color: "#ef4444",
      label: "X-AXIS",
    },
    {
      key: "y",
      icon: <IconYAxis />,
      name: "Y-AXIS CUT (VERTICAL)",
      color: "#22c55e",
      label: "Y-AXIS",
    },
    {
      key: "z",
      icon: <IconZAxis />,
      name: "Z-AXIS CUT",
      color: "#3b82f6",
      label: "Z-AXIS",
    },
  ];

  return (
    <div style={S.section}>
      <div style={S.sectionLabel}>ADVANCED SECTIONAL VIEW</div>

      {/* ── Focused View Indicator ── */}
      {isFocusedView && (
        <FocusedViewIndicator 
          layerId={focusedLayerId}
          model={model}
          onExitFocus={clearFocusedLayer}
        />
      )}

      {/* ── Toggle Row ── */}
      <div style={styles.toggleRow}>
        <PillToggle
          active={ctScanMode}
          onClick={() => setCTScanMode(!ctScanMode)}
          icon={<IconCTScan />}
          label="CT SCAN"
          activeColor="#06b6d4"
        />
        <PillToggle
          active={multiClipEnabled}
          onClick={() => setMultiClipEnabled(!multiClipEnabled)}
          icon={<IconClipSlice />}
          label="MULTI-CLIP"
          activeColor="#ef4444"
        />
        <PillToggle
          active={explodedView}
          onClick={toggleExplodedView}
          icon={<IconExploded />}
          label="EXPLODED"
          activeColor="#8b5cf6"
        />
      </div>

      {/* ── Multi-Clip Axis Controls ── */}
      {multiClipEnabled && (
        <div style={styles.axisSection}>
          {AXIS_CONFIG.map((axis) => (
            <AxisCutCard
              key={axis.key}
              axis={axis.key}
              icon={axis.icon}
              axisColor={axis.color}
              axisName={axis.name}
              clipPlane={clipPlanes[axis.key]}
              onToggle={(checked) => setClipPlane(axis.key, checked, clipPlanes[axis.key].offset)}
              onOffsetChange={(value) => setClipPlane(axis.key, clipPlanes[axis.key].enabled, value)}
            />
          ))}
        </div>
      )}

      {/* ── Exploded View ── */}
      <div style={styles.explodedSection}>
        <div style={styles.explodedHeader}>
          <div style={styles.explodedTitle}>
            <span style={styles.explodedTitleIcon}><IconExploded /></span>
            <span style={{ ...S.sectionLabel, marginBottom: 0 }}>EXPLODED VIEW</span>
          </div>
          <PillToggle
            active={explodedView}
            onClick={toggleExplodedView}
            icon={<IconCrosshair />}
            label={explodedView ? "ON" : "OFF"}
            activeColor="#8b5cf6"
          />
        </div>

        {explodedView && (
          <div style={styles.explosionSliderContainer}>
            <AxisSlider
              label="Explosion Factor"
              icon={<IconExploded />}
              axisColor="#8b5cf6"
              value={explosionFactor}
              onChange={setExplosionFactor}
              min={0.1}
              max={1.0}
              step={0.05}
            />
          </div>
        )}
      </div>

      {/* ── Helper Text ── */}
      {!multiClipEnabled && !explodedView && (
        <div style={{ ...S.helperText, padding: "12px", background: "rgba(59, 130, 246, 0.05)", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.1)" }}>
          Enable multi-clip for complex sectional views with multiple cutting planes,
          or use exploded view to separate furnace components for better inspection.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  // ── Toggle Row (top-level toggles) ──
  toggleRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
  },

  // ── Pill Toggle ──
  pillToggle: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    padding: "8px 12px",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.25s ease",
    textTransform: "uppercase",
    backdropFilter: "blur(4px)",
    border: "1px solid",
  },
  pillToggleIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },

  // ── Axis Section ──
  axisSection: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "16px",
  },

  // ── Axis Card ──
  axisCard: {
    padding: "14px",
    background: "rgba(30, 41, 59, 0.5)",
    borderRadius: "10px",
    border: "1px solid rgba(59, 130, 246, 0.12)",
    transition: "all 0.2s ease",
  },
  axisCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  axisCardTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "11px",
    fontWeight: 800,
    color: "#e2e8f0",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  axisCardIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },

  // ── Axis Slider ──
  axisSliderContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  axisSliderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  axisSliderLabel: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "10px",
    fontWeight: 700,
    color: "rgba(200, 220, 255, 0.8)",
    letterSpacing: "0.05em",
  },
  axisSliderIcon: {
    display: "flex",
    alignItems: "center",
  },
  axisSliderValue: {
    fontSize: "10px",
    fontWeight: 800,
    fontFamily: "'DM Mono', monospace",
  },
  axisSliderTrackWrapper: {
    position: "relative",
    height: "16px",
  },
  axisSliderFill: {
    position: "absolute",
    top: "50%",
    left: 0,
    height: "5px",
    borderRadius: "3px",
    transform: "translateY(-50%)",
    boxShadow: "0 0 6px rgba(59, 130, 246, 0.4)",
    transition: "width 0.15s ease",
    pointerEvents: "none",
  },
  axisSliderTrackBg: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: "5px",
    background: "rgba(255, 255, 255, 0.08)",
    borderRadius: "3px",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  axisSliderInput: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    appearance: "none",
    background: "transparent",
    cursor: "pointer",
    zIndex: 2,
    margin: 0,
    padding: 0,
  },

  // ── Compact Toggle ──
  compactToggleTrack: {
    width: "34px",
    height: "18px",
    borderRadius: "9px",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.25s ease",
    flexShrink: 0,
  },
  compactToggleOn: {
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    boxShadow: "0 0 8px rgba(59, 130, 246, 0.4)",
  },
  compactToggleOff: {
    background: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
  },
  compactToggleThumb: {
    position: "absolute",
    top: "1px",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    transition: "all 0.25s ease",
  },
  compactToggleThumbOn: {
    left: "18px",
    background: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.3)",
  },
  compactToggleThumbOff: {
    left: "2px",
    background: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
  },

  // ── Exploded View Section ──
  explodedSection: {
    borderTop: "1px solid rgba(59, 130, 246, 0.15)",
    paddingTop: "16px",
  },
  explodedHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  explodedTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  explodedTitleIcon: {
    display: "flex",
    alignItems: "center",
    opacity: 0.6,
  },
  explosionSliderContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  // ── Focused View Indicator ──
  focusedViewContainer: {
    marginBottom: "16px",
    padding: "14px",
    background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)",
    borderRadius: "10px",
    border: "1px solid rgba(139, 92, 246, 0.3)",
    backdropFilter: "blur(8px)"
  },
  focusedViewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px"
  },
  focusedViewTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "11px",
    fontWeight: 800,
    color: "#c4b5fd",
    letterSpacing: "0.05em"
  },
  focusedViewIcon: {
    fontSize: "14px"
  },
  exitFocusButton: {
    padding: "6px 12px",
    background: "rgba(139, 92, 246, 0.2)",
    border: "1px solid rgba(139, 92, 246, 0.4)",
    borderRadius: "6px",
    color: "#c4b5fd",
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
    letterSpacing: "0.05em"
  },
  focusedViewContent: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  focusedLayerInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "10px"
  },
  focusedLayerLabel: {
    color: "rgba(200, 220, 255, 0.6)",
    fontWeight: 500
  },
  focusedLayerValue: {
    color: "#c4b5fd",
    fontWeight: 700,
    fontFamily: "'DM Mono', monospace"
  },
};
