import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { temperatureToColor } from "../utils/temperatureScale";

/** Get coil temperature at a specific x position */
function getCoilTemperatureAtX(xNorm, boilerParams) {
  const coilPositions = [
    { xNorm: 0.12, temp: coilSideAverage(boilerParams, "dpsh") },
    { xNorm: 0.37, temp: coilSideAverage(boilerParams, "psh") },
    { xNorm: 0.63, temp: coilSideAverage(boilerParams, "rh") },
    { xNorm: 0.88, temp: coilSideAverage(boilerParams, "hsh") },
  ].map((coil) => ({
    ...coil,
    temp: coil.temp == null || coil.temp === "" || !Number.isFinite(Number(coil.temp)) ? null : Number(coil.temp)
  })).filter((coil) => coil.temp != null);

  if (coilPositions.length === 0) return 600; // Default temperature

  // Interpolate temperature based on x position
  if (coilPositions.length === 1) return coilPositions[0].temp;
  if (xNorm <= coilPositions[0].xNorm) return coilPositions[0].temp;
  if (xNorm >= coilPositions[coilPositions.length - 1].xNorm) return coilPositions[coilPositions.length - 1].temp;

  for (let i = 0; i < coilPositions.length - 1; i++) {
    const left = coilPositions[i];
    const right = coilPositions[i + 1];
    if (xNorm >= left.xNorm && xNorm <= right.xNorm) {
      const fraction = (xNorm - left.xNorm) / (right.xNorm - left.xNorm);
      return THREE.MathUtils.lerp(left.temp, right.temp, fraction);
    }
  }
  return coilPositions[0].temp;
}

function coilSideAverage(boilerParams, coilId) {
  const readings = ["l", "r"]
    .map((side) => boilerParams?.[`fg_temp_after_${coilId}_${side}`])
    .filter((value) => value != null && value !== "" && Number.isFinite(Number(value)))
    .map(Number);
  return readings.length ? readings.reduce((sum, value) => sum + value, 0) / readings.length : null;
}

/** 3D superheater tube curtains filling the upper furnace above the buzz-neck. */
export default function SuperheaterCoils({ dimensions, boilerParams, thresholds }) {
  const { width, depth, height } = dimensions;
  const coilMeshRefs = useRef([]);

  // 4 joined cuboids for dpsh, psh, rh, hsh from left to right
  const coils = useMemo(() => {
    const coilWidth = width * 0.15;
    const coilDepth = depth * 0.5;

    return [
      { id: 'dpsh', xPos: width * 0.0, yPos: height * 0.88, height: height * 0.25 },
      { id: 'psh', xPos: width * 0.30, yPos: height * 0.90, height: height * 0.20 },
      { id: 'rh', xPos: width * 0.60, yPos: height * 0.90, height: height * 0.20 },
      { id: 'hsh', xPos: width * 0.90, yPos: height * 0.90, height: height * 0.20 },
    ].map(coil => ({
      ...coil,
      coilWidth,
      coilDepth,
      geometry: new THREE.BoxGeometry(coilWidth, coil.height, coilDepth),
      color: new THREE.Color("#40131b")
    }));
  }, [width, height, depth]);

  return (
    <group>
      {coils.map((coil, coilIndex) => (
        <group key={coil.id}>
          <mesh
            ref={(node) => { coilMeshRefs.current[coilIndex] = node; }}
            geometry={coil.geometry}
            position={[coil.xPos, coil.yPos, 0]}
            renderOrder={500}
          >
            <meshBasicMaterial
              color={coil.color}
              transparent={false}
              opacity={1}
              side={THREE.FrontSide}
              depthTest={false}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>

          <CoilFaceLabels
            coil={coil}
            label={coil.id.toUpperCase()}
            coilIndex={coilIndex}
            coilMeshRefs={coilMeshRefs}
          />
        </group>
      ))}
    </group>
  );
}

function CoilFaceLabels({ coil, label, coilIndex, coilMeshRefs }) {
  const { camera } = useThree();
  const groupRef = useRef();
  const lastVisibleFaces = useRef("");
  const [visibleFaces, setVisibleFaces] = useState([]);
  const faces = coilFaces(coil);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const cameraPosition = useMemo(() => new THREE.Vector3(), []);
  const facePosition = useMemo(() => new THREE.Vector3(), []);
  const labelPosition = useMemo(() => new THREE.Vector3(), []);
  const toCamera = useMemo(() => new THREE.Vector3(), []);
  const rayDirection = useMemo(() => new THREE.Vector3(), []);
  const faceNormal = useMemo(() => new THREE.Vector3(), []);
  const orientation = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    if (!groupRef.current) return;
    camera.getWorldPosition(cameraPosition);
    groupRef.current.getWorldQuaternion(orientation);
    const candidates = coilMeshRefs.current.filter(Boolean);
    const ownMesh = coilMeshRefs.current[coilIndex];
    if (!ownMesh) return;

    const nextVisibleFaces = [];
    faces.forEach((face) => {
      faceNormal.set(...face.normal).applyQuaternion(orientation);
      facePosition.set(...face.position);
      groupRef.current.localToWorld(labelPosition.copy(facePosition));
      toCamera.copy(cameraPosition).sub(labelPosition).normalize();
      if (faceNormal.dot(toCamera) <= 0.02) return;

      rayDirection.copy(labelPosition).sub(cameraPosition).normalize();
      raycaster.set(cameraPosition, rayDirection);
      const firstHit = raycaster.intersectObjects(candidates, false)[0];
      const labelDistance = cameraPosition.distanceTo(labelPosition);
      const liesOnVisibleSurface = firstHit
        && firstHit.object === ownMesh
        && Math.abs(firstHit.distance - labelDistance) < 0.2;
      if (liesOnVisibleSurface) nextVisibleFaces.push(face.name);
    });
    const nextKey = nextVisibleFaces.join("|");
    if (nextKey !== lastVisibleFaces.current) {
      lastVisibleFaces.current = nextKey;
      setVisibleFaces(nextVisibleFaces);
    }
  });

  return (
    <group ref={groupRef} position={[coil.xPos, coil.yPos, 0]}>
      {faces.filter((face) => visibleFaces.includes(face.name)).map((face) => (
        <Html
          key={face.name}
          position={face.position}
          rotation={face.rotation}
          transform
          center
        >
          <div style={coilLabelStyle}>{label}</div>
        </Html>
      ))}
    </group>
  );
}

const coilLabelStyle = {
  color: "#ffffff",
  fontFamily: "Arial, sans-serif",
  fontSize: "22px",
  fontWeight: 800,
  lineHeight: 1,
  whiteSpace: "nowrap",
  textShadow: "0 1px 3px #000, 0 0 5px #000",
  pointerEvents: "none",
};

function coilFaces(coil) {
  const { coilWidth, coilDepth, height } = coil;
  const offset = 0.06;
  return [
    { name: "front", position: [0, 0, coilDepth / 2 + offset], rotation: [0, 0, 0], normal: [0, 0, 1] },
    { name: "back", position: [0, 0, -coilDepth / 2 - offset], rotation: [0, Math.PI, 0], normal: [0, 0, -1] },
    { name: "left", position: [-coilWidth / 2 - offset, 0, 0], rotation: [0, -Math.PI / 2, 0], normal: [-1, 0, 0] },
    { name: "right", position: [coilWidth / 2 + offset, 0, 0], rotation: [0, Math.PI / 2, 0], normal: [1, 0, 0] },
    { name: "top", position: [0, height / 2 + offset, 0], rotation: [-Math.PI / 2, 0, 0], normal: [0, 1, 0] },
    { name: "bottom", position: [0, -height / 2 - offset, 0], rotation: [Math.PI / 2, 0, 0], normal: [0, -1, 0] },
  ];
}
