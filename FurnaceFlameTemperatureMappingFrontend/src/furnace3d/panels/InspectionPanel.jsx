/**
 * Inspection Panel Component
 *
 * Provides detailed inspection capabilities for furnace elements.
 * Features include:
 * - Burner-level inspection with status, temperature, and controls
 * - Layer-level inspection with temperature statistics
 * - Furnace-level overview with aggregate statistics
 * - Simulation controls for burner overrides
 * - Real-time status indicators and condition monitoring
 * - Modern UI with enhanced visual feedback
 *
 * Design language: dark industrial dashboard with glass-morphism
 * panels, gradient accents, and smooth micro-interactions.
 */

import { useFurnaceStore, useEffectiveBurner } from "../state/FurnaceStore";
import { DATA_MODES, BURNER_STATUS_COLOR } from "../config/furnaceConfig";
import { temperatureStatusLabel, temperatureToColor } from "../utils/temperatureScale";
import { panelStyles as S } from "./panelStyles";
import { useEffect } from "react";

// ============================================================================
// SVG ICON LIBRARY — minimal line icons for industrial instrumentation
// ============================================================================

const IconThermometer = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C9.79 2 8 3.79 8 6C8 8.44 10.14 10.28 12.04 10.86C12.01 10.58 12 10.29 12 10C12 6.69 14.69 4 18 4C21.31 4 24 6.69 24 10C24 12.46 22.27 14.5 19.65 14.91C19.66 14.94 19.66 14.97 19.65 15C19.66 15.03 19.66 15.06 19.65 15.09C19.66 15.06 19.66 15.03 19.65 15C19.66 10.58 16.25 7 12 7C7.58 7 4 10.58 4 15C4 19.42 7.58 23 12 23C16.42 23 20 19.42 20 15C20 11.34 16.97 8.15 14 6.69C13.64 7.97 12.87 9.12 11.79 10C10.05 12.25 10 15.07 11.89 17.82C11.96 17.93 12 18.06 12 18.2C12 20.31 10.31 22 8 22C5.79 22 4 20.21 4 18C4 16.53 4.75 15.23 5.91 14.38C5.96 14.35 6 14.32 6 14.28C6 14.24 5.96 14.21 5.91 14.18C4.75 13.33 4 12.04 4 10.5C4 7.41 6.41 4.86 9.28 4.18C8.84 3.79 8.5 3.28 8.31 2.71C8.21 2.44 8.13 2.17 8.09 1.89C8.06 1.67 8.04 1.45 8.03 1.22C8.02 0.94 8.03 0.66 8.08 0.38C8.13 0.11 8.22 -0.16 8.41 -0.38" transform="translate(1 1)" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconFlame = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C12 2 8 7 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 7 12 2 12 2Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16V22" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 20H15" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconGauge = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12C21 7.58 17.42 4 13 4C8.58 4 5 7.58 5 12C5 16.42 8.58 20 13 20C17.42 20 21 16.42 21 12Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13 8V12L16 14" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconTarget = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke="currentColor"/>
    <circle cx="12" cy="12" r="3" strokeWidth="1.5" stroke="currentColor"/>
    <path d="M12 2V6" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M12 18V22" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
  </svg>
);

const IconLayers = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7V12C2 16.42 6.58 20 12 22C17.42 20 22 16.42 22 12V7L12 2Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12L2 7V12C2 14.21 4.79 16 8 16H16C19.21 16 22 14.21 22 12V7L12 12Z" strokeWidth="1.5" stroke="currentColor" fill="none"/>
  </svg>
);

const IconGrid = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="1.5" stroke="currentColor"/>
    <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="1.5" stroke="currentColor"/>
    <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="1.5" stroke="currentColor"/>
    <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="1.5" stroke="currentColor"/>
  </svg>
);

const IconWind = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 12H19" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M8 9L5 12L8 15" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 9L19 12L16 15" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconSettings = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19.4 13a7.5 7.5 0 0 0 0-2 1.5 1.5 0 0 0-.35.25 1.5 1.5 0 0 0-.25.35Z" strokeWidth="1.5" stroke="currentColor"/>
    <path d="M19.4 11a7.5 7.5 0 0 0 0 2 1.5 1.5 0 0 0-.35-.25 1.5 1.5 0 0 0-.25-.35Z" strokeWidth="1.5" stroke="currentColor"/>
    <path d="M15.3 19.3a1.5 1.5 0 0 0 0-2.7 1.5 1.5 0 0 0 0 2.7Z" strokeWidth="1.5" stroke="currentColor"/>
    <path d="M15.3 4.7a1.5 1.5 0 0 0 0 2.7 1.5 1.5 0 0 0 0-2.7Z" strokeWidth="1.5" stroke="currentColor"/>
    <path d="M4.7 11a7.5 7.5 0 0 0 0 2 1.5 1.5 0 0 0-.35.25 1.5 1.5 0 0 0-.25.35Z" strokeWidth="1.5" stroke="currentColor"/>
    <path d="M4.7 13a7.5 7.5 0 0 0 0-2 1.5 1.5 0 0 0 .35.25 1.5 1.5 0 0 0 .25.35Z" strokeWidth="1.5" stroke="currentColor"/>
    <path d="M8.7 4.6a1.5 1.5 0 0 0 2.7 0 1.5 1.5 0 0 0 0-2.7Z" strokeWidth="1.5" stroke="currentColor"/>
  </svg>
);

// ============================================================================
// UTILITY — colour helpers
// ============================================================================

/**
 * Maps a temperature condition label to a semantic colour.
 * Now correctly handles "ELEVATED" (returned by temperatureStatusLabel).
 */
function getConditionColor(condition) {
  switch (condition) {
    case "CRITICAL": return "#ef4444";
    case "ELEVATED": return "#f59e0b";
    case "WARNING": return "#f59e0b";   // legacy alias
    case "NORMAL":   return "#22c55e";
    case "NO DATA":  return "#6b7280";
    default:         return "#e2e8f0";
  }
}

/**
 * Maps a burner operational status to a semantic colour (uses config values).
 */
function getBurnerStatusColor(status) {
  return BURNER_STATUS_COLOR[status] || "#6b7280";
}

/**
 * Returns a pulse-animation name appropriate for the condition severity.
 */
function getPulseAnimation(condition) {
  if (condition === "CRITICAL") return "pulse-critical";
  if (condition === "ELEVATED" || condition === "WARNING") return "pulse-warning";
  return "pulse-normal";
}

// ============================================================================
// SUB-COMPONENT: IconicRow — label / value row with icon and status badge
// ============================================================================

function IconicRow({ label, value, icon, status, condition }) {
  const color = status ? getConditionColor(status) : condition ? getConditionColor(condition) : "rgba(200,220,255,0.7)";
  const dotColor = color;

  return (
    <div style={styles.dataRow}>
      <div style={styles.dataRowLeft}>
        <span style={{ ...styles.dataRowIcon, color: dotColor }}>{icon}</span>
        <span style={styles.dataRowLabel}>{label}</span>
      </div>
      <span style={{ ...styles.dataRowValue, color }}>
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: StatusBadge — small pill with coloured dot
// ============================================================================

function StatusBadge({ status, condition }) {
  const label = condition || status;
  const color = getConditionColor(condition || status);
  return (
    <span style={{ ...styles.statusBadge, background: `${color}20`, color, borderColor: `${color}40` }}>
      <span style={{ ...styles.statusDot, background: color, animation: getPulseAnimation(condition || status) }} />
      {label}
    </span>
  );
}

// ============================================================================
// SUB-COMPONENT: MetricCard — large numeric summary card
// ============================================================================

function MetricCard({ label, value, icon, condition }) {
  const color = condition ? getConditionColor(condition) : "#e2e8f0";
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricCardHeader}>
        <span style={{ ...styles.metricCardIcon, color }}>{icon}</span>
        <span style={styles.metricCardLabel}>{label}</span>
      </div>
      <div style={{ ...styles.metricCardValue, color }}>{value}</div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: CustomSlider — glass track with gradient fill & value bubble
// ============================================================================

function CustomSlider({ label, value, onChange, icon, min = 0.3, max = 1.6, step = 0.05, unit = "%" }) {
  const pct = ((value - min) / (max - min)) * 100;
  const displayValue = unit === "%" ? `${(value * 100).toFixed(0)}%` : `${value.toFixed(2)}x`;
  const thumbLeft = `${pct}%`;

  return (
    <div style={styles.sliderContainer}>
      <div style={styles.sliderHeader}>
        <div style={styles.sliderLabel}>
          <span style={styles.sliderIcon}>{icon}</span>
          <span>{label}</span>
        </div>
        <div style={styles.sliderValueBadge}>{displayValue}</div>
      </div>

      <div style={styles.sliderTrackWrapper}>
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => (
          <div
            key={tick}
            style={{
              ...styles.sliderTick,
              left: `${tick}%`,
              height: tick % 50 === 0 ? "6px" : "4px",
            }}
          />
        ))}

        {/* Gradient fill */}
        <div style={{ ...styles.sliderFill, width: `${pct}%` }} />

        {/* Track background */}
        <div style={styles.sliderTrackBg} />

        {/* Value bubble that follows the thumb */}
        <div style={{ ...styles.sliderBubble, left: thumbLeft }}>
          {displayValue}
        </div>

        {/* The actual range input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="inspection-panel-slider"
          style={styles.sliderInput}
        />
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: ToggleSwitch — styled replacement for native checkbox
// ============================================================================

function ToggleSwitch({ label, checked, onChange, icon }) {
  return (
    <div style={styles.toggleRow}>
      <span style={styles.toggleLabel}>
        <span style={styles.toggleIcon}>{icon}</span>
        {label}
      </span>
      <div
        style={{ ...styles.toggleTrack, ...(checked ? styles.toggleTrackOn : styles.toggleTrackOff) }}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <div style={{ ...styles.toggleThumb, ...(checked ? styles.toggleThumbOn : styles.toggleThumbOff) }} />
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: BurnerInspector — detailed burner card with all info + controls
// ============================================================================

function BurnerInspector({ burner }) {
  const { state, setBurnerOverride } = useFurnaceStore();
  const effective = useEffectiveBurner(burner);
  const isSimulation = state.mode === DATA_MODES.SIMULATION;
  const override = state.simulationOverrides[burner.id] || {};

  const alertThreshold = state.thresholds.alert;
  const warnThreshold = state.thresholds.warn;
  const condition = temperatureStatusLabel(effective.temperature, alertThreshold, warnThreshold);
  const statusColor = getBurnerStatusColor(effective.status);
  const tempColor = effective.temperature != null
    ? temperatureToColor(effective.temperature, alertThreshold, warnThreshold)
    : "#6b7280";
  const isDisabled = !!override.disabled;

  return (
    <div style={styles.inspectorCard}>
      {/* ── Header ── */}
      <div style={styles.inspectorHeader}>
        <div style={styles.inspectorTitle}>
          <IconFlame />
          <span style={{ color: statusColor }}>{burner.corner}</span>
          <span style={styles.inspectorTitleDivider}>·</span>
          <span style={styles.inspectorTitleDim}>LAYER</span>
          <span style={{ color: "#cbd5e1", fontWeight: 700 }}>{burner.layerIndex + 1}</span>
        </div>
        {effective.simulated && (
          <span style={styles.simBadge}>
            <span style={styles.simBadgeDot} />
            <span>SIMULATED</span>
          </span>
        )}
      </div>

      {/* ── Status dot bar ── */}
      <div style={styles.statusDotBar}>
        <span style={{ ...styles.statusDot, background: statusColor, animation: getPulseAnimation(effective.status) }} />
        <span style={styles.statusDotLabel}>STATUS</span>
        <span style={{ ...styles.statusDotValue, color: statusColor }}>{effective.status}</span>
      </div>

      {/* ── Data Grid ── */}
      <div style={styles.dataGrid}>
        <MetricCard
          icon={<IconGauge />}
          label="TEMPERATURE"
          value={effective.temperature != null ? `${effective.temperature.toFixed(0)}°C` : "—"}
          condition={condition}
        />
        <MetricCard
          icon={<IconTarget />}
          label="CONDITION"
          value={condition}
          condition={condition}
        />
      </div>

      {/* ── Property Rows ── */}
      <div style={styles.propertySection}>
        <div style={styles.propertyRow}>
          <IconicRow label="TILT" value={`${burner.tiltDeg.toFixed(1)}°`} icon={<IconSettings />} />
        </div>
        <div style={styles.propertyRow}>
          <IconicRow label="ANGLE" value={`${burner.angleDeg.toFixed(0)}°`} icon={<IconWind />} />
        </div>
        <div style={styles.propertyRow}>
          <IconicRow
            label="POSITION"
            value={`(${burner.position.x.toFixed(1)}, ${burner.position.y.toFixed(1)}, ${burner.position.z.toFixed(1)})`}
            icon={<IconGrid />}
          />
        </div>
        <div style={styles.propertyRow}>
          <IconicRow
            label="MILL LINKED"
            value={burner.mill.id}
            icon={<IconSettings />}
          />
        </div>
      </div>

      {/* ── Mill detail if present ── */}
      {burner.mill && (
        <div style={{ ...styles.simPanel, background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
          <div style={styles.sectionDivider}>MILL FLOW DATA</div>
          <div style={styles.dataGrid}>
            <MetricCard
              icon={<IconLayers />}
              label="COAL FLOW"
              value={burner.mill.coalFlowTph != null ? `${Number(burner.mill.coalFlowTph).toFixed(1)} TPH` : "—"}
            />
            <MetricCard
              icon={<IconWind />}
              label="PA FLOW"
              value={burner.mill.paFlowTph != null ? `${Number(burner.mill.paFlowTph).toFixed(1)} TPH` : "—"}
            />
          </div>
        </div>
      )}

      {/* ── Simulation Controls ── */}
      {isSimulation && (
        <div style={styles.simPanel}>
          <div style={styles.sectionDivider}>SIMULATION OVERRIDES</div>
          <CustomSlider
            icon={<IconLayers />}
            label="COAL FLOW"
            value={override.coalFlowMultiplier ?? 1}
            onChange={(val) => setBurnerOverride(burner.id, { coalFlowMultiplier: val })}
          />
          <CustomSlider
            icon={<IconWind />}
            label="AIR FLOW"
            value={override.airFlowMultiplier ?? 1}
            onChange={(val) => setBurnerOverride(burner.id, { airFlowMultiplier: val })}
          />
          <ToggleSwitch
            icon={<IconFlame />}
            label="Disable this burner"
            checked={isDisabled}
            onChange={(val) => setBurnerOverride(burner.id, { disabled: val })}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: LayerInspector — layer card with statistics + burner grid
// ============================================================================

function LayerInspector({ layer }) {
  const burnerCount = layer.burners.length;
  const activeBurners = layer.burners.filter((b) => b.temperature != null).length;
  const avgCondition = temperatureStatusLabel(layer.temperature.avg, 1350, 1300);

  return (
    <div style={styles.inspectorCard}>
      {/* ── Header ── */}
      <div style={styles.inspectorHeader}>
        <div style={styles.inspectorTitle}>
          <IconLayers />
          <span style={{ color: "#cbd5e1" }}>ELEVATION</span>
          <span style={{ color: "#3b82f6", fontWeight: 700 }}>{layer.label}</span>
          <span style={styles.inspectorTitleDim}>M</span>
        </div>
      </div>

      {/* ── Temperature Metrics ── */}
      <div style={styles.dataGrid}>
        <MetricCard
          icon={<IconThermometer />}
          label="MIN TEMP"
          value={layer.temperature.min != null ? `${layer.temperature.min.toFixed(0)}°C` : "—"}
        />
        <MetricCard
          icon={<IconThermometer />}
          label="MAX TEMP"
          value={layer.temperature.max != null ? `${layer.temperature.max.toFixed(0)}°C` : "—"}
        />
        <MetricCard
          icon={<IconTarget />}
          label="AVG TEMP"
          value={layer.temperature.avg != null ? `${layer.temperature.avg.toFixed(0)}°C` : "—"}
          condition={avgCondition}
        />
        <MetricCard
          icon={<IconGauge />}
          label="TILT"
          value={`${layer.tiltDeg.toFixed(1)}°`}
        />
      </div>

      {/* ── Burner Summary ── */}
      <div style={styles.propertySection}>
        <IconicRow
          label="ACTIVE BURNERS"
          value={`${activeBurners} / ${burnerCount}`}
          icon={<IconFlame />}
        />
      </div>

      {/* ── Burner Grid ── */}
      <div style={styles.sectionDivider}>BURNER DISTRIBUTION</div>
      <div className="burner-grid-scroll" style={styles.burnerGrid}>
        {layer.burners.map((b) => {
          const tempColor = b.temperature != null
            ? temperatureToColor(b.temperature, 1350, 1300)
            : "#6b7280";
          return (
            <div key={b.id} className="mini-burner-card" style={{ ...styles.miniBurnerCard, borderColor: `${tempColor}40` }}>
              <div style={styles.miniBurnerHeader}>
                <span style={styles.miniBurnerCorner}>{b.corner}</span>
                <span style={{ ...styles.miniBurnerStatusDot, background: tempColor }} />
              </div>
              <div style={{ ...styles.miniBurnerTemp, color: tempColor }}>
                {b.temperature != null ? `${b.temperature.toFixed(0)}°` : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: InspectionPanel
// ============================================================================

export default function InspectionPanel({ model }) {
  const { state } = useFurnaceStore();

  // Inject global CSS for custom range sliders, toggle switches,
  // and pulse/keyframe animations.
  useEffect(() => {
    if (typeof document === "undefined") return;

    const styleEl = document.createElement("style");
    styleEl.textContent =`
      /* Custom range thumb (WebKit) */
      .inspection-panel-slider::-webkit-slider-thumb {
        appearance: none;
        width: 18px;
        height: 18px;
        background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
        border: 2px solid rgba(139, 92, 247, 0.4);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 12px rgba(139, 92, 247, 0.5);
        margin-top: -5px;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .inspection-panel-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 16px rgba(139, 92, 247, 0.7);
      }
      .inspection-panel-slider::-webkit-slider-runnable-track {
        width: 100%;
        height: 8px;
        background: transparent;
        border-radius: 4px;
      }
      /* Custom range thumb (Firefox) */
      .inspection-panel-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
        border: 2px solid rgba(139, 92, 247, 0.4);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 12px rgba(139, 92, 247, 0.5);
        border: none;
      }
      .inspection-panel-slider::-moz-range-track {
        width: 100%;
        height: 8px;
        background: transparent;
        border-radius: 4px;
      }

      /* Pulse animations for status dots */
      @keyframes pulse-critical {
        0%, 100% { opacity: 1; transform: scale(1); filter: brightness(1); }
        50% { opacity: 0.6; transform: scale(1.3); filter: brightness(1.3) saturate(1.5); }
      }
      @keyframes pulse-warning {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.15); }
      }
      @keyframes pulse-normal {
        0%, 100% { opacity: 0.5; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.05); }
      }
      /* Subtle hover lift for burner grid cards */
      .mini-burner-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
      }

      /* Custom scrollbar for scrollable burner grid */
      .burner-grid-scroll::-webkit-scrollbar {
        width: 6px;
      }
      .burner-grid-scroll::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 3px;
      }
      .burner-grid-scroll::-webkit-scrollbar-thumb {
        background: rgba(59, 130, 246, 0.3);
        border-radius: 3px;
      }
      .burner-grid-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(59, 130, 246, 0.5);
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      if (document.head.contains(styleEl)) document.head.removeChild(styleEl);
    };
  }, []);

  if (!model) return null;

  // ── Burner selection ──
  if (state.selection.type === "burner") {
    const burner = model.layers
      .flatMap((l) => l.burners)
      .find((b) => b.id === state.selection.id);
    if (burner)
      return (
        <div style={S.section}>
          <div style={S.sectionLabel}>BURNER DETAIL</div>
          <BurnerInspector burner={burner} />
        </div>
      );
  }

  // ── Layer selection ──
  if (state.selection.type === "layer") {
    const layer = model.layers.find((l) => l.id === state.selection.id);
    if (layer)
      return (
        <div style={S.section}>
          <div style={S.sectionLabel}>LAYER DETAIL</div>
          <LayerInspector layer={layer} />
        </div>
      );
  }

  // ── Default furnace overview ──
  const totalBurners = model.layers.reduce((sum, l) => sum + l.burners.length, 0);
  const totalActive = model.layers.flatMap((l) => l.burners).filter((b) => b.temperature != null).length;
  const avgCondition = temperatureStatusLabel(model.stats.avg, 1350, 1300);
  const minCondition = temperatureStatusLabel(model.stats.min, 1350, 1300);
  const maxCondition = temperatureStatusLabel(model.stats.max, 1350, 1300);

  return (
    <div style={S.section}>
      <div style={S.sectionLabel}>FURNACE OVERVIEW</div>

      {/* ── Summary Metric Cards ── */}
      <div style={styles.overviewMetrics}>
        <MetricCard
          icon={<IconThermometer />}
          label="MIN TEMPERATURE"
          value={model.stats.min != null ? `${model.stats.min.toFixed(0)}°C` : "—"}
          condition={minCondition}
        />
        <MetricCard
          icon={<IconThermometer />}
          label="MAX TEMPERATURE"
          value={model.stats.max != null ? `${model.stats.max.toFixed(0)}°C` : "—"}
          condition={maxCondition}
        />
        <MetricCard
          icon={<IconTarget />}
          label="AVG TEMPERATURE"
          value={model.stats.avg != null ? `${model.stats.avg.toFixed(0)}°C` : "—"}
          condition={avgCondition}
        />
      </div>

      {/* ── Layer & Burner Count ── */}
      <div style={styles.overviewMetrics}>
        <MetricCard
          icon={<IconLayers />}
          label="TOTAL LAYERS"
          value={`${model.layers.length}`}
        />
        <MetricCard
          icon={<IconFlame />}
          label="TOTAL BURNERS"
          value={`${totalBurners}`}
        />
        <MetricCard
          icon={<IconGauge />}
          label="ACTIVE BURNERS"
          value={`${totalActive}`}
        />
      </div>

      {/* ── Helper card ── */}
      <div style={styles.helperCard}>
        <span style={styles.helperIcon}>👆</span>
        <div style={styles.helperContent}>
          <div style={styles.helperTitle}>INTERACTIVE INSPECTION</div>
          <div style={styles.helperText}>
            Click any layer or burner in the 3D view to drill down into
            detailed temperature data, condition status, and simulation controls.
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  // ── Inspector Card (Burner / Layer) ──
  inspectorCard: {
    background: "linear-gradient(135deg, rgba(30,41,59,0.7) 0%, rgba(15,23,45,0.75) 100%)",
    borderRadius: "14px",
    border: "1px solid rgba(59, 130, 246, 0.25)",
    backdropFilter: "blur(16px) saturate(180%)",
    overflow: "visible",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
  },

  // ── Inspector Header ──
  inspectorHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    background: "rgba(59, 130, 246, 0.08)",
    borderBottom: "1px solid rgba(59, 130, 246, 0.2)",
  },
  inspectorTitle: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
    fontWeight: 700,
    color: "#e2e8f0",
  },
  inspectorTitleDivider: {
    color: "rgba(200, 220, 255, 0.4)",
  },
  inspectorTitleDim: {
    color: "rgba(200, 220, 255, 0.45)",
    fontSize: "11px",
    letterSpacing: "0.05em",
  },

  // ── SIM badge ──
  simBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "9px",
    fontWeight: 700,
    color: "#ddd6fe",
    background: "rgba(167, 139, 250, 0.15)",
    border: "1px solid rgba(167, 139, 250, 0.4)",
    padding: "4px 10px",
    borderRadius: "6px",
    letterSpacing: "0.05em",
  },
  simBadgeDot: {
    width: "5px",
    height: "5px",
    borderRadius: "50%",
    background: "#a78bfa",
    boxShadow: "0 0 6px #a78bfa",
  },

  // ── Status Dot Bar ──
  statusDotBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    background: "rgba(255, 255, 255, 0.02)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    boxShadow: "0 0 8px currentColor",
  },
  statusDotLabel: {
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.1em",
    color: "rgba(200, 220, 255, 0.45)",
    textTransform: "uppercase",
  },
  statusDotValue: {
    fontSize: "12px",
    fontWeight: 700,
  },

  // ── Data Grid (MetricCards) ──
  dataGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "10px",
    padding: "16px 20px",
  },

  // ── MetricCard ──
  metricCard: {
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    padding: "14px",
    textAlign: "center",
    transition: "all 0.2s ease",
  },
  metricCardHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    marginBottom: "8px",
  },
  metricCardIcon: {
    fontSize: "16px",
    opacity: 0.8,
  },
  metricCardLabel: {
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.1em",
    color: "rgba(200, 220, 255, 0.45)",
    textTransform: "uppercase",
  },
  metricCardValue: {
    fontSize: "16px",
    fontWeight: 800,
    fontFamily: "'DM Mono', monospace",
    lineHeight: 1.2,
  },

  // ── Property Section ──
  propertySection: {
    padding: "0 20px",
    marginBottom: "4px",
  },
  propertyRow: {
    marginBottom: "6px",
  },

  // ── Simulation Panel ──
  simPanel: {
    margin: "16px 20px 20px",
    padding: "16px",
    background: "rgba(139, 92, 246, 0.08)",
    borderRadius: "12px",
    border: "1px solid rgba(139, 92, 246, 0.2)",
    transition: "border-color 0.2s ease",
  },

  // ── Section Divider ──
  sectionDivider: {
    fontSize: "9px",
    fontWeight: 800,
    color: "rgba(200, 220, 255, 0.5)",
    letterSpacing: "0.12em",
    margin: "16px 0 12px",
    paddingBottom: "8px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    textTransform: "uppercase",
  },

  // ── Data Row (IconicRow) ──
  dataRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "8px",
    marginBottom: "4px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    transition: "background 0.2s ease",
  },
  dataRowLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  dataRowIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  dataRowLabel: {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: "rgba(180, 210, 255, 0.55)",
    textTransform: "uppercase",
  },
  dataRowValue: {
    fontSize: "11px",
    fontWeight: 700,
    fontFamily: "'DM Mono', monospace",
  },

  // ── Status Badge ──
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "10px",
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: "10px",
    border: "1px solid",
    letterSpacing: "0.04em",
  },
  statusDot: {
    width: "5px",
    height: "5px",
    borderRadius: "50%",
  },

  // ── Custom Slider ──
  sliderContainer: {
    marginBottom: "18px",
  },
  sliderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  sliderLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    fontWeight: 700,
    color: "rgba(200, 220, 255, 0.8)",
  },
  sliderIcon: {
    display: "flex",
    alignItems: "center",
  },
  sliderValueBadge: {
    fontSize: "11px",
    fontWeight: 800,
    color: "#8b5cf6",
    background: "rgba(139, 92, 246, 0.15)",
    border: "1px solid rgba(139, 92, 246, 0.3)",
    padding: "3px 10px",
    borderRadius: "6px",
    fontFamily: "'DM Mono', monospace",
    minWidth: "50px",
    textAlign: "center",
  },
  sliderTrackWrapper: {
    position: "relative",
    height: "24px",
  },
  sliderTick: {
    position: "absolute",
    left: 0,
    top: "50%",
    transform: "translateY(-50%)",
    width: "2px",
    background: "rgba(200, 220, 255, 0.2)",
    borderRadius: "1px",
  },
  sliderFill: {
    position: "absolute",
    top: "50%",
    left: 0,
    height: "6px",
    background: "linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)",
    borderRadius: "3px",
    transform: "translateY(-50%)",
    boxShadow: "0 0 8px rgba(139, 92, 247, 0.4)",
    transition: "width 0.15s ease",
    pointerEvents: "none",
  },
  sliderTrackBg: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: "6px",
    background: "rgba(255, 255, 255, 0.08)",
    borderRadius: "3px",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  sliderBubble: {
    position: "absolute",
    top: "50%",
    transform: "translate(-50%, -150%)",
    fontSize: "9px",
    fontWeight: 800,
    color: "#ffffff",
    background: "rgba(30, 41, 59, 0.9)",
    border: "1px solid rgba(139, 92, 247, 0.3)",
    padding: "3px 8px",
    borderRadius: "4px",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
    transition: "left 0.1s ease",
  },
  sliderInput: {
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
    /* hide default fill */
    background: "transparent",
  },

  // ── Toggle Switch ──
  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  toggleLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "11px",
    fontWeight: 600,
    color: "rgba(200, 220, 255, 0.8)",
  },
  toggleIcon: {
    display: "flex",
    alignItems: "center",
  },
  toggleTrack: {
    width: "44px",
    height: "24px",
    borderRadius: "12px",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.25s ease",
  },
  toggleTrackOn: {
    background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
    boxShadow: "0 0 12px rgba(139, 92, 247, 0.4)",
  },
  toggleTrackOff: {
    background: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },
  toggleThumb: {
    position: "absolute",
    top: "2px",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    transition: "all 0.25s ease",
  },
  toggleThumbOn: {
    left: "22px",
    background: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
  },
  toggleThumbOff: {
    left: "2px",
    background: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
  },

  // ── Burner Grid ──
  burnerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
    padding: "0 20px 4px",
    maxHeight: "100px",
    overflowY: "auto",
  },
  miniBurnerCard: {
    padding: "12px 8px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    textAlign: "center",
    transition: "all 0.2s ease",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
    minWidth: "0",
  },
  miniBurnerHeader: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "6px",
    marginBottom: "6px",
  },
  miniBurnerCorner: {
    fontSize: "11px",
    fontWeight: 700,
    color: "rgba(200, 220, 255, 0.55)",
  },
  miniBurnerStatusDot: {
    width: "5px",
    height: "5px",
    borderRadius: "50%",
    boxShadow: "0 0 5px currentColor",
  },
  miniBurnerTemp: {
    fontSize: "12px",
    fontWeight: 800,
    fontFamily: "'DM Mono', monospace",
  },

  // ── Overview Metrics ──
  overviewMetrics: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    padding: "0 4px 8px",
  },

  // ── Helper Card ──
  helperCard: {
    display: "flex",
    gap: "14px",
    padding: "16px 20px",
    margin: "12px 4px 4px",
    background: "rgba(59, 130, 246, 0.08)",
    borderRadius: "12px",
    border: "1px solid rgba(59, 130, 246, 0.25)",
  },
  helperIcon: {
    fontSize: "28px",
    flexShrink: 0,
    opacity: 0.8,
  },
  helperContent: {
    flex: 1,
  },
  helperTitle: {
    fontSize: "12px",
    fontWeight: 800,
    color: "#e2e8f0",
    marginBottom: "4px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  helperText: {
    fontSize: "10px",
    color: "rgba(200, 220, 255, 0.65)",
    lineHeight: "1.5",
  },
};
