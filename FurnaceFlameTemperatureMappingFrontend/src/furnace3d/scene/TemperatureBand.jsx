import { useMemo } from "react";
import * as THREE from "three";
import { temperatureToColor } from "../utils/temperatureScale";

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
export default function TemperatureBand({ model, thresholds }) {
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
      let x = positions.getX(i);
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
      let fraction = 0;

      // If y is above the top layer, use the top layer's temperature
      if (y > top) {
        const lowTemp = layerTemperatureAt(high, xNorm, zNorm);
        const temp = lowTemp ?? 1200; // Fallback to reasonable temperature
        const color = new THREE.Color(temperatureToColor(temp, thresholds.alert, thresholds.warn));
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        continue;
      }

      // If y is below the bottom layer, use the bottom layer's temperature
      if (y < bottom) {
        const lowTemp = layerTemperatureAt(low, xNorm, zNorm);
        const temp = lowTemp ?? 1200; // Fallback to reasonable temperature
        const color = new THREE.Color(temperatureToColor(temp, thresholds.alert, thresholds.warn));
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        continue;
      }

      // Normal interpolation between layers
      for (let j = 0; j < layers.length - 1; j += 1) {
        if (y <= layers[j + 1].z) {
          low = layers[j];
          high = layers[j + 1];
          break;
        }
      }
      fraction = high.z === low.z ? 0 : THREE.MathUtils.clamp((y - low.z) / (high.z - low.z), 0, 1);
      const lowTemp = layerTemperatureAt(low, xNorm, zNorm);
      const highTemp = layerTemperatureAt(high, xNorm, zNorm);
      const temp = lowTemp == null ? highTemp : highTemp == null ? lowTemp : THREE.MathUtils.lerp(lowTemp, highTemp, fraction);
      const color = new THREE.Color(temperatureToColor(temp, thresholds.alert, thresholds.warn));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    positions.needsUpdate = true;
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return { geometry, centerY: (extendedBottom + extendedTop) / 2 };
  }, [layers, model, thresholds]);

  if (!band) return null;
  return (
    <mesh geometry={band.geometry} position={[0, band.centerY, 0]} renderOrder={0}>
      <meshBasicMaterial
        vertexColors
        transparent={false}
        opacity={1}
        depthWrite
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}
