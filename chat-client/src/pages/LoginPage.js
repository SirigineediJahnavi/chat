import { useState } from "react";
import axios from "axios";

export default function LoginPage({ setUser, setPage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      const res = await axios.post("http://localhost:5001/user/login", { email, password });
      console.log("Login response:", res.data);
      const { user, token } = res.data;
      localStorage.setItem("token", token);
      setUser(user);
      setPage("chat");
    } catch (e) {
      if (e.response?.status === 400) alert("Invalid email or password");
      else alert("Login failed");
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-box">
        <h2 style={{ color: "#0369a1", marginBottom: 20 }}>Login</h2>
        <input 
          style={{ width: "100%" }} 
          placeholder="Email" 
          onChange={e => setEmail(e.target.value)} 
        /><br /><br />
        <input 
          style={{ width: "100%" }} 
          placeholder="Password" 
          type="password" 
          onChange={e => setPassword(e.target.value)} 
        /><br /><br />
        <button 
          onClick={login}
          style={{
            padding: "10px 24px",
            background: "#0ea5e9",
            color: "white",
            border: "none",
            borderRadius: "20px",
            cursor: "pointer",
            fontWeight: "bold",
            width: "100%",
            boxShadow: "0 4px 6px rgba(14, 165, 233, 0.2)"
          }}
        >
          Login
        </button>
        <p style={{ marginTop: 20, color: "#334155" }}>
          New user? <span style={{ color: "#0284c7", cursor: "pointer", fontWeight: "bold" }} onClick={() => setPage("signup")}>Signup</span>
        </p>
      </div>
    </div>
  );
}