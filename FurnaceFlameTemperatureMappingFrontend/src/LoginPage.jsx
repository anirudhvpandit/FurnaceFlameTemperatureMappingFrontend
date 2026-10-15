// src/LoginPage.jsx
/**
 * Enhanced LoginPage with beautiful UI/UX improvements.
 *
 * Features:
 *  • Enhanced animations with smoother timing functions
 *  • Improved color scheme with better gradients
 *  • Enhanced glassmorphism effects
 *  • Better typography and spacing
 *  • Improved input field styling
 *  • Enhanced button with better gradients
 *  • Better visual hierarchy
 *  • Improved accessibility
 *  • Enhanced responsive design
 *  • Beautiful background effects
 */

import api from "./api";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "./assets/abhitech-logo.png";

/* ─── Enhanced Keyframes with beautiful animations ─────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes floatLogo {
    0%   { transform: translateY(0px) rotate(-1deg); filter: drop-shadow(0 8px 24px rgba(99, 102, 241, 0.5)); }
    50%  { transform: translateY(-14px) rotate(1deg); filter: drop-shadow(0 22px 36px rgba(99, 102, 241, 0.7)); }
    100% { transform: translateY(0px) rotate(-1deg); filter: drop-shadow(0 8px 24px rgba(99, 102, 241, 0.5)); }
  }

  @keyframes floatLogoLeft {
    0%   { transform: translateY(0px); filter: drop-shadow(0 6px 18px rgba(99, 102, 241, 0.4)); }
    50%  { transform: translateY(-10px); filter: drop-shadow(0 18px 28px rgba(99, 102, 241, 0.6)); }
    100% { transform: translateY(0px); filter: drop-shadow(0 6px 18px rgba(99, 102, 241, 0.4)); }
  }

  @keyframes fadeSlideUp {
    0%   { opacity: 0; transform: translateY(30px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeSlideIn {
    0%   { opacity: 0; transform: translateX(-24px); }
    100% { opacity: 1; transform: translateX(0); }
  }

  @keyframes fadeIn {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }

  @keyframes pulseDot {
    0%, 100% { opacity: 0.3; transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.5); }
    50%       { opacity: 1;   transform: scale(1.8); box-shadow: 0 0 12px 4px rgba(99, 102, 241, 0.4); }
  }

  @keyframes wave1 {
    0%   { d: path("M0,160 C200,100 400,220 600,140 C800,60 1000,180 1200,120 C1400,60 1600,160 1800,100 L1800,400 L0,400 Z"); }
    50%  { d: path("M0,140 C200,200 400,80  600,160 C800,240 1000,100 1200,180 C1400,260 1600,120 1800,160 L1800,400 L0,400 Z"); }
    100% { d: path("M0,160 C200,100 400,220 600,140 C800,60 1000,180 1200,120 C1400,60 1600,160 1800,100 L1800,400 L0,400 Z"); }
  }

  @keyframes wave2 {
    0%   { d: path("M0,200 C300,130 600,260 900,180 C1200,100 1500,220 1800,150 L1800,400 L0,400 Z"); }
    50%  { d: path("M0,180 C300,250 600,120 900,200 C1200,280 1500,140 1800,200 L1800,400 L0,400 Z"); }
    100% { d: path("M0,200 C300,130 600,260 900,180 C1200,100 1500,220 1800,150 L1800,400 L0,400 Z"); }
  }

  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }

  @keyframes cardIn {
    0%   { opacity: 0; transform: scale(0.92) translateY(20px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }

  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
    50%       { box-shadow: 0 0 0 12px rgba(99, 102, 241, 0.15); }
  }

  @keyframes shimmerEffect {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }

  .lp-input:focus {
    border-color: rgba(99, 102, 241, 0.8) !important;
    background: rgba(99, 102, 241, 0.1) !important;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2) !important;
  }

  .lp-btn:hover {
    filter: brightness(1.15) !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 20px 40px -8px rgba(99, 102, 241, 0.4) !important;
  }

  .lp-btn:active {
    transform: translateY(0) !important;
    filter: brightness(0.9) !important;
  }

  .lp-eye:hover { 
    color: rgba(255,255,255,1) !important;
    transform: scale(1.1);
  }

  .lp-eye {
    transition: all 0.2s ease;
  }

  @media (max-width: 768px) {
    .lp-left { display: none !important; }
    .lp-right { width: 100% !important; }
  }
`;

/* ─── Enhanced Animated SVG Wave Canvas ─────────────────────────────────────── */
const WaveBg = () => (
  <svg
    style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "45%", opacity: 0.2 }}
    viewBox="0 0 1800 400"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="rgba(99, 102, 241, 0.7)"
      style={{ animation: "wave1 7s ease-in-out infinite" }}
      d="M0,160 C200,100 400,220 600,140 C800,60 1000,180 1200,120 C1400,60 1600,160 1800,100 L1800,400 L0,400 Z"
    />
    <path
      fill="rgba(129, 140, 248, 0.5)"
      style={{ animation: "wave2 9s ease-in-out infinite" }}
      d="M0,200 C300,130 600,260 900,180 C1200,100 1500,220 1800,150 L1800,400 L0,400 Z"
    />
  </svg>
);

/* ─── Enhanced Floating particle dots ─────────────────────────────────────── */
const DOTS = [
  { x: "12%",  y: "78%", delay: "0s",    size: 3 },
  { x: "28%",  y: "65%", delay: "1.2s",  size: 2 },
  { x: "42%",  y: "82%", delay: "0.6s",  size: 4 },
  { x: "58%",  y: "70%", delay: "2s",    size: 2 },
  { x: "72%",  y: "85%", delay: "0.9s",  size: 3 },
  { x: "88%",  y: "72%", delay: "1.5s",  size: 2 },
  { x: "20%",  y: "90%", delay: "0.3s",  size: 3 },
  { x: "65%",  y: "92%", delay: "1.8s",  size: 2 },
];

const ParticleDots = () => (
  <>
    {DOTS.map((d, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: d.x, top: d.y,
          width: d.size, height: d.size,
          borderRadius: "50%",
          background: "rgba(99, 102, 241, 0.8)",
          animation: `pulseDot 3s ease-in-out infinite`,
          animationDelay: d.delay,
        }}
      />
    ))}
  </>
);

/* ─── Enhanced Main Component ─────────────────────────────────────────────── */
const LoginPage = () => {
  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const navigate = useNavigate();

  /* inject global CSS once */
  useEffect(() => {
    const tag = document.createElement("style");
    tag.textContent = CSS;
    document.head.appendChild(tag);
    return () => document.head.removeChild(tag);
  }, []);

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await api.post("/login", { username, password });
      const data = response.data;
      console.log(data);

      if (data.location === null) {
        alert("Invalid username or password.");
        setLoading(false);
        return;
      }

      localStorage.setItem("username", data.username);
      localStorage.setItem("location", data.location);
      localStorage.setItem("role", data.role);
      navigate("/station-select");
    } catch (error) {
      console.error("Login failed:", error);
      if (error.response) {
        alert(error.response.data?.message || error.response.data?.detail || "Invalid username or password.");
      } else {
        alert("Server unreachable. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%)",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Enhanced animated background waves + dots */}
      <WaveBg />
      <ParticleDots />

      {/* Enhanced radial glow behind card */}
      <div style={{
        position: "absolute",
        right: "20%", top: "50%",
        transform: "translate(50%, -50%)",
        width: 700, height: 700,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)",
        pointerEvents: "none",
        animation: "glowPulse 4s ease-in-out infinite",
      }} />

      {/* ── Enhanced Outer wrapper ── */}
      <div style={{
        display: "flex",
        width: "100%",
        maxWidth: 1000,
        minHeight: 560,
        margin: "0 20px",
        borderRadius: 32,
        overflow: "hidden",
        boxShadow: "0 50px 100px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)",
        animation: "cardIn 0.8s cubic-bezier(0.22,1,0.36,1) both",
      }}>

        {/* ── Enhanced LEFT PANEL ── */}
        <div className="lp-left" style={{
          width: "45%",
          background: "linear-gradient(155deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%)",
          borderRight: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "60px 52px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Enhanced left background glow */}
          <div style={{
            position: "absolute", left: -100, top: "40%",
            width: 400, height: 400, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Enhanced Logo floating */}
          <div style={{
            animation: "floatLogoLeft 5s ease-in-out infinite",
            marginBottom: 40,
          }}>
            <img src={logo} alt="Abhitech" style={{ width: 150, height: "auto", objectFit: "contain" }} />
          </div>

          {/* Enhanced Headline */}
          <div style={{
            animation: "fadeSlideIn 0.9s ease both",
            animationDelay: "0.25s",
            opacity: 0,
            animationFillMode: "forwards",
          }}>
            <p style={{
              fontSize: 11, letterSpacing: "0.25em",
              color: "rgba(129, 140, 248, 0.9)",
              marginBottom: 12, fontWeight: 700,
              textTransform: "uppercase",
            }}>ABHITECH Energycon Limited</p>
            <h1 style={{
              fontSize: 28, fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.2,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: 24,
              textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)"
            }}>
              FURNACE FLAME<br />TEMPERATURE<br />MAPPING SYSTEM
            </h1>
            <p style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.8,
              fontWeight: 400,
              maxWidth: 260,
            }}>
              Advanced monitoring and analysis<br />for industrial furnace optimization
            </p>
          </div>

          {/* Enhanced Bottom copyright */}
          <p style={{
            position: "absolute", bottom: 32, left: 52,
            fontSize: 11, color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.06em",
            animation: "fadeIn 1.2s ease both",
            animationDelay: "1s",
            animationFillMode: "forwards",
            opacity: 0,
          }}>
            © Abhitech Energycon Limited • All rights reserved
          </p>
        </div>

        {/* ── Enhanced RIGHT PANEL (Card) ── */}
        <div style={{
          flex: 1,
          background: "linear-gradient(160deg, rgba(30, 58, 138, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
          backdropFilter: "blur(24px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px 48px",
          borderLeft: "1px solid rgba(255,255,255,0.1)"
        }}>
          {/* Enhanced Logo */}
          <div style={{ animation: "floatLogo 5.5s ease-in-out infinite", marginBottom: 24 }}>
            <img src={logo} alt="Abhitech" style={{ width: 140, height: "auto", objectFit: "contain" }} />
          </div>

          {/* Enhanced Title */}
          <div style={{
            animation: "fadeSlideUp 0.75s ease both",
            animationDelay: "0.35s",
            animationFillMode: "forwards",
            opacity: 0,
            textAlign: "center",
            marginBottom: 40,
          }}>
            <p style={{
              fontSize: 13,
              letterSpacing: "0.18em",
              color: "rgba(255,255,255,0.85)",
              fontWeight: 700,
              textTransform: "uppercase",
              lineHeight: 1.6,
            }}>
              FURNACE FLAME TEMPERATURE<br />MAPPING SYSTEM
            </p>
          </div>

          {/* Enhanced Username */}
          <div style={{
            position: "relative", width: "100%", marginBottom: 16,
            animation: "fadeSlideUp 0.75s ease both",
            animationDelay: "0.5s",
            animationFillMode: "forwards",
            opacity: 0,
          }}>
            <span style={{
              position: "absolute", left: 18, top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(255,255,255,0.5)",
              display: "flex", alignItems: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <input
              className="lp-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Username"
              autoComplete="username"
              style={{
                width: "100%",
                padding: "16px 18px 16px 48px",
                border: "1.5px solid rgba(255,255,255,0.15)",
                borderRadius: 16,
                fontSize: 15,
                color: "#ffffff",
                background: "rgba(255,255,255,0.08)",
                outline: "none",
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                transition: "border-color 0.25s, background 0.25s, box-shadow 0.25s",
              }}
            />
          </div>

          {/* Enhanced Password */}
          <div style={{
            position: "relative", width: "100%", marginBottom: 24,
            animation: "fadeSlideUp 0.75s ease both",
            animationDelay: "0.65s",
            animationFillMode: "forwards",
            opacity: 0,
          }}>
            <span style={{
              position: "absolute", left: 18, top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(255,255,255,0.5)",
              display: "flex", alignItems: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              className="lp-input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Password"
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "16px 48px 16px 48px",
                border: "1.5px solid rgba(255,255,255,0.15)",
                borderRadius: 16,
                fontSize: 15,
                color: "#ffffff",
                background: "rgba(255,255,255,0.08)",
                outline: "none",
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                transition: "border-color 0.25s, background 0.25s, box-shadow 0.25s",
              }}
            />
            <button
              className="lp-eye"
              type="button"
              onClick={() => setShowPassword(s => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute", right: 16, top: "50%",
                transform: "translateY(-50%)",
                background: "none", border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.5)",
                display: "flex", alignItems: "center",
                padding: 4,
              }}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {/* Enhanced Login Button */}
          <div style={{
            width: "100%",
            animation: "fadeSlideUp 0.75s ease both",
            animationDelay: "0.8s",
            animationFillMode: "forwards",
            opacity: 0,
          }}>
            <button
              className="lp-btn"
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                background: "linear-gradient(90deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: 16,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "0.08em",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 12px 35px -8px rgba(99, 102, 241, 0.5)",
                transition: "filter 0.22s, transform 0.22s, box-shadow 0.22s",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Logging in…" : "Log In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;