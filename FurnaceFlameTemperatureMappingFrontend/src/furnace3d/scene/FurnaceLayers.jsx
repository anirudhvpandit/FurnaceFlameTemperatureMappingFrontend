// src/furnace3d/scene/FurnaceLayers.jsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useFurnaceStore } from "../state/FurnaceStore";
import { temperatureToColor } from "../utils/temperatureScale";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import AlarmIndicator from "./AlarmIndicator";

const LAYER_THICKNESS = 1.4;

/**
 * FurnaceLayers — temperature-mapped refractory layers with enhanced UI/UX.
 *
 * Enhancements:
 *  • Temperature-driven emissive intensity so hot layers glow visibly.
 *  • Enhanced material properties with realistic reflections and lighting.
 *  • Smooth animations for selection, hover, and explosion transitions.
 *  • Beautiful tooltip with gradient backgrounds and animated effects.
 *  • Pulse effects for high-temperature layers.
 *  • Enhanced shadow interaction for realistic depth.
 *  • Improved visual feedback for all interaction states.
 */
export default function FurnaceLayers({ model }) {
  const { state, selectLayer, setHover, setFocus, setFocusedLayer, clearFocusedLayer } = useFurnaceStore();
  const opacity = state.layerOpacity;
  const layerRefs = useRef({});

  // Calculate exploded view positions for layers with smooth animation
  const layerPositions = useMemo(() => {
    if (!state.explodedView) return {};

    const factor = state.explosionFactor || 0.3;
    const positions = {};

    model.layers.forEach((layer) => {
      // Spread layers vertically with explosion
      const baseZ = layer.z;
      const totalHeight = model.dimensions.height;
      const normalizedHeight = baseZ / totalHeight;

      // Add vertical offset based on explosion factor
      const explosionOffset = (normalizedHeight - 0.5) * totalHeight * factor;

      positions[layer.id] = {
        x: 0,
        y: baseZ + explosionOffset,
        z: 0,
      };
    });

    return positions;
  }, [state.explodedView, state.explosionFactor, model.layers, model.dimensions.height]);

  // Animate layer properties for smooth transitions
  useFrame(({ clock }) => {
    Object.entries(layerRefs.current).forEach(([layerId, meshRef]) => {
      if (meshRef?.current) {
        const layer = model.layers.find(l => l.id === layerId);
        if (!layer) return;

        const isSelected = state.selection.type === "layer" && state.selection.id === layerId;
        const isHovered = state.hoveredObject?.type === "layer" && state.hoveredObject?.id === layerId;
        
        // Pulse effect for high-temperature layers
        if (layer.temperature.avg > 1200 && !isSelected) {
          const time = clock.getElapsedTime();
          const pulseIntensity = Math.sin(time * 2 + layerId.charCodeAt(0)) * 0.1 + 0.9;
          meshRef.current.material.emissiveIntensity = pulseIntensity * 0.4;
        }

        // Selection glow animation
        if (isSelected) {
          const time = clock.getElapsedTime();
          meshRef.current.material.emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.15;
        }
      }
    });
  });

  return (
    <group>
      {model.layers.map((layer) => {
        const visible = state.layerVisibility[layer.id] ?? true;
        if (!visible) return null;

        const activeCtAxis = state.clipPlanes?.z?.enabled
          ? "z"
          : state.clipPlanes?.x?.enabled
            ? "x"
            : state.clipPlanes?.y?.enabled
              ? "y"
              : "z";
        const ctOffset = state.clipPlanes?.[activeCtAxis]?.offset ?? 0.5;
        const isCtSliceLayer = activeCtAxis !== "y" ||
          Math.abs(layer.z - (model.dimensions.height / 2 - ctOffset * model.dimensions.height)) <= LAYER_THICKNESS;
        if (state.ctScanMode && !isCtSliceLayer) return null;
        
        const isSelected = state.selection.type === "layer" && state.selection.id === layer.id;
        const isHovered = state.hoveredObject?.type === "layer" && state.hoveredObject?.id === layer.id;
        const isIsolatedOut = state.sectionalView === "isolated" && !isSelected;
        const isFocused = state.focusedLayerId === layer.id && state.isFocusedView;

        // A focused layer must be the only rendered elevation. Hiding only its
        // fill material leaves child overlays (alarm cards and outlines) behind.
        if (state.isFocusedView && state.focusedObjectType === "layer" && !isFocused) {
          return null;
        }
        
        // In burner-focused view, only show the layer containing the focused burner
        if (state.isFocusedView && state.focusedObjectType === 'burner') {
          const layerContainsFocusedBurner = layer.burners.some(b => b.id === state.focusedBurnerId);
          if (!layerContainsFocusedBurner) return null;
        }
        
        const color = temperatureToColor(layer.temperature.avg, state.thresholds.alert, state.thresholds.warn);

        // Enhanced temperature-driven emissive intensity
        const tempNorm = layer.temperature.avg != null
          ? Math.min(1, Math.max(0, (layer.temperature.avg - 900) / 800))
          : 0;
        // Keep the temperature field readable against the dark scene at all
        // times. The previous values made a live layer look almost black until
        // it was selected.
        const baseEmissiveIntensity = 0.35 + tempNorm * 0.45;
        const emissiveIntensity = isSelected ? 0.9 : baseEmissiveIntensity;

        // Enhanced opacity with smooth transitions
        let targetOpacity;
        if (state.ctScanMode) {
          targetOpacity = 0.95;
        } else if (state.isFocusedView) {
          targetOpacity = isFocused ? 1 : 0; // Focused View isolates the selected elevation
        } else {
          targetOpacity = isIsolatedOut ? 0.55 : isSelected ? 1 : Math.max(0.8, 0.9 * opacity);
        }

        // Use exploded position if enabled, otherwise use original position
        const position = state.explodedView ? layerPositions[layer.id] : { x: 0, y: layer.z, z: 0 };
        const ctPosition = state.ctScanMode
          ? {
              x: activeCtAxis === "x" ? model.dimensions.width / 2 - ctOffset * model.dimensions.width : 0,
              y: activeCtAxis === "y" ? model.dimensions.height / 2 - ctOffset * model.dimensions.height : position.y,
              z: activeCtAxis === "z" ? model.dimensions.depth / 2 - ctOffset * model.dimensions.depth : 0,
            }
          : position;
        const sliceDimensions = state.ctScanMode
          ? {
              ...model.dimensions,
              width: activeCtAxis === "x" ? 0.08 : model.dimensions.width,
              depth: activeCtAxis === "z" ? 0.08 : model.dimensions.depth,
            }
          : model.dimensions;

        return (
          <EnhancedLayerMesh
            key={layer.id}
            ref={el => layerRefs.current[layer.id] = el}
            layer={layer}
            position={ctPosition}
            dimensions={sliceDimensions}
            color={color}
            opacity={targetOpacity}
            emissiveIntensity={emissiveIntensity}
            isSelected={isSelected}
            isHovered={isHovered}
            isFocused={isFocused}
            isCtScan={state.ctScanMode}
            onSelectLayer={selectLayer}
            onFocus={setFocus}
            onHover={setHover}
            onDoubleClick={(layerId) => {
              if (state.isFocusedView && state.focusedLayerId === layerId) {
                clearFocusedLayer();
              } else {
                setFocusedLayer(layerId);
              }
            }}
          />
        );
      })}
    </group>
  );
}

// ============================================================================
// ENHANCED LAYER MESH COMPONENT
// ============================================================================

function EnhancedLayerMesh({ layer, position, dimensions, color, opacity, emissiveIntensity, isSelected, isHovered, isFocused, isCtScan, onSelectLayer, onFocus, onHover, onDoubleClick, ref }) {
  const fallbackMeshRef = useRef();
  const meshRef = ref || fallbackMeshRef;
  const materialRef = useRef();

  // Smooth material transitions
  useFrame(() => {
    if (materialRef.current) {
      // Smooth opacity transition
      materialRef.current.opacity = opacity;
      
      // Smooth emissive intensity transition
      materialRef.current.emissiveIntensity = emissiveIntensity;
    }
  });

  // Enhanced border glow for selected/hovered/focused states
  const borderColor = isFocused ? "#8b5cf6" : isSelected ? "#3b82f6" : isHovered ? "#22d3ee" : "transparent";
  const borderWidth = isFocused ? 3 : isSelected ? 2 : isHovered ? 1 : 0;

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      castShadow
      receiveShadow
      onClick={(e) => { e.stopPropagation(); onSelectLayer(layer.id); }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(layer.id); }}
      onPointerOver={() => { 
        document.body.style.cursor = "pointer"; 
        onHover({ type: "layer", id: layer.id }); 
      }}
      onPointerOut={() => { 
        document.body.style.cursor = "auto"; 
        onHover(null); 
      }}
    >
      <boxGeometry args={[dimensions.width * 1.04, LAYER_THICKNESS, dimensions.depth * 1.04]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite
        toneMapped={false}
      />

      {/* Persistent outline makes every elevation legible in the dark canvas,
          even when it is not selected or hovered. */}
      <lineSegments>
        <edgesGeometry
          args={[new THREE.BoxGeometry(
            dimensions.width * 1.04,
            LAYER_THICKNESS,
            dimensions.depth * 1.04
          )]}
        />
        <lineBasicMaterial
          color={color}
          transparent
          opacity={isFocused ? 1 : 0.82}
          depthTest={false}
        />
      </lineSegments>
      
      {/* Enhanced border effect for selection/hover */}
      {(isSelected || isHovered) && (
        <lineSegments>
          <edgesGeometry 
            args={[new THREE.BoxGeometry(
              dimensions.width * 1.05, 
              LAYER_THICKNESS + 0.05, 
              dimensions.depth * 1.05
            )]} 
          />
          <lineBasicMaterial 
            color={borderColor} 
            linewidth={borderWidth}
            transparent
            opacity={0.8}
          />
        </lineSegments>
      )}
      
      {/* Enhanced tooltip with beautiful styling */}
      {isHovered && !isSelected && layer.temperature.avg != null && (
        <Html position={[0, 0.8, 0]} style={{ pointerEvents: "none" }} occlude={false}>
          <EnhancedLayerTooltip layer={layer} color={color} isFocused={isFocused} />
        </Html>
      )}
      
      <AlarmIndicator object={layer} type="layer" temperature={layer.temperature.avg} />
    </mesh>
  );
}

// ============================================================================
// ENHANCED LAYER TOOLTIP COMPONENT
// ============================================================================

function EnhancedLayerTooltip({ layer, color, isFocused }) {
  const tempColor = getTemperatureColor(layer.temperature.avg);
  const statusIcon = getTemperatureStatusIcon(layer.temperature.avg);
  
  return (
    <div style={styles.tooltipContainer}>
      <div style={styles.tooltipHeader}>
        <span style={styles.tooltipIcon}>{statusIcon}</span>
        <span style={styles.tooltipLabel}>{layer.label}M</span>
      </div>
      <div style={styles.tooltipContent}>
        <div style={styles.temperatureRow}>
          <span style={styles.temperatureLabel}>Temperature</span>
          <span style={{ ...styles.temperatureValue, color: tempColor }}>
            {layer.temperature.avg.toFixed(0)}°C
          </span>
        </div>
        <div style={styles.statusRow}>
          <span style={styles.statusLabel}>Status</span>
          <span style={{ ...styles.statusValue, color: tempColor }}>
            {getTemperatureStatus(layer.temperature.avg)}
          </span>
        </div>
        {!isFocused && (
          <div style={styles.hintRow}>
            <span style={styles.hintText}>Double-click for CAT scan view</span>
          </div>
        )}
      </div>
      <div style={{ ...styles.tooltipAccent, background: color }} />
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Returns color based on temperature for UI elements
 */
function getTemperatureColor(temperature) {
  if (temperature == null) return "#9ca3af";
  if (temperature > 1400) return "#ef4444";    // Red - Critical
  if (temperature > 1200) return "#f97316";    // Orange - High
  if (temperature > 1000) return "#fbbf24";    // Yellow - Medium
  if (temperature > 800) return "#22d3ee";     // Cyan - Normal
  return "#3b82f6";                            // Blue - Cool
}

/**
 * Returns status icon based on temperature
 */
function getTemperatureStatusIcon(temperature) {
  if (temperature == null) return "❓";
  if (temperature > 1400) return "🔥";
  if (temperature > 1200) return "⚠️";
  if (temperature > 1000) return "🌡️";
  if (temperature > 800) return "✅";
  return "❄️";
}

/**
 * Returns status text based on temperature
 */
function getTemperatureStatus(temperature) {
  if (temperature == null) return "Unknown";
  if (temperature > 1400) return "CRITICAL";
  if (temperature > 1200) return "HIGH";
  if (temperature > 1000) return "MEDIUM";
  if (temperature > 800) return "NORMAL";
  return "COOL";
}

// ============================================================================
// ENHANCED STYLES
// ============================================================================

const styles = {
  tooltipContainer: {
    background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    borderRadius: "10px",
    padding: "10px 14px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "11px",
    color: "#fff",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.1)",
    minWidth: "140px",
    position: "relative",
    overflow: "hidden"
  },
  tooltipHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
    paddingBottom: "6px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
  },
  tooltipIcon: {
    fontSize: "14px"
  },
  tooltipLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#e2e8f0",
    letterSpacing: "0.5px"
  },
  tooltipContent: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  temperatureRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  temperatureLabel: {
    color: "rgba(200, 220, 255, 0.7)",
    fontSize: "10px",
    fontWeight: 500
  },
  temperatureValue: {
    fontSize: "12px",
    fontWeight: 700
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  statusLabel: {
    color: "rgba(200, 220, 255, 0.7)",
    fontSize: "10px",
    fontWeight: 500
  },
  statusValue: {
    fontSize: "10px",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "4px",
    background: "rgba(255, 255, 255, 0.1)"
  },
  hintRow: {
    marginTop: "4px",
    paddingTop: "4px",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)"
  },
  hintText: {
    fontSize: "9px",
    color: "rgba(200, 220, 255, 0.5)",
    fontStyle: "italic",
    textAlign: "center"
  },
  tooltipAccent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "3px",
    borderRadius: "0 0 10px 10px",
    opacity: 0.8
  }
};
