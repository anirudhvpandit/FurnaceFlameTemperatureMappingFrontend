// src/furnace3d/scene/FurnaceScene.jsx
import { Suspense, useRef, useEffect, forwardRef, useImperativeHandle, useState, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import FurnaceShell from "./FurnaceShell";
import FurnaceLayers from "./FurnaceLayers";
import BurnerSystem from "./BurnerSystem";
import TemperatureField from "./TemperatureField";
import AIPrediction from "./AIPrediction";
import { useFurnaceStore } from "../state/FurnaceStore";
import SceneLighting from "./SceneLightening";
import TemperatureColorLegend from "./TemperatureColorLegend";

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
 * Camera animation component for smooth transitions
 */
function CameraAnimator({ targetPositionRef, targetLookAtRef, controlsRef }) {
  useFrame(() => {
    if (!controlsRef.current) return;
    
    const targetPosition = targetPositionRef.current;
    const targetLookAt = targetLookAtRef.current;
    
    if (!targetPosition || !targetLookAt) return;
    
    const camera = controlsRef.current.object;
    const target = controlsRef.current.target;
    
    // Smoothly interpolate camera position
    camera.position.lerp(targetPosition, 0.05);
    target.lerp(targetLookAt, 0.05);
    
    controlsRef.current.update();
    
    // Clear targets when close enough to avoid continuous animation
    if (camera.position.distanceTo(targetPosition) < 0.1) {
      targetPositionRef.current = null;
      targetLookAtRef.current = null;
    }
  });
  
  return null;
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

const FurnaceScene = forwardRef(({ model, onResetCameraRef, onControlsReady, onControlsRemoved, furnaceOffsets = [[0, 0], [0, 0]] }, ref) => {
  const controlsRef = useRef();
  const sceneRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const { state, setModel } = useFurnaceStore();
  const targetPositionRef = useRef(null);
  const targetLookAtRef = useRef(null);
  const registeredControlsRef = useRef(null);

  // Register as soon as Drei creates the controls. A callback ref is important
  // here because the controls live inside the Canvas renderer tree.
  const setControlsRef = useCallback((controls) => {
    const previous = registeredControlsRef.current;
    if (previous && previous !== controls) onControlsRemoved?.(previous);
    controlsRef.current = controls;
    registeredControlsRef.current = controls;
    if (controls) onControlsReady?.(controls);
  }, [onControlsReady, onControlsRemoved]);

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
    if (controlsRef.current && state.focusTarget && model) {
      const target = state.focusTarget;
      let pos = [0, 0, 0];
      
      if (target.type === "layer") {
        const layer = model.layers.find(l => l.id === target.id);
        if (layer) pos = [0, layer.z, 0];
      } else if (target.type === "burner") {
        const burner = model.layers.flatMap(l => l.burners).find(b => b.id === target.id);
        if (burner) pos = [burner.position.x, burner.position.z, burner.position.y];
      }
      
      controlsRef.current.target.set(pos[0], pos[1], pos[2]);
      controlsRef.current.update();
    }
  }, [state.focusTarget, model]);

  // Camera positioning for CT scan view and focused cross-section view
  useEffect(() => {
    if (controlsRef.current && model) {
      if (state.ctScanMode) {
        const controls = controlsRef.current;
        const currentDistance = controls.object.position.distanceTo(controls.target);
        const centerY = model.dimensions.height / 2;
        const activeAxis = state.clipPlanes?.x?.enabled
          ? "x"
          : state.clipPlanes?.y?.enabled
            ? "y"
            : "z";
        const camPos = activeAxis === "x"
          ? new THREE.Vector3(currentDistance, centerY, 0)
          : activeAxis === "y"
            ? new THREE.Vector3(0, currentDistance, 0)
            : new THREE.Vector3(0, centerY, currentDistance);
        targetPositionRef.current = camPos;
        targetLookAtRef.current = new THREE.Vector3(0, centerY, 0);
        return;
      }

      const { width, depth, height } = model.dimensions;
      let camPos = null;
      let lookAt = null;

      if (state.isFocusedView && state.focusedLayerId) {
        // Focusing is a visibility operation only. Preserve the user's current
        // camera position instead of zooming or rotating toward the layer.
        return;
      }
      // Default view
      else {
        const cameraDistance = Math.max(width * 1.3, depth * 1.3, height * 1.28);
        camPos = new THREE.Vector3(width * 0.65, height / 2 + height * 0.12, cameraDistance);
        lookAt = new THREE.Vector3(0, height / 2, 0);
      }

      if (camPos && lookAt) {
        targetPositionRef.current = camPos;
        targetLookAtRef.current = lookAt;
      }
    }
  }, [state.ctScanMode, state.clipPlanes, state.isFocusedView, state.focusedLayerId, model]);

  // Loading state management
  useEffect(() => {
    if (model) {
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [model]);

  // Use useMemo to prevent recalculating dimensions unnecessarily
  const dimensions = useMemo(() => {
    if (!model) return null;
    return model.dimensions;
  }, [model]);
  
  const { width, depth, height } = dimensions || { width: 1, depth: 1, height: 1 };
  const camDist = Math.max(width, depth, height) * 1.6;
  const comparisonModel = state.comparisonModel;

  return (
    <>
      {isLoading && <SceneLoadingOverlay />}
      {model ? (
      <Canvas
        ref={sceneRef}
        dpr={[1, 2]}
        camera={{ position: [width * 0.65, height / 2 + height * 0.12, Math.max(width * 1.3, depth * 1.3, height * 1.28)], fov: 50 }}
        gl={{ 
          antialias: true, 
          powerPreference: "high-performance", 
          shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap },
          alpha: true
        }}
        onCreated={(three) => {
          const gl = three.gl;
          gl.localClippingEnabled = false;
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
        {!state.ctScanMode && <Environment preset="warehouse" />}
        
        <SceneLighting />
        
        <Suspense fallback={null}>
          {state.ctScanMode ? (
            <FurnaceLayers model={model} receiveShadow castShadow />
          ) : state.isFocusedView ? (
            <>
              <FurnaceLayers model={model} receiveShadow castShadow />
              {state.focusedObjectType === 'burner' && <BurnerSystem model={model} />}
            </>
          ) : (
            <>
              <group position={[furnaceOffsets[0]?.[0] || 0, 0, furnaceOffsets[0]?.[1] || 0]}>
              <FurnaceLayers model={model} receiveShadow castShadow />
              <FurnaceShell dimensions={model.dimensions} model={model} receiveShadow castShadow isFocusedView={state.isFocusedView} plantId={state.plantId || "default"} />
              <BurnerSystem model={model} />
              {(state.explodedView || state.sectionalView === "isolated" ||
                model.layers.some((layer) => state.layerVisibility[layer.id] === false)) && (
                <TemperatureField model={model} isFocusedView={state.isFocusedView} />
              )}
              {state.showAIOverlay && <AIPrediction model={model} isFocusedView={state.isFocusedView} />}
              </group>
            </>
          )}
          
          {/* Enhanced comparison mode */}
          {comparisonModel && !state.ctScanMode && (
            <group position={[comparisonModel.dimensions.width + 4 + (furnaceOffsets[1]?.[0] || 0), 0, furnaceOffsets[1]?.[1] || 0]}>
              <ComparisonSeparator position={[-2, 0, 0]} />
              <FurnaceShell dimensions={comparisonModel.dimensions} model={comparisonModel} receiveShadow castShadow isFocusedView={state.isFocusedView} />
              <FurnaceLayers model={comparisonModel} receiveShadow castShadow />
              <BurnerSystem model={comparisonModel} />
              <TemperatureField model={comparisonModel} isFocusedView={state.isFocusedView} />
            </group>
          )}
        </Suspense>
        
        {/* Enhanced contact shadows */}
        {!state.ctScanMode && (
          <ContactShadows 
            position={[0, -0.5, 0]} 
            opacity={0.6} 
            scale={50} 
            blur={4} 
            far={25} 
            resolution={1024} 
            color="#1a202c" 
          />
        )}
        
        <DeselectOnMiss />

        {/* 3D temperature colour scale legend */}
        {!state.ctScanMode && !state.isFocusedView && (
          <TemperatureColorLegend />
        )}


        
        {/* Camera animator for smooth transitions */}
        <CameraAnimator 
          targetPositionRef={targetPositionRef}
          targetLookAtRef={targetLookAtRef}
          controlsRef={controlsRef}
        />
        
        {/* Enhanced orbit controls with smooth damping */}
        <OrbitControls 
          ref={setControlsRef} 
          makeDefault 
          target={[0, height / 2, 0]} 
          minDistance={Math.max(width, depth) * 0.6} 
          maxDistance={camDist * 3.5} 
          enableDamping 
          dampingFactor={0.05}
          enablePan={!state.ctScanMode}
          enableZoom={!state.ctScanMode}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
        />
      </Canvas>
      ) : null}
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
