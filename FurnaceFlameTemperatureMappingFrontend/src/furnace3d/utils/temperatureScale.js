// src/furnace3d/utils/temperatureScale.js
import { DEFAULT_TEMPERATURE_WARN_C, DEFAULT_TEMPERATURE_ALERT_C } from "../config/furnaceConfig";

/** Smooth palette sampled from the supplied 350–1773 K contour legend.
 * Temperatures are stored in Celsius in the app, so the Kelvin stops are
 * converted to Celsius here while preserving the reference colors.
 */
export const DEFAULT_TEMPERATURE_SCALE_RANGE = { min: 77, max: 1500 };
const temperatureScaleRanges = new Map();

export function getTemperatureScaleRange(scaleKey = "default") {
  return temperatureScaleRanges.get(scaleKey) || DEFAULT_TEMPERATURE_SCALE_RANGE;
}

export function setTemperatureScaleRange(min, max, scaleKey = "default") {
  const low = Math.round(Number(min));
  const high = Math.round(Number(max));
  if (Number.isFinite(low) && Number.isFinite(high) && high > low) {
    temperatureScaleRanges.set(scaleKey, { min: low, max: high });
  }
}

export const TEMPERATURE_SCALE_STOPS = (min, max, scaleKey = "default") => {
  const range = getTemperatureScaleRange(scaleKey);
  min ??= range.min;
  max ??= range.max;
  const colors = [[20,72,235],[0,83,255],[0,177,235],[0,226,205],[0,230,91],[42,232,0],[211,239,0],[255,224,0],[255,104,0],[239,57,19]];
  return colors.map((color, index) => {
    const t = Math.round(min + (max - min) * index / (colors.length - 1));
    return { t, label: `${t}°C`, color };
  });
};

function lerp(a, b, f) { return a + (b - a) * f; }
function rgbToHex([r, g, b]) { return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`; }

export function temperatureToColor(tempC, _alert, _warn, scaleKey = "default") {
  if (tempC == null || Number.isNaN(tempC)) return "#6b7280";
  const stops = TEMPERATURE_SCALE_STOPS(undefined, undefined, scaleKey);
  if (tempC <= stops[0].t) return rgbToHex(stops[0].color);
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i], b = stops[i + 1];
    if (tempC >= a.t && tempC <= b.t) {
      const fraction = (tempC - a.t) / (b.t - a.t);
      return rgbToHex([0, 1, 2].map((channel) => lerp(a.color[channel], b.color[channel], fraction)));
    }
  }
  return rgbToHex(stops[stops.length - 1].color);
}

export function normalizeTemperature(tempC, scaleKey = "default") {
  const stops = TEMPERATURE_SCALE_STOPS(undefined, undefined, scaleKey);
  const min = stops[0].t, max = stops[stops.length - 1].t;
  if (tempC == null) return 0;
  return Math.min(1, Math.max(0, (tempC - min) / (max - min)));
}

export function temperatureStatusLabel(tempC, alert = DEFAULT_TEMPERATURE_ALERT_C, warn = DEFAULT_TEMPERATURE_WARN_C) {
  if (tempC == null) return "NO DATA";
  if (tempC >= alert) return "CRITICAL";
  if (tempC >= warn) return "ELEVATED";
  return "NORMAL";
}
