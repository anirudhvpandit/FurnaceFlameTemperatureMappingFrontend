// src/furnace3d/scene/AlarmIndicator.jsx
import { useEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useFurnaceStore } from "../state/FurnaceStore";
import { temperatureStatusLabel } from "../utils/temperatureScale";

const STYLE_ID = "furnace-alarm-indicator-keyframes";

const SEVERITY = {
  CRITICAL: {
    accent: "#f87171",
    accentDeep: "#ef4444",
    glow: "rgba(239, 68, 68, 0.55)",
    glowSoft: "rgba(239, 68, 68, 0.18)",
    border: "rgba(248, 113, 113, 0.55)",
    fill: "rgba(127, 29, 29, 0.42)",
    pulse: 5.2,
    ringOpacity: 0.85,
  },
  ELEVATED: {
    accent: "#fbbf24",
    accentDeep: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.5)",
    glowSoft: "rgba(245, 158, 11, 0.16)",
    border: "rgba(251, 191, 36, 0.5)",
    fill: "rgba(120, 53, 15, 0.42)",
    pulse: 3.4,
    ringOpacity: 0.7,
  },
};

function IconAlarm({ critical }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.2L21.4 19.6H2.6L12 3.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      {critical ? (
        <path d="M12 10v5.2M12 17.6h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M12 10.4v4.4M12 17.2h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

function AlarmBeacon({ color, severity }) {
  const groupRef = useRef();
  const innerRef = useRef();
  const haloRef = useRef();
  const palette = SEVERITY[severity];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * palette.pulse) * 0.1;
    const halo = 1.15 + Math.sin(t * palette.pulse * 0.65 + 0.8) * 0.18;
    if (groupRef.current) groupRef.current.scale.setScalar(pulse);
    if (innerRef.current) {
      innerRef.current.rotation.z = t * 0.8;
      innerRef.current.material.opacity = 0.35 + Math.sin(t * palette.pulse) * 0.15;
    }
    if (haloRef.current) {
      haloRef.current.scale.setScalar(halo);
      haloRef.current.material.opacity = 0.12 + Math.sin(t * palette.pulse * 0.5) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.48, 40]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={palette.ringOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={innerRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.28, 28]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.52, 0.78, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <pointLight color={color} intensity={severity === "CRITICAL" ? 1.6 : 0.9} distance={5} decay={2} />
    </group>
  );
}

function sourceLabel(object, type) {
  if (type === "burner") {
    const corner = object.corner || "Burner";
    const layer = Number.isFinite(object.layerIndex) ? `L${object.layerIndex + 1}` : null;
    return layer ? `${corner} · ${layer}` : corner;
  }
  const elevation = object.label != null ? `${object.label} m` : object.id;
  return `Layer · ${elevation}`;
}

export default function AlarmIndicator({ object, type, temperature }) {
  const { state } = useFurnaceStore();
  const alert = state.thresholds.alert;
  const warn = state.thresholds.warn;

  useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return undefined;
    const styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.textContent = `
      @keyframes alarmHudPulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); filter: brightness(1); }
        50% { transform: translate(-50%, -50%) scale(1.035); filter: brightness(1.08); }
      }
      @keyframes alarmRipple {
        0% { transform: scale(0.55); opacity: 0.55; }
        100% { transform: scale(1.55); opacity: 0; }
      }
      @keyframes alarmScan {
        0% { transform: translateX(-120%); }
        100% { transform: translateX(120%); }
      }
      @keyframes alarmDot {
        0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 currentColor; }
        50% { transform: scale(1.25); box-shadow: 0 0 10px 2px currentColor; }
      }
    `;
    document.head.appendChild(styleEl);
    return undefined;
  }, []);

  const severity = useMemo(() => {
    const label = temperatureStatusLabel(temperature, alert, warn);
    if (label === "CRITICAL" || label === "ELEVATED") return label;
    return null;
  }, [temperature, alert, warn]);

  if (severity == null || temperature == null) return null;

  const palette = SEVERITY[severity];
  const threshold = severity === "CRITICAL" ? alert : warn;
  const delta = temperature - threshold;
  const source = sourceLabel(object, type);
  const isBurner = type === "burner";
  const htmlPosition = isBurner ? [0, 2.35, 0] : [0, 1.15, 0];
  const beaconPosition = isBurner ? [0, 0.55, 0] : [0, 0.85, 0];

  return (
    <group>
      <group position={beaconPosition}>
        <AlarmBeacon color={palette.accentDeep} severity={severity} />
      </group>

      <Html position={htmlPosition} style={{ pointerEvents: "none" }} occlude={false} zIndexRange={[40, 0]}>
        <div
          style={{
            ...styles.wrap,
            animation: "alarmHudPulse 1.6s ease-in-out infinite",
            transform: "translate(-50%, -50%)",
          }}
        >
          <span style={{ ...styles.ripple, borderColor: palette.accent }} />
          <span style={{ ...styles.ripple, borderColor: palette.accent, animationDelay: "0.55s" }} />

          <div
            style={{
              ...styles.card,
              borderColor: palette.border,
              background: `linear-gradient(180deg, ${palette.fill} 0%, rgba(8, 14, 28, 0.78) 100%)`,
              boxShadow: `0 10px 28px rgba(0, 0, 0, 0.42), 0 0 22px ${palette.glowSoft}, inset 0 1px 0 rgba(255,255,255,0.08)`,
            }}
          >
            <div style={{ ...styles.accentBar, background: palette.accentDeep, boxShadow: `0 0 12px ${palette.glow}` }} />

            <div style={styles.scanClip}>
              <div style={{ ...styles.scan, background: `linear-gradient(90deg, transparent, ${palette.accent}33, transparent)` }} />
            </div>

            <div style={styles.header}>
              <span style={{ ...styles.iconWrap, color: palette.accent, background: palette.glowSoft }}>
                <IconAlarm critical={severity === "CRITICAL"} />
              </span>
              <div style={styles.headerText}>
                <div style={{ ...styles.severity, color: palette.accent }}>
                  <span style={{ ...styles.liveDot, background: palette.accent, color: palette.accent }} />
                  {severity}
                </div>
                <div style={styles.source}>{source}</div>
              </div>
            </div>

            <div style={styles.metrics}>
              <div style={styles.tempBlock}>
                <span style={styles.tempValue}>{temperature.toFixed(0)}</span>
                <span style={styles.tempUnit}>°C</span>
              </div>
              <div style={styles.deltaBlock}>
                <span style={styles.deltaLabel}>vs {threshold.toFixed(0)}°</span>
                <span style={{ ...styles.deltaValue, color: palette.accent }}>
                  {delta >= 0 ? "+" : ""}{delta.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}

const styles = {
  wrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    userSelect: "none",
  },
  ripple: {
    position: "absolute",
    inset: "-10px",
    borderRadius: "18px",
    border: "1px solid",
    animation: "alarmRipple 1.8s ease-out infinite",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    overflow: "hidden",
    minWidth: "148px",
    borderRadius: "12px",
    border: "1px solid",
    padding: "8px 11px 8px 13px",
    fontFamily: "'Inter', sans-serif",
    color: "#f8fafc",
    backdropFilter: "blur(16px) saturate(180%)",
    WebkitBackdropFilter: "blur(16px) saturate(180%)",
    whiteSpace: "nowrap",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "3px",
  },
  scanClip: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none",
  },
  scan: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "42%",
    animation: "alarmScan 2.8s linear infinite",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
  },
  iconWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "22px",
    height: "22px",
    borderRadius: "7px",
    flexShrink: 0,
  },
  headerText: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    minWidth: 0,
  },
  severity: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.16em",
  },
  liveDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    animation: "alarmDot 1s ease-in-out infinite",
  },
  source: {
    fontSize: "9px",
    fontWeight: 600,
    letterSpacing: "0.06em",
    color: "rgba(226, 232, 240, 0.62)",
    textTransform: "uppercase",
  },
  metrics: {
    display: "flex",
    alignItems: "flex-end",
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
    fontSize: "18px",
    fontWeight: 700,
    letterSpacing: "-0.03em",
    color: "#ffffff",
  },
  tempUnit: {
    fontFamily: "'DM Mono', ui-monospace, monospace",
    fontSize: "10px",
    fontWeight: 600,
    color: "rgba(226, 232, 240, 0.55)",
  },
  deltaBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "1px",
  },
  deltaLabel: {
    fontSize: "8px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "rgba(180, 210, 255, 0.45)",
    textTransform: "uppercase",
  },
  deltaValue: {
    fontFamily: "'DM Mono', ui-monospace, monospace",
    fontSize: "11px",
    fontWeight: 700,
  },
};
