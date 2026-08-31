/**
 * Simulation Controls Panel Component
 *
 * Provides scenario selection and playback control for furnace
 * simulation mode:
 * - Mode toggle between real data and simulation
 * - Grid of predefined combustion scenarios with icons
 * - Undo / redo history navigation
 * - Reset to real data
 *
 * Features:
 * - SVG icons for all controls
 * - Scenario cards with type-specific icons and descriptions
 * - Pill toggle for mode switching with colour-coded accents
 * - Gradient undo/redo buttons with disabled states
 * - Danger-styled reset button with confirmation styling
 */

import { useFurnaceStore } from "../state/FurnaceStore";
import { DATA_MODES, SIMULATION_SCENARIOS } from "../config/furnaceConfig";
import { panelStyles as S } from "./panelStyles";

// ============================================================================
// SVG ICONS — minimal line icons for simulation controls
// ============================================================================

const IconRealData = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V7C21 5.9 20.1 5 19 5H5C3.9 5 3 5.9 3 7Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12L2 7V12C2 14.21 4.79 16 8 16H16C19.21 16 22 14.21 22 12V7L12 12Z" strokeWidth="1.5" stroke="currentColor" fill="none"/>
  </svg>
);

const IconSimulation = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L14 8H20L13 12L15 18L12 14L9 18L11 12L4 8H10L12 2Z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconUndo = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5V2L6 7L12 12V9C15.31 9 18 11.69 18 15C18 17.76 15.76 20 13 20C11.45 20 10.08 19.35 9.14 18.29L7.73 16.87C7.24 16.38 7.59 15.5 8.31 15.5H9.5C10.33 15.5 11 14.83 11 14C11 13.17 10.33 12.5 9.5 12.5C7.51 12.5 5.91 10.9 5.75 9C5.55 7.17 6.74 5.5 8.5 5.5H11C12.66 5.5 14 6.84 14 8.5V13" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 8.5L6.5 5L10 8.5" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconRedo = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 14H13.5C12.67 14 12 13.33 12 12.5C12 11.67 12.67 11 13.5 11H15C16.66 11 18 12.34 18 14C18 15.66 16.66 17 15 17C13.45 17 12.08 16.35 11.14 15.29L9.73 13.87C9.24 13.38 9.59 12.5 10.31 12.5H11.5C12.33 12.5 13 13.17 13 14C13 14.83 12.33 15.5 11.5 15.5H10C11.38 15.5 12.51 16.62 12.88 17.88C13.08 18.61 13.86 19.14 14.62 19.14C16.48 19.14 18 17.56 18 15.5V9" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 8.5L17.5 5L14 8.5" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconReset = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2V6M12 2L8 8M12 2L16 8" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 12H8M4 12C7.31 12 10 14.69 10 18M4 12C4 15.31 6.69 18 10 18" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20 12C20 7.58 16.42 4 12 4C9.68 4 7.53 5.09 6.18 6.84L4 4.66V8" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Scenario-specific icons
const IconNormal = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15 9H22L13 14L10 21L7 14L2 9H9L12 2Z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconImbalance = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 8V12L16 14" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="9" strokeWidth="1.5" stroke="currentColor"/>
  </svg>
);

const IconFlow = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 12H22M2 12C4 8 7 6 10 6C13 6 16 8 22 12M2 12C4 16 7 18 10 18C13 18 16 16 22 12" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconTarget = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke="currentColor"/>
    <circle cx="12" cy="12" r="6" strokeWidth="1.5" stroke="currentColor"/>
    <circle cx="12" cy="12" r="2" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5"/>
  </svg>
);

const IconLeaf = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C7.58 2 4 5.58 4 10C4 14.42 7.58 18 12 18C16.42 18 20 14.42 20 10C20 5.58 16.42 2 12 2Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 2C9.79 4.69 9 7.81 9.54 11C10.18 14.79 12.91 17.47 17.5 17.91C14.56 20.15 11.04 21 7 21" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
  </svg>
);

const IconBuilder = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.752 18.349C13.833 20.037 12.04 21.25 10 21.937V21C10 18.79 8.21 17 6 17H2C2 14.79 3.79 13 6 13H10C11.104 13 12 13.896 12 15V19" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 9C7 10.657 5.657 12 4 12C2.343 12 1 10.657 1 9C1 7.343 2.343 6 4 6C5.657 6 7 4.657 7 3C7 1.343 5.657 0 4 0C2.343 0 1 1.343 1 3" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
    <path d="M14 9L17 9L20 6L23 9V14L20 17L17 17L14 14L14 9Z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ============================================================================
// SCENARIO ICON MAP — maps scenario id to appropriate icon
// ============================================================================

const SCENARIO_ICONS = {
  normal: IconNormal,
  burner_imbalance: IconImbalance,
  reduced_flow: IconFlow,
  increased_flow: IconFlow,
  optimal_combustion: IconTarget,
  high_excess_air: IconFlow,
  low_nox_mode: IconLeaf,
  custom: IconBuilder,
};

const SCENARIO_COLORS = {
  normal: "#22c55e",
  burner_imbalance: "#ef4444",
  reduced_flow: "#3b82f6",
  increased_flow: "#f59e0b",
  optimal_combustion: "#22c55e",
  high_excess_air: "#06b6d4",
  low_nox_mode: "#8b5cf6",
  custom: "#94a3b8",
};

// ============================================================================
// SUB-COMPONENT: ModePillToggle
// =========================================================================

function ModePillToggle({ active, onClick, icon, label, activeColor }) {
  return (
    <button
      style={{
        ...styles.modePill,
        ...(active ? {
          background: `linear-gradient(135deg, ${activeColor} 0%, #2563eb 100%)`,
          boxShadow: `0 0 12px ${activeColor}40`,
          color: "#ffffff",
          borderColor: `${activeColor}80`,
        } : {
          background: "rgba(255, 255, 255, 0.05)",
          borderColor: "rgba(59, 130, 246, 0.25)",
          color: "rgba(200, 220, 255, 0.6)",
          boxShadow: "none",
        }),
      }}
      onClick={onClick}
    >
      <span style={styles.modePillIcon}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ============================================================================
// SUB-COMPONENT: ScenarioButton
// =========================================================================

function ScenarioButton({ scenario, isActive, onClick, isBuilder }) {
  const IconComponent = SCENARIO_ICONS[scenario.id] || IconTarget;
  const color = SCENARIO_COLORS[scenario.id] || "#60a5fa";
  const scenarioColor = isBuilder ? "#94a3b8" : color;

  return (
    <button
      style={{
        ...styles.scenarioBtn,
        ...(isActive ? styles.scenarioBtnActive(scenarioColor) : {}),
      }}
      onClick={onClick}
      title={scenario.description || ""}
    >
      <span style={{ ...styles.scenarioBtnIcon, color: scenarioColor }}>
        <IconComponent />
      </span>
      <span style={styles.scenarioBtnLabel}>{scenario.label.toUpperCase()}</span>
    </button>
  );
}

// ============================================================================
// SUB-COMPONENT: HistoryButton
// =========================================================================

function HistoryButton({ onClick, disabled, icon, label, variant }) {
  return (
    <button
      style={{
        ...styles.historyBtn,
        ...(variant === "danger" ? styles.historyBtnDanger : {}),
        ...(disabled ? styles.historyBtnDisabled : {}),
      }}
      onClick={onClick}
      disabled={disabled}
      title={label}
    >
      <span style={styles.historyBtnIcon}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SimulationControls({ model, onOpenBuilder }) {
  const { state, setMode, applyScenario, resetSimulation, undoSimulation, redoSimulation } = useFurnaceStore();
  if (!model) return null;

  const allBurners = model.layers.flatMap((l) => l.burners);
  const isSimulation = state.mode === DATA_MODES.SIMULATION;
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.simulationHistory.length - 1;

  // Predefined scenarios (exclude custom)
  const predefinedScenarios = SIMULATION_SCENARIOS.filter((s) => s.id !== "custom");

  return (
    <div style={S.section}>
      <div style={S.sectionLabel}>SIMULATION</div>

      {/* ── Mode Toggle ── */}
      <div style={styles.modeToggleRow}>
        <ModePillToggle
          active={!isSimulation}
          onClick={() => setMode(DATA_MODES.REAL_RUN)}
          icon={<IconRealData />}
          label="REAL DATA"
          activeColor="#22c55e"
        />
        <ModePillToggle
          active={isSimulation}
          onClick={() => setMode(DATA_MODES.SIMULATION)}
          icon={<IconSimulation />}
          label="SIMULATION"
          activeColor="#8b5cf6"
        />
      </div>

      {/* ── Simulation Content ── */}
      {isSimulation ? (
        <>
          {/* ── Scenario Selection ── */}
          <div style={styles.scenarioSection}>
            <div style={styles.scenarioSectionLabel}>SCENARIOS</div>
            <div style={styles.scenarioGrid}>
              {predefinedScenarios.map((s) => (
                <ScenarioButton
                  key={s.id}
                  scenario={s}
                  isActive={state.activeScenarioId === s.id}
                  onClick={() => applyScenario(s.id, allBurners)}
                />
              ))}
              <ScenarioButton
                scenario={{ id: "custom", label: "Custom Builder", description: "User-defined custom scenario with manual parameter overrides." }}
                isActive={false}
                onClick={onOpenBuilder}
                isBuilder
              />
            </div>
          </div>

          {/* ── History Controls ── */}
          <div style={styles.historyRow}>
            <HistoryButton
              icon={<IconUndo />}
              label="UNDO"
              onClick={undoSimulation}
              disabled={!canUndo}
            />
            <HistoryButton
              icon={<IconRedo />}
              label="REDO"
              onClick={redoSimulation}
              disabled={!canRedo}
            />
          </div>

          {/* ── Reset ── */}
          <div style={styles.resetRow}>
            <button
              style={{ ...S.resetBtn, ...styles.resetBtn }}
              onClick={resetSimulation}
            >
              <span style={styles.resetBtnIcon}><IconReset /></span>
              <span>RESET TO REAL DATA</span>
            </button>
          </div>

          {/* ── Helper Text ── */}
          <div style={{ ...S.helperText, padding: "12px", background: "rgba(59, 130, 246, 0.05)", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.1)" }}>
            Select a burner in the 3D view to fine-tune its coal/air flow individually.
            Simulation values are visual scenario modeling, not a validated combustion/CFD result.
          </div>
        </>
      ) : (
        <div style={{ ...S.helperText, padding: "12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
          Showing actual FTM run data. Switch to Simulation to model scenarios.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  // ── Mode Toggle Row ──
  modeToggleRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
  },

  // ── Mode Pill Toggle ──
  modePill: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.06em",
    padding: "9px 12px",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.25s ease",
    textTransform: "uppercase",
    backdropFilter: "blur(4px)",
    border: "1px solid",
  },
  modePillIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },

  // ── Scenario Section ──
  scenarioSection: {
    marginBottom: "12px",
  },
  scenarioSectionLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "rgba(180, 210, 255, 0.5)",
    textTransform: "uppercase",
    marginBottom: "8px",
  },
  scenarioGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },

  // ── Scenario Button ──
  scenarioBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    background: "rgba(255, 255, 255, 0.03)",
    color: "rgba(200, 220, 255, 0.6)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  scenarioBtnActive: (color) => ({
    background: `linear-gradient(135deg, ${color} 0%, ${color}80 100%)`,
    boxShadow: `0 0 12px ${color}40`,
    color: "#ffffff",
    borderColor: `${color}80`,
  }),
  scenarioBtnIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  scenarioBtnLabel: {
    lineHeight: 1.2,
  },

  // ── History Row ──
  historyRow: {
    display: "flex",
    gap: "6px",
    marginBottom: "12px",
  },

  // ── History Button ──
  historyBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "10px",
    fontWeight: 700,
    padding: "7px 12px",
    borderRadius: "6px",
    border: "1px solid rgba(59, 130, 246, 0.25)",
    background: "rgba(59, 130, 246, 0.1)",
    color: "rgba(200, 220, 255, 0.85)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  historyBtnDisabled: {
    opacity: 0.4,
    cursor: "default",
  },
  historyBtnIcon: {
    display: "flex",
    alignItems: "center",
  },

  // ── Reset Row ──
  resetRow: {
    marginBottom: "10px",
  },

  // ── Reset Button ──
  resetBtn: {
    width: "auto",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  resetBtnIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
};
