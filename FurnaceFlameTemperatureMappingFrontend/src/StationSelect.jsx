import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import img from "./assets/abhitech-logo.png";

/* ─────────────────────────────────────────────
   Inline CSS injected once into <head>
───────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy-900: #040d1a;
    --navy-800: #071428;
    --navy-700: #0d2040;
    --navy-600: #162d55;
    --blue-500: #1a4f9c;
    --blue-400: #2563c6;
    --blue-300: #4d8de8;
    --blue-200: #7eb3f8;
    --blue-100: #bdd8ff;
    --cyan-400: #22d3ee;
    --cyan-300: #67e8f9;
    --white: #ffffff;
    --glass-bg: rgba(13,32,64,0.55);
    --glass-border: rgba(77,141,232,0.25);
    --selected-bg: linear-gradient(135deg, #1a4f9c 0%, #2563c6 50%, #1d4ed8 100%);
    --selected-border: rgba(99,179,255,0.8);
    --glow: 0 0 20px rgba(77,141,232,0.4);
    --glow-strong: 0 0 40px rgba(77,141,232,0.6), 0 0 80px rgba(37,99,198,0.3);
  }

  /* ── Animated background ── */
  .ss-bg {
    position: fixed; inset: 0; z-index: 0;
    background: radial-gradient(ellipse at 20% 50%, #0a2040 0%, var(--navy-900) 60%),
                radial-gradient(ellipse at 80% 20%, #0d1e3a 0%, transparent 50%);
    overflow: hidden;
  }

  .ss-bg-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(77,141,232,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(77,141,232,0.04) 1px, transparent 1px);
    background-size: 50px 50px;
    animation: gridPulse 8s ease-in-out infinite;
  }
  @keyframes gridPulse {
    0%,100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }

  /* Orb blobs */
  .ss-orb {
    position: absolute; border-radius: 50%;
    filter: blur(80px); animation: orbFloat linear infinite;
    pointer-events: none;
  }
  .ss-orb-1 {
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(37,99,198,0.25) 0%, transparent 70%);
    top: -100px; left: -100px; animation-duration: 25s;
  }
  .ss-orb-2 {
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%);
    bottom: -80px; right: -80px; animation-duration: 30s; animation-delay: -10s;
  }
  .ss-orb-3 {
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
    top: 40%; left: 60%; animation-duration: 20s; animation-delay: -5s;
  }
  @keyframes orbFloat {
    0%   { transform: translate(0,0) scale(1); }
    33%  { transform: translate(30px,-40px) scale(1.05); }
    66%  { transform: translate(-20px,30px) scale(0.95); }
    100% { transform: translate(0,0) scale(1); }
  }

  /* Particles canvas */
  .ss-particles { position: absolute; inset: 0; pointer-events: none; }

  /* Wave SVG lines */
  .ss-waves {
    position: absolute; bottom: 0; left: 0; right: 0; height: 200px;
    opacity: 0.18; pointer-events: none;
  }
  .wave-path-1 { animation: waveDrift 12s ease-in-out infinite; }
  .wave-path-2 { animation: waveDrift 15s ease-in-out infinite reverse; }
  @keyframes waveDrift {
    0%,100% { d: path("M0,100 C200,60 400,140 600,100 C800,60 1000,140 1200,100 C1400,60 1600,140 1920,100 L1920,200 L0,200 Z"); }
    50% { d: path("M0,120 C200,80 400,160 600,120 C800,80 1000,160 1200,120 C1400,80 1600,160 1920,120 L1920,200 L0,200 Z"); }
  }

  /* ── Header ── */
  .ss-header {
    position: sticky; top: 0; z-index: 200;
    background: rgba(4,13,26,0.85);
    backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid rgba(77,141,232,0.15);
    box-shadow: 0 1px 0 rgba(77,141,232,0.1), 0 4px 30px rgba(0,0,0,0.4);
  }
  .ss-header::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(77,141,232,0.6), rgba(34,211,238,0.4), transparent);
    animation: scanLine 4s linear infinite;
  }
  @keyframes scanLine {
    0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; }
  }

  .ss-header-inner {
    display: flex; align-items: center; padding: 12px 24px; gap: 12px; flex-wrap: wrap;
  }

  .ss-logo-block { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }

  .ss-logo-ring {
    width: 44px; height: 44px; flex-shrink: 0;
    border-radius: 50%; position: relative;
    background: linear-gradient(135deg, rgba(37,99,198,0.3), rgba(6,182,212,0.2));
    border: 1px solid rgba(77,141,232,0.4);
    display: flex; align-items: center; justify-content: center;
    animation: logoGlow 3s ease-in-out infinite;
  }
  .ss-logo-ring::before {
    content: ''; position: absolute; inset: -2px; border-radius: 50%;
    border: 1px solid transparent;
    background: linear-gradient(135deg, rgba(77,141,232,0.6), transparent) border-box;
    -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: destination-out; mask-composite: exclude;
    animation: ringRotate 6s linear infinite;
  }
  @keyframes logoGlow { 0%,100% { box-shadow: 0 0 10px rgba(37,99,198,0.3); } 50% { box-shadow: 0 0 25px rgba(37,99,198,0.6), 0 0 50px rgba(6,182,212,0.2); } }
  @keyframes ringRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .ss-logo-img { width: 28px; height: 28px; object-fit: contain; position: relative; z-index: 1; }

  .ss-brand-name {
    font-family: 'Inter', sans-serif; font-size: clamp(10px, 1.5vw, 16px); font-weight: 800;
    color: var(--white); letter-spacing: 0.04em; white-space: nowrap;
    text-overflow: ellipsis; overflow: hidden;
    text-shadow: 0 0 20px rgba(77,141,232,0.4);
  }
  .ss-brand-tagline {
    font-family: 'Inter', sans-serif; font-size: clamp(9px, 1vw, 11px);
    color: rgba(180,210,255,0.5); letter-spacing: 0.1em; margin-top: 2px; font-weight: 400;
  }

  .ss-header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

  .ss-role-badge {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: 20px;
    font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
    letter-spacing: 0.08em; color: var(--blue-100);
    background: rgba(37,99,198,0.2); border: 1px solid rgba(77,141,232,0.35);
    transition: all 0.3s; cursor: default;
  }
  .ss-role-badge:hover { background: rgba(37,99,198,0.35); border-color: rgba(77,141,232,0.6); }
  .ss-role-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--cyan-400); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }

  .ss-username-badge {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: 20px;
    font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 500;
    color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
  }

  .ss-logout-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 14px; border-radius: 8px; cursor: pointer;
    font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.06em;
    color: var(--white); background: rgba(220,38,38,0.15);
    border: 1px solid rgba(248,113,113,0.35); transition: all 0.25s;
    position: relative; overflow: hidden;
  }
  .ss-logout-btn::before {
    content: ''; position: absolute; inset: 0; opacity: 0;
    background: linear-gradient(135deg, rgba(220,38,38,0.3), rgba(239,68,68,0.2));
    transition: opacity 0.25s;
  }
  .ss-logout-btn:hover::before { opacity: 1; }
  .ss-logout-btn:hover { border-color: rgba(248,113,113,0.7); transform: translateY(-1px); box-shadow: 0 4px 15px rgba(220,38,38,0.3); }

  /* Logo image with flame glow */
  .ss-logo-img {
    width: 32px; height: 32px; object-fit: contain; position: relative; z-index: 1;
    animation: logoFlame 4s ease-in-out infinite;
    filter: drop-shadow(0 0 6px rgba(77,141,232,0.7));
  }
  @keyframes logoFlame {
    0%,100% { filter: drop-shadow(0 0 6px rgba(77,141,232,0.7)) drop-shadow(0 0 12px rgba(37,99,198,0.4)); transform: scale(1); }
    33%  { filter: drop-shadow(0 0 10px rgba(99,179,255,0.9)) drop-shadow(0 0 20px rgba(34,211,238,0.5)); transform: scale(1.05); }
    66%  { filter: drop-shadow(0 0 8px rgba(77,141,232,0.8)) drop-shadow(0 0 16px rgba(37,99,198,0.3)); transform: scale(0.98); }
  }

  /* ── Main layout ── */
  .ss-main {
    position: relative; z-index: 10;
    min-height: calc(100vh - 68px);
    display: flex; align-items: center; justify-content: center;
    padding: clamp(16px,4vw,48px) clamp(12px,3vw,24px);
  }

  /* ── Card ── */
  .ss-card {
    width: 100%; max-width: 680px;
    background: linear-gradient(160deg, rgba(22,45,85,0.7) 0%, rgba(13,32,64,0.8) 100%);
    border: 1px solid rgba(77,141,232,0.22);
    backdrop-filter: blur(24px) saturate(150%);
    border-radius: 24px; padding: clamp(24px,5vw,44px);
    box-shadow: 0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(77,141,232,0.08) inset, var(--glow);
    position: relative; overflow: hidden;
    animation: cardEntrance 0.7s cubic-bezier(0.16,1,0.3,1) both;
  }
  @keyframes cardEntrance {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .ss-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(77,141,232,0.8), rgba(34,211,238,0.6), rgba(77,141,232,0.8), transparent);
    animation: topBorder 5s ease-in-out infinite;
  }
  @keyframes topBorder { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
  .ss-card::after {
    content: ''; position: absolute; inset: 0; border-radius: 24px; pointer-events: none;
    background: radial-gradient(ellipse at 50% 0%, rgba(77,141,232,0.06) 0%, transparent 60%);
  }

  /* ── Title ── */
  .ss-title {
    font-family: 'Inter', sans-serif;
    font-size: clamp(20px,4vw,30px); font-weight: 900; letter-spacing: 0.04em;
    text-align: center; color: var(--white); margin-bottom: 6px;
    text-shadow: 0 0 40px rgba(77,141,232,0.5), 0 2px 4px rgba(0,0,0,0.4);
    position: relative;
    animation: titleEntrance 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both;
  }
  @keyframes titleEntrance {
    from { opacity:0; transform: translateY(-10px); letter-spacing: 0.15em; }
    to   { opacity:1; transform: translateY(0); letter-spacing: 0.04em; }
  }
  .ss-title-underline {
    width: 60px; height: 2px; margin: 10px auto 28px;
    background: linear-gradient(90deg, transparent, var(--cyan-400), transparent);
    border-radius: 1px; animation: underlinePulse 3s ease-in-out infinite;
  }
  @keyframes underlinePulse { 0%,100% { width:40px; opacity:0.6; } 50% { width:80px; opacity:1; } }

  /* ── Section ── */
  .ss-section { margin-bottom: 28px; }

  .ss-section-label {
    font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700;
    letter-spacing: 0.14em; color: rgba(180,210,255,0.6);
    text-align: center; margin-bottom: 14px; text-transform: uppercase;
    display: flex; align-items: center; justify-content: center; gap: 10px;
  }
  .ss-section-label::before, .ss-section-label::after {
    content: ''; flex: 1; max-width: 60px; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(77,141,232,0.4));
  }
  .ss-section-label::after { background: linear-gradient(270deg, transparent, rgba(77,141,232,0.4)); }

  /* ── Station info banner ── */
  .ss-station-info {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-family: 'Inter', sans-serif; font-size: 13px; color: rgba(200,225,255,0.8);
    padding: 8px 16px; border-radius: 8px; margin-bottom: 12px;
    background: rgba(37,99,198,0.1); border: 1px solid rgba(77,141,232,0.2);
  }

  /* ── Button grid ── */
  .ss-btn-grid {
    display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;
  }

  /* ── Station/Unit button ── */
  .ss-btn {
    position: relative; display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 18px; border-radius: 10px; cursor: pointer;
    font-family: 'Inter', sans-serif; font-size: clamp(11px,1.5vw,13px); font-weight: 600;
    letter-spacing: 0.04em; color: rgba(180,210,255,0.75);
    background: rgba(255,255,255,0.04); border: 1px solid rgba(77,141,232,0.2);
    transition: all 0.25s cubic-bezier(0.4,0,0.2,1); overflow: hidden;
    white-space: nowrap;
  }
  .ss-btn::before {
    content: ''; position: absolute; inset: 0; opacity: 0;
    background: radial-gradient(circle at 50% 50%, rgba(77,141,232,0.2), transparent 70%);
    transition: opacity 0.25s;
  }
  .ss-btn:hover:not(.ss-btn--disabled)::before { opacity: 1; }
  .ss-btn:hover:not(.ss-btn--disabled) {
    border-color: rgba(77,141,232,0.5); color: var(--white);
    transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37,99,198,0.25);
  }

  .ss-btn--selected {
    background: linear-gradient(135deg, rgba(26,79,156,0.9) 0%, rgba(37,99,198,0.95) 50%, rgba(29,78,216,0.9) 100%);
    border-color: rgba(99,179,255,0.7) !important;
    color: var(--white) !important;
    box-shadow: 0 0 20px rgba(37,99,198,0.5), 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1) !important;
    transform: scale(1.04) !important;
    animation: selectedGlow 2.5s ease-in-out infinite;
  }
  @keyframes selectedGlow {
    0%,100% { box-shadow: 0 0 20px rgba(37,99,198,0.5), 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1); }
    50% { box-shadow: 0 0 35px rgba(37,99,198,0.75), 0 4px 25px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15); }
  }

  .ss-btn--disabled {
    cursor: not-allowed; opacity: 0.3; filter: blur(1.5px);
    pointer-events: none;
  }

  .ss-btn-check {
    position: absolute; top: -2px; right: -2px;
    width: 18px; height: 18px; border-radius: 50%;
    background: linear-gradient(135deg, var(--cyan-400), #3b82f6);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 8px rgba(34,211,238,0.6);
    animation: checkPop 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes checkPop { from { transform: scale(0); } to { transform: scale(1); } }

  /* Icon SVG inside buttons */
  .ss-btn-icon { opacity: 0.7; flex-shrink: 0; }
  .ss-btn--selected .ss-btn-icon { opacity: 1; }

  /* Unit section entrance */
  .ss-unit-section {
    animation: sectionSlide 0.45s cubic-bezier(0.16,1,0.3,1) both;
  }
  @keyframes sectionSlide {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Divider */
  .ss-divider {
    height: 1px; margin: 4px 0 28px;
    background: linear-gradient(90deg, transparent, rgba(77,141,232,0.25), transparent);
  }

  /* ── Proceed button ── */
  .ss-proceed-btn {
    width: 100%; padding: 16px 24px; border-radius: 12px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 12px;
    font-family: 'Inter', sans-serif; font-size: clamp(13px,2vw,16px); font-weight: 800; letter-spacing: 0.08em;
    color: rgba(180,210,255,0.5); background: rgba(255,255,255,0.04);
    border: 1px solid rgba(77,141,232,0.15); transition: all 0.3s;
    margin-top: 8px; position: relative; overflow: hidden;
  }
  .ss-proceed-btn--active {
    color: var(--white) !important;
    background: linear-gradient(135deg, #0f3460 0%, #1a4f9c 40%, #2563c6 70%, #1d4ed8 100%) !important;
    border-color: rgba(99,179,255,0.6) !important;
    cursor: pointer !important;
    box-shadow: 0 8px 30px rgba(37,99,198,0.4), 0 0 0 1px rgba(77,141,232,0.2) inset !important;
  }
  .ss-proceed-btn--active::before {
    content: ''; position: absolute; inset: 0; opacity: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%);
    transform: translateX(-100%); transition: none;
    animation: shimmer 3s ease-in-out infinite;
  }
  @keyframes shimmer { 0%,100% { opacity:0; transform:translateX(-100%); } 50% { opacity:1; transform:translateX(100%); } }
  .ss-proceed-btn--active:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(37,99,198,0.55), 0 0 0 1px rgba(77,141,232,0.3) inset !important;
  }
  .ss-proceed-btn--active:active { transform: translateY(0); }

  .ss-proceed-arrow {
    transition: transform 0.3s;
  }
  .ss-proceed-btn--active:hover .ss-proceed-arrow { transform: translateX(4px); }

  /* ── Aurora behind card ── */
  .ss-aurora {
    position: fixed; z-index: 1; pointer-events: none;
    width: 700px; height: 500px;
    top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: radial-gradient(ellipse at 50% 50%,
      rgba(37,99,198,0.12) 0%,
      rgba(6,182,212,0.06) 40%,
      transparent 70%);
    border-radius: 50%; filter: blur(40px);
    animation: auroraPulse 6s ease-in-out infinite;
  }
  @keyframes auroraPulse {
    0%,100% { transform: translate(-50%,-50%) scale(1); opacity: 0.7; }
    50% { transform: translate(-50%,-50%) scale(1.15); opacity: 1; }
  }

  /* Staggered button entrance */
  .ss-btn { animation: btnEntrance 0.4s cubic-bezier(0.16,1,0.3,1) both; }
  @keyframes btnEntrance {
    from { opacity: 0; transform: scale(0.85) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @media (max-width: 480px) {
    .ss-header-inner { padding: 10px 14px; }
    .ss-brand-name { font-size: 9px; letter-spacing: 0.02em; }
    .ss-card { padding: 20px 16px; border-radius: 16px; }
    .ss-btn { padding: 9px 13px; font-size: 11px; }
    .ss-role-badge, .ss-username-badge { font-size: 10px; padding: 5px 8px; }
    .ss-logout-btn { padding: 7px 10px; font-size: 10px; }
  }
`;

/* ── SVG icons ── */
const FactoryIcon = () => (
  <svg className="ss-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20v-8l6-4v4l6-4v4l6-4v12H2z"/>
    <line x1="12" y1="20" x2="12" y2="15"/>
    <line x1="8" y1="20" x2="8" y2="15"/>
  </svg>
);

const UnitIcon = () => (
  <svg className="ss-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="8" rx="1"/>
    <rect x="13" y="3" width="8" height="8" rx="1"/>
    <rect x="3" y="13" width="8" height="8" rx="1"/>
    <rect x="13" y="13" width="8" height="8" rx="1"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1.5,5 4,7.5 8.5,2.5"/>
  </svg>
);

/* ── Particle canvas ── */
function ParticleCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3, vy: -Math.random() * 0.4 - 0.1,
      r: Math.random() * 2 + 0.5, alpha: Math.random() * 0.6 + 0.1,
      pulse: Math.random() * Math.PI * 2,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.pulse += 0.015;
        const a = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(77,141,232,${a})`;
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
        if (p.x < 0 || p.x > W) p.vx *= -1;
      });
      // Draw faint connecting lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(77,141,232,${0.12 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="ss-particles" />;
}

/* ══════════════════════════════════════════
   Main Component
══════════════════════════════════════════ */
export default function StationSelect() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [username, setUsername] = useState(null);
  const navigate = useNavigate();

  // Inject global CSS once
  useEffect(() => {
    const id = "ss-premium-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id; el.textContent = GLOBAL_CSS;
      document.head.appendChild(el);
    }
    return () => { /* leave styles for SPA navigation */ };
  }, []);

  useEffect(() => {
    const stationsList = [
      { id: 1, name: "BTPS" },
      { id: 2, name: "CSTPS" },
      { id: 3, name: "KPKD" },
      { id: 4, name: "KTPS" },
      { id: 5, name: "NTPS" },
      { id: 6, name: "PARAS TPS" },
      { id: 7, name: "PARALI TPS" },
    ];
    setStations(stationsList);

    const storedUsername = localStorage.getItem("username");
    const storedLocation = localStorage.getItem("location");
    setUsername(storedUsername);

    if (storedLocation === "all") {
      setUserLocation("all");
      setSelectedStation(null);
      setUnits([]);
    } else if (storedLocation && storedLocation !== "all") {
      setUserLocation(storedLocation);
      const station = stationsList.find(s => s.name === storedLocation);
      if (station) { setSelectedStation(station); fetchUnits(station.id); }
    } else if (storedUsername) {
      setUserLocation(storedLocation);
      const station = stationsList.find(s => s.name === storedLocation);
      if (station) { setSelectedStation(station); fetchUnits(station.id); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedStation", JSON.stringify(selectedStation));
    localStorage.setItem("selectedUnit", JSON.stringify(selectedUnit));
  }, [selectedStation, selectedUnit]);

  const fetchUnits = (stationId) => {
    const unitMap = {
      1: [{ id: 3, name: "Unit 3" }, { id: 4, name: "Unit 4" }, { id: 5, name: "Unit 5" }, { id: 6, name: "Unit 6" }],
      2: [{ id: 1, name: "Unit 1" }, { id: 2, name: "Unit 2" }, { id: 3, name: "Unit 3" }, { id: 4, name: "Unit 4" }, { id: 5, name: "Unit 5" }, { id: 6, name: "Unit 6" }, { id: 7, name: "Unit 7" }],
      3: [{ id: 1, name: "Unit 1" }, { id: 2, name: "Unit 2" }, { id: 3, name: "Unit 3" }, { id: 4, name: "Unit 4" }, { id: 5, name: "Unit 5" }],
      4: [{ id: 6, name: "Unit 6" }, { id: 8, name: "Unit 8" }, { id: 9, name: "Unit 9" }, { id: 10, name: "Unit 10" }],
      5: [{ id: 3, name: "Unit 3" }, { id: 4, name: "Unit 4" }, { id: 5, name: "Unit 5" }],
      6: [{ id: 3, name: "Unit 3" }, { id: 4, name: "Unit 4" }],
      7: [{ id: 6, name: "Unit 6" }, { id: 7, name: "Unit 7" }, { id: 8, name: "Unit 8" }],
    };
    setUnits(unitMap[stationId] || []);
  };

  const handleStationSelect = (station) => {
    if (userLocation !== "all") return;
    setSelectedStation(station);
    setSelectedUnit(null);
    fetchUnits(station.id);
  };

  const handleUnitSelect = (unit) => setSelectedUnit(unit);

  const handleProceed = () => {
    if (selectedStation && selectedUnit) {
      localStorage.setItem("selectedStation", JSON.stringify(selectedStation));
      localStorage.setItem("selectedUnit", JSON.stringify(selectedUnit));
      navigate("/dashboard");
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  const isAdmin = userLocation === "all";
  const canProceed = !!(selectedStation && selectedUnit);

  return (
    <>
      {/* ── Background ── */}
      <div className="ss-bg">
        <div className="ss-bg-grid" />
        <div className="ss-orb ss-orb-1" />
        <div className="ss-orb ss-orb-2" />
        <div className="ss-orb ss-orb-3" />
        <ParticleCanvas />
        <div className="ss-aurora" />
        <svg className="ss-waves" viewBox="0 0 1920 200" preserveAspectRatio="none">
          <path className="wave-path-1" fill="rgba(37,99,198,0.4)"
            d="M0,100 C200,60 400,140 600,100 C800,60 1000,140 1200,100 C1400,60 1600,140 1920,100 L1920,200 L0,200 Z"/>
          <path className="wave-path-2" fill="rgba(6,182,212,0.25)"
            d="M0,120 C300,80 500,160 800,120 C1100,80 1300,160 1920,120 L1920,200 L0,200 Z"/>
        </svg>
      </div>

      {/* ── Header ── */}
      <header className="ss-header">
        <div className="ss-header-inner">
          <div className="ss-logo-block">
            <div className="ss-logo-ring">
              <img src={img} alt="Abhitech Logo" className="ss-logo-img" />
            </div>
            <div>
              <div className="ss-brand-name">ABHITECH FURNACE FLAME TEMPERATURE MAPPING</div>
              <div className="ss-brand-tagline">FURNACE FLAME TEMPERATURE MAPPING SYSTEM</div>
            </div>
          </div>

          <div className="ss-header-right">
            <div className="ss-role-badge">
              <span className="ss-role-dot" />
              {isAdmin ? "ADMIN" : "USER"}
            </div>
            {username && (
              <div className="ss-username-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                {username}
              </div>
            )}
            <button className="ss-logout-btn" onClick={handleLogout}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="ss-main">
        <div className="ss-card">
          {/* Title */}
          <div className="ss-title">SELECT STATION &amp; UNIT</div>
          <div className="ss-title-underline" />

          {/* Station Section */}
          <div className="ss-section">
            <div className="ss-section-label">STATION</div>

            {!isAdmin && selectedStation && (
              <div className="ss-station-info">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(34,211,238,0.8)" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Assigned station: <strong style={{color:'rgba(180,210,255,0.95)',marginLeft:4}}>{selectedStation.name}</strong>
              </div>
            )}

            <div className="ss-btn-grid">
              {stations.map((station) => {
                const isSelected = selectedStation?.id === station.id;
                const isDisabled = !isAdmin && !isSelected;
                const blur = !isAdmin && selectedStation && !isSelected;
                return (
                  <button
                    key={station.id}
                    className={[
                      "ss-btn",
                      isSelected ? "ss-btn--selected" : "",
                      isDisabled ? "ss-btn--disabled" : "",
                    ].join(" ")}
                    style={{
                      ...(blur ? { opacity: 0.25, filter: "blur(2px)" } : {}),
                      animationDelay: `${station.id * 0.06}s`,
                    }}
                    onClick={() => handleStationSelect(station)}
                    disabled={isDisabled}
                  >
                    <FactoryIcon />
                    {station.name}
                    {isSelected && (
                      <span className="ss-btn-check"><CheckIcon /></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unit Section */}
          {selectedStation && (
            <>
              <div className="ss-divider" />
              <div className="ss-section ss-unit-section">
                <div className="ss-section-label">UNIT — {selectedStation.name}</div>
                <div className="ss-btn-grid">
                  {units.map((unit) => {
                    const isSelected = selectedUnit?.id === unit.id;
                    const blur = selectedUnit && !isSelected;
                    return (
                      <button
                        key={unit.id}
                        className={["ss-btn", isSelected ? "ss-btn--selected" : ""].join(" ")}
                        style={{
                          ...(blur ? { opacity: 0.3, filter: "blur(1.5px)" } : {}),
                          animationDelay: `${units.indexOf(unit) * 0.07}s`,
                        }}
                        onClick={() => handleUnitSelect(unit)}
                      >
                        <UnitIcon />
                        {unit.name}
                        {isSelected && (
                          <span className="ss-btn-check"><CheckIcon /></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Proceed */}
          <button
            className={["ss-proceed-btn", canProceed ? "ss-proceed-btn--active" : ""].join(" ")}
            onClick={handleProceed}
            disabled={!canProceed}
          >
            PROCEED TO DASHBOARD
            <svg className="ss-proceed-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </main>
    </>
  );
}