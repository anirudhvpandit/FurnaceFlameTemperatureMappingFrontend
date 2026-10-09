// src/furnace3d/scene/AlarmIndicator.jsx
import { Text } from "@react-three/drei";
import { temperatureToColor } from "../utils/temperatureScale";

/**
 * AlarmIndicator — temperature text labels at the four tile corners.
 *
 * FIX: Previously this component naively took the first 4 burners from the
 * burners array (Corner 1-4 at 45°, 90°, 135°, 180°) and placed them at tile
 * corner positions (back-left, back-right, front-right, front-left).  That
 * mapping was completely wrong — the physical corner burners are at the
 * diagonal angles (45°, 135°, 225°, 315°), i.e. Corner 1/3/5/7, not 1/2/3/4.
 *
 * Now the component mirrors the same geometry used by CornerTemperatureField
 * and EnhancedLayerMesh: for each tile corner it finds the *closest* burner
 * by angular distance, guaranteeing the temperature label matches both the
 * vertex-colour gradient and the corner spheres.
 */

/** Tile-corner definition — must stay in sync with CornerTemperatureField.jsx */
const TILE_CORNERS = [
  { id: "c1", label: "C1", targetAngle: 225, pos: "back-left" },   // ← Corner 5 (225°)
  { id: "c2", label: "C2", targetAngle: 315, pos: "back-right" },  // ← Corner 7 (315°)
  { id: "c3", label: "C3", targetAngle: 135, pos: "front-left" },  // ← Corner 3 (135°)
  { id: "c4", label: "C4", targetAngle: 45,  pos: "front-right" },  // ← Corner 1 (45°)
];

function findClosestBurner(burners, targetAngle) {
  let closest = null;
  let minDist = Infinity;
  for (const burner of burners) {
    if (burner.angleDeg == null) continue;
    const diff = Math.abs(burner.angleDeg - targetAngle);
    const dist = Math.min(diff, 360 - diff);
    if (dist < minDist) {
      minDist = dist;
      closest = burner;
    }
  }
  return closest;
}

export default function AlarmIndicator(props) {
  // Show temperature indicators at corners of elevation tiles
  return <CornerTemperatureIndicators {...props} />;
}

function CornerTemperatureIndicators({ type, burners, tileWidth, tileDepth }) {
  // Only show for layers with corner data
  if (type !== "layer" || !burners || burners.length === 0) {
    return null;
  }

  const width = tileWidth || 10;
  const depth = tileDepth || 10;
  const protrusionDistance = 1.2; // How far to protrude from corners

  // Build corner entries: for each tile corner find the closest burner
  // by angular distance, and place it at the matching position.  This is
  // exactly the same geometry used by CornerTemperatureField.jsx.
  const corners = TILE_CORNERS.map((corner) => {
    const targetX = corner.pos.includes("right")
      ? width / 2 + protrusionDistance
      : -(width / 2 + protrusionDistance);
    const targetZ = corner.pos.includes("front")
      ? depth / 2 + protrusionDistance
      : -(depth / 2 + protrusionDistance);
    return {
      ...corner,
      x: targetX,
      z: targetZ,
      burner: findClosestBurner(burners, corner.targetAngle),
    };
  });

  return (
    <group>
      {corners.map((corner) => {
        const burner = corner.burner;
        if (!burner) return null;

        const tempColor = temperatureToColor(
          burner.temperature,
          1350, // alert threshold
          1300  // warn threshold
        );
        const displayTemp =
          burner.temperature != null
            ? `${burner.temperature.toFixed(0)}°C`
            : "N/A";

        return (
          <group key={corner.id} position={[corner.x, 0.1, corner.z]}>
            {/* Temperature text */}
            <Text
              position={[0, 0, 0]}
              fontSize={0.5}
              color={tempColor}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.04}
              outlineColor="#0f172a"
              depthOffset={-1}
              fontWeight={900}
            >
              {displayTemp}
            </Text>

            {/* Corner label */}
            <Text
              position={[0, 0.4, 0]}
              fontSize={0.3}
              color="#e2e8f0"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.025}
              outlineColor="#0f172a"
              depthOffset={-1}
              fontWeight={700}
            >
              {corner.label}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
