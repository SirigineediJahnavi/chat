import { useState } from "react"
import axios from "axios"

export default function Signup({ onSignup }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  const signup = async () => {
    try {
      const res = await axios.post("http://localhost:5001/user/signup", { name, email })
      onSignup(res.data.name)
    } catch (e) {
      alert(e.response?.data || "Error signing up")
    }
  }

  return (
    <div style={{ padding: "50px" }}>
      <h2>Signup</h2>
      <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <button onClick={signup}>Signup</button>
    </div>
  )
}