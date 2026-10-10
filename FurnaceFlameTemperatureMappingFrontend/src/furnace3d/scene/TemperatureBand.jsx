import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getTemperatureScaleRange, temperatureToColor } from "../utils/temperatureScale";

function layerTemperatureAt(layer, x, z) {
  const values = [
    layer.temperature?.c1,
    layer.temperature?.c2,
    layer.temperature?.c3,
    layer.temperature?.c4,
  ].map((value) => value ?? layer.temperature?.avg ?? null);
  if (values.some((value) => value == null)) return layer.temperature?.avg ?? null;
  // Front face (z+) is c1 on the left and c4 on the right. The opposite
  // face (z-) is c2 on the left and c3 on the right.
  const back = THREE.MathUtils.lerp(values[1], values[2], x);
  const front = THREE.MathUtils.lerp(values[0], values[3], x);
  return THREE.MathUtils.lerp(back, front, z);
}

function flueGasTemperatureAt(boilerParams, y, xNorm, zNorm, height, leftWall, rightWall) {
  // These readings describe the coil pass sequence from top to bottom.
  const stages = [
    { y: 0.96, left: boilerParams?.fg_temp_after_dpsh_l, right: boilerParams?.fg_temp_after_dpsh_r },
    { y: 0.92, left: boilerParams?.fg_temp_after_psh_l, right: boilerParams?.fg_temp_after_psh_r },
    { y: 0.87, left: boilerParams?.fg_temp_after_rh_l, right: boilerParams?.fg_temp_after_rh_r },
    { y: 0.82, left: boilerParams?.fg_temp_after_hsh_l, right: boilerParams?.fg_temp_after_hsh_r },
  ].map((stage) => {
    const parse = (value) => value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
    return { ...stage, left: parse(stage.left), right: parse(stage.right) };
  }).filter((stage) => stage.left != null || stage.right != null);

  // Wrap the readings around all four vertical faces. The front/back faces
  // blend left-to-right; each side wall follows its corresponding sensor.
  // The top cap carries the final DPSH left-to-right gradient.
  const onLeftOrRightWall = leftWall || rightWall;
  const onFrontOrBackWall = zNorm <= 0.002 || zNorm >= 0.998;
  const altitude = y / height;
  const onTopSurface = altitude >= 0.998;
  if (!stages.length || (!onLeftOrRightWall && !onFrontOrBackWall && !onTopSurface)) return null;
  const sample = (stage) => {
    if (onLeftOrRightWall) {
      return leftWall
        ? stage.left ?? stage.right
        : stage.right ?? stage.left;
    }
    const left = stage.left ?? stage.right;
    const right = stage.right ?? stage.left;
    return THREE.MathUtils.lerp(left, right, xNorm);
  };
  const topStage = stages[0];
  const bottomStage = stages[stages.length - 1];
  if (onTopSurface) return sample(topStage);
  if (altitude >= topStage.y) return sample(topStage);
  if (altitude <= bottomStage.y) return sample(bottomStage);
  for (let index = 0; index < stages.length - 1; index += 1) {
    const upper = stages[index];
    const lower = stages[index + 1];
    if (altitude <= upper.y && altitude >= lower.y) {
      const fraction = (upper.y - altitude) / (upper.y - lower.y);
      return THREE.MathUtils.lerp(sample(upper), sample(lower), fraction);
    }
  }
  return null;
}

/** Get the inset value at a given height for the buzzneck notch */
function getBuzzneckInset(y, height, width) {
  const cutBottomY = height * 0.69;
  const cutTopY = height * 0.81;
  const cutInset = width * 0.28;

  // Below or above buzzneck section, no inset
  if (y < cutBottomY || y > cutTopY) return 0;

  // Interpolate through the notch profile
  const notchProfile = [
    { y: cutBottomY, inset: 0 },
    { y: height * 0.705, inset: cutInset * 0.35 },
    { y: height * 0.73, inset: cutInset * 0.9 },
    { y: height * 0.755, inset: cutInset },
    { y: cutTopY, inset: 0 },
  ];

  // Find the segment containing y and interpolate
  for (let i = 0; i < notchProfile.length - 1; i++) {
    const current = notchProfile[i];
    const next = notchProfile[i + 1];
    if (y >= current.y && y <= next.y) {
      const t = (y - current.y) / (next.y - current.y);
      return THREE.MathUtils.lerp(current.inset, next.inset, t);
    }
  }
  return 0;
}

/** Smooth temperature volume between the elevation tiles, colored from the
 * measured corner values at each elevation. */
export default function TemperatureBand({ model, thresholds, boilerParams }) {
  const materialRef = useRef();
  const scaleRange = getTemperatureScaleRange();
  const layers = useMemo(() => [...(model?.layers || [])]
    .filter((layer) => layer.temperature?.avg != null)
    .sort((a, b) => a.z - b.z), [model]);

  const band = useMemo(() => {
    if (layers.length < 2) return null;
    const bottom = layers[0].z;
    const top = layers[layers.length - 1].z;
    // Extend the temperature gradient to the full furnace height
    const extendedTop = model.dimensions.height;
    // Extend to just above the hopper (cone) - hopper starts at height * 0.16
    const extendedBottom = model.dimensions.height * 0.16;
    const height = extendedTop - extendedBottom;
    if (height <= 0) return null;

    const geometry = new THREE.BoxGeometry(
      model.dimensions.width * 0.99,
      height,
      model.dimensions.depth * 0.99,
      32,
      Math.max(48, layers.length * 16),
      32,
    );
    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    for (let i = 0; i < positions.count; i += 1) {
      const originalX = positions.getX(i);
      let x = originalX;
      const z = positions.getZ(i);
      const y = positions.getY(i) + height / 2 + extendedBottom;

      // Apply buzzneck notch on positive x side
      if (x > 0) {
        const inset = getBuzzneckInset(y, model.dimensions.height, model.dimensions.width);
        x = Math.max(0, x - inset);
        positions.setX(i, x);
      }

      const xNorm = THREE.MathUtils.clamp(x / (model.dimensions.width * 0.99) + 0.5, 0, 1);
      const zNorm = THREE.MathUtils.clamp(z / (model.dimensions.depth * 0.99) + 0.5, 0, 1);

      let low = layers[0];
      let high = layers[layers.length - 1];
      let temp;
      if (y <= bottom) {
        temp = layerTemperatureAt(low, xNorm, zNorm);
      } else if (y >= top) {
        temp = layerTemperatureAt(high, xNorm, zNorm);
      } else {
        for (let j = 0; j < layers.length - 1; j += 1) {
          if (y <= layers[j + 1].z) {
            low = layers[j];
            high = layers[j + 1];
            break;
          }
        }
        const fraction = high.z === low.z ? 0 : THREE.MathUtils.clamp((y - low.z) / (high.z - low.z), 0, 1);
        const lowTemp = layerTemperatureAt(low, xNorm, zNorm);
        const highTemp = layerTemperatureAt(high, xNorm, zNorm);
        temp = lowTemp == null ? highTemp : highTemp == null ? lowTemp : THREE.MathUtils.lerp(lowTemp, highTemp, fraction);
      }
      const shellHalfWidth = (model.dimensions.width * 0.99) / 2;
      const leftWall = originalX <= -shellHalfWidth + 0.002;
      const rightWall = originalX >= shellHalfWidth - 0.002;
      const flueTemp = flueGasTemperatureAt(boilerParams, y, xNorm, zNorm, model.dimensions.height, leftWall, rightWall);
      if (flueTemp != null) {
        // Fade the coil readings into the existing furnace heatmap below the coils.
        const blend = THREE.MathUtils.smoothstep(y / model.dimensions.height, 0.68, 0.82);
        temp = temp == null ? flueTemp : THREE.MathUtils.lerp(temp, flueTemp, blend);
      }
      const color = new THREE.Color(temperatureToColor(temp, thresholds.alert, thresholds.warn));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    positions.needsUpdate = true;
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return { geometry, centerY: (extendedBottom + extendedTop) / 2 };
  }, [layers, model, thresholds, scaleRange, boilerParams]);

  useFrame(({ clock }) => {
    const shader = materialRef.current?.userData.flowShader;
    if (shader) shader.uniforms.uFlowTime.value = clock.getElapsedTime();
  });

  if (!band) return null;
  return (
    <mesh geometry={band.geometry} position={[0, band.centerY, 0]} renderOrder={0}>
      <meshBasicMaterial
        ref={materialRef}
        vertexColors
        transparent={false}
        opacity={1}
        depthWrite
        side={THREE.DoubleSide}
        toneMapped={false}
        onBeforeCompile={(shader) => {
          shader.uniforms.uFlowTime = { value: 0 };
          shader.uniforms.uFurnaceHeight = { value: model.dimensions.height };
          shader.uniforms.uBandCenterY = { value: band.centerY };
          shader.vertexShader = `
            varying vec3 vFurnaceFlowPosition;
            uniform float uBandCenterY;
            ${shader.vertexShader}
          `.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
             vFurnaceFlowPosition = transformed + vec3(0.0, uBandCenterY, 0.0);`
          );
          shader.fragmentShader = `
            varying vec3 vFurnaceFlowPosition;
            uniform float uFlowTime;
            uniform float uFurnaceHeight;
            ${shader.fragmentShader}
          `.replace(
            "#include <color_fragment>",
            `#include <color_fragment>
             float altitude = clamp(vFurnaceFlowPosition.y / uFurnaceHeight, 0.0, 1.0);
             float weave = sin(vFurnaceFlowPosition.x * 0.28 + vFurnaceFlowPosition.z * 0.24
                               + sin(altitude * 5.0 - uFlowTime * 0.9) * 0.8);
             float currentA = 0.5 + 0.5 * sin(altitude * 16.0 - uFlowTime * 1.9 + weave * 1.1);
             float currentB = 0.5 + 0.5 * sin(altitude * 14.0 - uFlowTime * 1.7 - weave * 1.1 + 2.1);
             float gentleFlow = max(currentA, currentB);
             diffuseColor.rgb *= 0.82 + gentleFlow * 0.32;`
          );
          if (materialRef.current) materialRef.current.userData.flowShader = shader;
        }}
        customProgramCacheKey={() => "temperature-gradient-gentle-flow-v1"}
      />
    </mesh>
  );
}
