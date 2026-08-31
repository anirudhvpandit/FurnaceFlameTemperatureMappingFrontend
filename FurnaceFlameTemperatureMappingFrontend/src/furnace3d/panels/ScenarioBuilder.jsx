/**
 * Scenario Builder Panel Component
 *
 * Allows users to create custom furnace scenarios by overriding
 * individual burner parameters (coal flow, air flow, and enabled state).
 *
 * Features:
 * - Per-burner override cards with SVG icons
 * - Custom styled sliders with gradient fill and value bubbles
 * - Toggle switches for burner enable/disable
 * - Apply / Cancel action buttons
 * - Temperature-aware colour accents
 *
 * Design language: dark industrial dashboard with glass-morphism
 * cards, SVG line icons, gradient accents, and micro-interactions.
 */

import { useState, useEffect } from "react";
import { useFurnaceStore } from "../state/FurnaceStore";
import { temperatureToColor, temperatureStatusLabel } from "../utils/temperatureScale";
import { panelStyles as S } from "./panelStyles";

// ============================================================================
// SVG ICONS — minimal line icons consistent with InspectionPanel
// ============================================================================

const IconLayers = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7V12C2 16.42 6.58 20 12 22C17.42 20 22 16.42 22 12V7L12 2Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12L2 7V12C2 14.21 4.79 16 8 16H16C19.21 16 22 14.21 22 12V7L12 12Z" strokeWidth="1.5" stroke="currentColor" fill="none"/>
  </svg>
);

const IconWind = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 12H19" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M8 9L5 12L8 15" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 9L19 12L16 15" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconFlame = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C12 2 8 7 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 7 12 2 12 2Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 16V22" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 20H15" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPower = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2V6" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M4.93 4.93L7.05 7.05" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M2 12H6" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M4.93 19.07L7.05 16.95" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M12 18V22" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M16.95 16.95L19.07 19.07" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M20 12H18" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M19.07 4.93L16.95 7.05" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
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

// ============================================================================
// SUB-COMPONENT: ToggleSwitch — styled replacement for native checkbox
// ============================================================================

function ToggleSwitch({ checked, onChange, icon, label }) {
  return (
    <div style={styles.toggleRow}>
      <span style={styles.toggleLabel}>
        <span style={styles.toggleIcon}>{icon}</span>
        {label}
      </span>
      <div
        style={{
          ...styles.toggleTrack,
          ...(checked ? styles.toggleTrackOn : styles.toggleTrackOff),
        }}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <div style={{
          ...styles.toggleThumb,
          ...(checked ? styles.toggleThumbOn : styles.toggleThumbOff),
        }} />
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: ScenarioSlider — compact slider with gradient fill
// ============================================================================

function ScenarioSlider({ label, value, onChange, icon, min = 0.3, max = 1.6, step = 0.05 }) {
  const pct = ((value - min) / (max - min)) * 100;
  const displayValue = `${Math.round(value * 100)}%`;

  return (
    <div style={styles.sliderItem}>
      <div style={styles.sliderLabelRow}>
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
        {/* Range input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="scenario-slider"
          style={styles.sliderInput}
        />
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: BurnerOverrideCard
// =========================================================================

function BurnerOverrideCard({ burner, overrides, onChange }) {
  const { state } = useFurnaceStore();
  const burnerOverride = overrides[burner.id] || {};
  const isDisabled = !!burnerOverride.disabled;

  // Determine accent colour from burner temperature
  const tempColor = burner.temperature != null
    ? temperatureToColor(burner.temperature, state.thresholds.alert, state.thresholds.warn)
    : "#6b7280";

  return (
    <div style={{ ...styles.burnerCard, borderBottom: `1px solid ${tempColor}20` }}>
      {/* ── Header ── */}
      <div style={styles.burnerCardHeader}>
        <div style={styles.burnerCorner}>
          <span style={{ ...styles.burnerCornerText, color: tempColor }}>{burner.corner}</span>
          <span style={{ ...styles.burnerStatusDot, background: tempColor }} />
        </div>
        <span style={{ ...styles.burnerTemp, color: tempColor }}>
          {burner.temperature != null ? `${burner.temperature.toFixed(0)}°C` : "no data"}
        </span>
      </div>

      {/* ── Sliders ── */}
      <div style={styles.sliderGroup}>
        <ScenarioSlider
          icon={<IconLayers />}
          label="Coal Flow"
          value={burnerOverride.coalFlowMultiplier ?? 1}
          onChange={(val) => onChange(burner.id, "coalFlowMultiplier", val)}
        />
        <ScenarioSlider
          icon={<IconWind />}
          label="Air Flow"
          value={burnerOverride.airFlowMultiplier ?? 1}
          onChange={(val) => onChange(burner.id, "airFlowMultiplier", val)}
        />
      </div>

      {/* ── Disable Toggle ── */}
      <ToggleSwitch
        icon={<IconPower />}
        label="Disable this burner"
        checked={isDisabled}
        onChange={(val) => onChange(burner.id, "disabled", val)}
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ScenarioBuilder({ model, onClose }) {
  const { setBurnerOverride, applyScenario } = useFurnaceStore();
  const allBurners = model.layers.flatMap((l) => l.burners);
  const [overrides, setOverrides] = useState({});

  const handleChange = (id, field, value) => {
    setOverrides((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const applyCustom = () => {
    Object.entries(overrides).forEach(([id, patch]) => {
      setBurnerOverride(id, patch);
    });
    applyScenario("custom", allBurners);
    onClose();
  };

  // Inject global CSS for custom range sliders
  useEffect(() => {
    if (typeof document === "undefined") return;

    const styleEl = document.createElement("style");
    styleEl.textContent =`
      .scenario-slider::-webkit-slider-thumb {
        appearance: none;
        width: 12px;
        height: 12px;
        background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
        border: 2px solid rgba(59, 130, 246, 0.4);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
        margin-top: -3px;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .scenario-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
      }
      .scenario-slider::-webkit-slider-runnable-track {
        width: 100%;
        height: 6px;
        background: transparent;
        border-radius: 3px;
      }
      .scenario-slider::-moz-range-thumb {
        width: 12px;
        height: 12px;
        background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
        border: 2px solid rgba(59, 130, 246, 0.4);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
        border: none;
      }
      .scenario-slider::-moz-range-track {
        width: 100%;
        height: 6px;
        background: transparent;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      if (document.head.contains(styleEl)) document.head.removeChild(styleEl);
    };
  }, []);

  return (
    <div style={S.section}>
      <div style={S.sectionLabel}>CUSTOM SCENARIO</div>

      <div style={styles.burnerList}>
        {allBurners.map((b) => (
          <BurnerOverrideCard
            key={b.id}
            burner={b}
            overrides={overrides}
            onChange={handleChange}
          />
        ))}
      </div>

      {/* ── Action Buttons ── */}
      <div style={styles.actionRow}>
        <button
          style={{
            ...S.primaryBtn,
            ...styles.applyBtn,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
          onClick={applyCustom}
        >
          <IconCheck />
          <span>APPLY</span>
        </button>
        <button
          style={{
            ...S.secondaryBtn,
            ...styles.cancelBtn,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
          onClick={onClose}
        >
          <IconX />
          <span>CANCEL</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  // ── Burner List ──
  burnerList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "16px",
  },

  // ── Burner Card ──
  burnerCard: {
    padding: "14px",
    background: "rgba(30, 41, 59, 0.5)",
    borderRadius: "10px",
    border: "1px solid rgba(59, 130, 246, 0.12)",
    transition: "all 0.2s ease",
  },

  // ── Burner Card Header ──
  burnerCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  burnerCorner: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  burnerCornerText: {
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: "'DM Mono', monospace",
  },
  burnerStatusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    boxShadow: "0 0 6px currentColor",
  },
  burnerTemp: {
    fontSize: "10px",
    fontWeight: 600,
    color: "rgba(200, 220, 255, 0.5)",
  },

  // ── Slider Group ──
  sliderGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "12px",
  },

  // ── Slider ──
  sliderItem: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  sliderLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderLabel: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "10px",
    fontWeight: 700,
    color: "rgba(200, 220, 255, 0.8)",
    letterSpacing: "0.05em",
  },
  sliderIcon: {
    display: "flex",
    alignItems: "center",
  },
  sliderValueBadge: {
    fontSize: "10px",
    fontWeight: 800,
    color: "#3b82f6",
    background: "rgba(59, 130, 246, 0.15)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    padding: "2px 8px",
    borderRadius: "6px",
    fontFamily: "'DM Mono', monospace",
    minWidth: "42px",
    textAlign: "center",
  },
  sliderTrackWrapper: {
    position: "relative",
    height: "20px",
  },
  sliderTick: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: "2px",
    background: "rgba(200, 220, 255, 0.2)",
    borderRadius: "1px",
    pointerEvents: "none",
  },
  sliderFill: {
    position: "absolute",
    top: "50%",
    left: 0,
    height: "5px",
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
    height: "5px",
    background: "rgba(255, 255, 255, 0.08)",
    borderRadius: "3px",
    transform: "translateY(-50%)",
    pointerEvents: "none",
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
  },

  // ── Toggle Switch ──
  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.06)",
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
    width: "40px",
    height: "22px",
    borderRadius: "11px",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.25s ease",
  },
  toggleTrackOn: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    boxShadow: "0 0 10px rgba(239, 68, 68, 0.4)",
  },
  toggleTrackOff: {
    background: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },
  toggleThumb: {
    position: "absolute",
    top: "2px",
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    transition: "all 0.25s ease",
  },
  toggleThumbOn: {
    left: "20px",
    background: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
  },
  toggleThumbOff: {
    left: "2px",
    background: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
  },

  // ── Action Row ──
  actionRow: {
    display: "flex",
    gap: "10px",
    marginTop: "8px",
  },
  applyBtn: {
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  cancelBtn: {
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
};
