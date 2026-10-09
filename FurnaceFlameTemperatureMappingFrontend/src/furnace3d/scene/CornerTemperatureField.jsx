import { Billboard, Text } from "@react-three/drei";

const LAYER_THICKNESS = 0.85;

/** Small corner windows and readouts, split between the two opposite faces. */
export default function CornerTemperatureField({ layer, dimensions, position, isTopLayer = false, isBottomLayer = false, opacity = 1 }) {
  const basePosition = [position?.x ?? 0, position?.y ?? layer.z, position?.z ?? 0];
  const corners = {
    c1: { id: "c1", x: -1, z: 1, temperature: layer.temperature?.c1, label: "C1" },
    c2: { id: "c2", x: -1, z: -1, temperature: layer.temperature?.c2, label: "C2" },
    c3: { id: "c3", x: 1, z: -1, temperature: layer.temperature?.c3, label: "C3" },
    c4: { id: "c4", x: 1, z: 1, temperature: layer.temperature?.c4, label: "C4" },
  };

  return (
    <group position={basePosition}>
      {Object.values(corners).map((corner) => (
        <CornerMarker key={corner.id} corner={corner} dimensions={dimensions} face={corner.z > 0 ? "front" : "back"} opacity={opacity} />
      ))}
      {(isTopLayer || isBottomLayer) && (
        <FrontEndSquares dimensions={dimensions} isTopLayer={isTopLayer} isBottomLayer={isBottomLayer} />
      )}
    </group>
  );
}

function CornerMarker({ corner, dimensions, face, opacity }) {
  const x = corner.x * (dimensions.width * 1.04 / 2 - 0.4);
  const z = corner.z * (dimensions.depth * 1.04 / 2 + 0.035);
  const temperatureColor = corner.temperature == null ? "#a8b2c1" : "#f5d66e";
  const isBackSide = face === "back";
  const stackOffset = isBackSide ? -0.28 : 0.28;

  return (
    <Billboard position={[x, stackOffset, z]} renderOrder={7}>
      <group>
        <Text
          position={[0, 0.2, 0]}
          fontSize={0.22}
          color="#f5d66e"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.035}
          outlineColor="#050914"
          material-depthTest={false}
          material-depthWrite={false}
          opacity={opacity}
          fontWeight={700}
        >{corner.label}</Text>
        <Text
          position={[0, -0.08, 0]}
          fontSize={0.24}
          color={temperatureColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#050914"
          material-depthTest={false}
          material-depthWrite={false}
          opacity={opacity}
          fontWeight={800}
        >{corner.temperature == null ? "N/A" : `${Math.round(corner.temperature)}°C`}</Text>
      </group>
    </Billboard>
  );
}

function FrontEndSquares({ dimensions, isTopLayer, isBottomLayer }) {
  const z = dimensions.depth * 1.04 / 2 + 0.04;
  const x = dimensions.width * 1.04 / 2 - 0.4;
  const marks = [
    ...(isTopLayer ? [[-x, LAYER_THICKNESS / 2], [x, LAYER_THICKNESS / 2]] : []),
    ...(isBottomLayer ? [[-x, -LAYER_THICKNESS / 2], [x, -LAYER_THICKNESS / 2]] : []),
  ];

  return marks.map(([markX, y], index) => (
    <Billboard key={`${markX}-${y}-${index}`} position={[markX, y, z]} renderOrder={8}>
      <mesh renderOrder={8}>
        <planeGeometry args={[0.28, 0.28]} />
        <meshBasicMaterial color="#f1f3f5" toneMapped={false} depthTest={false} depthWrite={false} />
      </mesh>
    </Billboard>
  ));
}
