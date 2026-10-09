// src/furnace3d/scene/FlowArrows.jsx
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function FlowArrows({ model, isFocusedView = false }) {
  const groupRef = useRef();
  const arrowRefs = useRef([]);

  if (!model) return null;

  // Enhanced smooth rotation with easing
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const time = clock.getElapsedTime();
      groupRef.current.rotation.y = Math.sin(time * 0.1) * 0.05;
    }

    // Animate individual arrows with pulsing effect
    arrowRefs.current.forEach((arrowMesh, index) => {
      if (arrowMesh) {
        const time = clock.getElapsedTime();
        const pulsePhase = index * 0.5;
        const scale = 1 + Math.sin(time * 2 + pulsePhase) * 0.1;
        arrowMesh.scale.setScalar(scale);
      }
    });
  });

  // Enhanced arrow data with temperature-based coloring
  const arrows = useMemo(() => {
    if (!model) return [];
    return model.layers.flatMap(layer =>
      layer.burners.map((burner, burnerIndex) => {
        if (burner.temperature == null) return null;
        
        const dir = new THREE.Vector3(
          Math.cos(burner.angleDeg * Math.PI / 180),
          Math.sin(burner.tiltDeg * Math.PI / 180),
          Math.sin(burner.angleDeg * Math.PI / 180)
        ).normalize();
        
        const tempFactor = (burner.temperature - 1000) / 500;
        const length = 0.8 + tempFactor;
        
        // Temperature-based color gradient
        const color = getTemperatureColor(burner.temperature);
        
        return {
          pos: new THREE.Vector3(burner.position.x, burner.position.z, burner.position.y),
          dir,
          length: Math.max(0.3, Math.min(1.5, length)),
          color,
          temperature: burner.temperature,
          index: burnerIndex
        };
      }).filter(Boolean)
    );
  }, [model?.layers]);

  // Keep hook execution stable while switching into and out of Focused View.
  if (isFocusedView) return null;

  return (
    <group ref={groupRef}>
      {arrows.map((arrow, i) => (
        <EnhancedFlowArrow 
          key={`${arrow.index}-${i}`}
          ref={el => arrowRefs.current[i] = el}
          arrow={arrow}
          index={i}
        />
      ))}
    </group>
  );
}

// ============================================================================
// ENHANCED ARROW COMPONENT
// ============================================================================

function EnhancedFlowArrow({ arrow, index, ref }) {
  const fallbackMeshRef = useRef();
  const meshRef = ref || fallbackMeshRef;
  
  // Calculate enhanced visual properties
  const headLength = 0.25 + (arrow.temperature - 1000) / 2000;
  const headWidth = 0.12 + (arrow.temperature - 1000) / 3000;
  const shaftRadius = 0.02 + (arrow.temperature - 1000) / 10000;
  
  return (
    <group ref={meshRef}>
      {/* Main arrow helper with enhanced styling */}
      <arrowHelper 
        direction={arrow.dir} 
        origin={arrow.pos} 
        length={arrow.length} 
        color={arrow.color} 
        headLength={Math.max(0.15, Math.min(0.35, headLength))} 
        headWidth={Math.max(0.08, Math.min(0.18, headWidth))}
      />
      
      {/* Glow effect for high-temperature arrows */}
      {arrow.temperature > 1200 && (
        <GlowEffect 
          position={arrow.pos}
          direction={arrow.dir}
          color={arrow.color}
          intensity={Math.min((arrow.temperature - 1200) / 500, 1)}
        />
      )}
      
      {/* Particle trail for flow visualization */}
      <FlowTrail 
        position={arrow.pos}
        direction={arrow.dir}
        color={arrow.color}
        length={arrow.length}
      />
    </group>
  );
}

// ============================================================================
// GLOW EFFECT COMPONENT
// ============================================================================

function GlowEffect({ position, direction, color, intensity }) {
  const glowRef = useRef();
  
  useFrame(({ clock }) => {
    if (glowRef.current) {
      const time = clock.getElapsedTime();
      glowRef.current.material.opacity = 0.3 + Math.sin(time * 3) * 0.1 * intensity;
      glowRef.current.scale.setScalar(1 + Math.sin(time * 2) * 0.2 * intensity);
    }
  });
  
  return (
    <mesh ref={glowRef} position={position.clone().add(direction.clone().multiplyScalar(0.5))}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshBasicMaterial 
        color={color} 
        transparent 
        opacity={0.3 * intensity}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ============================================================================
// FLOW TRAIL COMPONENT
// ============================================================================

function FlowTrail({ position, direction, color, length }) {
  const trailRef = useRef();
  
  useFrame(({ clock }) => {
    if (trailRef.current) {
      const time = clock.getElapsedTime();
      trailRef.current.material.opacity = 0.15 + Math.sin(time * 4) * 0.05;
    }
  });
  
  // Create trail points along the arrow direction
  const trailPoints = useMemo(() => {
    const points = [];
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = position.clone().add(direction.clone().multiplyScalar(length * t));
      points.push(point);
    }
    return points;
  }, [position, direction, length]);
  
  return (
    <line ref={trailRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={trailPoints.length}
          array={new Float32Array(trailPoints.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial 
        color={color} 
        transparent 
        opacity={0.15}
        blending={THREE.AdditiveBlending}
        linewidth={2}
      />
    </line>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Returns color based on temperature with beautiful gradient
 */
function getTemperatureColor(temperature) {
  // Temperature gradient from cool blue to hot red
  const t = Math.max(0, Math.min(1, (temperature - 800) / 800));
  
  if (t < 0.25) {
    // Cool: Blue to Cyan
    const localT = t / 0.25;
    return new THREE.Color().lerpColors(
      new THREE.Color("#3b82f6"),
      new THREE.Color("#22d3ee"),
      localT
    );
  } else if (t < 0.5) {
    // Warm: Cyan to Yellow
    const localT = (t - 0.25) / 0.25;
    return new THREE.Color().lerpColors(
      new THREE.Color("#22d3ee"),
      new THREE.Color("#fbbf24"),
      localT
    );
  } else if (t < 0.75) {
    // Hot: Yellow to Orange
    const localT = (t - 0.5) / 0.25;
    return new THREE.Color().lerpColors(
      new THREE.Color("#fbbf24"),
      new THREE.Color("#f97316"),
      localT
    );
  } else {
    // Very Hot: Orange to Red
    const localT = (t - 0.75) / 0.25;
    return new THREE.Color().lerpColors(
      new THREE.Color("#f97316"),
      new THREE.Color("#ef4444"),
      localT
    );
  }
}
