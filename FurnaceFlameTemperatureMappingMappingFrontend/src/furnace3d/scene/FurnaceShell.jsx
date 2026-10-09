// ============================================================================
// SIDE BURNERS
// ============================================================================

/**
 * SideBurners — one rectangular burner port on each side wall of the
 * boiler (left and right, ±X faces) with an animated flame extending
 * into the furnace interior.
 *
 * The burner cuboid is fully opaque and visible with a bright steel
 * material.  Positions scale with furnace dimensions and honour the
 * explosion offset for exploded-view mode.
 */
function SideBurners({ width, height, depth, explosionOffset }) {
  const flameMatRef = useRef();
  const lightRef = useRef();

  // Burner vertical centre — 40% up the furnace
  const burnerY = height * 0.4;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (flameMatRef.current) {
      // Dual-frequency flicker for natural-looking flame
      const flicker =
        0.3 + Math.sin(t * 5.5) * 0.2 + Math.sin(t * 9.3) * 0.1;
      flameMatRef.current.emissiveIntensity = flicker;
      flameMatRef.current.opacity =
        0.55 + Math.sin(t * 7.1 + 0.5) * 0.15;
    }
    if (lightRef.current) {
      lightRef.current.intensity =
        0.5 + Math.sin(t * 5.5) * 0.3 + Math.sin(t * 9.3) * 0.15;
    }
  });

  return (
    <group>
      {/* Left side wall burner — flame extends into +X */}
      <SideBurner
        position={[
          -width / 2 + 0.05 + explosionOffset.x,
          burnerY + explosionOffset.y,
          explosionOffset.z,
        ]}
        flameDirection={[0, 0, 0]}          // flame axis = +X
      >
        {flameMatRef ? <SideBurnerFlame ref={flameMatRef} /> : null}
      </SideBurner>
    </group>
  );
}

/**/
function SideBurner({ position, children }) {
  return (
    <group position={position}>
      {/* Visible opaque cuboid burner port */}
      <mesh
        position={[0, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.45, 0.35, 0.15]} />
        <meshStandardMaterial
          color="#4a5568"
          metalness={0.8}
          roughness={0.2}
          emissive="#fbbf24"
          emissiveIntensity={0.5}
          envMapIntensity={1.5}
        />
      </mesh>

      {children}
    </group>
  );
}