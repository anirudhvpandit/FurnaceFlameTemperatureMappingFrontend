// src/furnace3d/scene/EnhancedFlame.jsx
import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useFurnaceStore } from "../state/FurnaceStore";
import { temperatureToColor } from "../utils/temperatureScale";
import { createFlameParticleMaterial } from "../utils/materials";

/**
 * EnhancedFlame — layered, temperature-driven burner flame.
 *
 * Visual stack (local Y is flame height; the group is rotated onto the nozzle):
 *  1. Soft volumetric glow at the root
 *  2. Additive shader body with domain-warped fBm, radial falloff, wisps
 *  3. White-hot inner core
 *  4. Blue stoichiometric root
 *  5. Sparks + slower embers
 *  6. Heat haze cards
 */

const NOISE_GLSL = `
vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
           dot(p, vec3(269.5, 183.3, 246.1)),
           dot(p, vec3(113.5, 271.9, 124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0));
  float n100 = dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0));
  float n010 = dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0));
  float n110 = dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0));
  float n001 = dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1));
  float n101 = dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1));
  float n011 = dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1));
  float n111 = dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}
float fbm(vec3 p) {
  float f = 0.0;
  float w = 0.5;
  for (int i = 0; i < 5; i++) {
    f += w * noise(p);
    p = p * 2.07 + 17.13;
    w *= 0.5;
  }
  return f * 0.5 + 0.5;
}
`;

const FlameShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color() },
    uIntensity: { value: 1.0 },
    uCoreColor: { value: new THREE.Color(1.0, 0.92, 0.23) }, // Yellow core
    uOuterColor: { value: new THREE.Color(1.0, 0.6, 0.0) }, // Orange outer
    uTipColor: { value: new THREE.Color(1.0, 0.34, 0.13) }, // Red-orange tip
    uTempNorm: { value: 0.5 },
    uSeed: { value: 0 },
    uHeight: { value: 1.85 },
    uSheath: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying float vNoise;

    uniform float uTime;
    uniform float uTempNorm;
    uniform float uSeed;
    uniform float uSheath;

    ${NOISE_GLSL}

    void main() {
      vUv = uv;
      vPosition = position;

      float t = uTime * (1.5 + uTempNorm * 1.0) + uSeed; // Reduced animation speed for stability
      float h = clamp(uv.y, 0.0, 1.0);
      vec3 p = vec3(position.x * 2.0, position.y * 1.5 - t * 1.5, position.z * 2.0); // Moderate vertical movement
      float n = fbm(p + uSeed);
      float n2 = fbm(p * 1.5 + vec3(20.1, t * 0.4, -8.4)); // Moderate noise for vertical flow
      vNoise = n;

      vec2 radial = position.xz;
      float radialLen = length(radial);
      vec2 dir = radialLen > 0.0001 ? radial / radialLen : vec2(0.0);
      float sway = (n - 0.5) * (0.12 + uSheath * 0.06) * (0.3 + h) * (0.4 + uTempNorm); // Reduced sway for stability
      vec3 displaced = position;
      displaced.xz += dir * sway;
      displaced.x += sin(t * 1.5 + position.y * 2.0 + uSeed) * 0.04 * h; // Reduced horizontal movement
      displaced.z += cos(t * 1.2 + position.y * 1.5 + uSeed) * 0.04 * h; // Reduced horizontal movement
      displaced.y += (n2 - 0.5) * 0.08 * uTempNorm * h; // Moderate vertical displacement

      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform vec3 uCoreColor;
    uniform vec3 uOuterColor;
    uniform vec3 uTipColor;
    uniform float uTempNorm;
    uniform float uSeed;
    uniform float uHeight;
    uniform float uSheath;
    uniform float uSheath;

    varying vec2 vUv;
    varying vec3 vPosition;
    varying float vNoise;

    ${NOISE_GLSL}

    void main() {
      float h = clamp(vPosition.y / uHeight + 0.5, 0.0, 1.0);
      float radiusAtH = mix(0.38 + uSheath * 0.12, 0.02, pow(h, 0.72));
      float r = length(vPosition.xz) / max(radiusAtH, 0.012);

      vec3 p = vec3(vUv * vec2(5.5, 3.2), uTime * (3.0 + uTempNorm * 1.5) + uSeed); // Reduced noise animation for stability
      vec2 warp = vec2(fbm(p), fbm(p + 23.17));
      float n = fbm(p + vec3(warp * 1.15, 0.0));
      float flicker = 0.82 + n * 0.28 + sin(uTime * 8.0 + uSeed) * 0.03; // Reduced flicker for stability

      vec3 baseCol = mix(uOuterColor, uColor, 0.4);
      vec3 midCol = mix(uCoreColor, uColor, 0.22);
      vec3 tipCol = mix(uTipColor, mix(uColor, vec3(0.55, 0.62, 1.0), 0.25 * uTempNorm), 0.35);

      vec3 flameCol = mix(baseCol, midCol, smoothstep(0.0, 0.45, h));
      flameCol = mix(flameCol, tipCol, smoothstep(0.55, 1.0, h));

      float core = exp(-r * (2.4 - uTempNorm * 0.6)) * (1.0 - h * 0.55);
      flameCol = mix(flameCol, uCoreColor, core * (0.55 + uTempNorm * 0.45));
      flameCol += core * uCoreColor * (0.85 + uTempNorm) * uIntensity;
      flameCol += pow(core, 2.2) * vec3(1.0, 0.97, 0.88) * uTempNorm * 0.8;

      float body = pow(1.0 - smoothstep(0.12, 1.05, r), 1.25);
      float wisps = mix(0.55, 1.0, smoothstep(0.22, 0.78, n));
      float tipFade = 1.0 - smoothstep(0.52 + uTempNorm * 0.12, 1.0, h);
      float rootFade = smoothstep(0.0, 0.07, h);
      float sheathFade = uSheath > 0.5 ? 0.42 : 1.0;

      float alpha = body * wisps * tipFade * rootFade * flicker * uIntensity * sheathFade;
      alpha *= 0.62 + 0.38 * uTempNorm;
      alpha = clamp(alpha, 0.0, 1.0);

      gl_FragColor = vec4(flameCol * flicker, alpha);
    }
  `,
};

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function FlameParticles({ count, color, intensity, seed, mode = "spark" }) {
  const particlesRef = useRef();
  const isEmber = mode === "ember";
  const spread = isEmber ? 0.25 : 0.3; // Increased spread for thicker flame
  const riseMax = isEmber ? 2.5 : 3.5; // Vertical rise for animated particles

  const { positions, velocities, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const s = seed + i * 19.17 + (isEmber ? 100 : 0);
      // Initial positions distributed vertically in the flame area
      pos[i * 3] = (seededRandom(s) - 0.5) * spread; // Horizontal spread
      pos[i * 3 + 1] = 0.0 + seededRandom(s + 1.3) * 2.0; // Vertical distribution
      pos[i * 3 + 2] = (seededRandom(s + 2.1) - 0.5) * spread; // Depth spread
      vel[i * 3] = (seededRandom(s + 3.7) - 0.5) * (isEmber ? 0.004 : 0.008); // Horizontal movement
      vel[i * 3 + 1] = (isEmber ? 0.02 : 0.04) + seededRandom(s + 4.2) * (isEmber ? 0.02 : 0.04); // Vertical rise
      vel[i * 3 + 2] = (seededRandom(s + 5.9) - 0.5) * (isEmber ? 0.004 : 0.008); // Depth movement
      sz[i] = (isEmber ? 0.18 : 0.12) + seededRandom(s + 8.4) * (isEmber ? 0.12 : 0.1); // Particle sizes
    }
    return { positions: pos, velocities: vel, sizes: sz };
  }, [count, seed, isEmber, spread, riseMax]);

  const particleMaterial = useMemo(() => {
    const mat = createFlameParticleMaterial(color, intensity);
    mat.size = isEmber ? 0.18 : 0.12; // Larger particles for thicker flame
    mat.toneMapped = false;
    mat.opacity = isEmber ? 0.65 * intensity : 0.95 * intensity; // Higher opacity
    mat.sizeAttenuation = true;
    return mat;
  }, [color, intensity, isEmber]);

  useEffect(() => {
    if (!particleMaterial) return;
    particleMaterial.color.set(color);
    particleMaterial.opacity = (isEmber ? 0.65 : 0.95) * intensity;
  }, [particleMaterial, color, intensity, isEmber]);

  useFrame(({ clock }) => {
    if (!particlesRef.current) return;
    const arr = particlesRef.current.geometry.attributes.position.array;
    const t = clock.getElapsedTime();
    const swirl = isEmber ? 0.8 : 1.2; // Swirl speed for animation

    for (let i = 0; i < count; i++) {
      const wobble = Math.sin(t * swirl + i * 0.5 + seed) * (isEmber ? 0.0008 : 0.0012); // Wobble animation
      arr[i * 3] += velocities[i * 3] + wobble; // Horizontal movement
      arr[i * 3 + 1] += velocities[i * 3 + 1]; // Vertical rise
      arr[i * 3 + 2] += velocities[i * 3 + 2] + Math.cos(t * swirl + i + seed) * (isEmber ? 0.0008 : 0.0012); // Depth movement

      // Reset particles when they reach the top
      if (arr[i * 3 + 1] > riseMax) {
        const s = seed + i * 13.7 + t;
        arr[i * 3 + 1] = 0.0; // Reset to bottom
        arr[i * 3] = (seededRandom(s) - 0.5) * spread * 0.6; // Reset horizontal position
        arr[i * 3 + 2] = (seededRandom(s + 4.1) - 0.5) * spread * 0.6; // Reset depth position
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <primitive object={particleMaterial} attach="material" />
    </points>
  );
}

function makeFlameShader(sheath) {
  return {
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color() },
      uIntensity: { value: 1 },
      uCoreColor: { value: new THREE.Color(1.0, 0.92, 0.23) }, // Yellow core
      uOuterColor: { value: new THREE.Color(1.0, 0.6, 0.0) }, // Orange outer
      uTipColor: { value: new THREE.Color(1.0, 0.34, 0.13) }, // Red-orange tip
      uTempNorm: { value: 0.5 },
      uSeed: { value: 0 },
      uHeight: { value: sheath ? 5.0 : 4.0 },
      uSheath: { value: sheath ? 1 : 0 },
    },
    vertexShader: FlameShaderMaterial.vertexShader,
    fragmentShader: FlameShaderMaterial.fragmentShader,
  };
}

export default function EnhancedFlame({ burner, temperature, isHot, isSelected, rectangular = false, flamePosition = [0, 0.5, 0] }) {
  const groupRef = useRef();
  const bodyRef = useRef();
  const sheathRef = useRef();
  const coreRef = useRef();
  const bodyMatRef = useRef();
  const sheathMatRef = useRef();
  const glowRef = useRef();
  const hazeRef = useRef();
  const { state } = useFurnaceStore();

  const safeTemperature = temperature ?? 1000; // Default to 1000°C for permanent flame
  const flameColor = temperatureToColor(safeTemperature, state.thresholds.alert, state.thresholds.warn);
  const tempNorm = Math.min(1, Math.max(0, (safeTemperature - 900) / 800));
  const intensity = (isHot ? 1.25 : 0.82) + (isSelected ? 0.22 : 0);
  const seed = (burner.position?.x ?? 0) * 12.7 + (burner.position?.y ?? 0) * 4.3;

  const coreColor = useMemo(() => new THREE.Color("#ffeb3b"), []); // Yellow core
  const outerColor = useMemo(() => new THREE.Color("#ff9800"), []); // Orange outer
  const tipColor = useMemo(() => new THREE.Color("#ff5722"), []); // Red-orange tip
  const rootYellow = useMemo(() => new THREE.Color("#ffeb3b"), []); // Yellow root

  const bodyShader = useMemo(() => makeFlameShader(false), []);
  const sheathShader = useMemo(() => makeFlameShader(true), []);

  const syncMaterial = (mat) => {
    if (!mat?.uniforms) return;
    mat.uniforms.uColor.value.set(coreColor); // Use yellow core color for entire flame
    mat.uniforms.uCoreColor.value.copy(coreColor);
    mat.uniforms.uOuterColor.value.copy(outerColor);
    mat.uniforms.uTipColor.value.copy(tipColor);
    mat.uniforms.uTempNorm.value = tempNorm;
    mat.uniforms.uIntensity.value = intensity;
    mat.uniforms.uSeed.value = seed;
  };

  useEffect(() => {
    syncMaterial(bodyMatRef.current);
    syncMaterial(sheathMatRef.current);
  }, [flameColor, intensity, tempNorm, seed, coreColor, outerColor, tipColor]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    
    // Animated flame - shader animation for flickering effect
    // Burner remains static, only flame animates

    if (bodyMatRef.current) {
      bodyMatRef.current.uniforms.uTime.value = t * 2.0; // Normal shader animation speed
      syncMaterial(bodyMatRef.current);
    }
    if (sheathMatRef.current) {
      sheathMatRef.current.uniforms.uTime.value = t * 1.5; // Normal shader animation speed
      syncMaterial(sheathMatRef.current);
      sheathMatRef.current.uniforms.uIntensity.value = intensity * 0.55;
    }

    // Subtle flame animation (breathing, core pulsing, glow)
    if (groupRef.current) {
      if (rectangular) {
        groupRef.current.scale.set(1.0, 1.0, 1.0);
      } else {
        groupRef.current.scale.set(1.0, 1.0, 1.0);
      }
    }
    if (bodyRef.current) {
      bodyRef.current.rotation.y = 0; // No rotation
      bodyRef.current.scale.y = 1 + Math.sin(t * 3.0 + seed) * 0.05 * (0.5 + tempNorm); // Breathing animation
    }
    if (sheathRef.current) {
      sheathRef.current.rotation.y = 0; // No rotation
    }
    if (coreRef.current) {
      const c = 0.92 + Math.sin(t * 4.0 + seed) * 0.04; // Core pulsing animation
      if (rectangular) {
        coreRef.current.scale.set(c * 0.9, 1 + Math.sin(t * 3.0 + seed) * 0.05, c * 0.8);
      } else {
        coreRef.current.scale.set(c, 1 + Math.sin(t * 3.0 + seed) * 0.05, c);
      }
    }
    if (glowRef.current) {
      const g = 1 + Math.sin(t * 2.5 + seed) * 0.06; // Glow pulsing animation
      glowRef.current.scale.setScalar(g);
    }
    if (hazeRef.current) {
      hazeRef.current.material.opacity = (0.04 + tempNorm * 0.05) * intensity * (0.7 + Math.sin(t * 1.8 + seed) * 0.15); // Haze flickering
      hazeRef.current.position.y = 0.55 + Math.sin(t * 0.7 + seed) * 0.04; // Haze movement
    }
  });

  const sparkCount = 48; // Increased spark count for larger flames
  const emberCount = 20; // Increased ember count for larger flames

  // Simple flame geometry - thick and tall yellow box
  const rectWidth = 0.9; // Thick
  const rectHeight = 5.0; // Very tall
  const rectDepth = 0.9; // Thick

  return (
    <group ref={groupRef} position={flamePosition} rotation={[0, 0, 0]}>
      {rectangular ? (
        <>
          {/* Simple yellow translucent flame box */}
          <mesh ref={bodyRef}>
            <boxGeometry args={[rectWidth, rectHeight, rectDepth]} />
            <meshBasicMaterial
              color={coreColor}
              transparent
              opacity={0.6}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Animated particles */}
          <FlameParticles count={sparkCount} color={coreColor} intensity={intensity} seed={seed} mode="spark" />
          <FlameParticles count={emberCount} color={coreColor} intensity={intensity * 0.7} seed={seed + 9.1} mode="ember" />
        </>
      ) : (
        <>
          {/* Cylindrical flame for non-rectangular */}
          <mesh ref={bodyRef}>
            <cylinderGeometry args={[0.3, 0.4, rectHeight, 32, 1, true]} />
            <meshBasicMaterial
              color={coreColor}
              transparent
              opacity={0.6}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Animated particles */}
          <FlameParticles count={sparkCount} color={coreColor} intensity={intensity} seed={seed} mode="spark" />
          <FlameParticles count={emberCount} color={coreColor} intensity={intensity * 0.7} seed={seed + 9.1} mode="ember" />
        </>
      )}
    </group>
  );
}
