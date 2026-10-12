// src/furnace3d/scene/BurnerSystem.jsx
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useFurnaceStore, useEffectiveBurner } from "../state/FurnaceStore";
import { BURNER_STATUS_COLOR } from "../config/furnaceConfig";
import { temperatureStatusLabel, temperatureToColor } from "../utils/temperatureScale";
import AlarmIndicator from "./AlarmIndicator";
import EnhancedFlame from "./EnhancedFlame";

const STYLE_ID = "furnace-burner-hud-keyframes";
const PORT_ANGLES = [0, 60, 120, 180, 240, 300];
const BOLT_ANGLES = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];

const STEEL = "#ffffff"; // White for burners
const STEEL_DARK = "#e0e0e0"; // Light gray for burner details
const STEEL_DEEP = "#cccccc"; // Medium gray for burner ports
const BRACKET = "#d0d0d0"; // Light gray for bracket

function ensureHudStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const styleEl = document.createElement("style");
  styleEl.id = STYLE_ID;
  styleEl.textContent = `
    @keyframes burnerHudIn {
      from { opacity: 0; transform: translate(-50%, calc(-50% + 6px)) scale(0.96); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    @keyframes burnerStatusDot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.35); opacity: 0.7; }
    }
  `;
  document.head.appendChild(styleEl);
}

function FocusHalo({ color, selected, hovered }) {
  const groupRef = useRef();
  const outerRef = useRef();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const pulse = selected ? 1 + Math.sin(t * 3.4) * 0.06 : 1 + Math.sin(t * 2.2) * 0.03;
    groupRef.current.scale.setScalar(pulse);
    if (outerRef.current) {
      outerRef.current.material.opacity = selected
        ? 0.22 + Math.sin(t * 3.4) * 0.08
        : 0.12 + Math.sin(t * 2.2) * 0.04;
      outerRef.current.rotation.z = t * (selected ? 0.35 : 0.15);
    }
  });

  if (!selected && !hovered) return null;

  return (
    <group ref={groupRef} position={[0, 0, 0.05]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.52, 0.62, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={selected ? 0.9 : 0.45}
          side={THREE.DoubleSide}
          depthWrite={false}
              // clippingPlanes={[]}
        />
      </mesh>
      <mesh ref={outerRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.68, 0.78, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
              // clippingPlanes={[]}
        />
      </mesh>
    </group>
  );
}

function BurnerTooltip({ burner, effective, condition, statusColor, tempColor, simulated, disabled }) {
  const mill = effective.mill;
  const tempLabel = effective.temperature != null ? `${effective.temperature.toFixed(0)}` : "—";

  return (
    <Html position={[0, 1.85, 0]} style={{ pointerEvents: "none" }} occlude={false} zIndexRange={[30, 0]}>
      <div style={styles.hudWrap}>
        <div
          style={{
            ...styles.card,
            borderColor: `${statusColor}66`,
            boxShadow: `0 12px 28px rgba(0,0,0,0.42), 0 0 18px ${statusColor}22, inset 0 1px 0 rgba(255,255,255,0.08)`,
          }}
        >
          <div style={{ ...styles.accent, background: statusColor, boxShadow: `0 0 10px ${statusColor}` }} />

          <div style={styles.row}>
            <span style={styles.status}>
              <span style={{ ...styles.dot, background: statusColor, color: statusColor }} />
              {disabled ? "OFFLINE" : effective.status}
            </span>
            {simulated && <span style={styles.simBadge}>SIM</span>}
          </div>

          <div style={styles.source}>
            {burner.corner}
            {Number.isFinite(burner.layerIndex) ? ` · L${burner.layerIndex + 1}` : ""}
          </div>

          <div style={styles.metrics}>
            <div style={styles.tempBlock}>
              <span style={{ ...styles.tempValue, color: disabled ? "rgba(226,232,240,0.45)" : "#fff" }}>{tempLabel}</span>
              <span style={styles.tempUnit}>°C</span>
            </div>
            <span style={{ ...styles.condition, color: tempColor }}>{condition}</span>
          </div>

          {mill && (
            <div style={styles.mill}>
              {mill.id || "Mill"}
              {mill.coalFlowTph != null ? ` · ${Number(mill.coalFlowTph).toFixed(1)} tph` : ""}
            </div>
          )}
        </div>
      </div>
    </Html>
  );
}

function Burner({ burner, layerVisible, isFocused, model }) {
  return layerVisible && isFocused ? <BurnerContent burner={burner} model={model} /> : null;
}

function BurnerContent({ burner, model }) {
  const effective = useEffectiveBurner(burner);
  const { state, selectBurner, setHover, setFocusedBurner, setFocusedLayer, clearFocusedLayer } = useFurnaceStore();
  const ledRef = useRef();

  const isSelected = state.selection.type === "burner" && state.selection.id === burner.id;
  const isHovered = state.hoveredObject?.type === "burner" && state.hoveredObject?.id === burner.id;
  const tempValue = effective.temperature ?? 1000; // Default to 1000°C for permanent flame
  const isHot = tempValue >= state.thresholds.alert;
  const isElevated = tempValue >= state.thresholds.warn;
  const disabled = !!effective.override?.disabled;
  const simulated = !!effective.simulated;

  const statusColor = BURNER_STATUS_COLOR[effective.status] || "#6b7280";
  const condition = temperatureStatusLabel(
    tempValue,
    state.thresholds.alert,
    state.thresholds.warn
  );
  const tempColor = temperatureToColor(
    tempValue,
    state.thresholds.alert,
    state.thresholds.warn
  );

  const nozzleEmissive = useMemo(() => {
    if (disabled) return 0.12;
    const t = Math.min(1, Math.max(0, (tempValue - 900) / 800));
    return THREE.MathUtils.lerp(0.28, 1.05, t);
  }, [tempValue, disabled]);

  const nozzleColorObj = useMemo(
    () => new THREE.Color(disabled ? STEEL_DARK : tempColor),
    [disabled, tempColor]
  );
  const statusColorObj = useMemo(() => new THREE.Color(statusColor), [statusColor]);
  const haloColor = isSelected ? "#22d3ee" : simulated ? "#a78bfa" : "#93c5fd";

  const alarmVisible = tempValue >= state.thresholds.warn;

  useFrame(({ clock }) => {
    if (!ledRef.current) return;
    const t = clock.getElapsedTime();
    const pulse = disabled ? 0.15 : 0.55 + Math.sin(t * (isHot ? 6 : 3.2) + burner.position.x) * 0.35;
    ledRef.current.material.emissiveIntensity = pulse;
  });

  // Calculate full elevation height based on layer index
  const layerHeight = (model?.dimensions?.height || 42) / (model?.layers?.length || 1);
  const burnerHeight = layerHeight * 1.0; // Cover 100% of the elevation section

  return (
    <group
      position={[burner.position.x, burner.position.z, burner.position.y]}
      rotation={[0, 0, 0]}
      onClick={(e) => { e.stopPropagation(); selectBurner(burner.id); }}
      onDoubleClick={(e) => { 
        e.stopPropagation(); 
        if (state.isFocusedView && state.focusedBurnerId === burner.id) {
          clearFocusedLayer();
        } else {
          setFocusedBurner(burner.id);
        }
      }}
      onPointerOver={() => { document.body.style.cursor = "pointer"; setHover({ type: "burner", id: burner.id }); }}
      onPointerOut={() => { document.body.style.cursor = "auto"; setHover(null); }}
    >
      {/* Simple white opaque burner - main vertical box */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, burnerHeight, 0.8]} />
        <meshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.9} />
      </mesh>

      {/* Status LED */}
      <mesh ref={ledRef} position={[0, burnerHeight * 0.5, 0.5]}>
        <boxGeometry args={[0.15, 0.15, 0.15]} />
        <meshStandardMaterial
          color={statusColorObj}
          emissive={statusColorObj}
          emissiveIntensity={0.8}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>

      {/* Yellow translucent flame on top */}
      <EnhancedFlame
        burner={burner}
        temperature={tempValue}
        isHot={isHot}
        isSelected={isSelected}
        rectangular={true}
        flamePosition={[0, burnerHeight * 0.5, 0]}
      />
      {/* Static vertical rectangular burner housing covering full elevation */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, burnerHeight, 0.5]} />
        <meshStandardMaterial color={STEEL} metalness={0.3} roughness={0.7} envMapIntensity={0.5} />
      </mesh>

      {/* Static vertical housing collar */}
      <mesh position={[0, 0, 0.2]} castShadow>
        <boxGeometry args={[0.55, burnerHeight * 0.9, 0.55]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.3} roughness={0.7} envMapIntensity={0.5} />
      </mesh>

      {/* Static vertical air intake ports */}
      {PORT_ANGLES.map((angle) => (
        <mesh
          key={`port-${angle}`}
          position={[Math.cos((angle * Math.PI) / 180) * 0.35, Math.sin((angle * Math.PI) / 180) * (burnerHeight * 0.4), -0.1]}
          castShadow
        >
          <boxGeometry args={[0.12, burnerHeight * 0.15, 0.12]} />
          <meshStandardMaterial color={STEEL_DEEP} metalness={0.3} roughness={0.7} envMapIntensity={0.5} />
        </mesh>
      ))}

      {/* Static vertical nozzle at top */}
      <mesh position={[0, burnerHeight * 0.45, 0.15]} castShadow receiveShadow>
        <boxGeometry args={[0.35, burnerHeight * 0.12, 0.35]} />
        <meshStandardMaterial
          color={STEEL_DARK}
          metalness={0.3}
          roughness={0.7}
          envMapIntensity={0.5}
        />
      </mesh>

      {/* Static vertical throat */}
      <mesh position={[0, burnerHeight * 0.35, 0.12]}>
        <boxGeometry args={[0.25, burnerHeight * 0.08, 0.25]} />
        <meshStandardMaterial color={STEEL_DARK} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Closed iris when the burner is disabled */}
      {disabled && (
        <mesh position={[0, burnerHeight * 0.5, 0.18]}>
          <boxGeometry args={[0.08, burnerHeight * 0.06, 0.08]} />
          <meshStandardMaterial color="#cccccc" metalness={0.3} roughness={0.7} />
        </mesh>
      )}

      {/* Static vertical support bracket */}
      <mesh position={[0, 0, -0.25]} castShadow receiveShadow>
        <boxGeometry args={[0.5, burnerHeight * 0.95, 0.5]} />
        <meshStandardMaterial color={BRACKET} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Control valve + status LED */}
      <mesh position={[0, burnerHeight * 0.1, -0.2]} castShadow>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial color="#ffffff" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh ref={ledRef} position={[0, burnerHeight * 0.15, -0.15]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial
          color={statusColorObj}
          emissive={statusColorObj}
          emissiveIntensity={0.7}
          metalness={0.2}
          roughness={0.35}
        />
      </mesh>

      <EnhancedFlame
        burner={burner}
        temperature={tempValue}
        isHot={isHot}
        isSelected={isSelected}
        rectangular={true}
        flamePosition={[0, burnerHeight * 0.6, 0]}
      />

      <pointLight
        position={[0, 0, 0.7]}
        color={tempColor}
        intensity={disabled ? 0.3 : (isHot ? 1.4 : 0.7)}
        distance={4.5}
        decay={2}
      />

      {isHovered && !alarmVisible && (
        <Html position={[0, 2.2, 0]} style={{ pointerEvents: "none" }} occlude={false}>
          <div style={styles.catScanHint}>
            Double-click for CAT scan view
          </div>
        </Html>
      )}

      <FocusHalo color={haloColor} selected={isSelected} hovered={isHovered} />
            <AlarmIndicator object={burner} type="burner" temperature={tempValue} />
    </group>
  );
}

export default function BurnerSystem({ model, visible = true }) {
  return visible ? <BurnerSystemContent model={model} /> : null;
}

function BurnerSystemContent({ model }) {
  const { state } = useFurnaceStore();

  useEffect(() => {
    ensureHudStyles();
  }, []);

  if (!model) return null;

  // In focused view, only show the focused burner
  const isFocusedView = state.isFocusedView && state.focusedObjectType === 'burner';

  const burnerPositions = useMemo(() => {
    if (!state.explodedView || !model) return {};

    const factor = state.explosionFactor || 0.3;
    const positions = {};
    const totalHeight = model.dimensions.height;

    model.layers.forEach((layer) => {
      const normalizedHeight = layer.z / totalHeight;
      const explosionOffset = (normalizedHeight - 0.5) * totalHeight * factor;
      layer.burners.forEach((burner) => {
        positions[burner.id] = {
          x: burner.position.x,
          y: burner.position.y,
          z: burner.position.z + explosionOffset,
        };
      });
    });

    return positions;
  }, [state.explodedView, state.explosionFactor, model?.layers, model?.dimensions.height]);

  return (
    <group>
      {model.layers.map((layer) => {
        const layerVisible = state.layerVisibility[layer.id] ?? true;
        const isolatedOut = state.sectionalView === "isolated" && !(state.selection.type === "layer" && state.selection.id === layer.id);
        // The burner assembly belongs to the front face only. Burner data is
        // stored with its horizontal depth in position.y (mapped to world z).
        return layer.burners.filter((burner) => burner.position.y >= 0).map((burner) => {
          const position = state.explodedView ? burnerPositions[burner.id] : burner.position;
          const adjustedBurner = position ? { ...burner, position } : burner;
          
          // In focused burner view, only show the focused burner
          const isFocusedBurner = isFocusedView && state.focusedBurnerId === burner.id;
          const shouldShow = isFocusedView ? isFocusedBurner : (layerVisible && !isolatedOut);
          
          return (
            <Burner
              key={burner.id}
              burner={adjustedBurner}
              layerVisible={shouldShow}
              isFocused={isFocusedBurner}
              model={model}
            />
          );
        });
      })}
    </group>
  );
}

const styles = {
  hudWrap: {
    transform: "translate(-50%, -50%)",
    animation: "burnerHudIn 0.18s ease-out",
    pointerEvents: "none",
    userSelect: "none",
  },
  card: {
    position: "relative",
    minWidth: "158px",
    overflow: "hidden",
    borderRadius: "12px",
    border: "1px solid rgba(59,130,246,0.35)",
    background: "linear-gradient(180deg, rgba(15,23,45,0.82) 0%, rgba(8,14,28,0.78) 100%)",
    padding: "8px 12px 8px 14px",
    fontFamily: "'Inter', sans-serif",
    color: "#f8fafc",
    backdropFilter: "blur(16px) saturate(180%)",
    WebkitBackdropFilter: "blur(16px) saturate(180%)",
    whiteSpace: "nowrap",
  },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "3px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "3px",
  },
  status: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "16px",
    fontWeight: 800,
    letterSpacing: "0.14em",
    color: "rgba(226,232,240,0.9)",
    textTransform: "uppercase",
  },
  dot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    animation: "burnerStatusDot 1.4s ease-in-out infinite",
  },
  simBadge: {
    fontSize: "15px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#ddd6fe",
    background: "rgba(124,58,237,0.28)",
    border: "1px solid rgba(167,139,250,0.5)",
    borderRadius: "5px",
    padding: "1px 6px",
  },
  source: {
    fontSize: "17px",
    fontWeight: 600,
    letterSpacing: "0.04em",
    color: "rgba(200,220,255,0.62)",
    marginBottom: "6px",
  },
  metrics: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "12px",
  },
  tempBlock: {
    display: "flex",
    alignItems: "baseline",
    gap: "2px",
    lineHeight: 1,
  },
  tempValue: {
    fontFamily: "'DM Mono', ui-monospace, monospace",
    fontSize: "28px",
    fontWeight: 700,
    letterSpacing: "-0.03em",
  },
  tempUnit: {
    fontFamily: "'DM Mono', ui-monospace, monospace",
    fontSize: "17px",
    color: "rgba(226,232,240,0.5)",
  },
  condition: {
    fontSize: "16px",
    fontWeight: 800,
    letterSpacing: "0.12em",
  },
  mill: {
    marginTop: "6px",
    paddingTop: "5px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    fontSize: "16px",
    fontWeight: 600,
    letterSpacing: "0.04em",
    color: "rgba(180,210,255,0.5)",
  },
  catScanHint: {
    fontSize: "16px",
    color: "rgba(200,220,255,0.6)",
    fontStyle: "italic",
    textAlign: "center",
    background: "rgba(15,23,42,0.8)",
    padding: "4px 8px",
    borderRadius: "6px",
    border: "1px solid rgba(59,130,246,0.2)",
    backdropFilter: "blur(8px)",
  },
};
