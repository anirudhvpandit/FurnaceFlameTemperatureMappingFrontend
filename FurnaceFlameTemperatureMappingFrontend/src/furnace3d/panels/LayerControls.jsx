/**
 * Layer Controls Panel Component
 *
 * Provides layer visibility management, opacity control, and
 * isolation functionality for the furnace 3D view.
 *
 * Features:
 * - Per-layer visibility toggle with custom styled switches
 * - Layer opacity slider with live preview
 * - Temperature-aware layer rows with colour-coded status
 * - Quick "Show All" and label toggle actions
 * - One-click layer isolation
 *
 * Design language: dark industrial dashboard with glass-morphism
 * panels, gradient accents, SVG line icons, and micro-interactions.
 */

import { useEffect } from "react";
import { useFurnaceStore } from "../state/FurnaceStore";
import { temperatureToColor, temperatureStatusLabel } from "../utils/temperatureScale";
import { panelStyles as S } from "./panelStyles";

// ============================================================================
// SVG ICONS — minimal line icons consistent with InspectionPanel
// ============================================================================

const IconEye = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} xmlns="http://www.w3.org/2000/svg">
    <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconLabel = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="1.5" stroke="currentColor"/>
    <path d="M3 9L12 14L21 9" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconOpacity = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke="currentColor"/>
    <path d="M2 12H22" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
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

// ============================================================================
// UTILITIES
// ============================================================================

function getTemperatureColor(tempC, alert, warn) {
  if (tempC == null) return "#6b7280";
  return temperatureToColor(tempC, alert, warn);
}

function getPulseAnimation(condition) {
  if (condition === "CRITICAL") return "pulse-critical";
  if (condition === "ELEVATED") return "pulse-warning";
  return "pulse-normal";
}

// ============================================================================
// SUB-COMPONENT: ActionButton — gradient button with icon
// ============================================================================

function ActionButton({ icon, label, onClick, active = false, variant = "primary" }) {
  return (
    <button
      style={{
        ...styles.actionButton,
        ...(variant === "primary"
          ? active ? styles.actionButtonActive : styles.actionButtonPrimary
          : active ? styles.actionButtonActiveSecondary : styles.actionButtonSecondary),
      }}
      onClick={onClick}
    >
      <span style={styles.actionButtonIcon}>{icon}</span>
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
      <div style={{ ...styles.compactToggleThumb, ...(checked ? styles.compactToggleThumbOn : styles.compactToggleThumbOff) }} />
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: LayerOpacitySlider — gradient slider with live value
// ============================================================================

function LayerOpacitySlider({ value, onChange }) {
  const pct = (value - 0.1) / (1 - 0.1) * 100;

  return (
    <div style={styles.opacitySliderContainer}>
      <div style={styles.opacitySliderHeader}>
        <div style={styles.opacitySliderLabel}>
          <span style={styles.opacitySliderIcon}><IconOpacity /></span>
          <span>OPACITY</span>
        </div>
        <div style={styles.opacitySliderValue}>{Math.round(value * 100)}%</div>
      </div>

      <div style={styles.opacitySliderTrackWrapper}>
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => (
          <div
            key={tick}
            style={{
              ...styles.opacitySliderTick,
              left: `${tick}%`,
              height: tick % 50 === 0 ? "6px" : "4px",
            }}
          />
        ))}

        {/* Gradient fill */}
        <div style={{ ...styles.opacitySliderFill, width: `${pct}%` }} />

        {/* Track background */}
        <div style={styles.opacitySliderTrackBg} />

        {/* The actual range input */}
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="layer-controls-slider"
          style={styles.opacitySliderInput}
        />
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: LayerRow — enhanced layer item with temperature accent
// ============================================================================

function LayerRow({ layer, visible, isSelected, isHovered, onSelect, onToggleVisibility, onIsolate, layerIds }) {
  const { state } = useFurnaceStore();
  const tempColor = getTemperatureColor(
    layer.temperature?.avg,
    state.thresholds.alert,
    state.thresholds.warn
  );
  const condition = temperatureStatusLabel(
    layer.temperature?.avg,
    state.thresholds.alert,
    state.thresholds.warn
  );
  const isCritical = condition === "CRITICAL" || condition === "ELEVATED";

  return (
    <div
      style={{
        ...styles.layerCard,
        ...(isSelected ? styles.layerCardSelected : {}),
        ...(isHovered && !isSelected ? styles.layerCardHover : {}),
      }}
      onClick={onSelect}
    >
      {/* Left accent bar coloured by temperature */}
      <div style={{ ...styles.layerAccent, background: tempColor }} />

      {/* Visibility toggle */}
      <CompactToggle checked={visible} onChange={onToggleVisibility} />

      {/* Layer info */}
      <div style={styles.layerInfo}>
        <div style={styles.layerName}>
          <span style={styles.layerNameText}>{layer.label}M</span>
          {isCritical && <span style={{ ...styles.layerPulseDot, background: tempColor, animation: getPulseAnimation(condition) }} />}
        </div>
        <div style={styles.layerTemp}>
          {layer.temperature?.avg != null
            ? <><span style={{ color: tempColor, fontWeight: 700 }}>{layer.temperature.avg.toFixed(0)}°C</span><span style={styles.layerTempSub}>avg</span></>
            : <span style={styles.layerTempNoData}>no data</span>
          }
        </div>
      </div>

      {/* Isolate button */}
      <button
        style={styles.isolateButton}
        onClick={onIsolate}
        title="Isolate this layer"
      >
        <IconTarget />
        <span>ISOLATE</span>
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LayerControls({ model }) {
  const {
    state,
    toggleLayerVisibility,
    showAllLayers,
    isolateLayer,
    selectLayer,
    toggleTemperatureLabels,
    setHover,
    setLayerOpacity,
  } = useFurnaceStore();

  if (!model) return null;

  const layerIds = model.layers.map((l) => l.id);

  // Inject global CSS for custom range sliders and animations
  useEffect(() => {
    if (typeof document === "undefined") return;

    const styleEl = document.createElement("style");
    styleEl.textContent =`
      /* Custom range thumb — shared by this component's slider */
      .layer-controls-slider::-webkit-slider-thumb {
        appearance: none;
        width: 14px;
        height: 14px;
        background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
        border: 2px solid rgba(59, 130, 246, 0.4);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        margin-top: -3px;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .layer-controls-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 14px rgba(59, 130, 246, 0.7);
      }
      .layer-controls-slider::-webkit-slider-runnable-track {
        width: 100%;
        height: 6px;
        background: transparent;
        border-radius: 3px;
      }
      .layer-controls-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
        border: 2px solid rgba(59, 130, 246, 0.4);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        border: none;
      }
      .layer-controls-slider::-moz-range-track {
        width: 100%;
        height: 6px;
        background: transparent;
        border-radius: 3px;
      }

      /* Pulse animation reuse (also used by InspectionPanel) */
      @keyframes pulse-critical-lc {
        0%, 100% { opacity: 1; transform: scale(1); filter: brightness(1); }
        50% { opacity: 0.5; transform: scale(1.4); filter: brightness(1.4) saturate(1.6); }
      }
      @keyframes pulse-warning-lc {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.2); }
      }
      @keyframes pulse-normal-lc {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50% { opacity: 0.9; transform: scale(1.08); }
      }
      .layer-pulse-critical { animation: pulse-critical-lc 1.5s ease-in-out infinite; }
      .layer-pulse-warning { animation: pulse-warning-lc 2s ease-in-out infinite; }
      .layer-pulse-normal { animation: pulse-normal-lc 3s ease-in-out infinite; }
    `;
    document.head.appendChild(styleEl);
    return () => {
      if (document.head.contains(styleEl)) document.head.removeChild(styleEl);
    };
  }, []);

  return (
    <div style={S.section}>
      <div style={S.sectionLabel}>LAYERS</div>

      {/* ── Action Bar ── */}
      <div style={styles.actionBar}>
        <ActionButton
          icon={<IconEye filled={false} />}
          label="SHOW ALL"
          onClick={() => showAllLayers(layerIds)}
          variant="primary"
        />
        <ActionButton
          icon={<IconLabel />}
          label={state.showTemperatureLabels ? "HIDE LABELS" : "SHOW LABELS"}
          onClick={toggleTemperatureLabels}
          active={state.showTemperatureLabels}
          variant="secondary"
        />
      </div>

      {/* ── Opacity Slider ── */}
      <LayerOpacitySlider value={state.layerOpacity} onChange={setLayerOpacity} />

      {/* ── Layer List ── */}
      <div style={styles.layerList}>
        {model.layers.map((layer) => {
          const visible = state.layerVisibility[layer.id] ?? true;
          const isSelected = state.selection.type === "layer" && state.selection.id === layer.id;
          const isHovered = state.hoveredObject?.type === "layer" && state.hoveredObject?.id === layer.id;

          return (
            <LayerRow
              key={layer.id}
              layer={layer}
              visible={visible}
              isSelected={isSelected}
              isHovered={isHovered}
              onSelect={() => {
                selectLayer(layer.id);
                setHover(null);
              }}
              onToggleVisibility={(e) => {
                e.stopPropagation();
                toggleLayerVisibility(layer.id);
              }}
              onIsolate={(e) => {
                e.stopPropagation();
                isolateLayer(layer.id, layerIds);
              }}
              layerIds={layerIds}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  // ── Action Bar ──
  actionBar: {
    display: "flex",
    gap: "8px",
    marginBottom: "14px",
  },

  // ── Action Button ──
  actionButton: {
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
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.25s ease",
    backdropFilter: "blur(4px)",
    textTransform: "uppercase",
  },
  actionButtonPrimary: {
    border: "1px solid rgba(59, 130, 246, 0.4)",
    background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
    color: "#ffffff",
    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
  },
  actionButtonPrimaryHover: {
    boxShadow: "0 6px 20px rgba(37, 99, 235, 0.45)",
    transform: "translateY(-2px)",
  },
  actionButtonActive: {
    border: "1px solid rgba(59, 130, 246, 0.4)",
    background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
    color: "#ffffff",
    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
  },
  actionButtonSecondary: {
    border: "1px solid rgba(59, 130, 246, 0.3)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "rgba(200, 220, 255, 0.8)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
  },
  actionButtonActiveSecondary: {
    border: "1px solid rgba(59, 130, 246, 0.5)",
    background: "rgba(59, 130, 246, 0.2)",
    color: "#e2e8f0",
    boxShadow: "0 0 16px rgba(59, 130, 246, 0.25)",
  },
  actionButtonIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },

  // ── Compact Toggle ──
  compactToggleTrack: {
    width: "36px",
    height: "20px",
    borderRadius: "10px",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.25s ease",
    flexShrink: 0,
    marginLeft: "4px",
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
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    transition: "all 0.25s ease",
  },
  compactToggleThumbOn: {
    left: "19px",
    background: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.3)",
  },
  compactToggleThumbOff: {
    left: "2px",
    background: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
  },

  // ── Opacity Slider ──
  opacitySliderContainer: {
    marginBottom: "16px",
  },
  opacitySliderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  opacitySliderLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.1em",
    color: "rgba(180, 210, 255, 0.55)",
    textTransform: "uppercase",
  },
  opacitySliderIcon: {
    display: "flex",
    alignItems: "center",
    opacity: 0.7,
  },
  opacitySliderValue: {
    fontSize: "11px",
    fontWeight: 800,
    color: "#3b82f6",
    background: "rgba(59, 130, 246, 0.15)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    padding: "3px 10px",
    borderRadius: "6px",
    fontFamily: "'DM Mono', monospace",
  },
  opacitySliderTrackWrapper: {
    position: "relative",
    height: "20px",
  },
  opacitySliderTick: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: "2px",
    background: "rgba(200, 220, 255, 0.18)",
    borderRadius: "1px",
  },
  opacitySliderFill: {
    position: "absolute",
    top: "50%",
    left: 0,
    height: "5px",
    background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
    borderRadius: "3px",
    transform: "translateY(-50%)",
    boxShadow: "0 0 6px rgba(59, 130, 246, 0.4)",
    transition: "width 0.15s ease",
    pointerEvents: "none",
  },
  opacitySliderTrackBg: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: "5px",
    background: "rgba(255, 255, 255, 0.06)",
    borderRadius: "3px",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  opacitySliderInput: {
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

  // ── Layer List ──
  layerList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  // ── Layer Card ──
  layerCard: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    background: "rgba(255, 255, 255, 0.02)",
    borderRadius: "8px",
    border: "1px solid rgba(59, 130, 246, 0.1)",
    borderLeft: "3px solid transparent",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  layerCardHover: {
    background: "rgba(59, 130, 246, 0.06)",
    borderColor: "rgba(59, 130, 246, 0.25)",
    transform: "translateX(2px)",
  },
  layerCardSelected: {
    background: "rgba(59, 130, 246, 0.12)",
    borderColor: "rgba(99, 179, 255, 0.5)",
    boxShadow: "0 0 12px rgba(59, 130, 246, 0.15)",
  },
  layerAccent: {
    width: "3px",
    height: "32px",
    borderRadius: "2px",
    boxShadow: "0 0 6px currentColor",
  },
  layerInfo: {
    flex: 1,
    minWidth: 0,
  },
  layerName: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "12px",
    fontWeight: 700,
    color: "#e2e8f0",
    marginBottom: "2px",
  },
  layerNameText: {
    fontFamily: "'DM Mono', monospace",
  },
  layerPulseDot: {
    width: "4px",
    height: "4px",
    borderRadius: "50%",
    boxShadow: "0 0 4px currentColor",
  },
  layerTemp: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "10px",
    color: "rgba(200, 220, 255, 0.6)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  layerTempSub: {
    fontSize: "8px",
    color: "rgba(200, 220, 255, 0.4)",
    fontWeight: 400,
  },
  layerTempNoData: {
    color: "rgba(107, 114, 128, 0.6)",
    fontStyle: "italic",
  },

  // ── Isolate Button ──
  isolateButton: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    border: "1px solid rgba(59, 130, 246, 0.25)",
    background: "rgba(59, 130, 246, 0.08)",
    color: "rgba(200, 220, 255, 0.75)",
    fontFamily: "'Inter', sans-serif",
    fontSize: "8px",
    fontWeight: 800,
    letterSpacing: "0.06em",
    padding: "5px 8px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textTransform: "uppercase",
    flexShrink: 0,
  },
};
