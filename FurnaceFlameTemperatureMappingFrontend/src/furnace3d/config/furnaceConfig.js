/**
 * Furnace 3D Configuration
 * 
 * Central configuration file for the furnace flame temperature mapping system.
 * Contains dimensional data, operational parameters, combustion modeling constants,
 * and simulation scenario definitions.
 */

// ============================================================================
// FURNACE DIMENSIONS
// ============================================================================

export const DEFAULT_FURNACE_DIMENSIONS = {
  width: 12,   // meters
  depth: 12,   // meters  
  height: 42   // meters
};

export const CORNER_ANGLES_DEG = {
  "Corner 1": 45,
  "Corner 2": 90,
  "Corner 3": 135,
  "Corner 4": 180,
  "Corner 5": 225,
  "Corner 6": 270,
  "Corner 7": 315,
  "Corner 8": 0
};

// ============================================================================
// TEMPERATURE THRESHOLDS
// ============================================================================

/**
 * Default temperature thresholds for alerts and warnings.
 * These can be overridden by user configuration (feature 15).
 */
export const DEFAULT_TEMPERATURE_ALERT_C = 1350; // Critical alert threshold
export const DEFAULT_TEMPERATURE_WARN_C = 1300;  // Warning threshold

// ============================================================================
// BURNER STATUS DEFINITIONS
// ============================================================================

export const BURNER_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE", 
  WARNING: "WARNING",
  FAULT: "FAULT",
  SIMULATED: "SIMULATED"
};

export const BURNER_STATUS_COLOR = {
  [BURNER_STATUS.ACTIVE]: "#22c55e",     // Green
  [BURNER_STATUS.INACTIVE]: "#6b7280",   // Gray
  [BURNER_STATUS.WARNING]: "#f59e0b",     // Amber
  [BURNER_STATUS.FAULT]: "#ef4444",       // Red
  [BURNER_STATUS.SIMULATED]: "#7c3aed"    // Purple
};

// ============================================================================
// DATA MODES
// ============================================================================

export const DATA_MODES = {
  REAL_RUN: "REAL_RUN",       // Live operational data
  SIMULATION: "SIMULATION"    // Simulated data for testing
};

// ============================================================================
// COMBUSTION MODELING PARAMETERS
// ============================================================================

/**
 * Default parameters for advanced combustion modeling.
 * These values represent typical industrial boiler/furnace conditions.
 */
export const COMBUSTION_DEFAULTS = {
  // Air-fuel ratio parameters
  stoichiometricRatio: 1.2,           // Ideal air-to-fuel ratio
  excessAirPercentage: 20,           // Excess air for complete combustion (%)
  
  // Efficiency parameters
  combustionEfficiency: 0.92,        // Typical boiler efficiency (0-1)
  mixingEfficiency: 0.85,            // Fuel-air mixing efficiency (0-1)
  
  // Temperature parameters
  flameTemperatureAdiabatic: 1800,   // Adiabatic flame temperature (°C)
  heatReleaseRate: 25000,             // Heat release rate (kJ/kg coal)
  
  // Flow dynamics
  turbulenceIntensity: 0.15,          // Turbulence intensity (0-1)
  residenceTime: 2.5,                 // Residence time in combustion zone (seconds)
  
  // Emission factors
  noxEmissionFactor: 0.8,             // NOx emission factor
  coEmissionFactor: 0.3               // CO emission factor
};

// ============================================================================
// SIMULATION SCENARIOS
// ============================================================================

/**
 * Predefined simulation scenarios for testing and analysis.
 * Each scenario includes a build function that generates burner-specific overrides.
 */
export const SIMULATION_SCENARIOS = [
  {
    id: "normal",
    label: "Normal Operation",
    description: "Standard operating conditions with no modifications.",
    overrides: {}
  },
  {
    id: "burner_imbalance",
    label: "Burner Imbalance",
    description: "One corner running hot, another running cold to test thermal imbalance detection.",
    build: (burners) => {
      if (burners.length < 3) return {};
      
      const hotBurner = burners[0].id;
      const coldBurner = burners[Math.floor(burners.length / 2)].id;
      
      return {
        [hotBurner]: { 
          coalFlowMultiplier: 1.35, 
          airFlowMultiplier: 1.15 
        },
        [coldBurner]: { 
          coalFlowMultiplier: 0.6, 
          airFlowMultiplier: 0.85 
        }
      };
    }
  },
  {
    id: "reduced_flow",
    label: "Reduced Coal Flow",
    description: "All burners operating at 70% of normal coal flow.",
    build: (burners) => Object.fromEntries(
      burners.map((burner) => [burner.id, { coalFlowMultiplier: 0.7 }])
    )
  },
  {
    id: "increased_flow",
    label: "Increased Coal Flow", 
    description: "All burners operating at 125% of normal coal flow.",
    build: (burners) => Object.fromEntries(
      burners.map((burner) => [burner.id, { coalFlowMultiplier: 1.25 }])
    )
  },
  {
    id: "optimal_combustion",
    label: "Optimal Combustion",
    description: "Optimized air-fuel ratio settings for maximum combustion efficiency.",
    build: (burners) => Object.fromEntries(
      burners.map((burner) => [
        burner.id, 
        { 
          coalFlowMultiplier: 1.0, 
          airFlowMultiplier: 1.1,
          stoichiometricRatio: 1.15,
          combustionEfficiency: 0.95
        }
      ])
    )
  },
  {
    id: "high_excess_air",
    label: "High Excess Air",
    description: "Increased excess air (35%) reduces temperature but improves mixing and combustion completeness.",
    build: (burners) => Object.fromEntries(
      burners.map((burner) => [
        burner.id,
        { 
          airFlowMultiplier: 1.4,
          excessAirPercentage: 35,
          mixingEfficiency: 0.92
        }
      ])
    )
  },
  {
    id: "low_nox_mode",
    label: "Low NOx Mode",
    description: "Staged combustion configuration to minimize NOx emissions while maintaining efficiency.",
    build: (burners) => Object.fromEntries(
      burners.map((burner) => [
        burner.id,
        { 
          coalFlowMultiplier: 0.95,
          airFlowMultiplier: 1.2,
          noxEmissionFactor: 0.4,
          turbulenceIntensity: 0.25
        }
      ])
    )
  },
  {
    id: "custom",
    label: "Custom Configuration",
    description: "User-defined custom scenario with manual parameter overrides.",
    overrides: null
  }
];