import { useState } from "react"
import axios from "axios"

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("")

  const login = async () => {
    try {
      const res = await axios.post("http://localhost:5001/user/login", { email })
      onLogin(res.data.name)
    } catch (e) {
      alert(e.response?.data || "Invalid email")
    }
  }

  return (
    <div style={{ padding: "50px" }}>
      <h2>Login</h2>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <button onClick={login}>Login</button>
    </div>
  )
}