import { useState } from "react"
import axios from "axios"

export default function LoginPage({ setUser, setPage }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const login = async () => {
    try {
      const res = await axios.post("http://localhost:5001/user/login", { email, password })
      setUser(res.data)
      setPage('chat')
    } catch (e) {
      if (e.response?.status === 400) alert("Invalid email or password")
      else alert("Login failed")
    }
  }

  return (
    <div style={{ padding: 50, background: "#e0f7ff", minHeight: "100vh" }}>
      <h2>Login</h2>
      <input placeholder="Email" onChange={e => setEmail(e.target.value)} /><br /><br />
      <input placeholder="Password" type="password" onChange={e => setPassword(e.target.value)} /><br /><br />
      <button onClick={login}>Login</button>
      <p style={{ marginTop: 10 }}>
        New user? <span style={{ color: "blue", cursor: "pointer" }} onClick={() => setPage('signup')}>Signup</span>
      </p>
    </div>
  )
}