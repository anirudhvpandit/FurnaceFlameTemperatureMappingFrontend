import api from "./api";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "./assets/abhitech-logo.png";

/* ─── Keyframes injected once ─────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes floatLogo {
    0%   { transform: translateY(0px) rotate(-1deg); filter: drop-shadow(0 8px 24px rgba(79,140,255,0.45)); }
    50%  { transform: translateY(-14px) rotate(1deg); filter: drop-shadow(0 22px 36px rgba(79,140,255,0.65)); }
    100% { transform: translateY(0px) rotate(-1deg); filter: drop-shadow(0 8px 24px rgba(79,140,255,0.45)); }
  }

  @keyframes floatLogoLeft {
    0%   { transform: translateY(0px); filter: drop-shadow(0 6px 18px rgba(79,140,255,0.35)); }
    50%  { transform: translateY(-10px); filter: drop-shadow(0 18px 28px rgba(79,140,255,0.55)); }
    100% { transform: translateY(0px); filter: drop-shadow(0 6px 18px rgba(79,140,255,0.35)); }
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
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.8); }
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
    0%, 100% { box-shadow: 0 0 0 0 rgba(79,140,255,0); }
    50%       { box-shadow: 0 0 0 8px rgba(79,140,255,0.18); }
  }

  .lp-input:focus {
    border-color: rgba(79,140,255,0.75) !important;
    background: rgba(79,140,255,0.08) !important;
    box-shadow: 0 0 0 3px rgba(79,140,255,0.15) !important;
  }

  .lp-btn:hover {
    filter: brightness(1.18) !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 18px 40px -10px rgba(0,0,0,0.65) !important;
  }

  .lp-btn:active {
    transform: translateY(0) !important;
    filter: brightness(0.95) !important;
  }

  .lp-eye:hover { color: rgba(255,255,255,1) !important; }

  @media (max-width: 768px) {
    .lp-left { display: none !important; }
    .lp-right { width: 100% !important; }
  }
`;

/* ─── Animated SVG Wave Canvas ─────────────────────────────────────── */
const WaveBg = () => (
  <svg
    style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "45%", opacity: 0.18 }}
    viewBox="0 0 1800 400"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="rgba(79,140,255,0.6)"
      style={{ animation: "wave1 7s ease-in-out infinite" }}
      d="M0,160 C200,100 400,220 600,140 C800,60 1000,180 1200,120 C1400,60 1600,160 1800,100 L1800,400 L0,400 Z"
    />
    <path
      fill="rgba(79,140,255,0.35)"
      style={{ animation: "wave2 9s ease-in-out infinite" }}
      d="M0,200 C300,130 600,260 900,180 C1200,100 1500,220 1800,150 L1800,400 L0,400 Z"
    />
  </svg>
);

/* ─── Floating particle dots ─────────────────────────────────────── */
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
          background: "rgba(79,140,255,0.75)",
          animation: `pulseDot 3s ease-in-out infinite`,
          animationDelay: d.delay,
        }}
      />
    ))}
  </>
);

/* ─── Main Component ─────────────────────────────────────────────── */
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
      background: "linear-gradient(135deg, #06101f 0%, #0d1b35 50%, #112448 100%)",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Animated background waves + dots */}
      <WaveBg />
      <ParticleDots />

      {/* Subtle radial glow behind card */}
      <div style={{
        position: "absolute",
        right: "20%", top: "50%",
        transform: "translate(50%, -50%)",
        width: 600, height: 600,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(30,80,180,0.22) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ── Outer wrapper ── */}
      <div style={{
        display: "flex",
        width: "100%",
        maxWidth: 980,
        minHeight: 540,
        margin: "0 20px",
        borderRadius: 28,
        overflow: "hidden",
        boxShadow: "0 40px 90px -20px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.07)",
        animation: "cardIn 0.8s cubic-bezier(0.22,1,0.36,1) both",
      }}>

        {/* ── LEFT PANEL ── */}
        <div className="lp-left" style={{
          width: "45%",
          background: "linear-gradient(155deg, #0a1628 0%, #0e2040 60%, #152d5a 100%)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "56px 48px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* left background glow */}
          <div style={{
            position: "absolute", left: -80, top: "40%",
            width: 340, height: 340, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(20,60,150,0.35) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Logo floating */}
          <div style={{
            animation: "floatLogoLeft 5s ease-in-out infinite",
            marginBottom: 36,
          }}>
            <img src={logo} alt="Abhitech" style={{ width: 140, height: "auto", objectFit: "contain" }} />
          </div>

          {/* Headline */}
          <div style={{
            animation: "fadeSlideIn 0.9s ease both",
            animationDelay: "0.25s",
            opacity: 0,
            animationFillMode: "forwards",
          }}>
            <p style={{
              fontSize: 11, letterSpacing: "0.22em",
              color: "rgba(79,140,255,0.85)",
              marginBottom: 10, fontWeight: 600,
              textTransform: "uppercase",
            }}>ABHITECH Energycon Limited</p>
            <h1 style={{
              fontSize: 26, fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.25,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}>
              FURNACE FLAME<br />TEMPERATURE<br />MAPPING SYSTEM
            </h1>
            <p style={{
              fontSize: 13.5,
              color: "rgba(255,255,255,0.48)",
              lineHeight: 1.7,
              fontWeight: 300,
              maxWidth: 240,
            }}>
              Advanced monitoring and analysis<br />for industrial furnace optimization
            </p>
          </div>

          {/* Bottom copyright */}
          <p style={{
            position: "absolute", bottom: 28, left: 48,
            fontSize: 11, color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.05em",
            animation: "fadeIn 1.2s ease both",
            animationDelay: "1s",
            animationFillMode: "forwards",
            opacity: 0,
          }}>
            © Abhitech Energycon Limited • All rights reserved
          </p>
        </div>

        {/* ── RIGHT PANEL (Card) ── */}
        <div style={{
          flex: 1,
          background: "linear-gradient(160deg, rgba(30,52,90,0.92) 0%, rgba(18,34,66,0.97) 100%)",
          backdropFilter: "blur(24px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "52px 44px",
        }}>
          {/* Logo */}
          <div style={{ animation: "floatLogo 5.5s ease-in-out infinite", marginBottom: 18 }}>
            <img src={logo} alt="Abhitech" style={{ width: 130, height: "auto", objectFit: "contain" }} />
          </div>

          {/* Title */}
          <div style={{
            animation: "fadeSlideUp 0.75s ease both",
            animationDelay: "0.35s",
            animationFillMode: "forwards",
            opacity: 0,
            textAlign: "center",
            marginBottom: 34,
          }}>
            <p style={{
              fontSize: 12.5,
              letterSpacing: "0.16em",
              color: "rgba(255,255,255,0.8)",
              fontWeight: 600,
              textTransform: "uppercase",
              lineHeight: 1.6,
            }}>
              FURNACE FLAME TEMPERATURE<br />MAPPING SYSTEM
            </p>
          </div>

          {/* Username */}
          <div style={{
            position: "relative", width: "100%", marginBottom: 14,
            animation: "fadeSlideUp 0.75s ease both",
            animationDelay: "0.5s",
            animationFillMode: "forwards",
            opacity: 0,
          }}>
            <span style={{
              position: "absolute", left: 16, top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(255,255,255,0.45)",
              display: "flex", alignItems: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                padding: "15px 16px 15px 44px",
                border: "1px solid rgba(255,255,255,0.13)",
                borderRadius: 14,
                fontSize: 14.5,
                color: "#ffffff",
                background: "rgba(255,255,255,0.07)",
                outline: "none",
                fontFamily: "'Inter', sans-serif",
                transition: "border-color 0.25s, background 0.25s, box-shadow 0.25s",
              }}
            />
          </div>

          {/* Password */}
          <div style={{
            position: "relative", width: "100%", marginBottom: 22,
            animation: "fadeSlideUp 0.75s ease both",
            animationDelay: "0.65s",
            animationFillMode: "forwards",
            opacity: 0,
          }}>
            <span style={{
              position: "absolute", left: 16, top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(255,255,255,0.45)",
              display: "flex", alignItems: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                padding: "15px 44px 15px 44px",
                border: "1px solid rgba(255,255,255,0.13)",
                borderRadius: 14,
                fontSize: 14.5,
                color: "#ffffff",
                background: "rgba(255,255,255,0.07)",
                outline: "none",
                fontFamily: "'Inter', sans-serif",
                transition: "border-color 0.25s, background 0.25s, box-shadow 0.25s",
              }}
            />
            <button
              className="lp-eye"
              type="button"
              onClick={() => setShowPassword(s => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute", right: 14, top: "50%",
                transform: "translateY(-50%)",
                background: "none", border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.45)",
                display: "flex", alignItems: "center",
                padding: 0,
                transition: "color 0.2s",
              }}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {/* Login Button */}
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
                padding: "15px",
                background: "linear-gradient(90deg, #15244a 0%, #2751a0 50%, #3a6fd4 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: 14,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: "0.06em",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 10px 30px -8px rgba(0,0,0,0.55)",
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