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

function flueGasTemperatureAt(boilerParams, y, xNorm, zNorm, height, leftWall, rightWall, width) {
  // These readings describe the coil pass sequence from top to bottom.
  // Coil positions from left to right: DPSH, PSH, RH, HSH
  const coilPositions = [
    { xNorm: 0.12, temp: boilerParams?.fg_temp_after_dpsh_l ?? boilerParams?.fg_temp_after_dpsh_r },
    { xNorm: 0.37, temp: boilerParams?.fg_temp_after_psh_l ?? boilerParams?.fg_temp_after_psh_r },
    { xNorm: 0.63, temp: boilerParams?.fg_temp_after_rh_l ?? boilerParams?.fg_temp_after_rh_r },
    { xNorm: 0.88, temp: boilerParams?.fg_temp_after_hsh_l ?? boilerParams?.fg_temp_after_hsh_r },
  ].map((coil) => ({
    ...coil,
    temp: coil.temp == null || coil.temp === "" || !Number.isFinite(Number(coil.temp)) ? null : Number(coil.temp)
  })).filter((coil) => coil.temp != null);

  if (coilPositions.length === 0) return null;

  // Interpolate temperature horizontally based on coil positions
  const getCoilTempAtX = (x) => {
    if (coilPositions.length === 1) return coilPositions[0].temp;
    if (x <= coilPositions[0].xNorm) return coilPositions[0].temp;
    if (x >= coilPositions[coilPositions.length - 1].xNorm) return coilPositions[coilPositions.length - 1].temp;

    for (let i = 0; i < coilPositions.length - 1; i++) {
      const left = coilPositions[i];
      const right = coilPositions[i + 1];
      if (x >= left.xNorm && x <= right.xNorm) {
        const fraction = (x - left.xNorm) / (right.xNorm - left.xNorm);
        return THREE.MathUtils.lerp(left.temp, right.temp, fraction);
      }
    }
    return coilPositions[0].temp;
  };

  const altitude = y / height;
  const onTopSurface = altitude >= 0.998;
  const onFrontOrBackWall = zNorm <= 0.002 || zNorm >= 0.998;

  // Apply coil temperature gradient in the coil section (0.72 to 1.0 of height - covers top section)
  const coilSectionTop = 1.0;
  const coilSectionBottom = 0.72;

  if (altitude >= coilSectionBottom && altitude <= coilSectionTop) {
    // The furnace cap is part of the coil section too. Sample the same
    // left-to-right coil pass gradient there instead of falling back to the
    // upper elevation layer temperatures.
    if (onTopSurface) {
      return getCoilTempAtX(xNorm);
    }
    if (onFrontOrBackWall) {
      return getCoilTempAtX(xNorm);
    }
    if (leftWall) {
      return getCoilTempAtX(0.15); // DPSH position on left wall
    }
    if (rightWall) {
      return getCoilTempAtX(0.85); // HSH position on right wall
    }
  }

  // For areas outside coil section, return null to use furnace layer temperatures
  return null;
}

/** Get the inset value at a given height for the buzzneck notch */
function getBuzzneckInset(y, height, width) {
  const cutBottomY = height * 0.72;
  const cutTopY = height * 0.82;
  const cutInset = width * 0.28;

  // Below or above buzzneck section, no inset
  if (y < cutBottomY || y > cutTopY) return 0;

  // Interpolate through the notch profile
  const notchProfile = [
    { y: cutBottomY, inset: 0 },
    { y: height * 0.73, inset: cutInset * 0.35 },
    { y: height * 0.745, inset: cutInset * 0.9 },
    { y: height * 0.76, inset: cutInset },
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

    const shellWidth = model.dimensions.width * 0.99;
    const rightExtension = model.dimensions.width * 0.45;
    const geometry = new THREE.BoxGeometry(
      shellWidth,
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

      const xNorm = THREE.MathUtils.clamp(x / shellWidth + 0.5, 0, 1);
      if (x > 0 && y >= model.dimensions.height * 0.82) {
        x += rightExtension;
        positions.setX(i, x);
      }
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
      const leftWall = originalX <= -shellWidth / 2 + 0.002;
      const rightWall = originalX >= shellWidth / 2 - 0.002;
      const flueTemp = flueGasTemperatureAt(boilerParams, y, xNorm, zNorm, model.dimensions.height, leftWall, rightWall, model.dimensions.width);
      if (flueTemp != null) {
        // Use coil temperature directly in the coil section
        temp = flueTemp;
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
