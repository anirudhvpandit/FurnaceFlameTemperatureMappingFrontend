import { useMemo } from "react";
import * as THREE from "three";

/** 3D superheater tube curtains filling the upper furnace above the buzz-neck. */
export default function SuperheaterCoils({ dimensions }) {
  const { width, depth, height } = dimensions;

  const tubeBanks = useMemo(() => {
    const xLeft = -width * 0.44 + width * 0.5;
    const xRight = width * 0.44 + width * 0.5;
    const yBottom = height * 0.72;
    const yTop = height * 0.98;
    const passCount = 12;
    const pitch = (xRight - xLeft) / (passCount - 1);
    const bendRadius = pitch * 0.5;
    const pipeRadius = Math.max(0.065, width * 0.007);
    const rowCount = 5;
    const sections = 4;
    const passesPerSection = passCount / sections;

    return Array.from({ length: rowCount }, (_, row) => {
      const z = THREE.MathUtils.lerp(-depth * 0.4, depth * 0.4, row / (rowCount - 1));
      const sectionBanks = [];

      for (let section = 0; section < sections; section += 1) {
        // Keep top constant, only shorten bottom for subsequent sections to follow slope
        const sectionProgress = section / (sections - 1);
        const bottomDescent = section > 0 ? sectionProgress * (height * 0.22) : 0;
        const sectionYBottom = yBottom + bottomDescent; // Bottom moves up, shortening the tube
        
        const startPass = section * passesPerSection;
        const endPass = startPass + passesPerSection;
        const points = [new THREE.Vector3(xLeft + pitch * startPass, yTop, z)];

        for (let pass = startPass; pass < endPass; pass += 1) {
          const x = xLeft + pitch * pass;
          const endsAtBottom = pass % 2 === 0;
          const yEnd = endsAtBottom ? sectionYBottom : yTop;
          points.push(new THREE.Vector3(x, yEnd, z));

          if (pass < endPass - 1) {
            const nextX = xLeft + pitch * (pass + 1);
            const centerX = (x + nextX) / 2;
            for (let step = 1; step <= 10; step += 1) {
              const angle = Math.PI - (step / 10) * Math.PI;
              const bendY = yEnd + (endsAtBottom ? -1 : 1) * bendRadius * Math.sin(angle);
              points.push(new THREE.Vector3(centerX + bendRadius * Math.cos(angle), bendY, z));
            }
          }
        }

        const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.25);
        const outline = new THREE.TubeGeometry(curve, 720, pipeRadius * 1.55, 8, false);
        const hotTube = new THREE.TubeGeometry(curve, 720, pipeRadius, 8, false);
        sectionBanks.push({ section, outline, hotTube });
      }

      return { z, sectionBanks };
    });
  }, [width, depth, height]);

  return (
    <group>
      {tubeBanks.map((bank, rowIndex) => (
        <group key={rowIndex}>
          {bank.sectionBanks.map((sectionBank, sectionIndex) => (
            <group key={`${rowIndex}-${sectionIndex}`}>
              {/* The offset silhouettes make each depth layer read as real tubing. */}
              <mesh geometry={sectionBank.outline} renderOrder={30}>
                <meshBasicMaterial color="#40131b" depthTest={false} toneMapped={false} />
              </mesh>
              <mesh geometry={sectionBank.hotTube} renderOrder={31}>
                <meshStandardMaterial
                  color={sectionIndex % 2 === 0 ? "#d84a34" : "#ef6a32"}
                  emissive="#8f2416"
                  emissiveIntensity={0.42}
                  metalness={0.38}
                  roughness={0.32}
                  depthTest={false}
                  toneMapped={false}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
