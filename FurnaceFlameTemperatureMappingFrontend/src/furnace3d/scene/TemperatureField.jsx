// src/furnace3d/scene/TemperatureField.jsx
import { Html } from "@react-three/drei";
import { useFurnaceStore } from "../state/FurnaceStore";
import { temperatureStatusLabel } from "../utils/temperatureScale";

/**
 * Enhanced TemperatureField with beautiful UI/UX improvements.
 *
 * Features:
 *  • Enhanced temperature labels with beautiful gradient backgrounds
 *  • Animated status indicators with pulsing effects
 *  • Improved typography with better visual hierarchy
 *  • Temperature-based color coding for visual feedback
 *  • Enhanced glassmorphism effects with backdrop blur
 *  • Smooth transitions and hover effects
 *  • Better spacing and visual organization
 *  • Professional industrial design aesthetic
 */

export default function TemperatureField({ model, isFocusedView = false, boilerParams }) {
  const { state } = useFurnaceStore();
  // Hide temperature field in focused view (CAT scan mode)
  const shouldShow = state.showTemperatureLabels && !isFocusedView;
  return (
    <group>
      {shouldShow && <TemperatureFieldContent model={model} />}
      <CoilTemperatureLabels model={model} boilerParams={boilerParams} />
    </group>
  );
}

function TemperatureFieldContent({ model }) {
  const { state } = useFurnaceStore();
  return (
    <group>
      {model.layers.map((layer) => {
        const visible = state.layerVisibility[layer.id] ?? true;
        if (!visible || layer.temperature.avg == null) return null;
        const isolatedOut = state.sectionalView === "isolated" && !(state.selection.type === "layer" && state.selection.id === layer.id);
        if (isolatedOut) return null;

        return (
          <EnhancedTemperatureLabel
            key={layer.id}
            layer={layer}
            position={[model.dimensions.width / 2 + 1.2, layer.z, 0]}
            thresholds={state.thresholds}
          />
        );
      })}
    </group>
  );
}

// ============================================================================
// ENHANCED TEMPERATURE LABEL COMPONENT
// ============================================================================

function EnhancedTemperatureLabel({ layer, position, thresholds }) {
  return null;
}

// ============================================================================
// COIL TEMPERATURE LABELS COMPONENT
// ============================================================================

function CoilTemperatureLabels({ model, boilerParams }) {
  if (!boilerParams) return null;

  const { width, height, depth } = model.dimensions;

  // Coil configuration: positions from left to right on the furnace face
  const coils = [
    { id: 'dpsh', label: 'DPSH', yPos: height * 0.92, xPos: -width * 0.38, zPos: depth * 0.5 + 0.5 },
    { id: 'psh', label: 'PSH', yPos: height * 0.88, xPos: -width * 0.13, zPos: depth * 0.5 + 0.5 },
    { id: 'rh', label: 'RH', yPos: height * 0.84, xPos: width * 0.13, zPos: depth * 0.5 + 0.5 },
    { id: 'hsh', label: 'HSH', yPos: height * 0.80, xPos: width * 0.38, zPos: depth * 0.5 + 0.5 },
  ];

  return (
    <group>
      {coils.map((coil) => {
        const leftTemp = boilerParams[`fg_temp_after_${coil.id}_l`];
        const rightTemp = boilerParams[`fg_temp_after_${coil.id}_r`];

        if (leftTemp == null && rightTemp == null) return null;

        return (
          <CoilLabel
            key={coil.id}
            label={coil.label}
            leftTemp={leftTemp}
            rightTemp={rightTemp}
            position={[coil.xPos, coil.yPos, coil.zPos]}
          />
        );
      })}
    </group>
  );
}

function CoilLabel({ label, leftTemp, rightTemp, position }) {
  const leftValue = leftTemp != null && leftTemp !== "" ? Number(leftTemp).toFixed(0) : "N/A";
  const rightValue = rightTemp != null && rightTemp !== "" ? Number(rightTemp).toFixed(0) : "N/A";

  return (
    <Html position={position} transform>
      <div style={coilLabelContainerStyle}>
        <div style={coilLabelHeaderStyle}>{label}</div>
        <div style={coilLabelContentStyle}>
          <div style={coilTempRowStyle}>
            <span style={coilSideLabelStyle}>L:</span>
            <span style={coilTempValueStyle}>{leftValue}°C</span>
          </div>
          <div style={coilTempRowStyle}>
            <span style={coilSideLabelStyle}>R:</span>
            <span style={coilTempValueStyle}>{rightValue}°C</span>
          </div>
        </div>
      </div>
    </Html>
  );
}

// ============================================================================
// COIL LABEL STYLES
// ============================================================================

const coilLabelContainerStyle = {
  background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)",
  border: "1px solid rgba(239, 68, 68, 0.4)",
  borderRadius: "8px",
  padding: "6px 10px",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "14px",
  color: "#e2e8f0",
  backdropFilter: "blur(12px)",
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(239, 68, 68, 0.15)",
  minWidth: "70px",
  textAlign: "center"
};

const coilLabelHeaderStyle = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#fca5a5",
  marginBottom: "4px",
  paddingBottom: "4px",
  borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
  letterSpacing: "0.5px"
};

const coilLabelContentStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "2px"
};

const coilTempRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "6px"
};

const coilSideLabelStyle = {
  fontSize: "13px",
  fontWeight: 600,
  color: "rgba(200, 220, 255, 0.8)"
};

const coilTempValueStyle = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#fef3c7"
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getTemperatureStyle(temperature, thresholds) {
  if (temperature >= thresholds.alert) {
    return {
      color: "#ef4444",
      icon: "🔥",
      background: "rgba(239, 68, 68, 0.15)"
    };
  } else if (temperature >= thresholds.warn) {
    return {
      color: "#f59e0b",
      icon: "⚠️",
      background: "rgba(245, 158, 11, 0.15)"
    };
  } else if (temperature >= 1000) {
    return {
      color: "#22d3ee",
      icon: "✅",
      background: "rgba(34, 211, 238, 0.15)"
    };
  } else {
    return {
      color: "#3b82f6",
      icon: "❄️",
      background: "rgba(59, 130, 246, 0.15)"
    };
  }
}

// ============================================================================
// ENHANCED STYLES
// ============================================================================

const styles = {
  labelContainer: {
    background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    borderRadius: "10px",
    padding: "8px 12px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "18px",
    color: "#e2e8f0",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    backdropFilter: "blur(12px)",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.1)",
    minWidth: "140px",
    position: "relative",
    overflow: "hidden"
  },
  labelHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
    paddingBottom: "6px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
  },
  labelIcon: {
    fontSize: "22px"
  },
  layerLabel: {
    fontSize: "19px",
    fontWeight: 700,
    color: "#e2e8f0",
    letterSpacing: "0.5px"
  },
  labelContent: {
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
  statusBadge: {
    fontSize: "17px",
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  labelAccent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "3px",
    borderRadius: "0 0 10px 10px",
    opacity: 0.8
  }
};