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

function configureFlowShader(shader, centerY, height, materialRef) {
  shader.uniforms.uFlowTime = { value: 0 };
  shader.uniforms.uFurnaceHeight = { value: height };
  shader.uniforms.uBandCenterY = { value: centerY };
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
}

/** Smooth temperature volume between the elevation tiles, colored from the
 * measured corner values at each elevation. */
export default function TemperatureBand({ model, thresholds, boilerParams }) {
  const materialRef = useRef();
  const endTriangleMaterialRef = useRef();
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
    // Keep an exact row at 82% height, where the upper block extension starts.
    // The band spans 16%-100%, so 82% is 11/14 through that span.
    const verticalSegments = Math.ceil(Math.max(48, layers.length * 16) / 14) * 14;
    const geometry = new THREE.BoxGeometry(
      shellWidth,
      height,
      model.dimensions.depth * 0.99,
      32,
      verticalSegments,
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
      if (x > 0 && y >= model.dimensions.height * 0.82 - 1e-6) {
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

  // Fill only the final buzzneck triangle, including its front, back, and
  // connecting faces. Its colors use the same coil-temperature sampling as
  // the furnace gradient, while the existing band geometry remains unchanged.
  const endTriangle = useMemo(() => {
    if (!model?.dimensions || layers.length < 1) return null;
    const { width, depth, height } = model.dimensions;
    const bottom = height * 0.77;
    const top = height * 0.82;
    // Match the existing upper gradient surface's actual span at the join.
    const xInner = width * 0.45;
    const xOuter = width * 0.951;
    const centerY = (height * 0.16 + height) / 2;
    // Slightly overlap the shell outline to prevent a dark antialiasing seam;
    // the outline itself renders over this fill.
    const z = depth * 0.501;
    const points = [
      [xInner, top, -z], [xOuter, bottom, -z], [xOuter, top, -z],
      [xInner, top, z], [xOuter, bottom, z], [xOuter, top, z],
    ];
    const positions = [];
    const colors = [];
    const addFace = (a, b, c) => [points[a], points[b], points[c]].forEach(([x, y, zPosition]) => {
      positions.push(x, y - centerY, zPosition);
    });
    // Triangular end faces.
    addFace(0, 1, 2);
    addFace(3, 5, 4);
    // Three rectangular sides, split into triangles to close the prism.
    [[0, 1, 4, 3], [1, 2, 5, 4], [2, 0, 3, 5]].forEach(([a, b, c, d]) => {
      addFace(a, b, c);
      addFace(a, c, d);
    });
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1] + centerY;
      const zPosition = positions[i + 2];
      // Above the slope, the existing gradient is translated right by 0.45w;
      // invert that translation when sampling its colors at the shared edge.
      const sampleX = y >= top - 1e-6 ? x - width * 0.45 : x;
      const xNorm = THREE.MathUtils.clamp(sampleX / (width * 0.99) + 0.5, 0, 1);
      const zNorm = THREE.MathUtils.clamp(zPosition / (depth * 0.99) + 0.5, 0, 1);
      let low = layers[0];
      let high = layers[layers.length - 1];
      let temp;
      if (y <= low.z) temp = layerTemperatureAt(low, xNorm, zNorm);
      else if (y >= high.z) temp = layerTemperatureAt(high, xNorm, zNorm);
      else {
        for (let j = 0; j < layers.length - 1; j += 1) {
          if (y <= layers[j + 1].z) {
            low = layers[j];
            high = layers[j + 1];
            break;
          }
        }
        const t = high.z === low.z ? 0 : THREE.MathUtils.clamp((y - low.z) / (high.z - low.z), 0, 1);
        const lowTemp = layerTemperatureAt(low, xNorm, zNorm);
        const highTemp = layerTemperatureAt(high, xNorm, zNorm);
        temp = lowTemp == null ? highTemp : highTemp == null ? lowTemp : THREE.MathUtils.lerp(lowTemp, highTemp, t);
      }
      const coilTemp = flueGasTemperatureAt(
        boilerParams, y, xNorm, 1, height, false, false, width,
      );
      if (coilTemp != null) temp = coilTemp;
      const color = new THREE.Color(temperatureToColor(temp, thresholds.alert, thresholds.warn));
      colors.push(color.r, color.g, color.b);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return { geometry, centerY };
  }, [layers, model, thresholds, boilerParams]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    [materialRef, endTriangleMaterialRef].forEach((ref) => {
      const shader = ref.current?.userData.flowShader;
      if (shader) shader.uniforms.uFlowTime.value = time;
    });
  });

  if (!band) return null;
  return (
    <>
    <mesh geometry={band.geometry} position={[0, band.centerY, 0]} renderOrder={0}>
      <meshBasicMaterial
        ref={materialRef}
        vertexColors
        transparent={false}
        opacity={1}
        depthWrite
        side={THREE.DoubleSide}
        toneMapped={false}
        onBeforeCompile={(shader) => configureFlowShader(shader, band.centerY, model.dimensions.height, materialRef)}
        customProgramCacheKey={() => "temperature-gradient-gentle-flow-v1"}
      />
    </mesh>
    {endTriangle && (
      <mesh geometry={endTriangle.geometry} position={[0, endTriangle.centerY, 0]} renderOrder={1}>
        <meshBasicMaterial
          ref={endTriangleMaterialRef}
          vertexColors
          side={THREE.DoubleSide}
          toneMapped={false}
          onBeforeCompile={(shader) => configureFlowShader(shader, endTriangle.centerY, model.dimensions.height, endTriangleMaterialRef)}
          customProgramCacheKey={() => "temperature-gradient-gentle-flow-v1"}
        />
      </mesh>
    )}
    </>
  );
}
