// src/furnace3d/scene/IndustrialEnvironment.jsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Enhanced IndustrialEnvironment with beautiful UI/UX improvements.
 *
 * Features:
 *  • Enhanced materials with realistic industrial properties
 *  • Animated indicator lights and screens with pulsing effects
 *  • Improved pipe systems with better insulation and supports
 *  • Enhanced control panels with animated displays
 *  • Animated safety equipment and warning systems
 *  • Better ground markings and safety signage
 *  • Enhanced cable trays with realistic cable management
 *  • Smooth animations for dynamic industrial feel
 */

export default function IndustrialEnvironment({ dimensions, isFocusedView = false }) {
  const { width, depth, height } = dimensions;
  const controlPanelRefs = useRef([]);
  const indicatorLightRefs = useRef([]);
  const safetyEquipmentRefs = useRef([]);
  
  // Pipe configurations with enhanced properties
  const pipes = useMemo(() => [
    // Main steam pipes
    { start: [-width / 2 - 2, height * 0.8, 0], end: [-width / 2 - 2, height * 0.2, 0], radius: 0.3, color: 0x4a5568, type: 'steam' },
    { start: [width / 2 + 2, height * 0.8, 0], end: [width / 2 + 2, height * 0.2, 0], radius: 0.3, color: 0x4a5568, type: 'steam' },
    // Water pipes
    { start: [-width / 2 - 1.5, height * 0.6, depth / 2 + 1], end: [width / 2 + 1.5, height * 0.6, depth / 2 + 1], radius: 0.2, color: 0x3182ce, type: 'water' },
    { start: [-width / 2 - 1.5, height * 0.6, -depth / 2 - 1], end: [width / 2 + 1.5, height * 0.6, -depth / 2 - 1], radius: 0.2, color: 0x3182ce, type: 'water' },
    // Air ducts
    { start: [0, height * 0.9, -depth / 2 - 1.5], end: [0, height * 0.9, depth / 2 + 1.5], radius: 0.4, color: 0x718096, type: 'air' },
  ], [width, depth, height]);

  // Control panel positions
  const controlPanels = useMemo(() => [
    { position: [-width / 2 - 3, height * 0.5, 0], rotation: [0, Math.PI / 2, 0], id: 0 },
    { position: [width / 2 + 3, height * 0.5, 0], rotation: [0, -Math.PI / 2, 0], id: 1 },
  ], [width, height]);

  // Ladder positions
  const ladders = useMemo(() => [
    { position: [-width / 2 - 1.2, 0, -depth / 2 - 1], rotation: [0, 0, 0], id: 0 },
    { position: [width / 2 + 1.2, 0, depth / 2 + 1], rotation: [0, Math.PI, 0], id: 1 },
  ], [width, depth]);

  // Animate industrial elements
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    // Animate control panel screens
    controlPanelRefs.current.forEach((screenRef, i) => {
      if (screenRef?.material) {
        const phase = i * 0.5;
        screenRef.material.emissiveIntensity = 0.4 + Math.sin(time * 2 + phase) * 0.15;
      }
    });

    // Animate indicator lights with different patterns
    indicatorLightRefs.current.forEach((lightRef, i) => {
      if (lightRef?.material) {
        const phase = i * 0.3;
        const pattern = i % 3;
        if (pattern === 0) {
          // Steady pulse
          lightRef.material.emissiveIntensity = 0.6 + Math.sin(time * 3 + phase) * 0.2;
        } else if (pattern === 1) {
          // Slow blink
          lightRef.material.emissiveIntensity = 0.4 + Math.sin(time * 1.5 + phase) * 0.3;
        } else {
          // Fast blink
          lightRef.material.emissiveIntensity = 0.5 + Math.sin(time * 4 + phase) * 0.25;
        }
      }
    });

    // Animate safety equipment
    safetyEquipmentRefs.current.forEach((equipmentRef, i) => {
      if (equipmentRef?.material) {
        const phase = i * 0.4;
        equipmentRef.material.emissiveIntensity = 0.2 + Math.sin(time * 2.5 + phase) * 0.1;
      }
    });
  });

  // Keep hooks unconditional; only the rendered scene changes in Focused View.
  if (isFocusedView) return null;

  return (
    <group>
      {/* Enhanced large pipes */}
      {pipes.map((pipe, i) => (
        <EnhancedPipeSystem 
          key={`pipe-${i}`}
          pipe={pipe}
          index={i}
        />
      ))}

      {/* Enhanced control panels */}
      {controlPanels.map((panel, i) => (
        <EnhancedControlPanel
          key={`panel-${i}`}
          panel={panel}
          screenRef={el => controlPanelRefs.current[i] = el}
          lightRefs={(idx) => (el) => {
            if (!indicatorLightRefs.current[i]) indicatorLightRefs.current[i] = [];
            indicatorLightRefs.current[i][idx] = el;
          }}
        />
      ))}

      {/* Enhanced ladders */}
      {ladders.map((ladder, i) => (
        <EnhancedLadder
          key={`ladder-${i}`}
          ladder={ladder}
          height={height}
        />
      ))}

      {/* Enhanced valves and instruments */}
      {[
        { position: [-width / 2 - 2, height * 0.5, 0], color: "#e53e3e", type: "emergency" },
        { position: [width / 2 + 2, height * 0.5, 0], color: "#38a169", type: "normal" },
        { position: [0, height * 0.5, -depth / 2 - 1.5], color: "#3182ce", type: "control" },
      ].map((valve, i) => (
        <EnhancedValveSystem
          key={`valve-${i}`}
          valve={valve}
          index={i}
        />
      ))}

      {/* Enhanced safety equipment */}
      <EnhancedSafetyEquipment
        position={[-width / 2 - 4, 0.5, depth / 2 + 2]}
        ref={el => safetyEquipmentRefs.current[0] = el}
      />

      {/* Enhanced ground markings */}
      <EnhancedGroundMarkings
        width={width}
        depth={depth}
      />

      {/* Enhanced warning signs */}
      {[
        { position: [-width / 2 - 2, height * 0.7, depth / 2 + 0.5], text: "HOT", color: "#e53e3e" },
        { position: [width / 2 + 2, height * 0.7, -depth / 2 - 0.5], text: "HOT", color: "#e53e3e" },
      ].map((sign, i) => (
        <EnhancedWarningSign
          key={`sign-${i}`}
          sign={sign}
          index={i}
        />
      ))}

      {/* Enhanced cable trays */}
      <EnhancedCableTray
        width={width}
        height={height}
      />
    </group>
  );
}

// ============================================================================
// ENHANCED SUB-COMPONENTS
// ============================================================================

function EnhancedPipeSystem({ pipe, index }) {
  const direction = new THREE.Vector3(
    pipe.end[0] - pipe.start[0],
    pipe.end[1] - pipe.start[1],
    pipe.end[2] - pipe.start[2]
  );
  const length = direction.length();
  const midpoint = [
    (pipe.start[0] + pipe.end[0]) / 2,
    (pipe.start[1] + pipe.end[1]) / 2,
    (pipe.start[2] + pipe.end[2]) / 2,
  ];

  // Enhanced pipe color based on type
  const pipeColor = pipe.type === 'steam' ? '#4a5568' : 
                   pipe.type === 'water' ? '#3182ce' : '#718096';

  return (
    <group key={`pipe-${index}`}>
      {/* Main pipe with enhanced materials */}
      <mesh position={midpoint} rotation={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[pipe.radius, pipe.radius, length, 20]} />
        <meshStandardMaterial
          color={pipeColor}
          metalness={0.85}
          roughness={0.25}
          envMapIntensity={1.2}
        />
      </mesh>
      
      {/* Enhanced pipe insulation sections */}
      {Array.from({ length: Math.floor(length / 2) }).map((_, j) => (
        <mesh
          key={`insulation-${j}`}
          position={[
            pipe.start[0] + (direction.x * (j + 0.5) * 2 / length),
            pipe.start[1] + (direction.y * (j + 0.5) * 2 / length),
            pipe.start[2] + (direction.z * (j + 0.5) * 2 / length),
          ]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[pipe.radius + 0.06, pipe.radius + 0.06, 1.5, 16]} />
          <meshStandardMaterial 
            color="#a0aec0" 
            metalness={0.25} 
            roughness={0.75}
            envMapIntensity={0.5}
          />
        </mesh>
      ))}
      
      {/* Enhanced pipe supports */}
      {[0.25, 0.5, 0.75].map((ratio, j) => (
        <mesh
          key={`support-${j}`}
          position={[
            pipe.start[0] + direction.x * ratio,
            pipe.start[1] + direction.y * ratio - 1,
            pipe.start[2] + direction.z * ratio,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.7, 2.2, 0.7]} />
          <meshStandardMaterial 
            color="#4a5568" 
            metalness={0.75} 
            roughness={0.35}
            envMapIntensity={1.0}
          />
        </mesh>
      ))}
    </group>
  );
}

function EnhancedControlPanel({ panel, screenRef, lightRefs }) {
  return (
    <group key={`panel-${panel.id}`} position={panel.position} rotation={panel.rotation}>
      {/* Enhanced panel housing */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.6, 2.2, 0.35]} />
        <meshStandardMaterial 
          color="#2d3748" 
          metalness={0.65} 
          roughness={0.35} 
          envMapIntensity={0.9}
        />
      </mesh>
      
      {/* Enhanced screen with animated display */}
      <mesh 
        ref={screenRef}
        position={[0, 0.3, 0.22]}
        castShadow
      >
        <boxGeometry args={[1.3, 0.9, 0.06]} />
        <meshStandardMaterial 
          color="#1a202c" 
          emissive="#22d3ee" 
          emissiveIntensity={0.4} 
          envMapIntensity={1.2}
        />
      </mesh>
      
      {/* Enhanced buttons */}
      {[0, -0.4, -0.8].map((y, j) => (
        <mesh 
          key={`btn-${j}`} 
          position={[0.35, y, 0.22]} 
          castShadow 
          receiveShadow
        >
          <cylinderGeometry args={[0.1, 0.1, 0.06, 12]} />
          <meshStandardMaterial 
            color="#48bb78" 
            metalness={0.55} 
            roughness={0.25}
            envMapIntensity={0.8}
          />
        </mesh>
      ))}
      
      {/* Enhanced indicator lights */}
      {[0.2, -0.2, -0.6].map((y, j) => (
        <mesh 
          key={`light-${j}`} 
          ref={lightRefs(j)}
          position={[-0.35, y, 0.22]} 
          castShadow
        >
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial
            color={j === 0 ? "#48bb78" : j === 1 ? "#ecc94b" : "#f56565"}
            emissive={j === 0 ? "#48bb78" : j === 1 ? "#ecc94b" : "#f56565"}
            emissiveIntensity={0.6}
            metalness={0.45}
            roughness={0.25}
            envMapIntensity={1.5}
          />
        </mesh>
      ))}
    </group>
  );
}

function EnhancedLadder({ ladder, height }) {
  return (
    <group key={`ladder-${ladder.id}`} position={ladder.position} rotation={ladder.rotation}>
      {/* Enhanced side rails */}
      <mesh position={[0.35, height * 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, height * 1.2, 0.1]} />
        <meshStandardMaterial 
          color="#f6e05e" 
          metalness={0.65} 
          roughness={0.25}
          envMapIntensity={1.2}
        />
      </mesh>
      <mesh position={[-0.35, height * 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, height * 1.2, 0.1]} />
        <meshStandardMaterial 
          color="#f6e05e" 
          metalness={0.65} 
          roughness={0.25}
          envMapIntensity={1.2}
        />
      </mesh>
      
      {/* Enhanced rungs */}
      {Array.from({ length: Math.floor(height * 1.2 / 0.4) }).map((_, j) => (
        <mesh
          key={`rung-${j}`}
          position={[0, 0.2 + j * 0.4, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.7, 0.08, 0.08]} />
          <meshStandardMaterial 
            color="#d69e2e" 
            metalness={0.55} 
            roughness={0.35}
            envMapIntensity={1.0}
          />
        </mesh>
      ))}
      
      {/* Enhanced safety cage */}
      <mesh position={[0, height * 1.25, 0]} castShadow>
        <torusGeometry args={[0.55, 0.05, 12, 24]} />
        <meshStandardMaterial 
          color="#f6e05e" 
          metalness={0.65} 
          roughness={0.25}
          envMapIntensity={1.2}
        />
      </mesh>
    </group>
  );
}

function EnhancedValveSystem({ valve, index }) {
  const valveRef = useRef();
  
  useFrame(({ clock }) => {
    if (valveRef?.current?.material) {
      const time = clock.getElapsedTime();
      const phase = index * 0.3;
      valveRef.current.material.emissiveIntensity = 0.3 + Math.sin(time * 2 + phase) * 0.15;
    }
  });

  return (
    <group key={`valve-${index}`} position={valve.position}>
      {/* Enhanced valve body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.45, 0.35, 0.45]} />
        <meshStandardMaterial 
          color="#4a5568" 
          metalness={0.75} 
          roughness={0.25}
          envMapIntensity={1.1}
        />
      </mesh>
      
      {/* Enhanced valve handle */}
      <mesh 
        ref={valveRef}
        position={[0, 0.28, 0]} 
        castShadow
      >
        <boxGeometry args={[0.18, 0.12, 0.35]} />
        <meshStandardMaterial 
          color={valve.color} 
          metalness={0.55} 
          roughness={0.35}
          emissive={valve.color}
          emissiveIntensity={0.3}
          envMapIntensity={0.9}
        />
      </mesh>
      
      {/* Enhanced pressure gauge */}
      <mesh position={[0, 0.18, 0.28]} castShadow receiveShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.06, 20]} />
        <meshStandardMaterial 
          color="#2d3748" 
          metalness={0.65} 
          roughness={0.35}
          envMapIntensity={1.0}
        />
      </mesh>
      <mesh position={[0, 0.18, 0.32]}>
        <circleGeometry args={[0.1]} />
        <meshStandardMaterial 
          color="#fff" 
          emissive="#fff" 
          emissiveIntensity={0.6}
          envMapIntensity={1.5}
        />
      </mesh>
    </group>
  );
}

function EnhancedSafetyEquipment({ position, ref }) {
  return (
    <group position={position}>
      {/* Enhanced fire extinguisher */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.9, 16]} />
        <meshStandardMaterial 
          color="#e53e3e" 
          metalness={0.35} 
          roughness={0.55}
          envMapIntensity={0.7}
        />
      </mesh>
      <mesh 
        ref={ref}
        position={[0, 1.0, 0]} 
        castShadow 
        receiveShadow
      >
        <cylinderGeometry args={[0.1, 0.1, 0.18, 12]} />
        <meshStandardMaterial 
          color="#2d3748" 
          metalness={0.75} 
          roughness={0.25}
          emissive="#e53e3e"
          emissiveIntensity={0.2}
          envMapIntensity={1.2}
        />
      </mesh>
    </group>
  );
}

function EnhancedGroundMarkings({ width, depth }) {
  const markingRef = useRef();
  
  useFrame(({ clock }) => {
    if (markingRef?.current?.material) {
      const time = clock.getElapsedTime();
      markingRef.current.material.opacity = 0.25 + Math.sin(time * 1.5) * 0.08;
    }
  });

  return (
    <mesh 
      ref={markingRef}
      position={[0, 0.02, 0]} 
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[Math.max(width, depth) * 1.5, Math.max(width, depth) * 1.8, 64]} />
      <meshBasicMaterial 
        color="#f6e05e" 
        transparent 
        opacity={0.3}
      />
    </mesh>
  );
}

function EnhancedWarningSign({ sign, index }) {
  const signRef = useRef();
  
  useFrame(({ clock }) => {
    if (signRef?.current?.material) {
      const time = clock.getElapsedTime();
      const phase = index * 0.4;
      signRef.current.material.emissiveIntensity = 0.3 + Math.sin(time * 2.5 + phase) * 0.2;
    }
  });

  return (
    <group key={`sign-${index}`} position={sign.position}>
      <mesh 
        ref={signRef}
        castShadow 
        receiveShadow
      >
        <boxGeometry args={[0.9, 0.5, 0.08]} />
        <meshStandardMaterial 
          color={sign.color} 
          metalness={0.25} 
          roughness={0.55}
          emissive={sign.color}
          emissiveIntensity={0.3}
          envMapIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

function EnhancedCableTray({ width, height }) {
  return (
    <group position={[0, height + 0.8, 0]}>
      {/* Enhanced cable tray base */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width + 4.5, 0.18, 0.5]} />
        <meshStandardMaterial 
          color="#4a5568" 
          metalness={0.75} 
          roughness={0.35}
          envMapIntensity={1.1}
        />
      </mesh>
      
      {/* Enhanced cables with variety */}
      {Array.from({ length: 10 }).map((_, i) => {
        const cableColors = ['#1a202c', '#2d3748', '#4a5568', '#1a202c', '#2d3748'];
        const cableColor = cableColors[i % cableColors.length];
        
        return (
          <mesh
            key={`cable-${i}`}
            position={[-width / 2 - 1.8 + i * ((width + 3.6) / 9), 0.12, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.04, 0.04, width + 3.6, 12]} />
            <meshStandardMaterial 
              color={cableColor} 
              metalness={0.85} 
              roughness={0.15}
              envMapIntensity={1.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}
