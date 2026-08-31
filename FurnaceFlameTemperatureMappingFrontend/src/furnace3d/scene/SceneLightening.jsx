// src/furnace3d/scene/SceneLighting.jsx
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useFurnaceStore } from "../state/FurnaceStore";

/**
 * Enhanced SceneLighting with beautiful UI/UX improvements.
 *
 * Features:
 *  • Enhanced 3-point lighting setup with cinematic quality
 *  • Improved lighting presets with sophisticated color schemes
 *  • Dynamic light animations for realistic industrial ambiance
 *  • Enhanced temperature-driven burner lighting with smooth transitions
 *  • Improved shadow quality with better soft shadows
 *  • Atmospheric effects with subtle color variations
 *  • Enhanced flicker effects for realistic furnace operation
 *  • Better ambient lighting with improved intensity control
 */

const TIME_OF_DAY_PRESETS = {
  neutral: {
    keyColor: "#e8ecff",
    fillColor: "#d0d8f0",
    rimColor: "#0d2040",
    skyColor: "#0d2040",
    groundColor: "#040d1a",
    ambientIntensity: 0.38,
    keyIntensity: 0.95,
    fillIntensity: 0.38,
    rimIntensity: 0.48,
    hemisphereIntensity: 0.42,
  },
  warm: {
    keyColor: "#ffd8a8",
    fillColor: "#a8c4f0",
    rimColor: "#0d2040",
    skyColor: "#1a2a4a",
    groundColor: "#040d1a",
    ambientIntensity: 0.32,
    keyIntensity: 0.92,
    fillIntensity: 0.35,
    rimIntensity: 0.45,
    hemisphereIntensity: 0.38,
  },
  cool: {
    keyColor: "#a8c4ff",
    fillColor: "#8098d0",
    rimColor: "#0a1a30",
    skyColor: "#061020",
    groundColor: "#020814",
    ambientIntensity: 0.45,
    keyIntensity: 0.88,
    fillIntensity: 0.40,
    rimIntensity: 0.42,
    hemisphereIntensity: 0.45,
  },
  emissive: {
    keyColor: "#ffd28a",
    fillColor: "#8bb0ff",
    rimColor: "#0d2040",
    skyColor: "#0d1a28",
    groundColor: "#030814",
    ambientIntensity: 0.25,
    keyIntensity: 0.85,
    fillIntensity: 0.30,
    rimIntensity: 0.40,
    hemisphereIntensity: 0.35,
  },
  cinematic: {
    keyColor: "#fff5e6",
    fillColor: "#d4e4ff",
    rimColor: "#1a3060",
    skyColor: "#152540",
    groundColor: "#050d18",
    ambientIntensity: 0.35,
    keyIntensity: 1.0,
    fillIntensity: 0.42,
    rimIntensity: 0.52,
    hemisphereIntensity: 0.40,
  },
};

// Enhanced burner flame color temperature range (°K → RGB approximation)
const FLAME_MIN_RGB = new THREE.Color(1.0, 0.55, 0.1);   // ~1200 K
const FLAME_MID_RGB = new THREE.Color(1.0, 0.85, 0.4);   // ~1550 K
const FLAME_MAX_RGB = new THREE.Color(1.0, 0.95, 0.65);  // ~1900 K

function SceneLighting() {
  const { state } = useFurnaceStore();
  const preset = TIME_OF_DAY_PRESETS[state.lightingPreset ?? "warm"];
  const keyLightRef = useRef();
  const fillLightRef = useRef();
  const rimLightRef = useRef();
  const hemisphereLightRef = useRef();
  const ambientLightRef = useRef();

  // Collect every active burner across all layers
  const burners = useMemo(() => {
    if (!state.model) return [];
    return state.model.layers.flatMap((layer) => layer.burners);
  }, [state.model]);

  // Enhanced lighting animations for realistic industrial ambiance
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    
    // Key light flicker (turbine / wind-box vibration)
    if (keyLightRef.current) {
      const keyFlicker = 0.5 + 0.5 * Math.sin(t * 0.17) * 0.08 + Math.sin(t * 0.23) * 0.04;
      keyLightRef.current.intensity = THREE.MathUtils.lerp(
        preset.keyIntensity * 0.9,
        preset.keyIntensity * 1.1,
        keyFlicker
      );
    }

    // Fill light subtle variation
    if (fillLightRef.current) {
      const fillVariation = 0.5 + 0.5 * Math.sin(t * 0.13) * 0.06;
      fillLightRef.current.intensity = THREE.MathUtils.lerp(
        preset.fillIntensity * 0.95,
        preset.fillIntensity * 1.05,
        fillVariation
      );
    }

    // Rim light gentle breathing
    if (rimLightRef.current) {
      const rimBreathing = 0.5 + 0.5 * Math.sin(t * 0.11) * 0.05;
      rimLightRef.current.intensity = THREE.MathUtils.lerp(
        preset.rimIntensity * 0.92,
        preset.rimIntensity * 1.08,
        rimBreathing
      );
    }

    // Hemisphere light subtle ambient variation
    if (hemisphereLightRef.current) {
      const hemisphereVariation = 0.5 + 0.5 * Math.sin(t * 0.09) * 0.04;
      hemisphereLightRef.current.intensity = THREE.MathUtils.lerp(
        preset.hemisphereIntensity * 0.96,
        preset.hemisphereIntensity * 1.04,
        hemisphereVariation
      );
    }

    // Ambient light very subtle variation
    if (ambientLightRef.current) {
      const ambientVariation = 0.5 + 0.5 * Math.sin(t * 0.07) * 0.03;
      ambientLightRef.current.intensity = THREE.MathUtils.lerp(
        preset.ambientIntensity * 0.97,
        preset.ambientIntensity * 1.03,
        ambientVariation
      );
    }
  });

  return (
    <>
      {/* Enhanced ambient light with soft global fill */}
      <ambientLight 
        ref={ambientLightRef}
        intensity={preset.ambientIntensity} 
        color="#ffffff"
      />

      {/* Enhanced key light (primary sun / roof fixture) */}
      <directionalLight
        ref={keyLightRef}
        position={[25, 40, 20]}
        intensity={preset.keyIntensity}
        color={preset.keyColor}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0001}
        shadow-normalBias={0.015}
        shadow-radius={3}
      />

      {/* Enhanced fill light (softens shadows) */}
      <directionalLight
        ref={fillLightRef}
        position={[-30, 25, -15]}
        intensity={preset.fillIntensity}
        color={preset.fillColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={150}
        shadow-bias={-0.0002}
        shadow-normalBias={0.04}
        shadow-radius={2}
      />

      {/* Enhanced rim / back light (separates furnace from background) */}
      <directionalLight
        ref={rimLightRef}
        position={[-15, 15, -35]}
        intensity={preset.rimIntensity}
        color={preset.rimColor}
      />

      {/* Enhanced hemisphere light (sky / ground bounce) */}
      <hemisphereLight
        ref={hemisphereLightRef}
        skyColor={preset.skyColor}
        groundColor={preset.groundColor}
        intensity={preset.hemisphereIntensity}
      />

      {/* Enhanced per-burner point lights (temperature-driven) */}
      {burners.map((burner) => {
        if (burner.temperature == null) return null;
        
        const flameT = Math.min(1, Math.max(0, (burner.temperature - 900) / 800));
        const intensity = THREE.MathUtils.lerp(0.4, 2.5, flameT);
        
        // Enhanced color interpolation with mid-point
        let color;
        if (flameT < 0.5) {
          const localT = flameT * 2;
          color = new THREE.Color().lerpColors(FLAME_MIN_RGB, FLAME_MID_RGB, localT);
        } else {
          const localT = (flameT - 0.5) * 2;
          color = new THREE.Color().lerpColors(FLAME_MID_RGB, FLAME_MAX_RGB, localT);
        }
        
        const x = burner.position.x;
        const y = burner.position.z; // note: burner.position is {x, y, z} where z is elevation
        const z = burner.position.y;
        
        const emissiveMultiplier = state.lightingPreset === "emissive" ? 2.2 : 
                                 state.lightingPreset === "cinematic" ? 1.5 : 1.0;
        
        return (
          <EnhancedBurnerLight
            key={burner.id}
            position={[x, y, z]}
            color={color}
            intensity={intensity * emissiveMultiplier}
            temperature={burner.temperature}
            flameT={flameT}
          />
        );
      })}
    </>
  );
}

// ============================================================================
// ENHANCED BURNER LIGHT COMPONENT
// ============================================================================

function EnhancedBurnerLight({ position, color, intensity, temperature, flameT }) {
  const lightRef = useRef();
  
  useFrame(({ clock }) => {
    if (lightRef?.current) {
      const time = clock.getElapsedTime();
      const flickerIntensity = 0.5 + 0.5 * Math.sin(time * 8 + temperature) * 0.15 + 
                             Math.sin(time * 12) * 0.08;
      
      lightRef.current.intensity = THREE.MathUtils.lerp(
        intensity * 0.85,
        intensity * 1.15,
        flickerIntensity
      );
      
      // Subtle color variation for realistic flame flicker
      const colorVariation = 0.5 + 0.5 * Math.sin(time * 6) * 0.05;
      const baseColor = color.clone();
      const variedColor = baseColor.clone().multiplyScalar(0.95 + colorVariation * 0.1);
      lightRef.current.color.lerp(variedColor, 0.1);
    }
  });

  return (
    <pointLight
      ref={lightRef}
      position={position}
      color={color}
      intensity={intensity}
      distance={15}
      decay={1.8}
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-bias={-0.0001}
      shadow-normalBias={0.03}
      shadow-radius={2}
    />
  );
}

export default SceneLighting;
export { TIME_OF_DAY_PRESETS };
