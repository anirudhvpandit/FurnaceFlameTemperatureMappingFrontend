import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "./assets/abhitech-logo.png";

const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async () => {
    try {
        const response = await axios.post("https://abhiftm.com/api/login", {
            username,
            password
        });

        const data = response.data;
        console.log(data);
        
        // Validate response
        if (
            data.location === null
        ) {
            alert("Invalid username or password.");
            return;
        }

        localStorage.setItem("username", data.username);
        localStorage.setItem("location", data.location);
        localStorage.setItem("role", data.role);

        navigate("/station-select");

    } catch (error) {
        console.error("Login failed:", error);

        // Better API error handling
        if (error.response) {
            alert(
                error.response.data?.message ||
                error.response.data?.detail ||
                "Invalid username or password."
            );
        } else {
            alert("Server unreachable. Please try again.");
        }
    }
};

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            handleLogin();
        }
    };

    const UI = {
        pageBg: "linear-gradient(135deg, #0c1730 0%, #16223d 45%, #2c4870 100%)",
        panel: "linear-gradient(160deg, rgba(122,140,170,0.55) 0%, rgba(68,93,136,0.6) 100%)",
        panelBorder: "rgba(255,255,255,0.18)",
        text: "#ffffff",
        muted: "rgba(255,255,255,0.65)",
        inputBg: "rgba(255,255,255,0.1)",
        inputBorder: "rgba(255,255,255,0.16)",
        placeholder: "rgba(255,255,255,0.55)",
        radius: "20px",
        shadowCard: "0 25px 60px -15px rgba(0,0,0,0.55)",
    };

    const S = {
        container: {
            background: UI.pageBg,
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
        },
        card: {
            background: UI.panel,
            border: `1px solid ${UI.panelBorder}`,
            backdropFilter: "blur(18px)",
            padding: "44px 40px",
            borderRadius: UI.radius,
            boxShadow: UI.shadowCard,
            width: "100%",
            maxWidth: "400px",
            textAlign: "center",
        },
        logoWrap: {
            display: "flex",
            justifyContent: "center",
            marginBottom: "10px",
        },
        logo: {
            width: "150px",
            height: "auto",
            objectFit: "contain",
            filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.35))",
        },
        tagline: {
            fontFamily: "'Inter', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.18em",
            color: UI.muted,
            marginBottom: "30px",
        },
        fieldWrap: {
            position: "relative",
            marginBottom: "16px",
        },
        input: {
            width: "100%",
            padding: "14px 16px",
            border: `1px solid ${UI.inputBorder}`,
            borderRadius: "12px",
            fontSize: "15px",
            color: UI.text,
            background: UI.inputBg,
            outline: "none",
            transition: "border-color 0.2s",
            boxSizing: "border-box",
            fontFamily: "'Inter', sans-serif",
        },
        eyeBtn: {
            position: "absolute",
            right: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.75)",
            display: "flex",
            alignItems: "center",
            padding: 0,
        },
        button: {
            width: "100%",
            marginTop: "10px",
            padding: "14px",
            background: "linear-gradient(90deg, #18243e 0%, #3a5a8c 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 800,
            fontSize: "15px",
            letterSpacing: "0.03em",
            cursor: "pointer",
            boxShadow: "0 10px 25px -8px rgba(0,0,0,0.5)",
            transition: "filter 0.2s",
        },
    };

    return (
        <div style={S.container}>
            <div style={S.card}>
                <div style={S.logoWrap}>
                    <img src={logo} alt="Abhitech" style={S.logo} />
                </div>
                <div style={S.tagline}>FURNACE FLAME TEMPERATURE MAPPING SYSTEM</div>

                <div style={S.fieldWrap}>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={S.input}
                        placeholder="Username"
                        autoComplete="username"
                    />
                </div>

                <div style={S.fieldWrap}>
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{ ...S.input, paddingRight: "44px" }}
                        placeholder="Password"
                        autoComplete="current-password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        style={S.eyeBtn}
                        aria-label={showPassword ? "Hide password" : "Show password"}
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

                <button onClick={handleLogin} style={S.button}>
                    Log In
                </button>

            </div>
        </div>
    );
};

export default LoginPage;