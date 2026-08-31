// src/furnace3d/utils/optimizationSuggester.js
export function generateSuggestion(model) {
  const allTemps = model.layers.flatMap(l => l.burners.map(b => b.temperature).filter(t => t != null));
  if (allTemps.length === 0) return "No temperature data available.";

  const avg = allTemps.reduce((a, b) => a + b, 0) / allTemps.length;
  const max = Math.max(...allTemps);
  const min = Math.min(...allTemps);

  if (max - min > 100) {
    return `Detected thermal imbalance: max ${max.toFixed(0)}°C, min ${min.toFixed(0)}°C (Δ${(max-min).toFixed(0)}°C). Consider adjusting coal flow to burners at corners ${getHotCorner(model)} to reduce spread.`;
  } else {
    return `Thermal distribution is balanced (Δ${(max-min).toFixed(0)}°C). Current average temperature is ${avg.toFixed(0)}°C.`;
  }
}

function getHotCorner(model) {
  let hottest = null;
  let maxTemp = -Infinity;
  model.layers.forEach(l => {
    l.burners.forEach(b => {
      if (b.temperature > maxTemp) {
        maxTemp = b.temperature;
        hottest = b.corner;
      }
    });
  });
  return hottest || "unknown";
}