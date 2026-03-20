import { useState } from "react"
import SignupPage from "./pages/SignupPage"
import LoginPage from "./pages/LoginPage"
import ChatPage from "./pages/ChatPage"

function App() {
  const [user, setUser] = useState("")
  const [showSignup, setShowSignup] = useState(false)

  if (!user) {
    return showSignup ? (
      <div>
        <SignupPage onSignup={name => setUser(name)} />
        <p style={{ marginTop: "10px" }}>
          Already have an account?{" "}
          <button onClick={() => setShowSignup(false)}>Login</button>
        </p>
      </div>
    ) : (
      <div>
        <LoginPage onLogin={name => setUser(name)} />
        <p style={{ marginTop: "10px" }}>
          New user?{" "}
          <button onClick={() => setShowSignup(true)}>Signup</button>
        </p>
      </div>
    )
  }

  return <ChatPage user={user} />
}

export default App