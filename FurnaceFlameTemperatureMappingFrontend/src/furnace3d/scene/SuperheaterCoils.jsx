import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { temperatureToColor } from "../utils/temperatureScale";

function averageCoilTemperature(boilerParams, coilId) {
  const values = ["l", "r"]
    .map((side) => boilerParams?.[`fg_temp_after_${coilId}_${side}`])
    .filter((value) => value != null && value !== "" && Number.isFinite(Number(value)))
    .map(Number);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 600;
}

/** Earlier serpentine coil detail, shown inside each flue-gas cuboid on zoom. */
export default function SuperheaterCoils({ dimensions, boilerParams, thresholds }) {
  const { width, depth, height } = dimensions;
  const banks = useMemo(() => {
    const configs = [
      { id: "dpsh", x: width * 0.0, y: height * 0.89, h: height * 0.23 },
      { id: "psh", x: width * 0.30, y: height * 0.90, h: height * 0.20 },
      { id: "rh", x: width * 0.60, y: height * 0.90, h: height * 0.20 },
      { id: "hsh", x: width * 0.90, y: height * 0.89, h: height * 0.23 },
    ];
    const casingWidth = width * 0.15;
    const casingDepth = depth * 0.5;
    const pipeRadius = Math.max(0.045, width * 0.0048);
    const rowCount = 5;
    const passes = 4;
    const alert = thresholds?.alert || 1350;
    const warn = thresholds?.warn || 1300;

    return configs.map((config) => {
      const xLeft = -casingWidth * 0.39;
      const xRight = casingWidth * 0.39;
      const pitch = (xRight - xLeft) / (passes - 1);
      const bendRadius = pitch / 2;
      const yTop = config.h * 0.39;
      const yBottom = -config.h * 0.39;
      const rowCurves = [];

      for (let row = 0; row < rowCount; row += 1) {
        const z = THREE.MathUtils.lerp(-casingDepth * 0.38, casingDepth * 0.38, row / (rowCount - 1));
        const points = [new THREE.Vector3(xLeft, yTop, z)];
        for (let pass = 0; pass < passes; pass += 1) {
          const x = xLeft + pitch * pass;
          const endsAtBottom = pass % 2 === 0;
          const yEnd = endsAtBottom ? yBottom : yTop;
          points.push(new THREE.Vector3(x, yEnd, z));

          if (pass < passes - 1) {
            const nextX = xLeft + pitch * (pass + 1);
            const centerX = (x + nextX) / 2;
            for (let step = 1; step <= 10; step += 1) {
              const angle = Math.PI - (step / 10) * Math.PI;
              points.push(new THREE.Vector3(
                centerX + bendRadius * Math.cos(angle),
                yEnd + (endsAtBottom ? -1 : 1) * bendRadius * Math.sin(angle),
                z,
              ));
            }
          }
        }

        const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.25);
        const outline = new THREE.TubeGeometry(curve, 240, pipeRadius * 1.65, 8, false);
        const hotTube = new THREE.TubeGeometry(curve, 240, pipeRadius, 8, false);
        const colors = new Float32Array(hotTube.attributes.position.count * 3);
        const color = new THREE.Color();
        const temp = averageCoilTemperature(boilerParams, config.id);
        color.set(temperatureToColor(temp, alert, warn));
        for (let i = 0; i < hotTube.attributes.position.count; i += 1) {
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        }
        hotTube.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        rowCurves.push({ outline, hotTube });
      }

      const casingGeometry = new THREE.BoxGeometry(casingWidth, config.h, casingDepth);
      return { ...config, rowCurves, casingGeometry, casingWidth, casingDepth };
    });
  }, [width, depth, height, boilerParams, thresholds]);

  return (
    <group>
      {banks.map((bank) => (
        <group key={bank.id} position={[bank.x, bank.y, 0]}>
          <ZoomAwareCuboid bank={bank} dimensions={dimensions} />
          <ZoomedCoilRows bank={bank} dimensions={dimensions} />
          <Html position={[0, 0, bank.casingDepth / 2 + 0.06]} center style={{ pointerEvents: "none" }}>
            <div style={coilLabelStyle}>{bank.id.toUpperCase()}</div>
          </Html>
        </group>
      ))}
    </group>
  );
}

function ZoomedCoilRows({ bank, dimensions }) {
  const detailRef = useRef();
  const { camera } = useThree();
  const distanceLimit = Math.max(dimensions.width, dimensions.height, dimensions.depth) * 0.9;

  useFrame(() => {
    if (!detailRef.current) return;
    const cameraDistance = camera.position.distanceTo(
      new THREE.Vector3(bank.x, bank.y, 0),
    );
    detailRef.current.visible = cameraDistance < distanceLimit;
  });

  return (
    <group ref={detailRef}>
      {bank.rowCurves.map((row, index) => (
        <group key={index} renderOrder={520}>
          <mesh geometry={row.outline} renderOrder={520}>
            <meshBasicMaterial color="#40131b" depthTest={false} toneMapped={false} />
          </mesh>
          <mesh geometry={row.hotTube} renderOrder={521}>
            <meshStandardMaterial
              vertexColors
              emissive="#8f2416"
              emissiveIntensity={0.42}
              metalness={0.38}
              roughness={0.32}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ZoomAwareCuboid({ bank, dimensions }) {
  const { camera } = useThree();
  const meshRef = useRef();
  const wasZoomed = useRef(false);
  const openingMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#40131b",
    side: THREE.FrontSide,
    transparent: true,
    opacity: 1,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  }), []);
  const solidMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#40131b",
    side: THREE.FrontSide,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  }), []);
  const materials = useMemo(
    () => [solidMaterial, solidMaterial, solidMaterial, solidMaterial, openingMaterial, solidMaterial],
    [solidMaterial, openingMaterial],
  );
  const distanceLimit = Math.max(dimensions.width, dimensions.height, dimensions.depth) * 0.9;
  const center = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.getWorldPosition(center);
    const zoomed = camera.position.distanceTo(center) < distanceLimit;
    if (zoomed !== wasZoomed.current) {
      openingMaterial.opacity = zoomed ? 0 : 1;
      openingMaterial.needsUpdate = true;
      wasZoomed.current = zoomed;
    }
  });

  return <mesh ref={meshRef} geometry={bank.casingGeometry} material={materials} renderOrder={500} />;
}

const coilLabelStyle = {
  color: "#ffffff",
  fontFamily: "Arial, sans-serif",
  fontSize: "22px",
  fontWeight: 800,
  lineHeight: 1,
  whiteSpace: "nowrap",
  textShadow: "0 1px 3px #000, 0 0 5px #000",
};
