// src/furnace3d/scene/FurnaceShell.jsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useFurnaceStore } from "../state/FurnaceStore";
import { getBurnerConfig } from "../config/furnaceConfig";

/**
 * Enhanced FurnaceShell with beautiful UI/UX improvements.
 *
 * Features:
 *  • Enhanced materials with realistic metal and glass properties
 *  • Smooth animations for exploded view transitions
 *  • Beautiful clipping plane indicators with glow effects
 *  • Enhanced structural elements with improved visual quality
 *  • Animated safety features and industrial details
 *  • Optimized rendering with progressive enhancement
 */

export default function FurnaceShell({ dimensions, visible = true, isFocusedView = false, model = null }) {
  // Hide shell in focused view (CAT scan mode)
  const shouldShow = visible && !isFocusedView;
  return shouldShow ? <FurnaceShellContent dimensions={dimensions} model={model} /> : null;
}

function FurnaceShellContent({ dimensions, model }) {
  const { state } = useFurnaceStore();
  const { width, depth, height } = dimensions;
  const shellRef = useRef();
  const clippingIndicatorsRef = useRef([]);
  
  // Calculate the vertical span between the top and bottom layers for corner supports
  const cornerSupportData = useMemo(() => {
    if (model && model.layers && model.layers.length > 0) {
      // Find the minimum and maximum layer positions
      const layerPositions = model.layers.map(layer => layer.z);
      const minLayerZ = Math.min(...layerPositions);
      const maxLayerZ = Math.max(...layerPositions);
      // Calculate the span and add padding on both sides
      const bottom = minLayerZ - 1.0;
      const top = maxLayerZ + 1.0;
      const totalHeight = top - bottom;
      const center = (bottom + top) / 2;
      
      return { height: totalHeight, center, bottom, top };
    }
    // Default to full height if no layer data available
    return { height, center: height / 2, bottom: 0, top: height }; 
  }, [model, height]);

  // Calculate exploded view offset with smooth animation
  const explosionOffset = useMemo(() => {
    if (!state.explodedView) return { x: 0, y: 0, z: 0 };
    const factor = state.explosionFactor || 0.3;
    return {
      x: width * factor * 0.5,
      y: height * factor * 0.5,
      z: depth * factor * 0.5,
    };
  }, [state.explodedView, state.explosionFactor, width, height, depth]);

  // Animate shell properties — shell is static and stationary (no breathing animation)
  useFrame(({ clock }) => {
    // Animate clipping indicators with pulsing effect
    clippingIndicatorsRef.current.forEach((indicator, index) => {
      if (indicator?.material) {
        const time = clock.getElapsedTime();
        const pulsePhase = index * 0.5;
        indicator.material.opacity = 0.3 + Math.sin(time * 2 + pulsePhase) * 0.15;
      }
    });
  });

  return (
    <group ref={shellRef}>
      {/* Open furnace frame with a long shaft, lower grate, and tapered hopper. */}
      <FurnaceFrame
        width={width}
        height={height}
        depth={depth}
        explosionOffset={explosionOffset}
      />

      {/* Static side burner ports aligned with the temperature elevations. */}
      <SideBurners
        width={width}
        height={height}
        depth={depth}
        explosionOffset={explosionOffset}
        plantId={state.plantId || "default"}
        model={model}
      />

      {/* Enhanced clipping plane indicators with beautiful effects */}
      {state.multiClipEnabled && (
        <EnhancedClippingIndicators
          state={state}
          width={width}
          height={height}
          depth={depth}
          clippingIndicatorsRef={clippingIndicatorsRef}
        />
      )}
    </group>
  );
}

function FurnaceFrame({ width, height, depth, explosionOffset }) {
  const geometry = useMemo(() => {
    const vertices = [];
    const addLine = (a, b) => vertices.push(...a, ...b);
    const x = width / 2;
    const xRight = width * 0.95;
    const z = depth / 2;
    const topY = height;
    const hopperY = height * 0.16;
    const outletY = -height * 0.04;
    const cutTopY = height * 0.82;
    const slopeOuterY = height * 0.77;
    const cutBottomY = height * 0.72;
    const cutInset = width * 0.28;
    const notchProfile = [
      { y: cutBottomY, inset: 0 },
      { y: height * 0.73, inset: cutInset * 0.35 },
      { y: height * 0.745, inset: cutInset * 0.9 },
      { y: height * 0.76, inset: cutInset },
      { y: cutTopY, inset: 0 },
    ];
    const outletX = (width / 2) * 0.28;
    const outletZ = z * 0.28;
    const corners = [[-x, -z], [x, -z], [x, z], [-x, z]];

    // Extend from the upper buzzneck corner down-right to the outer right wall.
    corners.forEach(([cx, cz]) => {
      if (cx > 0) {
        addLine([cx, hopperY, cz], [cx, cutBottomY, cz]);
        for (let i = 0; i < notchProfile.length - 1; i += 1) {
          const current = notchProfile[i];
          const next = notchProfile[i + 1];
          addLine([cx - current.inset, current.y, cz], [cx - next.inset, next.y, cz]);
        }
        addLine([cx, cutTopY, cz], [xRight, slopeOuterY, cz]);
        addLine([xRight, slopeOuterY, cz], [xRight, topY, cz]);
      } else {
        addLine([cx, hopperY, cz], [cx, topY, cz]);
      }
    });

    // Join the buzzneck and the added diagonal front-to-back.
    notchProfile.forEach(({ y, inset }) => {
      addLine([x - inset, y, -z], [x - inset, y, z]);
    });
    addLine([xRight, slopeOuterY, -z], [xRight, slopeOuterY, z]);

    // Top rim.
    const topCorners = [[-x, -z], [xRight, -z], [xRight, z], [-x, z]];
    topCorners.forEach(([cx, cz], index) => {
      const [nx, nz] = topCorners[(index + 1) % topCorners.length];
      addLine([cx, topY, cz], [nx, topY, nz]);
    });
    corners.forEach(([cx, cz], index) => {
      const [nx, nz] = corners[(index + 1) % corners.length];
      addLine([cx, hopperY, cz], [nx, hopperY, nz]);
    });

    // Tapered lower hopper and its small outlet frame.
    corners.forEach(([cx, cz], index) => {
      const lower = [[-outletX, -outletZ], [outletX, -outletZ], [outletX, outletZ], [-outletX, outletZ]][index];
      addLine([cx, hopperY, cz], [lower[0], outletY, lower[1]]);
      const next = [[-outletX, -outletZ], [outletX, -outletZ], [outletX, outletZ], [-outletX, outletZ]][(index + 1) % 4];
      addLine([lower[0], outletY, lower[1]], [next[0], outletY, next[1]]);
    });

    return new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  }, [width, height, depth]);

  return (
    <group position={[explosionOffset.x, explosionOffset.y, explosionOffset.z]}>
      <lineSegments geometry={geometry} renderOrder={5}>
        <lineBasicMaterial color="#d6d9e0" transparent opacity={0.86} />
      </lineSegments>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={0}>
        <torusGeometry args={[width * 1.08, 0.58, 8, 72]} />
        <meshBasicMaterial color="#34372f" />
      </mesh>
    </group>
  );
}

// ============================================================================
// ENHANCED SUB-COMPONENTS
// ============================================================================

function EnhancedCornerSupport({ position, explosionOffset, supportData, model, index }) {
  const meshRef = useRef();
  
  useFrame(({ clock }) => {
    if (meshRef?.current?.material) {
      const time = clock.getElapsedTime();
      const phase = index * 0.3;
      meshRef.current.material.emissiveIntensity = 0.1 + Math.sin(time * 1.5 + phase) * 0.05;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[position[0] + explosionOffset.x, supportData.center + explosionOffset.y, position[2] + explosionOffset.z]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.8, supportData.height, 0.8]} />
      <meshStandardMaterial 
        color="#ffffff" 
        metalness={0.9} 
        roughness={0.1}
        emissive="#ffffff"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

function EnhancedSupportBeams({ ratio, width, height, depth, explosionOffset, index }) {
  return (
    <group key={`beam-${index}`}>
      <mesh
        position={[explosionOffset.x, height * ratio + explosionOffset.y, -depth / 2 - 0.5 + explosionOffset.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width + 1, 0.6, 0.4]} />
        <meshStandardMaterial 
          color="#4a5568" 
          metalness={0.85} 
          roughness={0.3}
          envMapIntensity={1.2}
        />
      </mesh>
      <mesh
        position={[explosionOffset.x, height * ratio + explosionOffset.y, depth / 2 + 0.5 + explosionOffset.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width + 1, 0.6, 0.4]} />
        <meshStandardMaterial 
          color="#4a5568" 
          metalness={0.85} 
          roughness={0.3}
          envMapIntensity={1.2}
        />
      </mesh>
    </group>
  );
}

function EnhancedVerticalPipes({ ratio, width, height, depth, explosionOffset, index }) {
  const pipeRefs = useRef([]);
  
  useFrame(({ clock }) => {
    pipeRefs.current.forEach((pipeRef, i) => {
      if (pipeRef?.current?.material) {
        const time = clock.getElapsedTime();
        const phase = (index + i) * 0.4;
        pipeRef.current.material.emissiveIntensity = 0.15 + Math.sin(time * 2 + phase) * 0.08;
      }
    });
  });

  return (
    <group key={`pipe-${index}`}>
      <mesh
        ref={el => pipeRefs.current[0] = el}
        position={[-width / 2 - 0.8 + explosionOffset.x, height * ratio + explosionOffset.y, 0 + explosionOffset.z]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.15, 0.15, depth + 1.6, 16]} />
        <meshStandardMaterial 
          color="#718096" 
          metalness={0.95} 
          roughness={0.15}
          emissive="#718096"
          emissiveIntensity={0.15}
          envMapIntensity={1.5}
        />
      </mesh>
      <mesh
        ref={el => pipeRefs.current[1] = el}
        position={[width / 2 + 0.8 + explosionOffset.x, height * ratio + explosionOffset.y, 0 + explosionOffset.z]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.15, 0.15, depth + 1.6, 16]} />
        <meshStandardMaterial 
          color="#718096" 
          metalness={0.95} 
          roughness={0.15}
          emissive="#718096"
          emissiveIntensity={0.15}
          envMapIntensity={1.5}
        />
      </mesh>
    </group>
  );
}

function EnhancedAccessDoors({ ratio, height, depth, explosionOffset, index }) {
  return (
    <group key={`door-${index}`}>
      <mesh
        position={[0 + explosionOffset.x, height * ratio + explosionOffset.y, -depth / 2 - 0.3]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[2, 2.5, 0.2]} />
        <meshStandardMaterial 
          color="#2d3748" 
          metalness={0.7} 
          roughness={0.4}
          envMapIntensity={1.0}
        />
      </mesh>
      <mesh
        position={[0 + explosionOffset.x, height * ratio + explosionOffset.y, depth / 2 + 0.3]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[2, 2.5, 0.2]} />
        <meshStandardMaterial 
          color="#2d3748" 
          metalness={0.7} 
          roughness={0.4}
          envMapIntensity={1.0}
        />
      </mesh>
    </group>
  );
}

function EnhancedTopPlatform({ width, height, depth, explosionOffset }) {
  return (
    <mesh
      position={[explosionOffset.x, height + 0.5 + explosionOffset.y, explosionOffset.z]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[width + 2, 0.3, depth + 2]} />
      <meshStandardMaterial 
        color="#4a5568" 
        metalness={0.75} 
        roughness={0.35}
        envMapIntensity={1.3}
      />
    </mesh>
  );
}

function EnhancedSafetyRailing({ width, height, depth, explosionOffset }) {
  const railRefs = useRef([]);
  
  useFrame(({ clock }) => {
    railRefs.current.forEach((railRef, i) => {
      if (railRef?.current?.material) {
        const time = clock.getElapsedTime();
        const phase = i * 0.2;
        railRef.current.material.emissiveIntensity = 0.2 + Math.sin(time * 3 + phase) * 0.1;
      }
    });
  });

  return (
    <group position={[explosionOffset.x, height + 1.2 + explosionOffset.y, explosionOffset.z]}>
      {[
        [-width / 2 - 1, -depth / 2 - 1], [width / 2 + 1, -depth / 2 - 1],
        [-width / 2 - 1, depth / 2 + 1], [width / 2 + 1, depth / 2 + 1]
      ].map((pos, i) => (
        <mesh 
          key={`rail-post-${i}`} 
          ref={el => railRefs.current[i] = el}
          position={[pos[0], 0, pos[1]]} 
          castShadow
        >
          <cylinderGeometry args={[0.08, 0.08, 1.4, 8]} />
          <meshStandardMaterial 
            color="#f6e05e" 
            metalness={0.7} 
            roughness={0.25}
            emissive="#f6e05e"
            emissiveIntensity={0.2}
            envMapIntensity={1.5}
          />
        </mesh>
      ))}
      {/* Horizontal rails */}
      {[
        { pos: [0, 0, -depth / 2 - 1], args: [width + 2.4, 0.08, 0.08] },
        { pos: [0, 0, depth / 2 + 1], args: [width + 2.4, 0.08, 0.08] },
        { pos: [-width / 2 - 1, 0, 0], args: [0.08, 0.08, depth + 2.4] },
        { pos: [width / 2 + 1, 0, 0], args: [0.08, 0.08, depth + 2.4] }
      ].map((rail, i) => (
        <mesh 
          key={`rail-${i}`} 
          ref={el => railRefs.current[i + 4] = el}
          position={rail.pos} 
          castShadow
        >
          <boxGeometry args={rail.args} />
          <meshStandardMaterial 
            color="#f6e05e" 
            metalness={0.7} 
            roughness={0.25}
            emissive="#f6e05e"
            emissiveIntensity={0.2}
            envMapIntensity={1.5}
          />
        </mesh>
      ))}
    </group>
  );
}

function EnhancedFoundation({ width, height, depth, explosionOffset }) {
  return (
    <mesh
      position={[explosionOffset.x, -0.5 + explosionOffset.y, explosionOffset.z]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[width + 4, 1, depth + 4]} />
      <meshStandardMaterial 
        color="#4a5568" 
        metalness={0.35} 
        roughness={0.75}
        envMapIntensity={0.5}
      />
    </mesh>
  );
}

function EnhancedFloorGrid({ width, depth, explosionOffset }) {
  return (
    <gridHelper
      position={[explosionOffset.x, 0.01 + explosionOffset.y, explosionOffset.z]}
      args={[Math.max(width, depth) * 3, 30, "#4a5568", "#2d3748"]}
    />
  );
}

function EnhancedClippingIndicators({ state, width, height, depth, clippingIndicatorsRef }) {
  const indicatorColor = "#22d3ee";
  
  return (
    <group>
      {state.clipPlanes.x.enabled && (
        <mesh 
          ref={el => clippingIndicatorsRef.current[0] = el}
          position={[width / 2 - (state.clipPlanes.x.offset * width), height / 2, 0]} 
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry args={[depth, height]} />
          <meshBasicMaterial 
            color={indicatorColor} 
            transparent 
            opacity={0.3} 
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
      {state.clipPlanes.y.enabled && (
        <mesh 
          ref={el => clippingIndicatorsRef.current[1] = el}
          position={[0, height / 2 - (state.clipPlanes.y.offset * height), 0]} 
          rotation={[Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[width, depth]} />
          <meshBasicMaterial 
            color={indicatorColor} 
            transparent 
            opacity={0.3} 
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
      {state.clipPlanes.z.enabled && (
        <mesh 
          ref={el => clippingIndicatorsRef.current[2] = el}
          position={[0, height / 2, depth / 2 - (state.clipPlanes.z.offset * depth)]}
        >
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial 
            color={indicatorColor} 
            transparent 
            opacity={0.3} 
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
            )}
    </group>
  );
}

// ============================================================================
// SIDE BURNERS
// ============================================================================

/**
 * SideBurners — fixed rectangular ports along both side walls, aligned to
 * measured temperature elevations. They stay static so the furnace structure
 * remains easy to read while the temperature layers move or update.
 */
function SideBurners({ width, height, depth, explosionOffset, plantId = "default", model }) {
  const { state } = useFurnaceStore();
  
  // Get plant-specific burner configuration
  const burnerConfig = getBurnerConfig(plantId);
  const sideBurnerConfig = burnerConfig.sideBurners;

  const layerElevations = model?.layers?.length
    ? model.layers.map((layer) => layer.z)
    : [height * sideBurnerConfig.position.verticalRatio];
  const sides = [-1, 1];

  return (
    <group>
      {layerElevations.flatMap((y, layerIndex) => sides.map((side) => (
        <mesh
          key={`static-side-burner-${layerIndex}-${side}`}
          position={[side * (width * 0.52 + 0.08) + explosionOffset.x, y + explosionOffset.y, explosionOffset.z]}
          renderOrder={8}
        >
          <boxGeometry args={[0.12, Math.max(0.24, height * 0.008), Math.max(0.48, depth * 0.045)]} />
          <meshBasicMaterial color="#bf7b28" toneMapped={false} />
        </mesh>
      )))}
    </group>
  );
}
