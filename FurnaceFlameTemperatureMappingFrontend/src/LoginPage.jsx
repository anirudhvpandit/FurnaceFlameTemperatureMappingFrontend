import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            const response = await axios.post("http://91.203.132.34:8080/login", {
                username,
                password
            });
            if (response.status === 200) {
                const data = response.data;
                console.log(data);
                
                localStorage.setItem("username", data.username);
                localStorage.setItem("location",data.location);
                localStorage.setItem("role", data.role);
            }
            navigate("/station-select");
        } catch (error) {
            console.error("Login failed:", error);
            alert("Login failed. Please check your credentials.");
        }
    };

    const UI = {
        bg: "#f6f7fb",
        panel: "#ffffff",
        text: "#12121a",
        muted: "#6e6c96",
        primary: "#4f46e5",
        border: "#e6e4f2",
        radius: "12px",
        shadowCard: "0 6px 24px rgba(79,70,229,0.08)",
    };

    const S = {
        container: {
            background: UI.bg,
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
        },
        card: {
            background: UI.panel,
            padding: "40px",
            borderRadius: UI.radius,
            boxShadow: UI.shadowCard,
            width: "100%",
            maxWidth: "400px",
            textAlign: "center",
        },
        title: {
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "24px",
            letterSpacing: "0.1em",
            color: UI.text,
            marginBottom: "30px",
        },
        label: {
            display: "block",
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.2em",
            color: UI.muted,
            marginBottom: "8px",
            textAlign: "left",
        },
        input: {
            width: "100%",
            padding: "12px 16px",
            border: `1px solid ${UI.border}`,
            borderRadius: "6px",
            fontSize: "14px",
            color: UI.text,
            background: UI.panel,
            marginBottom: "20px",
            outline: "none",
            transition: "border-color 0.2s",
        },
        button: {
            width: "100%",
            padding: "12px",
            background: UI.primary,
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontFamily: "'DM Mono', monospace",
            fontSize: "12px",
            letterSpacing: "0.1em",
            cursor: "pointer",
            transition: "background 0.2s",
        },
    };

    return (
        <div style={S.container}>
            <div style={S.card}>
                <div style={S.title}>LOGIN</div>
                <div>
                    <label style={S.label}>USERNAME</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={S.input}
                        placeholder="Enter your username"
                    />
                </div>
                <div>
                    <label style={S.label}>PASSWORD</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={S.input}
                        placeholder="Enter your password"
                    />
                </div>
                <button onClick={handleLogin} style={S.button}>
                    LOGIN
                </button>
            </div>
        </div>
    );
};

export default LoginPage;