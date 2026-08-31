// src/furnace3d/utils/exportSimulation.js
export function exportSimulationCSV(overrides) {
  const rows = [["Burner", "Coal Multiplier", "Air Multiplier", "Disabled"]];
  Object.entries(overrides).forEach(([id, patch]) => {
    rows.push([id, patch.coalFlowMultiplier || 1, patch.airFlowMultiplier || 1, patch.disabled ? "Yes" : "No"]);
  });
  const csv = rows.map(row => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "simulation_scenario.csv";
  a.click();
}

/**
 * Export current furnace state and simulation data to JSON
 */
export function exportFurnaceJSON(model, state, simulationOverrides, combustionParams, aiAnalysis) {
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      version: "1.0",
      application: "AbhiFTM 3D Visualization",
    },
    furnace: {
      dimensions: model?.dimensions || {},
      layers: model?.layers?.map(layer => ({
        id: layer.id,
        index: layer.index,
        elevation: layer.elevationM,
        label: layer.label,
        position: { z: layer.z },
        temperature: layer.temperature,
        tilt: layer.tiltDeg,
        burnerCount: layer.burners?.length || 0,
      })) || [],
    },
    burners: model?.layers?.flatMap(layer => 
      layer.burners?.map(burner => ({
        id: burner.id,
        layer: layer.id,
        corner: burner.corner,
        position: burner.position,
        angle: burner.angleDeg,
        tilt: burner.tiltDeg,
        temperature: burner.temperature,
        status: burner.status,
        mill: burner.mill,
      })) || []
    ) || [],
    simulation: {
      mode: state.mode,
      activeScenario: state.activeScenarioId,
      overrides: simulationOverrides || {},
      combustionParams: combustionParams || {},
      enableAdvancedCombustion: state.enableAdvancedCombustion,
    },
    viewState: {
      sectionalView: state.sectionalView,
      layerVisibility: state.layerVisibility,
      layerOpacity: state.layerOpacity,
      multiClipEnabled: state.multiClipEnabled,
      clipPlanes: state.clipPlanes,
      explodedView: state.explodedView,
      explosionFactor: state.explosionFactor,
    },
    thresholds: {
      alert: state.thresholds.alert,
      warn: state.thresholds.warn,
    },
    aiAnalysis: aiAnalysis ? {
      timestamp: aiAnalysis.timestamp,
      overallHealthScore: aiAnalysis.overallHealthScore,
      failurePredictions: aiAnalysis.failurePredictions,
      temperaturePredictions: aiAnalysis.temperaturePredictions,
      optimizationRecommendations: aiAnalysis.optimizationRecommendations,
      anomalies: aiAnalysis.anomalies,
    } : null,
    statistics: {
      totalBurners: model?.layers?.reduce((sum, layer) => sum + (layer.burners?.length || 0), 0) || 0,
      temperatureStats: model?.stats || {},
    },
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `furnace_export_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export simulation scenario as JSON
 */
export function exportScenarioJSON(scenarioId, scenarioName, overrides, combustionParams) {
  const scenarioData = {
    metadata: {
      exportDate: new Date().toISOString(),
      version: "1.0",
      type: "Simulation Scenario",
    },
    scenario: {
      id: scenarioId,
      name: scenarioName,
      overrides: overrides || {},
      combustionParams: combustionParams || {},
    },
  };

  const jsonContent = JSON.stringify(scenarioData, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `scenario_${scenarioId}_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Import simulation scenario from JSON
 */
export function importScenarioJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.scenario && data.scenario.overrides) {
          resolve(data.scenario);
        } else {
          reject(new Error("Invalid scenario file format"));
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Export temperature data as JSON
 */
export function exportTemperatureJSON(model) {
  const temperatureData = {
    metadata: {
      exportDate: new Date().toISOString(),
      version: "1.0",
      type: "Temperature Data",
    },
    temperatures: model?.layers?.map(layer => ({
      layer: layer.id,
      elevation: layer.elevationM,
      label: layer.label,
      min: layer.temperature.min,
      max: layer.temperature.max,
      avg: layer.temperature.avg,
      burners: layer.burners?.map(burner => ({
        id: burner.id,
        corner: burner.corner,
        temperature: burner.temperature,
      })) || [],
    })) || [],
    statistics: model?.stats || {},
  };

  const jsonContent = JSON.stringify(temperatureData, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `temperature_data_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}