// src/furnace3d/utils/temperatureScale.js
import { DEFAULT_TEMPERATURE_WARN_C, DEFAULT_TEMPERATURE_ALERT_C } from "../config/furnaceConfig";

export const TEMPERATURE_SCALE_STOPS = (alert = DEFAULT_TEMPERATURE_ALERT_C, warn = DEFAULT_TEMPERATURE_WARN_C) => [
  { t: 600, color: [37, 99, 235] },
  { t: 900, color: [6, 182, 212] },
  { t: 1100, color: [16, 185, 129] },
  { t: warn, color: [245, 158, 11] },
  { t: alert, color: [239, 68, 68] },
  { t: 1500, color: [190, 24, 93] },
];

function lerp(a, b, f) { return a + (b - a) * f; }
function rgbToHex([r, g, b]) { return `#${[r,g,b].map((v) => Math.round(v).toString(16).padStart(2,"0")).join("")}`; }

export function temperatureToColor(tempC, alert = DEFAULT_TEMPERATURE_ALERT_C, warn = DEFAULT_TEMPERATURE_WARN_C) {
  if (tempC == null || Number.isNaN(tempC)) return "#6b7280";
  const stops = TEMPERATURE_SCALE_STOPS(alert, warn);
  if (tempC <= stops[0].t) return rgbToHex(stops[0].color);
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i+1];
    if (tempC >= a.t && tempC <= b.t) {
      const f = (tempC - a.t) / (b.t - a.t);
      const c = [0,1,2].map((k) => lerp(a.color[k], b.color[k], f));
      return rgbToHex(c);
    }
  }
  return rgbToHex(stops[stops.length-1].color);
}

export function normalizeTemperature(tempC, alert = DEFAULT_TEMPERATURE_ALERT_C, warn = DEFAULT_TEMPERATURE_WARN_C) {
  const stops = TEMPERATURE_SCALE_STOPS(alert, warn);
  const min = stops[0].t, max = stops[stops.length-1].t;
  if (tempC == null) return 0;
  return Math.min(1, Math.max(0, (tempC - min) / (max - min)));
}

export function temperatureStatusLabel(tempC, alert = DEFAULT_TEMPERATURE_ALERT_C, warn = DEFAULT_TEMPERATURE_WARN_C) {
  if (tempC == null) return "NO DATA";
  if (tempC >= alert) return "CRITICAL";
  if (tempC >= warn) return "ELEVATED";
  return "NORMAL";
}