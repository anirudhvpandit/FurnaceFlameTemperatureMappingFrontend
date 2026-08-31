// src/furnace3d/utils/export3D.js
import * as THREE from 'three';

/**
 * Export 3D scene to GLTF format
 * Note: This requires the GLTFExporter from three/examples/jsm/exporters/GLTFExporter
 * For production, you would need to install and import: import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
 */
export async function exportToGLTF(scene, filename = 'furnace_model') {
  try {
    // Dynamic import to avoid adding to main bundle size
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
    
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();
      
      exporter.parse(
        scene,
        (gltf) => {
          const output = JSON.stringify(gltf, null, 2);
          const blob = new Blob([output], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${filename}.gltf`;
          link.click();
          URL.revokeObjectURL(url);
          resolve(true);
        },
        (error) => {
          console.error('An error happened during GLTF export:', error);
          alert('Failed to export GLTF model. See console for details.');
          resolve(false);
        },
        { binary: false } // Export as GLTF JSON, not GLB binary
      );
    });
  } catch (error) {
    console.error('GLTF exporter not available:', error);
    // Fallback to simplified JSON export
    alert('GLTF export requires three.js exporters. Using simplified JSON export instead.');
    return false;
  }
}

/**
 * Export 3D scene to OBJ format
 * Note: This requires the OBJExporter from three/examples/jsm/exporters/OBJExporter
 */
export async function exportToOBJ(scene, filename = 'furnace_model') {
  try {
    // Dynamic import to avoid adding to main bundle size
    const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');
    
    const exporter = new OBJExporter();
    const result = exporter.parse(scene);
    
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.obj`;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('OBJ exporter not available:', error);
    alert('OBJ export requires three.js exporters. Using simplified JSON export instead.');
    return false;
  }
}

/**
 * Export 3D scene to STL format (for 3D printing)
 * Note: This requires the STLExporter from three/examples/jsm/exporters/STLExporter
 */
export async function exportToSTL(scene, filename = 'furnace_model', binary = true) {
  try {
    // Dynamic import to avoid adding to main bundle size
    const { STLExporter } = await import('three/examples/jsm/exporters/STLExporter.js');
    
    const exporter = new STLExporter();
    const result = exporter.parse(scene, { binary });
    
    const blob = new Blob([result], { type: binary ? 'application/octet-stream' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${binary ? 'stl' : 'stl'}`;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('STL exporter not available:', error);
    alert('STL export requires three.js exporters. Using simplified JSON export instead.');
    return false;
  }
}

/**
 * Export current view as a simplified 3D representation
 * Creates a lightweight representation of the furnace for external applications
 */
export function exportSimplified3D(model, filename = 'furnace_simplified') {
  const simplifiedData = {
    metadata: {
      format: 'Simplified 3D',
      version: '1.0',
      exportDate: new Date().toISOString(),
    },
    furnace: {
      dimensions: model.dimensions,
      layers: model.layers.map(layer => ({
        id: layer.id,
        position: { x: 0, y: layer.z, z: 0 },
        size: {
          width: model.dimensions.width,
          height: 1.4, // LAYER_THICKNESS
          depth: model.dimensions.depth,
        },
        temperature: layer.temperature,
      })),
    },
    burners: model.layers.flatMap(layer =>
      layer.burners.map(burner => ({
        id: burner.id,
        position: burner.position,
        rotation: {
          x: 0,
          y: (-burner.angleDeg * Math.PI) / 180,
          z: (burner.tiltDeg * Math.PI) / 180,
        },
        size: {
          radius: 0.24,
          height: 0.6,
        },
        temperature: burner.temperature,
        status: burner.status,
      }))
    ),
  };

  const jsonContent = JSON.stringify(simplifiedData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export scene screenshot as high-resolution image
 */
export function exportHighResScreenshot(renderer, scene, camera, filename = 'furnace_screenshot', width = 4096, height = 2160) {
  try {
    // Create a new renderer for high-res export
    const originalSize = renderer.getSize(new THREE.Vector2());
    const originalPixelRatio = renderer.getPixelRatio();
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    
    renderer.render(scene, camera);
    
    const dataURL = renderer.domElement.toDataURL('image/png');
    
    // Restore original renderer settings
    renderer.setSize(originalSize.x, originalSize.y);
    renderer.setPixelRatio(originalPixelRatio);
    
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `${filename}_${width}x${height}.png`;
    link.click();
  } catch (error) {
    console.error('High-res screenshot failed:', error);
    alert('Failed to export high-resolution screenshot.');
  }
}

/**
 * Export furnace layout as 2D CAD-friendly format (DXF-like JSON)
 */
export function exportLayoutCAD(model, filename = 'furnace_layout') {
  const cadData = {
    metadata: {
      format: 'CAD Layout',
      version: '1.0',
      exportDate: new Date().toISOString(),
    },
    layout: {
      units: 'meters',
      origin: { x: 0, y: 0, z: 0 },
      furnace: {
        footprint: {
          type: 'rectangle',
          width: model.dimensions.width,
          depth: model.dimensions.depth,
          corners: [
            { x: -model.dimensions.width/2, y: -model.dimensions.depth/2 },
            { x: model.dimensions.width/2, y: -model.dimensions.depth/2 },
            { x: model.dimensions.width/2, y: model.dimensions.depth/2 },
            { x: -model.dimensions.width/2, y: model.dimensions.depth/2 },
          ],
        },
        height: model.dimensions.height,
      },
      layers: model.layers.map(layer => ({
        id: layer.id,
        elevation: layer.elevationM,
        zPosition: layer.z,
        burners: layer.burners.map(burner => ({
          id: burner.id,
          corner: burner.corner,
          position: { x: burner.position.x, y: burner.position.y },
          angle: burner.angleDeg,
          tilt: burner.tiltDeg,
        })),
      })),
    },
  };

  const jsonContent = JSON.stringify(cadData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(url);
}