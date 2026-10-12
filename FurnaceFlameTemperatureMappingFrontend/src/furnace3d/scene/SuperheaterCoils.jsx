import { useMemo } from "react";
import * as THREE from "three";
import { temperatureToColor } from "../utils/temperatureScale";

/** Get coil temperature at a specific x position */
function getCoilTemperatureAtX(xNorm, boilerParams) {
  const coilPositions = [
    { xNorm: 0.12, temp: boilerParams?.fg_temp_after_dpsh_l ?? boilerParams?.fg_temp_after_dpsh_r },
    { xNorm: 0.37, temp: boilerParams?.fg_temp_after_psh_l ?? boilerParams?.fg_temp_after_psh_r },
    { xNorm: 0.63, temp: boilerParams?.fg_temp_after_rh_l ?? boilerParams?.fg_temp_after_rh_r },
    { xNorm: 0.88, temp: boilerParams?.fg_temp_after_hsh_l ?? boilerParams?.fg_temp_after_hsh_r },
  ].map((coil) => ({
    ...coil,
    temp: coil.temp == null || coil.temp === "" || !Number.isFinite(Number(coil.temp)) ? null : Number(coil.temp)
  })).filter((coil) => coil.temp != null);

  if (coilPositions.length === 0) return 600; // Default temperature

  // Interpolate temperature based on x position
  if (coilPositions.length === 1) return coilPositions[0].temp;
  if (xNorm <= coilPositions[0].xNorm) return coilPositions[0].temp;
  if (xNorm >= coilPositions[coilPositions.length - 1].xNorm) return coilPositions[coilPositions.length - 1].temp;

  for (let i = 0; i < coilPositions.length - 1; i++) {
    const left = coilPositions[i];
    const right = coilPositions[i + 1];
    if (xNorm >= left.xNorm && xNorm <= right.xNorm) {
      const fraction = (xNorm - left.xNorm) / (right.xNorm - left.xNorm);
      return THREE.MathUtils.lerp(left.temp, right.temp, fraction);
    }
  }
  return coilPositions[0].temp;
}

/** 3D superheater tube curtains filling the upper furnace above the buzz-neck. */
export default function SuperheaterCoils({ dimensions, boilerParams, thresholds }) {
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

        // Add vertex colors based on temperature at each position
        const positions = hotTube.attributes.position;
        const colors = new Float32Array(positions.count * 3);
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i);
          const xNorm = (x / width) + 0.5;
          const temp = getCoilTemperatureAtX(xNorm, boilerParams);
          const color = new THREE.Color(temperatureToColor(temp, thresholds?.alert || 1350, thresholds?.warn || 1300));
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        }
        hotTube.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        sectionBanks.push({ section, outline, hotTube });
      }

      return { z, sectionBanks };
    });
  }, [width, depth, height, boilerParams, thresholds]);

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
                  vertexColors
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
