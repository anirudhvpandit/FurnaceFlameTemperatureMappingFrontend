// src/furnace3d/scene/TemperatureCloud.jsx
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { temperatureToColor } from "../utils/temperatureScale";
import { useFurnaceStore } from "../state/FurnaceStore";

/**
 * Enhanced TemperatureCloud with beautiful UI/UX improvements.
 *
 * Features:
 *  • Enhanced particle system with beautiful gradient textures
 *  • Smooth cloud animations with multiple movement patterns
 *  • Improved particle size variation based on temperature
 *  • Enhanced color transitions with smoother gradients
 *  • Dynamic opacity changes for realistic heat visualization
 *  • Better performance with optimized particle count
 *  • Enhanced glow effects with additive blending
 *  • Realistic thermal convection simulation
 */

const PARTICLE_COUNT = 12000; // Increased for better visual quality

// Enhanced seeded random number generator for reproducible results
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Enhanced noise function for more natural particle movement
function noise(x, y, z, time) {
  return Math.sin(x * 0.5 + time) * Math.cos(y * 0.3 + time * 0.7) * Math.sin(z * 0.4 + time * 0.5);
}

export default function TemperatureCloud({ model, isFocusedView = false }) {
  const cloudRef = useRef();
  const materialRef = useRef();
  const { state } = useFurnaceStore();
  
  const { positions, colors, sizes, velocities, originalPositions } = useMemo(() => {
    if (!model) {
      // Return empty arrays if model is not available
      return {
        positions: new Float32Array(PARTICLE_COUNT * 3),
        colors: new Float32Array(PARTICLE_COUNT * 3),
        sizes: new Float32Array(PARTICLE_COUNT),
        velocities: new Float32Array(PARTICLE_COUNT * 3),
        originalPositions: new Float32Array(PARTICLE_COUNT * 3)
      };
    }

    const { width, depth, height } = model.dimensions;
    const allTemps = model.layers.flatMap((l) =>
      l.burners.map((b) => b.temperature).filter((t) => t != null)
    );
    const minT = allTemps.length ? Math.min(...allTemps) : 1000;
    const maxT = allTemps.length ? Math.max(...allTemps) : 1400;

    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    const sz = new Float32Array(PARTICLE_COUNT);
    const vel = new Float32Array(PARTICLE_COUNT * 3); // Velocity for animation
    const origPos = new Float32Array(PARTICLE_COUNT * 3); // Original positions

    // Enhanced particle distribution with better temperature mapping
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (seededRandom(i) - 0.5) * width;
      const z = (seededRandom(i + PARTICLE_COUNT) - 0.5) * depth;
      const y = seededRandom(i + PARTICLE_COUNT * 2) * height;

      // Enhanced temperature calculation with distance weighting
      let temp = null;
      let minDist = Infinity;
      let totalWeight = 0;
      let weightedTemp = 0;
      
      for (const layer of model.layers) {
        const dist = Math.abs(layer.z - y);
        const weight = Math.max(0, 1 - dist / (height * 0.3));
        if (weight > 0 && layer.temperature.avg != null) {
          weightedTemp += layer.temperature.avg * weight;
          totalWeight += weight;
        }
        if (dist < minDist && layer.temperature.avg != null) {
          minDist = dist;
          temp = layer.temperature.avg;
        }
      }
      
      if (totalWeight > 0) {
        temp = weightedTemp / totalWeight;
      }
      if (temp == null) temp = (minT + maxT) / 2;

      const color = temperatureToColor(temp, state.thresholds.alert, state.thresholds.warn);
      const c = new THREE.Color(color);
      
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      
      origPos[i * 3] = x;
      origPos[i * 3 + 1] = y;
      origPos[i * 3 + 2] = z;
      
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      // Enhanced particle size scaling with temperature
      const tempNorm = Math.min(1, Math.max(0, (temp - minT) / (maxT - minT || 1)));
      sz[i] = 0.25 + tempNorm * 0.65;

      // Initial velocities for thermal convection simulation
      const convectionSpeed = 0.001 + tempNorm * 0.002;
      vel[i * 3] = (seededRandom(i + PARTICLE_COUNT * 3) - 0.5) * convectionSpeed;
      vel[i * 3 + 1] = convectionSpeed * (0.5 + seededRandom(i + PARTICLE_COUNT * 4) * 0.5); // Upward bias
      vel[i * 3 + 2] = (seededRandom(i + PARTICLE_COUNT * 5) - 0.5) * convectionSpeed;
    }

    return { positions: pos, colors: col, sizes: sz, velocities: vel, originalPositions: origPos };
  }, [model, state.thresholds]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, colors, sizes]);

  // Enhanced sprite texture with beautiful gradient
  const spriteTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128; // Higher resolution
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    
    // Create beautiful multi-stop radial gradient
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.1, "rgba(255, 245, 220, 0.95)");
    gradient.addColorStop(0.25, "rgba(255, 220, 150, 0.8)");
    gradient.addColorStop(0.4, "rgba(255, 180, 100, 0.5)");
    gradient.addColorStop(0.6, "rgba(255, 140, 50, 0.25)");
    gradient.addColorStop(0.8, "rgba(200, 100, 30, 0.1)");
    gradient.addColorStop(1, "rgba(100, 50, 20, 0)");
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 4; // Better texture quality at angles
    return tex;
  }, []);

  // Enhanced cloud animation with thermal convection simulation
  useFrame(({ clock }) => {
    if (cloudRef.current && materialRef.current) {
      const time = clock.getElapsedTime();
      const positions = cloudRef.current.geometry.attributes.position.array;
      
      // Smooth rotation animation
      cloudRef.current.rotation.y = Math.sin(time * 0.1) * 0.03;
      cloudRef.current.rotation.x = Math.sin(time * 0.07) * 0.015;

      // Thermal convection simulation
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        
        // Apply noise-based movement
        const n = noise(
          positions[idx] * 0.5,
          positions[idx + 1] * 0.5,
          positions[idx + 2] * 0.5,
          time * 0.5
        );
        
        // Update positions with velocity and noise
        positions[idx] += velocities[idx] + n * 0.002;
        positions[idx + 1] += velocities[idx + 1] + n * 0.003;
        positions[idx + 2] += velocities[idx + 2] + n * 0.002;
        
        // Boundary checking with soft reset
        if (!model) return; // Skip if model is not available
        const { width, depth, height } = model.dimensions;
        const halfW = width / 2;
        const halfD = depth / 2;
        
        if (Math.abs(positions[idx]) > halfW * 1.2 ||
            positions[idx + 1] > height * 1.1 ||
            positions[idx + 1] < -0.5 ||
            Math.abs(positions[idx + 2]) > halfD * 1.2) {
          // Soft reset to original position with some variation
          positions[idx] = originalPositions[idx] + (seededRandom(i + time) - 0.5) * 0.5;
          positions[idx + 1] = originalPositions[idx + 1] + (seededRandom(i + time + 1) - 0.5) * 0.3;
          positions[idx + 2] = originalPositions[idx + 2] + (seededRandom(i + time + 2) - 0.5) * 0.5;
        }
      }
      
      cloudRef.current.geometry.attributes.position.needsUpdate = true;

      // Animated opacity for pulsing effect
      const pulseBase = 0.5;
      const pulseIntensity = 0.12;
      materialRef.current.opacity = pulseBase + Math.sin(time * 1.2) * pulseIntensity;
      
      // Subtle size animation
      const sizeBase = 0.6;
      const sizeIntensity = 0.08;
      materialRef.current.size = sizeBase + Math.sin(time * 1.5) * sizeIntensity;
    }
  });

  // Do not return before hooks: Focused View can be toggled at runtime.
  if (isFocusedView) return null;

  return (
    <points ref={cloudRef} geometry={geometry}>
      <pointsMaterial
        ref={materialRef}
        size={0.6}
        map={spriteTexture}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
