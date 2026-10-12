// src/furnace3d/data/ftmAdapter.js
import { DEFAULT_FURNACE_DIMENSIONS, CORNER_ANGLES_DEG, BURNER_STATUS } from "../config/furnaceConfig";

function polarToXY(radius, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
}

export function buildFurnaceModel(dataset, coalMills = [], dimensions = DEFAULT_FURNACE_DIMENSIONS) {
  if (!dataset || !Array.isArray(dataset.elevation) || dataset.elevation.length === 0) return null;
  const cornerKeys = Object.keys(dataset).filter((k) => /^c\d+$/.test(k))
    .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));
  const elevationsNum = dataset.elevation.map(Number).filter((e) => !Number.isNaN(e));
  const minElevation = elevationsNum.length ? Math.min(...elevationsNum) : 0;
  const maxElevation = elevationsNum.length ? Math.max(...elevationsNum) : 1;
  const elevationSpan = Math.max(1, maxElevation - minElevation);
  const cornerRadius = Math.min(dimensions.width, dimensions.depth) / 2;
  const allTemps = [];
  const layers = dataset.elevation.map((rawElevation, rowIdx) => {
    const elevationM = Number(rawElevation);
    const elevationFraction = Number.isFinite(elevationM)
      ? ((elevationM - minElevation) / elevationSpan) * dimensions.height
      : (rowIdx / Math.max(1, dataset.elevation.length - 1)) * dimensions.height;
    // Keep the measured elevation sequence together as a compact stack in the
    // centre of the furnace, leaving the upper chamber and lower hopper clear.
    const normalizedZ = dimensions.height * (0.4 + (elevationFraction / dimensions.height) * 0.26);
    const label = dataset.elevation_labels?.[rowIdx] ?? String(rawElevation);
    const tiltDeg = Number(dataset.burner_tilt_deg?.[rowIdx]) || 0;
    const burners = cornerKeys.map((key, i) => {
      const cornerLabel = `Corner ${key.slice(1)}`;
      const angleDeg = CORNER_ANGLES_DEG[cornerLabel] ?? (i * 360) / cornerKeys.length;
      const { x, y } = polarToXY(cornerRadius, angleDeg);
      const tempRaw = dataset[key]?.[rowIdx];
      const temperature = tempRaw != null && tempRaw !== "" && !Number.isNaN(Number(tempRaw)) ? Number(tempRaw) : null;
      if (temperature != null) allTemps.push(temperature);
      const mill = coalMills.length ? coalMills[i % coalMills.length] : null;
      return {
        id: `L${rowIdx}-${cornerLabel.replace(/\s+/g, "")}`,
        layerIndex: rowIdx,
        corner: cornerLabel,
        angleDeg,
        position: { x, y, z: normalizedZ },
        tiltDeg,
        temperature,
        status: temperature == null ? BURNER_STATUS.INACTIVE : BURNER_STATUS.ACTIVE,
        mill: mill ? { id: mill.mill, coalFlowTph: mill.coal_flow_tph ?? null, paFlowTph: mill.pa_flow_tph ?? null } : null,
      };
    });
    const layerTemps = burners.map((b) => b.temperature).filter((v) => v != null);
    const avg = layerTemps.length ? layerTemps.reduce((a, b) => a + b, 0) / layerTemps.length : null;

    /* ------------------------------------------------------------------
     * Derive the 4 tile-corner temperatures from burner data.
     * Burners are arranged around the furnace perimeter at specific angles
     * (see CORNER_ANGLES_DEG).  The four diagonal angles (45°, 135°, 225°,
     * 315°) land closest to the four corners of the rectangular elevation
     * tile.  We find the closest burner for each tile corner so that the
     * per-corner colours and the gradient surface between them have real
     * temperature data to work with.
     * ------------------------------------------------------------------ */
    const TARGET_ANGLE_BY_TILE_CORNER = {
      c1: 135, // front-left (z+)
      c2: 225, // back-left (z-)
      c3: 315, // back-right (z-)
      c4: 45,  // front-right (z+)
    };
    const tileCornerTemps = { c1: null, c2: null, c3: null, c4: null };
    for (const [cornerKey, targetAngle] of Object.entries(TARGET_ANGLE_BY_TILE_CORNER)) {
      let closestBurner = null;
      let minDist = Infinity;
      for (const burner of burners) {
        const diff = Math.abs(burner.angleDeg - targetAngle);
        const dist = Math.min(diff, 360 - diff);
        if (dist < minDist) {
          minDist = dist;
          closestBurner = burner;
        }
      }
      tileCornerTemps[cornerKey] = closestBurner ? closestBurner.temperature : null;
    }

    return {
      id: `layer-${rowIdx}`,
      index: rowIdx,
      elevationM,
      label,
      z: normalizedZ,
      tiltDeg,
      burners,
      temperature: {
        min: layerTemps.length ? Math.min(...layerTemps) : null,
        max: layerTemps.length ? Math.max(...layerTemps) : null,
        avg,
        c1: tileCornerTemps.c1,
        c2: tileCornerTemps.c2,
        c3: tileCornerTemps.c3,
        c4: tileCornerTemps.c4,
      },
    };
  });
  return {
    dimensions,
    cornerKeys,
    layers,
    stats: {
      min: allTemps.length ? Math.min(...allTemps) : null,
      max: allTemps.length ? Math.max(...allTemps) : null,
      avg: allTemps.length ? allTemps.reduce((a, b) => a + b, 0) / allTemps.length : null,
    },
  };
}

export function buildDemoFurnaceModel() {
  const demoDataset = {
    elevation: [56.4, 62.8, 69.2, 75.6],
    elevation_labels: ["56.4", "62.8", "69.2", "75.6"],
    burner_tilt_deg: [-8, 0, 6, 14],
    c1: [1180, 1240, 1310, 1265],
    c2: [1205, 1260, 1355, 1290],
    c3: [1160, 1220, 1295, 1240],
    c4: [1190, 1250, 1320, 1270],
    c5: [1175, 1235, 1305, 1255],
    c6: [1210, 1265, 1360, 1300],
    c7: [1165, 1225, 1290, 1245],
    c8: [1195, 1245, 1315, 1260],
  };
  const demoMills = ["A", "B", "C", "D", "E", "F", "G", "H"].map((m, i) => ({
    mill: m,
    coal_flow_tph: 12 + ((i * 7) % 5),
    pa_flow_tph: 20 + ((i * 3) % 6),
  }));
  const model = buildFurnaceModel(demoDataset, demoMills);
  // Add demo boiler params with coil temperature data
  model.boilerParams = {
    fg_temp_after_dpsh_l: 680.0,
    fg_temp_after_dpsh_r: 653.0,
    fg_temp_after_psh_l: null,
    fg_temp_after_psh_r: 616.0,
    fg_temp_after_rh_l: 617.0,
    fg_temp_after_rh_r: 547.0,
    fg_temp_after_hsh_l: 595.0,
    fg_temp_after_hsh_r: 561.0,
  };
  return model;
}
