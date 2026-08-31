// src/furnace3d/utils/materials.js
import * as THREE from "three";

/**
 * Shared PBR material factory for furnace 3D scene.
 * Centralises material definitions so every component uses physically
 * plausible, consistent settings.
 */

// ── Industrial steel / metal ──────────────────────────────────────────────
export const createSteelMaterial = (color = 0x4a5568, { metalness = 0.8, roughness = 0.35, emissive = 0x000000, emissiveIntensity = 0 } = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    emissive,
    emissiveIntensity,
    envMapIntensity: 0.8,
  });

// ── Heat-resistant refractory / firebrick ─────────────────────────────────
export const createRefractoryMaterial = (color = 0x8b4513) =>
  new THREE.MeshStandardMaterial({
    color,
    metalness: 0.12,
    roughness: 0.85,
    emissive: new THREE.Color(color).multiplyScalar(0.15),
    emissiveIntensity: 0.3,
    envMapIntensity: 0.4,
  });

// ── Insulation blanket ────────────────────────────────────────────────────
export const createInsulationMaterial = (color = 0xd4a574) =>
  new THREE.MeshStandardMaterial({
    color,
    metalness: 0.0,
    roughness: 0.95,
  });

// ── Hot steel that glows based on temperature ─────────────────────────────
export const createHotMetalMaterial = (tempColor) =>
  new THREE.MeshStandardMaterial({
    color: tempColor,
    metalness: 0.75,
    roughness: 0.5,
    emissive: new THREE.Color(tempColor).multiplyScalar(0.4),
    emissiveIntensity: 0.8,
  });

// ── Semi-transparent shell (furnace casing) ───────────────────────────────
export const createTransparentShellMaterial = (color = 0x2d3748) =>
  new THREE.MeshStandardMaterial({
    color,
    metalness: 0.7,
    roughness: 0.3,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

// ── Emissive panel / control screen ───────────────────────────────────────
export const createEmissivePanelMaterial = (color, emissiveColor) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: emissiveColor ?? color,
    emissiveIntensity: 0.25,
    metalness: 0.6,
    roughness: 0.4,
  });

// ── Flame particle material ───────────────────────────────────────────────
export const createFlameParticleMaterial = (color, intensity = 1) =>
  new THREE.PointsMaterial({
    size: 0.6,
    map: createFlameSpriteTexture(),
    color,
    transparent: true,
    opacity: 0.55 * intensity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    fog: true,
  });

/** Build a soft-oval sprite texture used by flame / heat particles. */
function createFlameSpriteTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.3, "rgba(255,200,100,0.5)");
  gradient.addColorStop(1, "rgba(100,50,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}
