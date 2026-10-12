/**
 * Shared Panel Styles
 *
 * Centralised design-tokens and style definitions for all furnace
 * control-panel components.  Every panel (Inspection, LayerControls,
 * Legend, etc.) imports from this file so that the industrial
 * glass-morphism aesthetic stays consistent across the dashboard.
 *
 * Design principles:
 * - Dark industrial colour palette with blue primary / purple accent
 * - Glass-morphism surfaces (backdrop-filter blur + translucent borders)
 * - Subtle gradient backgrounds for depth
 * - Sharp typography with Inter body / DM Mono numeric
 * - Micro-interactions (transitions, hover states, glow)
 */

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const COLORS = {
  // Primary — electric blue (data / interactive)
  blue: "#3b82f6",
  blueDark: "#1e40af",
  blueDarkest: "#1a4f9c",
  blueLight: "#60a5fa",
  blueTranslucent: "rgba(59, 130, 246, 0.15)",
  blueBorder: "rgba(59, 130, 246, 0.25)",
  blueBorderHover: "rgba(59, 130, 246, 0.4)",
  blueGlow: "rgba(37, 99, 235, 0.3)",
  blueGlowStrong: "rgba(37, 99, 235, 0.5)",

  // Secondary — violet (simulation / overrides)
  purple: "#8b5cf6",
  purpleDark: "#6b46c1",
  purpleTranslucent: "rgba(139, 92, 246, 0.15)",
  purpleBorder: "rgba(139, 92, 247, 0.3)",
  purpleGlow: "rgba(139, 92, 247, 0.4)",

  // Semantic — temperature & status
  green: "#22c55e",
  greenLight: "#4ade80",
  greenTranslucent: "rgba(34, 197, 94, 0.15)",
  greenBorder: "rgba(74, 222, 128, 0.4)",
  amber: "#f59e0b",
  amberTranslucent: "rgba(245, 158, 11, 0.15)",
  red: "#ef4444",
  redLight: "#f87171",
  redTranslucent: "rgba(220, 38, 38, 0.15)",
  redBorder: "rgba(248, 113, 113, 0.35)",

  // Neutral — text & surfaces
  textPrimary: "#e2e8f0",
  textSecondary: "rgba(200, 220, 255, 0.7)",
  textTertiary: "rgba(200, 220, 255, 0.5)",
  textMuted: "rgba(180, 210, 255, 0.55)",
  textDim: "rgba(180, 210, 255, 0.45)",

  bgPanel: "rgba(15, 23, 45, 0.5)",
  bgPanelAlt: "rgba(30, 41, 59, 0.6)",
  bgGlass: "rgba(255, 255, 255, 0.02)",
  bgGlassHover: "rgba(255, 255, 255, 0.05)",
  bgGlassStrong: "rgba(255, 255, 255, 0.06)",

  borderDefault: "rgba(59, 130, 246, 0.12)",
  borderGlass: "rgba(255, 255, 255, 0.06)",
  borderGlassHover: "rgba(255, 255, 255, 0.1)",
  borderSubtle: "rgba(255, 255, 255, 0.05)",

  shadowInner: "inset 0 1px 2px rgba(0, 0, 0, 0.3)",
  shadowPanel: "0 8px 32px rgba(0, 0, 0, 0.3)",
  shadowCard: "0 2px 8px rgba(0, 0, 0, 0.2)",
  shadowGlow: "0 0 12px rgba(59, 130, 246, 0.3)",
};

const FONTS = {
  body: "'Inter', sans-serif",
  mono: "'DM Mono', monospace",
};

const RADIUS = {
  sm: "4px",
  md: "6px",
  lg: "8px",
  xl: "10px",
  xl2: "12px",
  full: "20px",
  pill: "12px",
};

const TRANSITIONS = {
  fast: "all 0.15s ease",
  base: "all 0.2s ease",
  slow: "all 0.25s ease",
};

// ============================================================================
// PANEL CONTAINER & LABELS
// ============================================================================

export const panelStyles = {
  // ── Section Container ──
  section: {
    padding: "18px 16px",
    borderBottom: "1px solid rgba(77,141,232,0.12)",
    background: "rgba(4,13,26,0.45)",
    backdropFilter: "blur(16px) saturate(180%)",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
  },

  // ── Section Label (header) ──
  sectionLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "16px",
    fontWeight: 800,
    letterSpacing: "0.22em",
    color: "rgba(180,210,255,0.7)",
    textTransform: "uppercase",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  // ── Helper Text ──
  helperText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "17px",
    color: "rgba(200,220,255,0.6)",
    lineHeight: 1.6,
    marginBottom: "10px",
    fontWeight: 400,
  },

  // ── Field Label (sub-section headers) ──
  fieldLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "16px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "rgba(180,210,255,0.55)",
    margin: "10px 0 6px",
  },

  // ── Slider Value (inline label) ──
  sliderValue: {
    textAlign: "right",
    fontFamily: "'Inter', sans-serif",
    fontSize: "17px",
    color: "rgba(200,220,255,0.7)",
  },

  // ── Checkbox Row ──
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "10px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "17px",
    color: "rgba(200,220,255,0.75)",
  },

  // ── Mini Burner Row ──
  miniBurnerRow: {
    display: "flex",
    justifyContent: "space-between",
    fontFamily: "'Inter', sans-serif",
    fontSize: "17px",
    color: "rgba(200,220,255,0.7)",
    padding: "3px 0",
  },

  // ============================================================================
  // BUTTONS
  // ============================================================================

  // ── Small Button (default / toggle-style) ──
  smallBtn: {
    border: "1px solid rgba(59, 130, 246, 0.25)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "rgba(200, 220, 255, 0.85)",
    fontFamily: "'Inter', sans-serif",
    fontSize: "16px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "7px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    backdropFilter: "blur(4px)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
  },
  smallBtnActive: {
    background: "rgba(37, 99, 198, 0.35)",
    borderColor: "rgba(99, 179, 255, 0.7)",
    color: "#ffffff",
    boxShadow: "0 0 20px rgba(37, 99, 198, 0.3)",
  },

  // ── Primary Button ──
  primaryBtn: {
    border: "none",
    background: "linear-gradient(135deg, #1a4f9c 0%, #2563c6 100%)",
    color: "#ffffff",
    fontFamily: "'Inter', sans-serif",
    fontSize: "17px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(37, 99, 235, 0.3)",
    transition: "all 0.2s ease",
    textTransform: "uppercase",
  },
  primaryBtnHover: {
    boxShadow: "0 6px 20px rgba(37, 99, 235, 0.45)",
    transform: "translateY(-1px)",
  },

  // ── Secondary Button ──
  secondaryBtn: {
    border: "1px solid rgba(59, 130, 246, 0.3)",
    background: "transparent",
    color: "rgba(200, 220, 255, 0.8)",
    fontFamily: "'Inter', sans-serif",
    fontSize: "17px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textTransform: "uppercase",
  },
  secondaryBtnHover: {
    background: "rgba(59, 130, 246, 0.08)",
    borderColor: "rgba(59, 130, 246, 0.5)",
    color: "#e2e8f0",
  },

  // ── Reset / Danger Button ──
  resetBtn: {
    width: "100%",
    border: "1px solid rgba(248, 113, 113, 0.35)",
    background: "rgba(220, 38, 38, 0.15)",
    color: "#ffffff",
    fontFamily: "'Inter', sans-serif",
    fontSize: "17px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "10px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    backdropFilter: "blur(4px)",
    textTransform: "uppercase",
  },
  resetBtnHover: {
    background: "rgba(220, 38, 38, 0.25)",
    boxShadow: "0 0 14px rgba(220, 38, 38, 0.3)",
    transform: "translateY(-1px)",
  },

  // ── Mode Button (segmented control) ──
  modeBtn: {
    flex: 1,
    border: "1px solid rgba(59, 130, 246, 0.25)",
    background: "rgba(255, 255, 255, 0.03)",
    color: "rgba(200, 220, 255, 0.65)",
    fontFamily: "'Inter', sans-serif",
    fontSize: "17px",
    fontWeight: 800,
    letterSpacing: "0.06em",
    padding: "9px 8px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textTransform: "uppercase",
  },
  modeBtnActive: {
    background: "linear-gradient(135deg, #1a4f9c 0%, #2563c6 100%)",
    borderColor: "rgba(99, 179, 255, 0.8)",
    color: "#ffffff",
    boxShadow: "0 0 20px rgba(37, 99, 235, 0.3)",
  },
  modeBtnHover: {
    background: "rgba(59, 130, 246, 0.08)",
    color: "rgba(200, 220, 255, 0.85)",
  },

  // ============================================================================
  // LAYER ROWS (used by LayerControls / legacy components)
  // ============================================================================

  layerRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid rgba(59, 130, 246, 0.12)",
    background: "rgba(255, 255, 255, 0.02)",
    cursor: "pointer",
    marginBottom: "4px",
    transition: "all 0.15s ease",
  },
  layerRowActive: {
    background: "rgba(37, 99, 198, 0.18)",
    borderColor: "rgba(99, 179, 255, 0.5)",
    boxShadow: "0 0 15px rgba(37, 99, 198, 0.15)",
  },
  layerRowHover: {
    background: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  layerLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "18px",
    fontWeight: 700,
    color: "#ffffff",
  },
  layerSub: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "16px",
    color: "rgba(200, 220, 255, 0.5)",
  },
  isolateBtn: {
    border: "1px solid rgba(59, 130, 246, 0.3)",
    background: "transparent",
    color: "rgba(200, 220, 255, 0.7)",
    fontSize: "15px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    padding: "4px 7px",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },

  // ============================================================================
  // INSPECTION PANEL (used by legacy inspection components)
  // ============================================================================

  inspectorTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "19px",
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "0.04em",
    marginBottom: "10px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
    borderBottom: "1px solid rgba(59, 130, 246, 0.08)",
    fontFamily: "'Inter', sans-serif",
    fontSize: "18px",
  },
  rowLabel: {
    color: "rgba(180, 210, 255, 0.55)",
    letterSpacing: "0.06em",
    fontSize: "16px",
    fontWeight: 700,
  },
  rowValue: {
    color: "#ffffff",
    fontWeight: 700,
    fontFamily: "'DM Mono', monospace",
    fontSize: "18px",
  },
  simBadge: {
    display: "inline-block",
    marginTop: "8px",
    padding: "3px 8px",
    borderRadius: "5px",
    background: "rgba(124, 58, 237, 0.2)",
    border: "1px solid rgba(167, 139, 250, 0.5)",
    color: "#ddd6fe",
    fontFamily: "'Inter', sans-serif",
    fontSize: "16px",
    fontWeight: 700,
    letterSpacing: "0.06em",
  },

  // ============================================================================
  // LEGEND BAR (footer / status bar)
  // ============================================================================

  legendBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "20px",
    padding: "12px 20px",
    borderTop: "1px solid rgba(59, 130, 246, 0.15)",
    background: "rgba(4, 13, 26, 0.65)",
    backdropFilter: "blur(16px) saturate(180%)",
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.25)",
  },

  // ── Legend Group (vertical stack within the bar) ──
  legendGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    alignItems: "flex-start",
  },

  // ── Legend Caption ──
  legendCaption: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "15px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "rgba(180, 210, 255, 0.5)",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },

  // ── Legend Gradient Bar ──
  legendGradient: {
    width: "110px",
    height: "8px",
    borderRadius: "4px",
    boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    transition: "box-shadow 0.2s ease",
  },
  legendGradientHover: {
    boxShadow: "0 0 8px rgba(59, 130, 246, 0.4)",
  },

  // ── Legend Min/Max Labels ──
  legendMinMax: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "16px",
    color: "rgba(200, 220, 255, 0.55)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  // ── Legend Chip (status indicator) ──
  legendChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "16px",
    fontWeight: 600,
    color: "rgba(200, 220, 255, 0.65)",
    letterSpacing: "0.04em",
    padding: "3px 8px",
    borderRadius: "5px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    background: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(4px)",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
  },
  legendDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    boxShadow: "0 0 5px currentColor",
  },

  // ── Legend Mode Badge ──
  legendModeBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "16px",
    fontWeight: 800,
    letterSpacing: "0.1em",
    padding: "5px 14px",
    borderRadius: "20px",
    border: "1px solid",
    backdropFilter: "blur(6px)",
    textTransform: "uppercase",
    transition: "all 0.2s ease",
  },

  // ── Legend Separator (optional vertical divider) ──
  legendSeparator: {
    width: "1px",
    height: "20px",
    background: "rgba(59, 130, 246, 0.2)",
  },

  // ── Legend Selected Item ──
  legendSelected: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "17px",
    fontWeight: 700,
    color: "rgba(200, 220, 255, 0.7)",
    letterSpacing: "0.06em",
    padding: "3px 10px",
    borderRadius: "6px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },

  // ============================================================================
  // NEW — Shared helpers for beautified components
  // ===========================================================================

  // Icon wrapper for section labels
  sectionLabelIcon: {
    display: "flex",
    alignItems: "center",
    opacity: 0.6,
  },

  // Glass-morphism content card (used inside sections)
  contentCard: {
    background: "rgba(30, 41, 59, 0.5)",
    borderRadius: "12px",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    backdropFilter: "blur(16px) saturate(180%)",
    overflow: "visible",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
  },

  // Generic status dot (for inline indicators)
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    boxShadow: "0 0 5px currentColor",
  },
};

// ============================================================================
// THEME CONSTANTS — export for consumers that need semantic colours
// ============================================================================

export const THEME_COLORS = COLORS;
export const THEME_FONTS = FONTS;
export const THEME_RADIUS = RADIUS;
export const THEME_TRANSITIONS = TRANSITIONS;
