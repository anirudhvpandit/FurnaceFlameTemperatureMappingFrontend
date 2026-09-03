/**
 * Playback Controls Panel Component
 *
 * Provides timeline navigation and playback control for historical
 * furnace run data.
 *
 * Features:
 * - Skip back / skip forward buttons
 * - Prominent play / pause toggle with state-aware styling
 * - Timeline slider with gradient fill, tick marks, and value bubble
 * - Run counter badge showing current vs total
 *
 * Design language: dark industrial dashboard with glass-morphism
 * controls, SVG line icons, gradient accents, and micro-interactions.
 */

import { useEffect } from "react";
import { useFurnaceStore } from "../state/FurnaceStore";
import { panelStyles as S } from "./panelStyles";

// ============================================================================
// SVG ICONS — minimal line icons for playback controls
// ============================================================================

const IconSkipBack = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 7V17" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 7V17" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.5 12L5 8V16L9.5 12Z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconSkipForward = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 7V17" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 7V17" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14.5 12L19 8V16L14.5 12Z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPlay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 4V20L18 12L6 4Z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPause = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 5V19" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 5V19" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PlaybackControls() {
  const { state, setCurrentRunIndex, nextRun, prevRun, setPlaybackState } = useFurnaceStore();
  const { historicalRuns, currentRunIndex, isPlaying } = state;

  const total = historicalRuns.length;
  const current = currentRunIndex;
  const progress = total > 1 ? (current / (total - 1)) * 100 : 0;
  const displayIndex = current + 1;

  // Inject global CSS for custom range slider thumb
  useEffect(() => {
    if (typeof document === "undefined") return;

    const styleEl = document.createElement("style");
    styleEl.textContent =`
      .playback-slider::-webkit-slider-thumb {
        appearance: none;
        width: 14px;
        height: 14px;
        background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
        border: 2px solid rgba(59, 130, 246, 0.4);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        margin-top: -5px;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .playback-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 14px rgba(59, 130, 246, 0.7);
      }
      .playback-slider::-webkit-slider-runnable-track {
        width: 100%;
        height: 6px;
        background: transparent;
        border-radius: 3px;
      }
      .playback-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
        border: 2px solid rgba(59, 130, 246, 0.4);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        border: none;
      }
      .playback-slider::-moz-range-track {
        width: 100%;
        height: 6px;
        background: transparent;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      if (document.head.contains(styleEl)) document.head.removeChild(styleEl);
    };
  }, []);

  if (historicalRuns.length === 0) return null;

  return (
    <div style={S.section}>
      <div style={S.sectionLabel}>PLAYBACK</div>

      <div style={styles.controlsRow}>
        {/* ── Skip Back ── */}
        <button
          style={styles.controlBtn}
          onClick={prevRun}
          title="Previous run"
        >
          <IconSkipBack />
        </button>

        {/* ── Play / Pause ── */}
        <button
          style={{
            ...styles.playPauseBtn,
            ...(isPlaying ? styles.playPausePlaying : styles.playPausePaused),
          }}
          onClick={() => setPlaybackState(!isPlaying)}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <IconPause /> : <IconPlay />}
        </button>

        {/* ── Skip Forward ── */}
        <button
          style={styles.controlBtn}
          onClick={nextRun}
          title="Next run"
        >
          <IconSkipForward />
        </button>

        {/* ── Timeline Slider ── */}
        <div style={styles.sliderContainer}>
          <div style={styles.sliderWrapper}>
            {/* Tick marks */}
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.sliderTick,
                  left: `${(i / Math.max(1, total - 1)) * 100}%`,
                }}
              />
            ))}

            {/* Progress fill */}
            <div style={{ ...styles.sliderFill, width: `${progress}%` }} />

            {/* Track background */}
            <div style={styles.sliderTrackBg} />

            {/* Value bubble */}
            <div style={{ ...styles.sliderBubble, left: `${progress}%` }}>
              {displayIndex}
            </div>

            {/* Range input */}
            <input
              type="range"
              min={0}
              max={total - 1}
              step={1}
              value={current}
              onChange={(e) => setCurrentRunIndex(Number(e.target.value))}
              className="playback-slider"
              style={styles.sliderInput}
            />
          </div>
        </div>

        {/* ── Counter Badge ── */}
        <div style={styles.counterBadge}>
          <span style={styles.counterNumber}>{displayIndex}</span>
          <span style={styles.counterDivider} />
          <span style={styles.counterTotal}>{total}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  // ── Controls Row ──
  controlsRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  // ── Control Button (skip back / skip forward) ──
  controlBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "rgba(200, 220, 255, 0.85)",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    backdropFilter: "blur(4px)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
    flexShrink: 0,
  },

  // ── Play / Pause Button ──
  playPauseBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.25s ease",
    color: "#ffffff",
    flexShrink: 0,
  },
  playPausePlaying: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    boxShadow: "0 0 16px rgba(239, 68, 68, 0.4)",
  },
  playPausePaused: {
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    boxShadow: "0 0 16px rgba(59, 130, 246, 0.4)",
  },

  // ── Slider ──
  sliderContainer: {
    flex: 1,
    minWidth: "120px",
  },
  sliderWrapper: {
    position: "relative",
    height: "20px",
  },
  sliderTick: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: "2px",
    height: "6px",
    background: "rgba(200, 220, 255, 0.2)",
    borderRadius: "1px",
    pointerEvents: "none",
  },
  sliderFill: {
    position: "absolute",
    top: "50%",
    left: 0,
    height: "5px",
    background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
    borderRadius: "3px",
    transform: "translateY(-50%)",
    boxShadow: "0 0 8px rgba(59, 130, 246, 0.4)",
    transition: "width 0.15s ease",
    pointerEvents: "none",
  },
  sliderTrackBg: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: "5px",
    background: "rgba(255, 255, 255, 0.06)",
    borderRadius: "3px",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  sliderBubble: {
    position: "absolute",
    top: "50%",
    transform: "translate(-50%, -140%)",
    fontSize: "8px",
    fontWeight: 800,
    color: "#ffffff",
    background: "rgba(30, 41, 59, 0.9)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    padding: "2px 6px",
    borderRadius: "4px",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
    transition: "left 0.1s ease",
    minWidth: "20px",
    textAlign: "center",
  },
  sliderInput: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    appearance: "none",
    background: "transparent",
    cursor: "pointer",
    zIndex: 2,
    margin: 0,
    padding: 0,
  },

  // ── Counter Badge ──
  counterBadge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontFamily: "'DM Mono', monospace",
    fontSize: "11px",
    fontWeight: 800,
    color: "rgba(200, 220, 255, 0.7)",
    background: "rgba(59, 130, 246, 0.15)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    padding: "4px 10px",
    borderRadius: "8px",
    backdropFilter: "blur(4px)",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  counterNumber: {
    color: "#3b82f6",
    fontWeight: 800,
  },
  counterDivider: {
    color: "rgba(200, 220, 255, 0.3)",
  },
  counterTotal: {
    color: "rgba(200, 220, 255, 0.5)",
    fontWeight: 600,
  },
};
