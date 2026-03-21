import { useState } from "react"
import LoginPage from "./pages/LoginPage"
import SignupPage from "./pages/SignupPage"
import ChatPage from "./pages/ChatPage"

function App(){
  const [user,setUser] = useState(null)
  const [page,setPage] = useState('signup') // default is signup

  return page==='signup' 
    ? <SignupPage setUser={setUser} setPage={setPage} />
    : page==='login' 
      ? <LoginPage setUser={setUser} setPage={setPage} />
      : <ChatPage user={user}/>
}

export default App