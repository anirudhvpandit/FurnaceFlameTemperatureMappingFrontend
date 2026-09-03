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
    uCoreColor: { value: new THREE.Color(1.0, 0.95, 0.72) },
    uOuterColor: { value: new THREE.Color(1.0, 0.38, 0.08) },
    uTipColor: { value: new THREE.Color(0.55, 0.22, 0.04) },
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

      float t = uTime * (1.65 + uTempNorm * 1.4) + uSeed;
      float h = clamp(uv.y, 0.0, 1.0);
      vec3 p = vec3(position.x * 2.4, position.y * 1.15 - t * 1.55, position.z * 2.4);
      float n = fbm(p + uSeed);
      float n2 = fbm(p * 1.7 + vec3(19.1, t * 0.4, -8.4));
      vNoise = n;

      vec2 radial = position.xz;
      float radialLen = length(radial);
      vec2 dir = radialLen > 0.0001 ? radial / radialLen : vec2(0.0);
      float sway = (n - 0.5) * (0.16 + uSheath * 0.08) * (0.35 + h) * (0.45 + uTempNorm);
      vec3 displaced = position;
      displaced.xz += dir * sway;
      displaced.x += sin(t * 1.8 + position.y * 3.0 + uSeed) * 0.045 * h;
      displaced.z += cos(t * 1.5 + position.y * 2.4 + uSeed) * 0.045 * h;
      displaced.y += (n2 - 0.5) * 0.08 * uTempNorm;

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

    varying vec2 vUv;
    varying vec3 vPosition;
    varying float vNoise;

    ${NOISE_GLSL}

    void main() {
      float h = clamp(vPosition.y / uHeight + 0.5, 0.0, 1.0);
      float radiusAtH = mix(0.38 + uSheath * 0.12, 0.02, pow(h, 0.72));
      float r = length(vPosition.xz) / max(radiusAtH, 0.012);

      vec3 p = vec3(vUv * vec2(5.5, 3.2), uTime * (4.2 + uTempNorm * 2.4) + uSeed);
      vec2 warp = vec2(fbm(p), fbm(p + 23.17));
      float n = fbm(p + vec3(warp * 1.15, 0.0));
      float flicker = 0.78 + n * 0.38 + sin(uTime * 11.0 + uSeed) * 0.04;

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
  const riseMax = isEmber ? 1.25 : 1.7;
  const spread = isEmber ? 0.18 : 0.28;

  const { positions, velocities, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const s = seed + i * 19.17 + (isEmber ? 100 : 0);
      pos[i * 3] = (seededRandom(s) - 0.5) * spread;
      pos[i * 3 + 1] = seededRandom(s + 1.3) * riseMax;
      pos[i * 3 + 2] = (seededRandom(s + 2.1) - 0.5) * spread;
      vel[i * 3] = (seededRandom(s + 3.7) - 0.5) * (isEmber ? 0.004 : 0.01);
      vel[i * 3 + 1] = (isEmber ? 0.01 : 0.022) + seededRandom(s + 4.2) * (isEmber ? 0.014 : 0.032);
      vel[i * 3 + 2] = (seededRandom(s + 5.9) - 0.5) * (isEmber ? 0.004 : 0.01);
      sz[i] = (isEmber ? 0.055 : 0.03) + seededRandom(s + 8.4) * (isEmber ? 0.04 : 0.028);
    }
    return { positions: pos, velocities: vel, sizes: sz };
  }, [count, seed, isEmber, riseMax, spread]);

  const particleMaterial = useMemo(() => {
    const mat = createFlameParticleMaterial(color, intensity);
    mat.size = isEmber ? 0.07 : 0.045;
    mat.toneMapped = false;
    mat.opacity = isEmber ? 0.35 * intensity : 0.7 * intensity;
    mat.sizeAttenuation = true;
    return mat;
  }, [color, intensity, isEmber]);

  useEffect(() => {
    if (!particleMaterial) return;
    particleMaterial.color.set(color);
    particleMaterial.opacity = (isEmber ? 0.35 : 0.7) * intensity;
  }, [particleMaterial, color, intensity, isEmber]);

  useFrame(({ clock }) => {
    if (!particlesRef.current) return;
    const arr = particlesRef.current.geometry.attributes.position.array;
    const t = clock.getElapsedTime();
    const swirl = isEmber ? 1.1 : 2.4;

    for (let i = 0; i < count; i++) {
      const wobble = Math.sin(t * swirl + i * 0.7 + seed) * (isEmber ? 0.0012 : 0.0024);
      arr[i * 3] += velocities[i * 3] + wobble;
      arr[i * 3 + 1] += velocities[i * 3 + 1];
      arr[i * 3 + 2] += velocities[i * 3 + 2] + Math.cos(t * swirl + i + seed) * (isEmber ? 0.0012 : 0.0024);

      if (arr[i * 3 + 1] > riseMax) {
        const s = seed + i * 13.7 + t;
        arr[i * 3 + 1] = 0.02;
        arr[i * 3] = (seededRandom(s) - 0.5) * spread * 0.7;
        arr[i * 3 + 2] = (seededRandom(s + 4.1) - 0.5) * spread * 0.7;
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
      uCoreColor: { value: new THREE.Color(1.0, 0.95, 0.72) },
      uOuterColor: { value: new THREE.Color(1.0, 0.38, 0.08) },
      uTipColor: { value: new THREE.Color(0.72, 0.18, 0.04) },
      uTempNorm: { value: 0.5 },
      uSeed: { value: 0 },
      uHeight: { value: sheath ? 2.05 : 1.85 },
      uSheath: { value: sheath ? 1 : 0 },
    },
    vertexShader: FlameShaderMaterial.vertexShader,
    fragmentShader: FlameShaderMaterial.fragmentShader,
  };
}

export default function EnhancedFlame({ burner, temperature, isHot, isSelected }) {
  const groupRef = useRef();
  const bodyRef = useRef();
  const sheathRef = useRef();
  const coreRef = useRef();
  const bodyMatRef = useRef();
  const sheathMatRef = useRef();
  const glowRef = useRef();
  const hazeRef = useRef();
  const { state } = useFurnaceStore();

  const flameColor = temperatureToColor(temperature, state.thresholds.alert, state.thresholds.warn);
  const tempNorm = Math.min(1, Math.max(0, (temperature - 900) / 800));
  const intensity = (isHot ? 1.25 : 0.82) + (isSelected ? 0.22 : 0);
  const seed = (burner.position?.x ?? 0) * 12.7 + (burner.position?.y ?? 0) * 4.3;

  const coreColor = useMemo(() => new THREE.Color().setHSL(0.09, 0.35 + tempNorm * 0.15, 0.78 + tempNorm * 0.16), [tempNorm]);
  const outerColor = useMemo(() => new THREE.Color(flameColor).lerp(new THREE.Color("#ff4d1a"), 0.35), [flameColor]);
  const tipColor = useMemo(() => new THREE.Color("#c2410c").lerp(new THREE.Color("#93c5fd"), tempNorm * 0.28), [tempNorm]);
  const rootBlue = useMemo(() => new THREE.Color("#7dd3fc"), []);

  const bodyShader = useMemo(() => makeFlameShader(false), []);
  const sheathShader = useMemo(() => makeFlameShader(true), []);

  const syncMaterial = (mat) => {
    if (!mat?.uniforms) return;
    mat.uniforms.uColor.value.set(flameColor);
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
    const breath = 1 + Math.sin(t * (3.1 + tempNorm * 2.2) + seed) * (0.045 + tempNorm * 0.04);
    const lean = Math.sin(t * 1.7 + seed) * 0.035 * (0.6 + tempNorm);

    if (bodyMatRef.current) {
      bodyMatRef.current.uniforms.uTime.value = t;
      syncMaterial(bodyMatRef.current);
    }
    if (sheathMatRef.current) {
      sheathMatRef.current.uniforms.uTime.value = t * 0.86;
      syncMaterial(sheathMatRef.current);
      sheathMatRef.current.uniforms.uIntensity.value = intensity * 0.55;
    }

    if (groupRef.current) {
      groupRef.current.scale.set(breath, 0.92 + tempNorm * 0.28, breath);
    }
    if (bodyRef.current) {
      bodyRef.current.rotation.y = lean;
      bodyRef.current.scale.y = 1 + Math.sin(t * 4.2 + seed) * 0.06 * (0.5 + tempNorm);
    }
    if (sheathRef.current) {
      sheathRef.current.rotation.y = -lean * 0.7;
    }
    if (coreRef.current) {
      const c = 0.92 + Math.sin(t * 8.5 + seed) * 0.08;
      coreRef.current.scale.set(c, 1 + Math.sin(t * 6.2 + seed) * 0.1, c);
    }
    if (glowRef.current) {
      const g = 1 + Math.sin(t * 5.4 + seed) * 0.12;
      glowRef.current.scale.setScalar(g);
    }
    if (hazeRef.current) {
      hazeRef.current.material.opacity = (0.04 + tempNorm * 0.05) * intensity * (0.7 + Math.sin(t * 3.6 + seed) * 0.3);
      hazeRef.current.position.y = 0.55 + Math.sin(t * 1.4 + seed) * 0.08;
    }
  });

  const sparkCount = isHot ? 28 : 16;
  const emberCount = isHot ? 12 : 7;

  return (
    <group ref={groupRef} position={[0, 0, 1.05]} rotation={[Math.PI / 2, 0, 0]}>
      {/* Outer sheath — larger, softer, slower */}
      <mesh ref={sheathRef} position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.02, 0.46, 2.05, 36, 12, true]} />
        <shaderMaterial
          ref={sheathMatRef}
          args={[sheathShader]}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          clippingPlanes={[]}
        />
      </mesh>

      {/* Main flame body */}
      <mesh ref={bodyRef}>
        <cylinderGeometry args={[0.012, 0.34, 1.85, 40, 14, true]} />
        <shaderMaterial
          ref={bodyMatRef}
          args={[bodyShader]}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          clippingPlanes={[]}
        />
      </mesh>

      {/* White-hot core — along flame height (local Y) */}
      <mesh ref={coreRef} position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.008, 0.13, 0.95, 20, 1, true]} />
        <meshBasicMaterial
          color={coreColor}
          transparent
          opacity={0.55 + tempNorm * 0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
          clippingPlanes={[]}
        />
      </mesh>

      {/* Stoichiometric blue root at the nozzle */}
      <mesh position={[0, -0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.04, 0.16, 24]} />
        <meshBasicMaterial
          color={rootBlue}
          transparent
          opacity={0.18 + tempNorm * 0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
          clippingPlanes={[]}
        />
      </mesh>
      <mesh position={[0, -0.7, 0]}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshBasicMaterial
          color={rootBlue}
          transparent
          opacity={0.16 + tempNorm * 0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          clippingPlanes={[]}
        />
      </mesh>

      <FlameParticles count={sparkCount} color={flameColor} intensity={intensity} seed={seed} mode="spark" />
      <FlameParticles count={emberCount} color={flameColor} intensity={intensity * 0.7} seed={seed + 9.1} mode="ember" />

      {/* Heat haze */}
      <mesh ref={hazeRef} position={[0, 0.55, 0]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.55, 0.85]} />
        <meshBasicMaterial
          color={flameColor}
          transparent
          opacity={0.06 * intensity * tempNorm}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
          clippingPlanes={[]}
        />
      </mesh>

      {/* Root glow — tight + soft */}
      <group ref={glowRef} position={[0, -0.55, 0]}>
        <mesh>
          <sphereGeometry args={[0.22 + tempNorm * 0.08, 20, 20]} />
          <meshBasicMaterial
            color={coreColor}
            transparent
            opacity={0.28 * intensity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            clippingPlanes={[]}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.48 + tempNorm * 0.22, 20, 20]} />
          <meshBasicMaterial
            color={outerColor}
            transparent
            opacity={0.1 * intensity * (0.7 + tempNorm * 0.3)}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            clippingPlanes={[]}
          />
        </mesh>
      </group>
    </group>
  );
}
