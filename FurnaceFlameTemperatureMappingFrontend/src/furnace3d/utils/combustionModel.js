// src/furnace3d/utils/combustionModel.js
import { COMBUSTION_DEFAULTS } from "../config/furnaceConfig";

/**
 * Advanced combustion modeling utility
 * Calculates realistic temperature distributions and flame characteristics
 * based on thermodynamic principles and combustion parameters
 */

export function calculateFlameTemperature(baseTemp, params = {}) {
  const {
    coalFlowMultiplier = 1.0,
    airFlowMultiplier = 1.0,
    stoichiometricRatio = COMBUSTION_DEFAULTS.stoichiometricRatio,
    combustionEfficiency = COMBUSTION_DEFAULTS.combustionEfficiency,
    excessAirPercentage = COMBUSTION_DEFAULTS.excessAirPercentage,
    heatReleaseRate = COMBUSTION_DEFAULTS.heatReleaseRate,
  } = params;

  // Calculate actual air-to-fuel ratio
  const actualAirFuelRatio = stoichiometricRatio * (1 + excessAirPercentage / 100);
  
  // Adjust for flow multipliers
  const adjustedCoalFlow = coalFlowMultiplier;
  const adjustedAirFlow = airFlowMultiplier;
  
  // Calculate heat release (simplified thermodynamic model)
  const heatRelease = adjustedCoalFlow * heatReleaseRate * combustionEfficiency;
  
  // Calculate temperature rise due to combustion
  const tempRise = (heatRelease / (adjustedAirFlow * 1.2)) * 0.5; // Simplified specific heat calculation
  
  // Apply efficiency losses
  const efficiencyFactor = combustionEfficiency * (1 - (excessAirPercentage / 200));
  
  // Calculate final flame temperature
  const flameTemp = baseTemp + (tempRise * efficiencyFactor * (coalFlowMultiplier > 0 ? 1 : 0));
  
  return Math.max(200, Math.min(2000, flameTemp)); // Clamp to reasonable range
}

export function calculateCombustionEfficiency(params = {}) {
  const {
    stoichiometricRatio = COMBUSTION_DEFAULTS.stoichiometricRatio,
    excessAirPercentage = COMBUSTION_DEFAULTS.excessAirPercentage,
    mixingEfficiency = COMBUSTION_DEFAULTS.mixingEfficiency,
    turbulenceIntensity = COMBUSTION_DEFAULTS.turbulenceIntensity,
  } = params;

  // Base efficiency from stoichiometric ratio (optimal around 1.1-1.2)
  const ratioEfficiency = 1 - Math.abs(stoichiometricRatio - 1.15) * 0.1;
  
  // Excess air reduces efficiency but improves completeness
  const excessAirFactor = 1 - (excessAirPercentage / 300);
  
  // Mixing efficiency contribution
  const mixingFactor = mixingEfficiency;
  
  // Turbulence improves mixing but too much causes heat loss
  const turbulenceFactor = 1 + turbulenceIntensity * 0.1 - Math.pow(turbulenceIntensity, 2) * 0.2;
  
  const totalEfficiency = ratioEfficiency * excessAirFactor * mixingFactor * turbulenceFactor;
  
  return Math.max(0.5, Math.min(0.98, totalEfficiency));
}

export function calculateEmissions(params = {}) {
  const {
    noxEmissionFactor = COMBUSTION_DEFAULTS.noxEmissionFactor,
    coEmissionFactor = COMBUSTION_DEFAULTS.coEmissionFactor,
    combustionEfficiency = COMBUSTION_DEFAULTS.combustionEfficiency,
    excessAirPercentage = COMBUSTION_DEFAULTS.excessAirPercentage,
    coalFlowMultiplier = 1.0,
  } = params;

  // NOx increases with temperature and decreases with excess air
  const noxEmission = noxEmissionFactor * coalFlowMultiplier * (1 - excessAirPercentage / 50) * (2 - combustionEfficiency);
  
  // CO decreases with excess air and combustion efficiency
  const coEmission = coEmissionFactor * coalFlowMultiplier * (1 - combustionEfficiency) * (1 - excessAirPercentage / 40);
  
  return {
    nox: Math.max(0, noxEmission),
    co: Math.max(0, coEmission),
    efficiency: combustionEfficiency,
  };
}

export function calculateFlameCharacteristics(params = {}) {
  const {
    coalFlowMultiplier = 1.0,
    airFlowMultiplier = 1.0,
    turbulenceIntensity = COMBUSTION_DEFAULTS.turbulenceIntensity,
    residenceTime = COMBUSTION_DEFAULTS.residenceTime,
  } = params;

  // Flame length increases with fuel flow and decreases with air flow
  const flameLength = 1.6 * coalFlowMultiplier / Math.sqrt(airFlowMultiplier);
  
  // Flame width related to turbulence
  const flameWidth = 0.35 * (1 + turbulenceIntensity);
  
  // Flame intensity (brightness and heat)
  const flameIntensity = (coalFlowMultiplier * airFlowMultiplier) * (1 + turbulenceIntensity * 0.5);
  
  // Flicker frequency increases with turbulence
  const flickerFrequency = 3 + turbulenceIntensity * 5;
  
  // Particle count for visualization
  const particleCount = Math.floor(15 * coalFlowMultiplier * (1 + turbulenceIntensity * 2));
  
  return {
    length: flameLength,
    width: flameWidth,
    intensity: flameIntensity,
    flickerFrequency,
    particleCount,
  };
}

export function applyCombustionModelToBurner(burner, overrides = {}) {
  const params = {
    ...COMBUSTION_DEFAULTS,
    ...overrides,
  };

  // Calculate enhanced temperature based on combustion model
  const enhancedTemp = calculateFlameTemperature(burner.temperature || 1200, params);
  
  // Calculate combustion efficiency
  const efficiency = calculateCombustionEfficiency(params);
  
  // Calculate emissions
  const emissions = calculateEmissions(params);
  
  // Calculate flame characteristics for visualization
  const flameChars = calculateFlameCharacteristics(params);
  
  return {
    ...burner,
    temperature: enhancedTemp,
    combustionEfficiency: efficiency,
    emissions,
    flameCharacteristics: flameChars,
    combustionParams: params,
  };
}

export function optimizeCombustionForTarget(targetTemp, currentParams = {}) {
  const params = { ...COMBUSTION_DEFAULTS, ...currentParams };
  
  // Simple optimization: adjust coal flow to reach target temperature
  const currentTemp = calculateFlameTemperature(1200, params);
  const tempRatio = targetTemp / currentTemp;
  
  // Adjust coal flow (with limits)
  const newCoalFlow = Math.max(0.3, Math.min(1.6, params.coalFlowMultiplier * tempRatio));
  
  // Adjust air flow to maintain optimal ratio
  const newAirFlow = newCoalFlow * (params.airFlowMultiplier / params.coalFlowMultiplier);
  
  return {
    ...params,
    coalFlowMultiplier: newCoalFlow,
    airFlowMultiplier: newAirFlow,
  };
}

export function getCombustionHealthScore(params = {}) {
  const efficiency = calculateCombustionEfficiency(params);
  const emissions = calculateEmissions(params);
  
  // Health score based on efficiency and emissions
  const efficiencyScore = efficiency * 100;
  const emissionsScore = 100 - (emissions.nox * 30 + emissions.co * 20);
  
  const overallScore = (efficiencyScore * 0.6 + emissionsScore * 0.4);
  
  return {
    overall: Math.max(0, Math.min(100, overallScore)),
    efficiency: efficiencyScore,
    emissions: emissionsScore,
    status: overallScore > 80 ? "EXCELLENT" : overallScore > 60 ? "GOOD" : overallScore > 40 ? "FAIR" : "POOR",
  };
}