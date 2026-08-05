import { useState } from "react"
import axios from "axios"

const API_BASE ="https://chitchat-ny5e.onrender.com";
  
export default function SignupPage({ setUser, setPage }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")

  const signup = async () => {
    try {
      const res = await axios.post(`${API_BASE}/user/signup`, { name, email, password, phone })
      console.log('Signup response:', res.data)
      const { user, token } = res.data;
      localStorage.setItem("token", token);
      setUser(user)
      setPage('chat')
    } catch (e) {
      if (e.response?.status === 400) alert(e.response.data)
      else alert("Signup failed")
    }
  }

  return (
    <div className="auth-container">
      <div className="glass-panel auth-box">
        <h2 style={{ color: "#0369a1", marginBottom: 20 }}>Signup</h2>
        <input style={{ width: "100%" }} placeholder="Name" onChange={e => setName(e.target.value)} /><br /><br />
        <input style={{ width: "100%" }} placeholder="Email" onChange={e => setEmail(e.target.value)} /><br /><br />
        <input style={{ width: "100%" }} placeholder="Password" type="password" onChange={e => setPassword(e.target.value)} /><br /><br />
        <input style={{ width: "100%" }} placeholder="Phone Number" onChange={e => setPhone(e.target.value)} /><br /><br />
        <button 
          onClick={signup}
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
          Signup
        </button>
        <p style={{ marginTop: 20, color: "#334155" }}>
          Already registered? <span style={{ color: "#0284c7", cursor: "pointer", fontWeight: "bold" }} onClick={() => setPage('login')}>Login</span>
        </p>
      </div>
    </div>
  )
}