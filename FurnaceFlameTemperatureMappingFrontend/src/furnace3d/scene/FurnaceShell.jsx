// src/furnace3d/scene/FurnaceShell.jsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useFurnaceStore } from "../state/FurnaceStore";

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

export default function FurnaceShell({ dimensions, visible = true, isFocusedView = false }) {
  // Hide shell in focused view (CAT scan mode)
  const shouldShow = visible && !isFocusedView;
  return shouldShow ? <FurnaceShellContent dimensions={dimensions} /> : null;
}

function FurnaceShellContent({ dimensions }) {
  const { state } = useFurnaceStore();
  const { width, depth, height } = dimensions;
  const shellRef = useRef();
  const clippingIndicatorsRef = useRef([]);

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

  // Animate shell properties
  useFrame(({ clock }) => {
    if (shellRef.current) {
      // Subtle breathing animation for the shell
      const time = clock.getElapsedTime();
      const breathScale = 1 + Math.sin(time * 0.5) * 0.002;
      shellRef.current.scale.setScalar(breathScale);
    }

    // Animate clipping indicators with pulsing effect
    clippingIndicatorsRef.current.forEach((indicator, index) => {
      if (indicator?.material) {
        const time = clock.getElapsedTime();
        const pulsePhase = index * 0.5;
        indicator.material.opacity = 0.3 + Math.sin(time * 2 + pulsePhase) * 0.15;
      }
    });
  });

  // Enhanced material properties based on view state
  const shellOpacity = state.sectionalView === "section" || state.multiClipEnabled ? 0.18 : 0.15;
  const liningOpacity = state.sectionalView === "section" || state.multiClipEnabled ? 0.35 : 0.4;

  return (
    <group ref={shellRef}>
      {/* Main furnace shell — outer steel casing with enhanced materials */}
      <mesh
        position={[explosionOffset.x, height / 2 + explosionOffset.y, explosionOffset.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color="#2d3748"
          metalness={0.8}
          roughness={0.25}
          transparent
          opacity={shellOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Inner refractory lining with enhanced thermal properties */}
      <mesh
        position={[explosionOffset.x, height / 2 + explosionOffset.y, explosionOffset.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.95, height * 0.98, depth * 0.95]} />
        <meshStandardMaterial
          color="#8b4513"
          metalness={0.15}
          roughness={0.85}
          emissive={new THREE.Color(0x8b4513).multiplyScalar(0.15)}
          emissiveIntensity={0.4}
          transparent
          opacity={liningOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
          envMapIntensity={0.8}
        />
      </mesh>

      {/* Enhanced steel frame edges with glow effect */}
      <lineSegments position={[explosionOffset.x, height / 2 + explosionOffset.y, explosionOffset.z]}>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial color="#718096" linewidth={3} transparent opacity={0.8} />
      </lineSegments>

      {/* Corner structural supports with enhanced materials */}
      {[
        [-width / 2, 0, -depth / 2], [width / 2, 0, -depth / 2],
        [-width / 2, 0, depth / 2], [width / 2, 0, depth / 2]
      ].map((position, i) => (
        <EnhancedCornerSupport
          key={`corner-${i}`}
          position={position}
          explosionOffset={explosionOffset}
          height={height}
          index={i}
        />
      ))}

      {/* Horizontal support beams with industrial styling */}
      {[0.25, 0.5, 0.75].map((ratio, i) => (
        <EnhancedSupportBeams
          key={`beam-${i}`}
          ratio={ratio}
          width={width}
          height={height}
          depth={depth}
          explosionOffset={explosionOffset}
          index={i}
        />
      ))}

      {/* Vertical pipes on sides with realistic materials */}
      {[0.2, 0.8].map((ratio, i) => (
        <EnhancedVerticalPipes
          key={`pipe-${i}`}
          ratio={ratio}
          width={width}
          height={height}
          depth={depth}
          explosionOffset={explosionOffset}
          index={i}
        />
      ))}

      {/* Enhanced access doors with industrial details */}
      {[0.3, 0.7].map((ratio, i) => (
        <EnhancedAccessDoors
          key={`door-${i}`}
          ratio={ratio}
          height={height}
          depth={depth}
          explosionOffset={explosionOffset}
          index={i}
        />
      ))}

      {/* Top platform with enhanced materials */}
      <EnhancedTopPlatform
        width={width}
        height={height}
        depth={depth}
        explosionOffset={explosionOffset}
      />

      {/* Enhanced safety railing with animated features */}
      <EnhancedSafetyRailing
        width={width}
        height={height}
        depth={depth}
        explosionOffset={explosionOffset}
      />

      {/* Foundation base with realistic concrete texture */}
      <EnhancedFoundation
        width={width}
        height={height}
        depth={depth}
        explosionOffset={explosionOffset}
      />

      {/* Enhanced industrial floor grid */}
      <EnhancedFloorGrid
        width={width}
        depth={depth}
        explosionOffset={explosionOffset}
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

// ============================================================================
// ENHANCED SUB-COMPONENTS
// ============================================================================

function EnhancedCornerSupport({ position, explosionOffset, height, index }) {
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
      position={[position[0] + explosionOffset.x, position[1] + explosionOffset.y, position[2] + explosionOffset.z]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.8, height, 0.8]} />
      <meshStandardMaterial 
        color="#4a5568" 
        metalness={0.85} 
        roughness={0.3}
        emissive="#4a5568"
        emissiveIntensity={0.1}
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
