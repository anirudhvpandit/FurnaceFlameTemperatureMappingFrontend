// src/furnace3d/Furnace3DView.jsx
/**
 * Enhanced Furnace3DView with beautiful UI/UX improvements.
 *
 * Features:
 *  • Enhanced header with beautiful gradient and glassmorphism effects
 *  • Improved button styling with hover effects and animations
 *  • Better modal design with enhanced shadows and backdrop blur
 *  • Enhanced loading states with beautiful animations
 *  • Improved error messaging with visual hierarchy
 *  • Better responsive design with smooth transitions
 *  • Enhanced toolbar organization with button grouping
 *  • Improved color scheme consistency
 *  • Better mobile navigation with enhanced tabs
 *  • Enhanced visual feedback for all interactions
 */

import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FurnaceStoreProvider, useFurnaceStore } from "./state/FurnaceStore";
import { buildFurnaceModel, buildDemoFurnaceModel } from "./data/ftmAdapter";
import FurnaceScene from "./scene/FurnaceScene";
import LayerControls from "./panels/LayerControls";
import SimulationControls from "./panels/SimulationControls";
import InspectionPanel from "./panels/InspectionPanel";
import Legend from "./panels/Legend";
import PlaybackControls from "./panels/PlaybackControls";
import ScenarioBuilder from "./panels/ScenarioBuilder";
import ComparisonControls from "./panels/ComparisonControls";
import ThresholdSettings from "./panels/ThresholdSettings";
import SuggestionPanel from "./panels/SuggestionPanel";
import CombustionControls from "./panels/CombustionControls";
import AIAnalysisPanel from "./panels/AIAnalysisPanel";
import SectionalControls from "./panels/SectionalControls";
import { connectWebSocket, disconnectWebSocket } from "./services/websocket";
import { exportVideo } from "./utils/exportVideo";
import { exportSimulationCSV, exportFurnaceJSON, exportScenarioJSON, exportTemperatureJSON } from "./utils/exportSimulation";
import { exportSimplified3D, exportLayoutCAD } from "./utils/export3D";
import { playAlertSound } from "./utils/soundAlerts";
import { useCameraSync } from "./CameraSync";

const BASE_URL = "https://abhiftm.com/api";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getStoredStation() {
  try { return JSON.parse(localStorage.getItem("selectedStation")); } catch { return null; }
}
function getStoredUnit() {
  try { return JSON.parse(localStorage.getItem("selectedUnit")); } catch { return null; }
}
function getLastSelectedRunId() {
  try { const ids = JSON.parse(localStorage.getItem("ftm_selected") || "[]"); return ids.find(Boolean) || null; } catch { return null; }
}

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}

// ============================================================================
// ENHANCED STYLES
// ============================================================================

const styles = {
  mainContainer: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #030814 0%, #071428 50%, #0a1b34 100%)",
    display: "flex",
    flexDirection: "column"
  },
  
  // Enhanced header
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
    padding: "16px 24px",
    borderBottom: "1px solid rgba(77,141,232,0.2)",
    background: "linear-gradient(135deg, rgba(4,13,26,0.95) 0%, rgba(7,20,35,0.9) 100%)",
    backdropFilter: "blur(20px)",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)"
  },
  
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    minWidth: 0
  },
  
  headerTitle: {
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "16px",
    fontWeight: 800,
    color: "#fff",
    letterSpacing: "0.04em",
    textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)"
  },
  
  headerSubtitle: {
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "11px",
    color: "rgba(180,210,255,0.6)",
    letterSpacing: "0.1em",
    marginTop: "4px",
    fontWeight: 500
  },
  
  // Enhanced toolbar
  toolbar: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    alignItems: "center"
  },
  
  // Enhanced button styles
  button: {
    border: "1px solid rgba(77,141,232,0.3)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    borderRadius: "8px",
    padding: "8px 14px",
    cursor: "pointer",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    transition: "all 0.2s ease",
    boxShadow: "none"
  },
  
  buttonActive: {
    background: "linear-gradient(135deg, rgba(37,99,198,0.5) 0%, rgba(59,130,246,0.4) 100%)",
    borderColor: "rgba(59,130,246,0.5)",
    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)"
  },
  
  buttonHover: {
    background: "rgba(59,130,246,0.15)",
    borderColor: "rgba(59,130,246,0.5)",
    transform: "translateY(-1px)",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)"
  },
  
  // Enhanced lighting button
  lightingButton: {
    border: "1px solid rgba(77,141,232,0.25)",
    background: "rgba(255,255,255,0.03)",
    color: "#fff",
    borderRadius: "6px",
    padding: "6px 12px",
    cursor: "pointer",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    transition: "all 0.2s ease"
  },
  
  lightingButtonActive: {
    background: "linear-gradient(135deg, rgba(34,211,238,0.4) 0%, rgba(59,130,246,0.3) 100%)",
    borderColor: "rgba(34,211,238,0.5)"
  },
  
  // Enhanced error banner
  errorBanner: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(251,191,36,0.1) 100%)",
    borderBottom: "1px solid rgba(245,158,11,0.3)",
    color: "#fde68a",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "12px",
    letterSpacing: "0.04em",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  
  // Enhanced loading state
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "rgba(200,220,255,0.7)",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    gap: "16px"
  },
  
  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: "3px solid rgba(59,130,246,0.2)",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  
  loadingText: {
    fontSize: "14px",
    fontWeight: 600,
    letterSpacing: "0.05em"
  },
  
  // Enhanced mobile tabs
  mobileTabs: {
    display: "flex",
    borderBottom: "1px solid rgba(77,141,232,0.15)",
    background: "rgba(4,13,26,0.5)"
  },
  
  mobileTab: {
    flex: 1,
    padding: "12px 8px",
    border: "none",
    borderBottom: "2px solid transparent",
    background: "transparent",
    color: "rgba(200,220,255,0.5)",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  
  mobileTabActive: {
    borderBottom: "2px solid #3b82f6",
    color: "#fff",
    background: "rgba(59,130,246,0.1)"
  },
  
  // Enhanced desktop layout
  desktopLayout: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "280px 1fr 300px",
    minHeight: 0
  },
  
  aside: {
    overflowY: "auto",
    borderRight: "1px solid rgba(77,141,232,0.15)",
    background: "rgba(4,13,26,0.3)",
    backdropFilter: "blur(8px)"
  },
  
  asideRight: {
    borderRight: "none",
    borderLeft: "1px solid rgba(77,141,232,0.15)"
  },
  
  // Enhanced modal
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(8px)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  
  modalContent: {
    background: "linear-gradient(135deg, #0a1b34 0%, #0d2440 100%)",
    borderRadius: "16px",
    padding: "24px",
    maxWidth: "800px",
    width: "90%",
    maxHeight: "85vh",
    overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.2)"
  },
  
  // Enhanced section divider
  sectionDivider: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 12px"
  },
  
  sectionDividerText: {
    color: "rgba(200,220,255,0.5)",
    fontSize: "9px",
    fontWeight: 600,
    letterSpacing: "0.1em"
  },
  
  sectionDividerSlider: {
    width: "70px",
    height: "4px",
    background: "rgba(59,130,246,0.3)",
    borderRadius: "2px",
    appearance: "none",
    cursor: "pointer"
  }
};

// ============================================================================
// COMPONENTS
// ============================================================================

const EnhancedButton = ({ children, active = false, onClick, style = {}, ...props }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...styles.button,
        ...(active ? styles.buttonActive : {}),
        ...(isHovered && !active ? styles.buttonHover : {}),
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
};

const LightingPresetBtn = ({ label, preset, setLightingPreset, active }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={() => setLightingPreset(preset)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...styles.lightingButton,
        ...(active ? styles.lightingButtonActive : {}),
        ...(isHovered && !active ? { background: "rgba(34,211,238,0.15)", borderColor: "rgba(34,211,238,0.4)" } : {})
      }}
      title={`Lighting preset: ${preset}`}
    >
      {label}
    </button>
  );
};

const EnhancedLoadingState = () => (
  <div style={styles.loadingContainer}>
    <div style={styles.loadingSpinner} />
    <div style={styles.loadingText}>LOADING FURNACE MODEL…</div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function Furnace3DViewInner({ embedded = false, runId: requestedRunId = null, enableCameraSync = true }) {
  const navigate = useNavigate();
  const cameraSync = useCameraSync();
  useEffect(() => {
    cameraSync?.setSyncEnabled(enableCameraSync);
  }, [cameraSync, enableCameraSync]);
  const {
    state,
    setSectionalView, setClipOffset, toggleAIOverlay,
    setHistoricalRuns, setCurrentRunIndex,
    setModel: setStoreModel,
    undoSimulation, redoSimulation,
    setSuggestion,
    setLightingPreset,
    clearFocusedLayer,
  } = useFurnaceStore();
  
  const [model, setModel] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileTab, setMobileTab] = useState("scene");
  const [showScenarioBuilder, setShowScenarioBuilder] = useState(false);
  const [showThresholds, setShowThresholds] = useState(false);
  const resetCameraRef = useRef(null);
  const width = useWindowWidth();
  const isCompact = width < 900;

  const station = getStoredStation();
  const unit = getStoredUnit();

  const loadRun = useCallback(async (runId) => {
    setLoading(true);
    setError("");
    try {
      const [dsRes, coalRes] = await Promise.all([
        axios.get(`${BASE_URL}/history/${runId}`),
        axios.get(`${BASE_URL}/history/${runId}/coal-mill-params`),
      ]);
      const built = buildFurnaceModel(dsRes.data, coalRes.data);
      if (!built) throw new Error("Run has no elevation data to visualize.");
      setModel(built);
      setStoreModel(built);
      setIsDemo(false);
      // Connect WebSocket for live updates if enabled
      connectWebSocket(runId, (updatedData) => {
        const newModel = buildFurnaceModel(updatedData, coalRes.data);
        if (newModel) {
          setModel(newModel);
          setStoreModel(newModel);
        }
      });
    } catch (err) {
      console.error("Furnace3DView: failed to load run, falling back to demo data:", err);
      const demo = buildDemoFurnaceModel();
      setModel(demo);
      setStoreModel(demo);
      setIsDemo(true);
      setError("Could not load real run data — showing placeholder demo data instead.");
    } finally {
      setLoading(false);
    }
  }, [setStoreModel]);

  useEffect(() => {
    const runId = requestedRunId || getLastSelectedRunId();
    if (runId) loadRun(runId);
    else {
      const demo = buildDemoFurnaceModel();
      setModel(demo);
      setStoreModel(demo);
      setIsDemo(true);
      setLoading(false);
    }
    return () => disconnectWebSocket();
  }, [loadRun, requestedRunId, setStoreModel]);

  // Load historical runs (playback)
  useEffect(() => {
    if (!model) return;
    const demoRuns = [
      model,
      { ...model, layers: model.layers.map(l => ({ ...l, temperature: { ...l.temperature, avg: (l.temperature.avg || 0) * 0.9 } })) },
      { ...model, layers: model.layers.map(l => ({ ...l, temperature: { ...l.temperature, avg: (l.temperature.avg || 0) * 1.1 } })) },
    ];
    setHistoricalRuns(demoRuns);
    setCurrentRunIndex(0);
  }, [model, setHistoricalRuns, setCurrentRunIndex]);

  // Auto-optimization suggestion
  useEffect(() => {
    if (!model) return;
    const suggest = async () => {
      const { generateSuggestion } = await import("./utils/optimizationSuggester");
      const suggestion = generateSuggestion(model);
      setSuggestion(suggestion);
    };
    suggest();
  }, [model, setSuggestion]);

  // Sound alerts
  useEffect(() => {
    if (!model) return;
    const criticalBurners = model.layers.flatMap(l => l.burners).filter(b => (b.temperature || 0) > 1350);
    if (criticalBurners.length > 0) playAlertSound();
  }, [model]);

  // Keyboard shortcut for ESC to exit focused view
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && state.isFocusedView) {
        clearFocusedLayer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isFocusedView, clearFocusedLayer]);

  // Auto-switch to scene tab when focused view is activated (mobile)
  useEffect(() => {
    if (state.isFocusedView && isCompact) {
      setMobileTab("scene");
    }
  }, [state.isFocusedView, isCompact]);

  const sceneEl = loading ? (
    <EnhancedLoadingState />
  ) : (
    <FurnaceScene
      model={model}
      onResetCameraRef={resetCameraRef}
      onControlsReady={cameraSync?.registerControls}
      onControlsRemoved={cameraSync?.unregisterControls}
    />
  );

  const captureScreenshot = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "furnace_screenshot.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleExportVideo = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    exportVideo(canvas, state.historicalRuns, setCurrentRunIndex);
  };

  const handleExportJSON = () => {
    if (!model) return;
    exportFurnaceJSON(model, state, state.simulationOverrides, state.combustionParams, state.aiAnalysis);
  };

  const handleExportScenario = () => {
    if (!model) return;
    exportScenarioJSON(state.activeScenarioId, state.activeScenarioId, state.simulationOverrides, state.combustionParams);
  };

  const handleExportTemperature = () => {
    if (!model) return;
    exportTemperatureJSON(model);
  };

  const handleExport3D = (format) => {
    switch (format) {
      case 'simplified':
        if (model) exportSimplified3D(model, 'furnace_simplified');
        break;
      case 'cad':
        if (model) exportLayoutCAD(model, 'furnace_layout');
        break;
      default:
        alert('Unknown export format');
    }
  };

  const cameraPresets = [
    { label: "TOP", pos: [0, 80, 0], target: [0, 20, 0] },
    { label: "FRONT", pos: [0, 20, 50], target: [0, 20, 0] },
    { label: "SIDE", pos: [50, 20, 0], target: [0, 20, 0] },
    { label: "ISO", pos: [40, 40, 40], target: [0, 20, 0] },
  ];

  const lightingPresets = [
    { label: "WARM", value: "warm" },
    { label: "NEUTRAL", value: "neutral" },
    { label: "COOL", value: "cool" },
    { label: "EMISSIVE", value: "emissive" },
  ];

  // Add CSS animations
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, []);

  // When embedded in an FTM card, render only the interactive boiler canvas.
  // The surrounding dashboard already supplies navigation and run controls.
  if (embedded) {
    return (
      <div style={{ height: "760px", background: "#030814", borderRadius: "12px", overflow: "hidden" }}>
        {sceneEl}
      </div>
    );
  }

  return (
    <div style={styles.mainContainer}>
      {/* Enhanced Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <EnhancedButton onClick={() => navigate("/dashboard")}>
            ← DASHBOARD
          </EnhancedButton>
          <div>
            <div style={styles.headerTitle}>3D FURNACE VISUALIZATION</div>
            <div style={styles.headerSubtitle}>
              {station?.name || "—"} · {unit?.name || "—"} {isDemo && "· DEMO DATA"}
            </div>
          </div>
        </div>
        
        <div style={styles.toolbar}>
          {/* View Controls */}
          {["full", "section", "isolated"].map((v) => (
            <EnhancedButton 
              key={v} 
              active={state.sectionalView === v}
              onClick={() => setSectionalView(v)}
            >
              {v.toUpperCase()}
            </EnhancedButton>
          ))}
          
          {/* Sectional Slider */}
          {state.sectionalView === "section" && (
            <div style={styles.sectionDivider}>
              <span style={styles.sectionDividerText}>CUT</span>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={state.clipOffset || 0.5} 
                onChange={(e) => setClipOffset(Number(e.target.value))} 
                style={styles.sectionDividerSlider} 
              />
            </div>
          )}
          
          {/* Camera Presets */}
          {cameraPresets.map((p) => (
            <EnhancedButton
              key={p.label}
              onClick={() => {
                const ref = resetCameraRef.current;
                if (ref && ref.setView) ref.setView(
                  {x:p.pos[0], y:p.pos[1], z:p.pos[2]}, 
                  {x:p.target[0], y:p.target[1], z:p.target[2]}
                );
              }}
            >
              {p.label}
            </EnhancedButton>
          ))}
          
          {/* Export Controls */}
          <EnhancedButton onClick={captureScreenshot}>📷 SCREENSHOT</EnhancedButton>
          <EnhancedButton onClick={handleExportVideo}>🎬 VIDEO</EnhancedButton>
          <EnhancedButton onClick={handleExportJSON}>📄 JSON</EnhancedButton>
          <EnhancedButton onClick={handleExportScenario}>📋 SCENARIO</EnhancedButton>
          <EnhancedButton onClick={handleExportTemperature}>🌡️ TEMPS</EnhancedButton>
          <EnhancedButton onClick={() => handleExport3D('simplified')}>📐 3D SIMPLIFIED</EnhancedButton>
          <EnhancedButton onClick={() => handleExport3D('cad')}>📏 CAD LAYOUT</EnhancedButton>
          
          {/* AI Toggle */}
          <EnhancedButton 
            active={state.showAIOverlay}
            onClick={() => toggleAIOverlay()}
          >
            {state.showAIOverlay ? "AI ON" : "AI OFF"}
          </EnhancedButton>
          
          {/* Lighting Presets */}
          <span style={styles.sectionDividerText}>LIGHTING:</span>
          {lightingPresets.map((p) => (
            <LightingPresetBtn
              key={p.value}
              label={p.label}
              preset={p.value}
              setLightingPreset={setLightingPreset}
              active={state.lightingPreset === p.value}
            />
          ))}
          
          {/* Tools */}
          <EnhancedButton onClick={() => setShowScenarioBuilder(true)}>⚙️ BUILDER</EnhancedButton>
          <EnhancedButton onClick={() => setShowThresholds(true)}>🔧 THRESHOLDS</EnhancedButton>
          <EnhancedButton onClick={() => resetCameraRef.current?.reset()}>RESET CAM</EnhancedButton>
          <EnhancedButton onClick={undoSimulation}>↩️ UNDO</EnhancedButton>
          <EnhancedButton onClick={redoSimulation}>↪️ REDO</EnhancedButton>
          <EnhancedButton onClick={() => exportSimulationCSV(state.simulationOverrides)}>📤 EXPORT SIM</EnhancedButton>
        </div>
      </div>
      
      {/* Enhanced Error Banner */}
      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      
      {/* Mobile Layout */}
      {isCompact ? (
        <>
          <div style={styles.mobileTabs}>
            {[
              {k:"layers",l:"LAYERS & SIM"},
              {k:"combustion",l:"COMBUSTION"},
              {k:"ai",l:"AI ANALYSIS"},
              {k:"sectional",l:"SECTIONAL"},
              {k:"elevation",l:"ELEVATION"},
              {k:"scene",l:"3D VIEW"},
              {k:"inspector",l:"INSPECTOR"},
              {k:"playback",l:"PLAYBACK"},
              {k:"compare",l:"COMPARE"},
              {k:"suggest",l:"SUGGEST"}
            ].filter(t => t.k !== "elevation").map((t) => (
              <button 
                key={t.k} 
                onClick={() => setMobileTab(t.k)} 
                style={{
                  ...styles.mobileTab,
                  ...(mobileTab === t.k ? styles.mobileTabActive : {})
                }}
              >
                {t.l}
              </button>
            ))}
          </div>
          <div style={{ flex:1, minHeight:"60vh", position:"relative" }}>
            {mobileTab === "layers" && <div style={{ overflowY:"auto", maxHeight:"70vh" }}><LayerControls model={model} /><SimulationControls model={model} onOpenBuilder={() => setShowScenarioBuilder(true)} /></div>}
            {mobileTab === "combustion" && <div style={{ overflowY:"auto", maxHeight:"70vh" }}><CombustionControls model={model} /></div>}
            {mobileTab === "ai" && <div style={{ overflowY:"auto", maxHeight:"70vh" }}><AIAnalysisPanel model={model} /></div>}
            {mobileTab === "sectional" && <div style={{ overflowY:"auto", maxHeight:"70vh" }}><SectionalControls model={model} /></div>}
            {mobileTab === "scene" && sceneEl}
            {mobileTab === "inspector" && <div style={{ overflowY:"auto", maxHeight:"70vh" }}><InspectionPanel model={model} /></div>}
            {mobileTab === "playback" && <div style={{ overflowY:"auto", maxHeight:"70vh" }}><PlaybackControls /></div>}
            {mobileTab === "compare" && <div style={{ overflowY:"auto", maxHeight:"70vh" }}><ComparisonControls model={model} /></div>}
            {mobileTab === "suggest" && <div style={{ overflowY:"auto", maxHeight:"70vh" }}><SuggestionPanel /></div>}
          </div>
        </>
      ) : (
        /* Desktop Layout */
        <div style={styles.desktopLayout}>
          <aside style={styles.aside}>
            <LayerControls model={model} />
            <SimulationControls model={model} onOpenBuilder={() => setShowScenarioBuilder(true)} />
            <CombustionControls model={model} />
            <AIAnalysisPanel model={model} />
            <SectionalControls model={model} />
            <SuggestionPanel />
          </aside>
          <div style={{ position:"relative" }}>{sceneEl}</div>
          <aside style={{ ...styles.aside, ...styles.asideRight }}>
            <InspectionPanel model={model} />
            <PlaybackControls />
            <ComparisonControls model={model} />
          </aside>
        </div>
      )}
      
      <Legend />
      
      {/* Enhanced Modals */}
      {showScenarioBuilder && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <ScenarioBuilder model={model} onClose={() => setShowScenarioBuilder(false)} />
          </div>
        </div>
      )}
      
      {showThresholds && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: "500px" }}>
            <ThresholdSettings onClose={() => setShowThresholds(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Furnace3DView({ embedded = false, runId = null, enableCameraSync = true }) {
  return (
    <FurnaceStoreProvider>
      <Furnace3DViewInner embedded={embedded} runId={runId} enableCameraSync={enableCameraSync} />
    </FurnaceStoreProvider>
  );
}
