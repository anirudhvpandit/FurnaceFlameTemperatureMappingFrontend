// src/furnace3d/scene/FurnaceLayers.jsx
import { useMemo, useRef } from "react";
import { useFurnaceStore } from "../state/FurnaceStore";
import { getTemperatureScaleRange, temperatureToColor } from "../utils/temperatureScale";
import { Html, Text } from "@react-three/drei";
import * as THREE from "three";
import CornerTemperatureField from "./CornerTemperatureField";
import TemperatureBand from "./TemperatureBand";

const LAYER_THICKNESS = 0.85;

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
export default function FurnaceLayers({ model, boilerParams }) {
  const { state, selectLayer, setHover, setFocus, setFocusedLayer, clearFocusedLayer } = useFurnaceStore();
  const opacity = state.layerOpacity;
  const layerRefs = useRef({});
  const showContinuousBand = !state.explodedView && !state.ctScanMode &&
    state.sectionalView !== "isolated" && !state.isFocusedView &&
    model.layers.every((layer) => state.layerVisibility[layer.id] ?? true);
  const layerElevations = model.layers.map((layer) => layer.z);
  const lowestElevation = Math.min(...layerElevations);
  const highestElevation = Math.max(...layerElevations);

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

  // Removed animations to keep furnace static and stable

  return (
    <group>
      {showContinuousBand && <TemperatureBand model={model} thresholds={state.thresholds} boilerParams={boilerParams} />}
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
        // However, corner temperature markers should always be visible on all layers
        if (state.isFocusedView && state.focusedObjectType === "layer" && !isFocused) {
          return null;
        }

        // In burner-focused view, only show the layer containing the focused burner
        // However, corner temperature markers should always be visible on all layers
        if (state.isFocusedView && state.focusedObjectType === 'burner') {
          const layerContainsFocusedBurner = layer.burners.some(b => b.id === state.focusedBurnerId);
          if (!layerContainsFocusedBurner) return null;
        }
        
        // Outline colour follows the layer average-temperature colour so the
        // tile edge reinforces the gradient shown on the surface.
        const color = layer.temperature?.avg != null
          ? temperatureToColor(layer.temperature.avg, state.thresholds.alert, state.thresholds.warn)
          : "#64748b";

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
          <group key={layer.id}>
            <EnhancedLayerMesh
              ref={el => layerRefs.current[layer.id] = el}
              layer={layer}
              showContinuousBand={showContinuousBand}
              position={ctPosition}
              dimensions={sliceDimensions}
              color={color}
              opacity={targetOpacity}
              emissiveIntensity={emissiveIntensity}
              isSelected={isSelected}
              isHovered={isHovered}
              isFocused={isFocused}
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
            {/* Corner temperature markers - always visible on all layers */}
            <CornerTemperatureField
              layer={layer}
              dimensions={sliceDimensions}
              position={ctPosition}
              isTopLayer={layer.z === highestElevation}
              isBottomLayer={layer.z === lowestElevation}
              opacity={1}
            />
          </group>
        );
      })}
    </group>
  );
}

// ============================================================================
// ENHANCED LAYER MESH COMPONENT
// ============================================================================

function EnhancedLayerMesh({ layer, showContinuousBand, position, dimensions, color, opacity, isSelected, isHovered, isFocused, onSelectLayer, onHover, onDoubleClick, ref }) {
  const fallbackMeshRef = useRef();
  const meshRef = ref || fallbackMeshRef;
  const materialRef = useRef();
  const { state } = useFurnaceStore();
  const scaleRange = getTemperatureScaleRange();

  // Create custom geometry with vertex colors for corners
  const geometry = useMemo(() => {
    const width = dimensions.width * 1.04;
    const height = LAYER_THICKNESS;
    const depth = dimensions.depth * 1.04;

    const boxGeometry = new THREE.BoxGeometry(width, height, depth);

    // Get corner temperatures
    const cornerTemps = {
      c1: layer.temperature?.c1,
      c2: layer.temperature?.c2,
      c3: layer.temperature?.c3,
      c4: layer.temperature?.c4,
    };

    // Get colors for each corner
    const cornerColors = {
      c1: new THREE.Color(temperatureToColor(cornerTemps.c1, state.thresholds.alert, state.thresholds.warn)),
      c2: new THREE.Color(temperatureToColor(cornerTemps.c2, state.thresholds.alert, state.thresholds.warn)),
      c3: new THREE.Color(temperatureToColor(cornerTemps.c3, state.thresholds.alert, state.thresholds.warn)),
      c4: new THREE.Color(temperatureToColor(cornerTemps.c4, state.thresholds.alert, state.thresholds.warn)),
    };

    // BoxGeometry has 24 vertices (4 per face)
    // We need to assign colors to vertices based on their corner positions
    const colors = new Float32Array(boxGeometry.attributes.position.count * 3);
    const positions = boxGeometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];

      // Determine which corner this vertex belongs to based on x and z coordinates
      let cornerColor;

      // C1/C4 face the front (z+); C2/C3 are on the opposite face (z-).
      if (x > 0 && z > 0) {
        cornerColor = cornerColors.c4; // front-right
      } else if (x < 0 && z > 0) {
        cornerColor = cornerColors.c1; // front-left
      } else if (x < 0 && z < 0) {
        cornerColor = cornerColors.c2; // back-left
      } else {
        cornerColor = cornerColors.c3; // back-right (x > 0, z < 0)
      }

      colors[i] = cornerColor.r;
      colors[i + 1] = cornerColor.g;
      colors[i + 2] = cornerColor.b;
    }

    boxGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return boxGeometry;
  }, [layer.temperature, dimensions, state.thresholds, scaleRange]);

  // Removed smooth material transitions to keep furnace static

  // Enhanced border glow for selected/hovered/focused states
  const borderColor = isFocused ? "#8b5cf6" : isSelected ? "#3b82f6" : isHovered ? "#22d3ee" : "transparent";
  const borderWidth = isFocused ? 3 : isSelected ? 2 : isHovered ? 1 : 0;

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      renderOrder={3}
      castShadow={!showContinuousBand}
      receiveShadow={!showContinuousBand}
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
      <primitive object={geometry} />
      <meshBasicMaterial
        ref={materialRef}
        vertexColors
        colorWrite={!showContinuousBand}
        depthWrite={!showContinuousBand}
        transparent={showContinuousBand || opacity < 1}
        opacity={showContinuousBand ? 0 : opacity}
        side={THREE.DoubleSide}
        toneMapped={false}
      />

      {/* Persistent outline makes every elevation legible in the dark canvas,
          even when it is not selected or hovered. */}
      {!showContinuousBand && <lineSegments>
        <edgesGeometry
          args={[new THREE.BoxGeometry(
            dimensions.width * 1.04,
            LAYER_THICKNESS,
            dimensions.depth * 1.04
          )]}
        />
        <lineBasicMaterial color="#dce2eb" transparent opacity={isFocused ? 0.95 : 0.72} depthTest={false} />
      </lineSegments>}
      
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
      
      <ElevationNumber
        label={layer.label}
        width={dimensions.width * 1.04}
        depth={dimensions.depth * 1.04}
        opacity={opacity}
      />
    </mesh>
  );
}

function ElevationNumber({ label, width, depth, opacity = 1 }) {
  const text = `${label} m`;
  const fontSize = Math.min(1.4, Math.max(0.7, Math.min(width, depth) * 0.1));
  const textOpacity = 1;
  const faces = [
    { position: [0, 0, depth / 2 + 0.035], rotation: [0, 0, 0] },
    { position: [0, 0, -depth / 2 - 0.035], rotation: [0, Math.PI, 0] },
    { position: [width / 2 + 0.035, 0, 0], rotation: [0, Math.PI / 2, 0] },
    { position: [-width / 2 - 0.035, 0, 0], rotation: [0, -Math.PI / 2, 0] },
  ];

  return (
    <group>
      {faces.map((face, index) => (
        <Text
          key={index}
          position={face.position}
          rotation={face.rotation}
          fontSize={fontSize}
          color="#172033"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.035}
          outlineColor="#fff3c4"
          depthOffset={-2}
          opacity={textOpacity}
          fontWeight={900}
          material-depthTest={false}
          material-depthWrite={false}
          renderOrder={7}
        >{text}</Text>
      ))}
    </group>
  );
}

// ============================================================================
// ENHANCED LAYER TOOLTIP COMPONENT
// ============================================================================

function EnhancedLayerTooltip({ layer, color }) {
  const tempColor = getTemperatureColor(layer.temperature.avg);
  
  return (
    <div style={styles.tooltipContainer}>
      <div style={styles.tooltipContent}>
        <span style={{ ...styles.temperatureValue, color: tempColor }}>
          {layer.temperature.avg.toFixed(0)}°C
        </span>
      </div>
      <div style={{ ...styles.tooltipAccent, background: color }} />
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Returns color based on temperature for UI elements.
 * Uses the shared temperatureToColor scale so the UI never
 * diverges from the 3D geometry colours.
 */
function getTemperatureColor(temperature) {
  if (temperature == null) return "#9ca3af";
  return temperatureToColor(temperature);
}

// ============================================================================
// ENHANCED STYLES
// ============================================================================

const styles = {
  elevationBadge: {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(226, 232, 240, 0.35)",
    borderRadius: "6px",
    padding: "4px 10px",
    fontFamily: "'DM Mono', 'SF Mono', ui-monospace, monospace",
    fontSize: "20px",
    fontWeight: 700,
    color: "#f8fafc",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.45)",
    userSelect: "none",
  },
  tooltipContainer: {
    background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    borderRadius: "10px",
    padding: "10px 14px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "18px",
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
    fontSize: "22px"
  },
  tooltipLabel: {
    fontSize: "19px",
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
    fontSize: "17px",
    fontWeight: 500
  },
  temperatureValue: {
    fontSize: "19px",
    fontWeight: 700
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  statusLabel: {
    color: "rgba(200, 220, 255, 0.7)",
    fontSize: "17px",
    fontWeight: 500
  },
  statusValue: {
    fontSize: "17px",
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
    fontSize: "16px",
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
