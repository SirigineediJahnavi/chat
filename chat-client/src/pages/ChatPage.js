import { useEffect, useState } from "react"
import { io } from "socket.io-client"
import axios from "axios"

const socket = io("http://localhost:5001")

export default function Chat({ user }) {
  const [other, setOther] = useState("")
  const [otherInput, setOtherInput] = useState("")
  const [msg, setMsg] = useState("")
  const [list, setList] = useState([])
  const [room, setRoom] = useState("")

  const joinRoom = async () => {
    setOther(otherInput)
    const res = await axios.post("http://localhost:5001/chat", { user1: user, user2: otherInput })
    const r = [user, otherInput].sort().join("_")
    setRoom(r)
    socket.emit("join_room", r)
  }

  const send = () => {
    socket.emit("send_message", { sender: user, receiver: other, text: msg, room })
    setMsg("")
  }

  useEffect(() => {
    socket.on("receive_message", data => setList(prev => [...prev, data]))
    return () => socket.off("receive_message")
  }, [])

  return (
    <div style={{ padding: "50px" }}>
      {!room && (
        <div>
          <input placeholder="Chat with" value={otherInput} onChange={e => setOtherInput(e.target.value)} />
          <button onClick={joinRoom}>Start Chat</button>
        </div>
      )}
      {room && (
        <>
          <h2>Chat with {other}</h2>
          <input placeholder="Message" value={msg} onChange={e => setMsg(e.target.value)} />
          <button onClick={send}>Send</button>
          <div>
            {list.map((m, i) => (
              <p key={i}><b>{m.sender}:</b> {m.text}</p>
            ))}
          </div>
        </>
      )}
    </div>
  )
}