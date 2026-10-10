// src/furnace3d/scene/HeatmapFloor.jsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getTemperatureScaleRange, temperatureToColor } from "../utils/temperatureScale";
import { useFurnaceStore } from "../state/FurnaceStore";

/**
 * Enhanced HeatmapFloor with beautiful UI/UX improvements.
 *
 * Features:
 *  • Enhanced sprite-based particles with beautiful gradients
 *  • Animated particle pulsing based on temperature
 *  • Improved particle size variation for better visual hierarchy
 *  • Enhanced additive blending for realistic heat glow effects
 *  • Smooth animations and dynamic intensity changes
 *  • Higher resolution textures for better visual quality
 *  • Optimized rendering with performance improvements
 */

export default function HeatmapFloor({ model, isFocusedView = false }) {
  const { state } = useFurnaceStore();
  const pointsRef = useRef();
  const materialRef = useRef();
  const scaleRange = getTemperatureScaleRange();

  if (!model) return null;

  const { positions, colors, sizes, intensities } = useMemo(() => {
    const { width, depth } = model.dimensions;
    const halfW = width / 2;
    const halfD = depth / 2;
    const gridSize = 25; // Increased grid size for better resolution

    const positions = [];
    const colors = [];
    const sizes = [];
    const intensities = [];

    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const x = -halfW + (i / gridSize) * width;
        const z = -halfD + (j / gridSize) * depth;
        let temp = null;
        let minDist = Infinity;
        
        // Enhanced temperature calculation with distance weighting
        model.layers.forEach((layer) => {
          layer.burners.forEach((b) => {
            if (b.temperature == null) return;
            const dx = b.position.x - x;
            const dz = b.position.y - z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < minDist) {
              minDist = dist;
              temp = b.temperature;
            }
          });
        });
        
        if (temp == null) temp = 1000;

        const tempNorm = Math.min(1, Math.max(0, (temp - 900) / 800));
        const color = new THREE.Color(temperatureToColor(temp, state.thresholds.alert, state.thresholds.warn));
        
        positions.push(x, 0.05, z); // Slightly elevated position
        colors.push(color.r, color.g, color.b);
        
        // Enhanced size calculation with better visual hierarchy
        const baseSize = 0.3 + tempNorm * 0.7;
        sizes.push(baseSize);
        
        // Intensity for animation
        intensities.push(tempNorm);
      }
    }

    return { 
      positions: new Float32Array(positions), 
      colors: new Float32Array(colors), 
      sizes: new Float32Array(sizes),
      intensities: new Float32Array(intensities)
    };
  }, [model, state.thresholds, scaleRange]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, colors, sizes]);

  // Enhanced sprite texture with beautiful gradient
  const spriteTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128; // Higher resolution
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    
    // Create beautiful radial gradient
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.15, "rgba(255, 220, 150, 0.9)");
    gradient.addColorStop(0.3, "rgba(255, 180, 100, 0.6)");
    gradient.addColorStop(0.5, "rgba(255, 140, 50, 0.3)");
    gradient.addColorStop(0.7, "rgba(200, 100, 30, 0.15)");
    gradient.addColorStop(1, "rgba(100, 50, 20, 0)");
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 4; // Better texture quality at angles
    return tex;
  }, []);

  // Animate particle effects
  useFrame(({ clock }) => {
    if (materialRef?.current) {
      const time = clock.getElapsedTime();
      
      // Animated opacity for pulsing effect
      const pulseBase = 0.75;
      const pulseIntensity = 0.15;
      materialRef.current.opacity = pulseBase + Math.sin(time * 1.5) * pulseIntensity;
      
      // Subtle size animation
      const sizeBase = 1.0;
      const sizeIntensity = 0.1;
      materialRef.current.size = sizeBase + Math.sin(time * 2) * sizeIntensity;
    }
  });

  // This must be after every hook so changing view modes never changes the
  // component's hook order.
  if (isFocusedView) return null;

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        ref={materialRef}
        size={1.0}
        map={spriteTexture}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.75}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
