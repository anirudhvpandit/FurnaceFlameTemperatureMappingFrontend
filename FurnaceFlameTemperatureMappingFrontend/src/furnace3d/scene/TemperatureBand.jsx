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
    const height = top - bottom;
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
      const x = THREE.MathUtils.clamp(positions.getX(i) / (model.dimensions.width * 0.99) + 0.5, 0, 1);
      const z = THREE.MathUtils.clamp(positions.getZ(i) / (model.dimensions.depth * 0.99) + 0.5, 0, 1);
      const y = positions.getY(i) + height / 2 + bottom;
      let low = layers[0];
      let high = layers[layers.length - 1];
      for (let j = 0; j < layers.length - 1; j += 1) {
        if (y <= layers[j + 1].z) {
          low = layers[j];
          high = layers[j + 1];
          break;
        }
      }
      const fraction = high.z === low.z ? 0 : THREE.MathUtils.clamp((y - low.z) / (high.z - low.z), 0, 1);
      const lowTemp = layerTemperatureAt(low, x, z);
      const highTemp = layerTemperatureAt(high, x, z);
      const temp = lowTemp == null ? highTemp : highTemp == null ? lowTemp : THREE.MathUtils.lerp(lowTemp, highTemp, fraction);
      const color = new THREE.Color(temperatureToColor(temp, thresholds.alert, thresholds.warn));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return { geometry, centerY: (bottom + top) / 2 };
  }, [layers, model, thresholds]);

  if (!band) return null;
  return (
    <mesh geometry={band.geometry} position={[0, band.centerY, 0]} renderOrder={1}>
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
