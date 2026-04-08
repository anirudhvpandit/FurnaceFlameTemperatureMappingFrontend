import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
    const [username,setUsername] = useState("");
    const [password,setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async () => {   
        const response = await axios.post("http://91.203.132.34:8000/login", {
            username,
            password
        });
        if (response.status === 200) {
            const data = response.data;
            localStorage.setItem("username",data.username)
        }
        navigate("/station-select");
    }
    return (
        <>
            <label>
                USERNAME
            </label>
            <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <label>
                PASSWORD
            </label>
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleLogin}>
                LOGIN
            </button>
        </>
    );
}

export default LoginPage;