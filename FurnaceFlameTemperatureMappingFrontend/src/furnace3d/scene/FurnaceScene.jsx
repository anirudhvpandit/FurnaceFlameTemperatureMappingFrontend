// src/furnace3d/scene/FurnaceScene.jsx
import { Suspense, useRef, useEffect, forwardRef, useImperativeHandle, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import FurnaceShell from "./FurnaceShell";
import FurnaceLayers from "./FurnaceLayers";
import BurnerSystem from "./BurnerSystem";
import TemperatureField from "./TemperatureField";
import TemperatureCloud from "./TemperatureCloud";
import FlowArrows from "./FlowArrows";
import HeatmapFloor from "./HeatmapFloor";
import AIPrediction from "./AIPrediction";
import IndustrialEnvironment from "./IndustrialEnvironment";
import { useFurnaceStore } from "../state/FurnaceStore";
import SceneLighting from "./SceneLightening";

/**
 * Enhanced FurnaceScene with beautiful UI/UX improvements.
 *
 * Features:
 *  • Smooth camera transitions and focus animations
 *  • Enhanced loading states with beautiful animations
 *  • Improved shadow quality and visual effects
 *  • Beautiful comparison mode with visual separator
 *  • Enhanced scene transitions and visual feedback
 *  • Optimized rendering with progressive enhancement
 */

function DeselectOnMiss() {
  const { clearSelection } = useFurnaceStore();
  return (
    <mesh visible={false} onPointerMissed={() => clearSelection()}>
      <boxGeometry args={[0.001, 0.001, 0.001]} />
    </mesh>
  );
}

/**
 * Enhanced loading overlay with beautiful animation
 */
function SceneLoadingOverlay() {
  return (
    <div style={styles.loadingOverlay}>
      <div style={styles.loadingContent}>
        <div style={styles.loadingSpinner}>
          <div style={{ ...styles.spinnerRing, animationDelay: "0s" }} />
          <div style={{ ...styles.spinnerRing, animationDelay: "0.15s" }} />
          <div style={{ ...styles.spinnerRing, animationDelay: "0.3s" }} />
        </div>
        <div style={styles.loadingText}>Loading 3D Scene...</div>
        <div style={styles.loadingSubtext}>Preparing furnace visualization</div>
      </div>
    </div>
  );
}

/**
 * Visual separator for comparison mode
 */
function ComparisonSeparator({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 5, 0]}>
        <boxGeometry args={[0.1, 10, 20]} />
        <meshStandardMaterial
          color="#3b82f6"
          transparent
          opacity={0.3}
          emissive="#3b82f6"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0, 5, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 10, 16]} />
        <meshStandardMaterial
          color="#22d3ee"
          transparent
          opacity={0.4}
          emissive="#22d3ee"
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
}

const FurnaceScene = forwardRef(({ model, onResetCameraRef }, ref) => {
  const controlsRef = useRef();
  const sceneRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const { state, setModel } = useFurnaceStore();

  // Add loading animation styles
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, []);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (controlsRef.current) {
        controlsRef.current.reset();
        controlsRef.current.target.set(0, model?.dimensions.height / 2 || 0, 0);
      }
    },
    setView: (position, target) => {
      if (controlsRef.current) {
        controlsRef.current.camera.position.set(position.x, position.y, position.z);
        controlsRef.current.target.set(target.x, target.y, target.z);
        controlsRef.current.update();
      }
    },
    getScene: () => sceneRef.current,
  }));

  // Keep the store's model reference in sync
  useEffect(() => {
    if (model && state.model !== model) {
      setModel(model);
    }
  }, [model, setModel, state.model]);

  // Enhanced camera reset reference
  useEffect(() => {
    if (onResetCameraRef) {
      onResetCameraRef.current = {
        reset: () => {
          if (controlsRef.current) {
            controlsRef.current.reset();
            controlsRef.current.target.set(0, model?.dimensions.height / 2 || 0, 0);
          }
        },
        setView: (p, t) => {
          if (controlsRef.current) {
            controlsRef.current.camera.position.set(p.x, p.y, p.z);
            controlsRef.current.target.set(t.x, t.y, t.z);
            controlsRef.current.update();
          }
        }
      };
    }
  }, [onResetCameraRef, model]);

  // Store scene reference for 3D export
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.__threejs_scene = sceneRef.current;
    }
  }, [model]);

  // Enhanced focus target with smooth transitions
  useEffect(() => {
    if (!controlsRef.current || !state.focusTarget) return;
    
    const target = state.focusTarget;
    let pos = [0, 0, 0];
    
    if (target.type === "layer") {
      const layer = model?.layers.find(l => l.id === target.id);
      if (layer) pos = [0, layer.z, 0];
    } else if (target.type === "burner") {
      const burner = model?.layers.flatMap(l => l.burners).find(b => b.id === target.id);
      if (burner) pos = [burner.position.x, burner.position.z, burner.position.y];
    }
    
    controlsRef.current.target.set(pos[0], pos[1], pos[2]);
    controlsRef.current.update();
  }, [state.focusTarget, model]);

  // Loading state management
  useEffect(() => {
    if (model) {
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [model]);

  if (!model) return null;
  
  const { width, depth, height } = model.dimensions;
  const camDist = Math.max(width, depth, height) * 1.6;
  const comparisonModel = state.comparisonModel;

  return (
    <>
      {isLoading && <SceneLoadingOverlay />}
      <Canvas
        ref={sceneRef}
        dpr={[1, 2]}
        camera={{ position: [camDist, camDist * 0.7, camDist], fov: 50 }}
        gl={{ 
          antialias: true, 
          powerPreference: "high-performance", 
          shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap },
          alpha: true
        }}
        onCreated={(three) => {
          const gl = three.gl;
          gl.localClippingEnabled = true;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
          gl.setClearColor(0x030814, 1);
          three.scene.__threejs_scene = three.scene;
        }}
        style={{ 
          background: "linear-gradient(135deg, #030814 0%, #0a0f1e 100%)",
          borderRadius: "12px"
        }}
      >
        {/* Enhanced environment for realistic reflections */}
        <Environment preset="warehouse" />
        
        <SceneLighting />
        
        <Suspense fallback={null}>
          <FurnaceShell dimensions={model.dimensions} receiveShadow castShadow />
          <FurnaceLayers model={model} receiveShadow castShadow />
          <BurnerSystem model={model} />
          <TemperatureField model={model} />
          <TemperatureCloud model={model} />
          <FlowArrows model={model} />
          <HeatmapFloor model={model} />
          <IndustrialEnvironment dimensions={model.dimensions} receiveShadow castShadow />
          {state.showAIOverlay && <AIPrediction model={model} />}
          
          {/* Enhanced comparison mode */}
          {comparisonModel && (
            <group position={[model.dimensions.width + 4, 0, 0]}>
              <ComparisonSeparator position={[-2, 0, 0]} />
              <FurnaceShell dimensions={comparisonModel.dimensions} receiveShadow castShadow />
              <FurnaceLayers model={comparisonModel} receiveShadow castShadow />
              <BurnerSystem model={comparisonModel} />
              <TemperatureField model={comparisonModel} />
              <TemperatureCloud model={comparisonModel} />
              <FlowArrows model={comparisonModel} />
              <HeatmapFloor model={comparisonModel} />
            </group>
          )}
        </Suspense>
        
        {/* Enhanced contact shadows */}
        <ContactShadows 
          position={[0, -0.5, 0]} 
          opacity={0.6} 
          scale={50} 
          blur={4} 
          far={25} 
          resolution={1024} 
          color="#1a202c" 
        />
        
        <DeselectOnMiss />
        
        {/* Enhanced orbit controls with smooth damping */}
        <OrbitControls 
          ref={controlsRef} 
          makeDefault 
          target={[0, height / 2, 0]} 
          minDistance={Math.max(width, depth) * 0.6} 
          maxDistance={camDist * 3.5} 
          enableDamping 
          dampingFactor={0.05}
          enablePan={true}
          enableZoom={true}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
        />
      </Canvas>
    </>
  );
});

export default FurnaceScene;

// ============================================================================
// ENHANCED STYLES
// ============================================================================

const styles = {
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(135deg, rgba(3, 8, 20, 0.95) 0%, rgba(10, 15, 30, 0.92) 100%)",
    backdropFilter: "blur(20px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    borderRadius: "12px"
  },
  loadingContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px"
  },
  loadingSpinner: {
    position: "relative",
    width: "60px",
    height: "60px"
  },
  spinnerRing: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    border: "3px solid transparent",
    borderTopColor: "#3b82f6",
    borderRightColor: "#22d3ee",
    animation: "spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite"
  },
  loadingText: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "16px",
    fontWeight: 600,
    color: "#e2e8f0",
    letterSpacing: "0.5px"
  },
  loadingSubtext: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "12px",
    color: "rgba(200, 220, 255, 0.6)",
    fontWeight: 400
  }
};
