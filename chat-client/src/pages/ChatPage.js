import { useEffect, useState } from "react"
import { io } from "socket.io-client"
import axios from "axios"

const socket = io("http://localhost:5001")

export default function ChatPage({ user }) {
  const [other, setOther] = useState("")
  const [room, setRoom] = useState("")
  const [msg, setMsg] = useState("")
  const [list, setList] = useState([])
  const [online, setOnline] = useState([])
  const [typingUser, setTypingUser] = useState("")

  // Online users + messages + read receipts
  useEffect(() => {
    socket.emit("user_online", user.phone)
    socket.on("online_users", setOnline)
    socket.on("receive_message", m => setList(prev => [...prev, m]))
    socket.on("message_read", id =>
      setList(prev => prev.map(m => m._id === id ? { ...m, read: true } : m))
    )
    return () => {
      socket.off("online_users")
      socket.off("receive_message")
      socket.off("message_read")
    }
  }, [user.phone])

  // Typing indicator
  useEffect(() => {
    socket.on("typing", u => setTypingUser(u))
    return () => socket.off("typing")
  }, [])

  const joinRoom = async () => {
  if (!other) return;

  try {
    // Check if user exists
    const res = await axios.post("http://localhost:5001/user/check", { phone: other });

    if (!res.data.exists) {
      alert("User not found!");
      return; // stop here, don’t go to chat page
    }

    // If user exists, proceed
    const r = [user.phone, other].sort().join("_");
    setRoom(r);
    socket.emit("join_room", r);

    const chatRes = await axios.post("http://localhost:5001/chat", { user1: user.phone, user2: other });
    setList(chatRes.data.messages || []);
  } catch (err) {
    console.error(err);
    alert("Error checking user");
  }
};

// ChatPage.js
  useEffect(() => {
    let timeout;
    socket.on("typing", (u) => {
      setTypingUser(u);
      clearTimeout(timeout);
      if (u) {
        timeout = setTimeout(() => setTypingUser(""), 3000);
      }
    });
    return () => socket.off("typing");
  }, []);

  
  const send = () => {
  if (!msg || !room) return
  const data = { sender: user.phone, receiver: other, text: msg, room, read: false }
  socket.emit("send_message", data)
  setMsg("")   // don’t add to list here
}


  const handleRead = id => {
    if (room)  socket.emit("message_read", { room, messageId: id, reader: user.phone })
  }


  return (
    <div style={{ padding: 20, background: "#e0f7ff", height: "100vh" }}>
      {!room ? (
        <>
          <input placeholder="chat with" onChange={e => setOther(e.target.value)} />
          <button onClick={joinRoom}>Start Chat</button>
        </>
      ) : (
        <>
          <h2>Chat with {other}</h2>
          <div>Online: {online.join(", ")}</div>
          <div style={{ margin: "10px 0", maxHeight: "60vh", overflowY: "auto" }}>
            {list.map((m, idx) => (
              <p
                key={m._id || `${m.sender}-${idx}`}
                onMouseEnter={() => handleRead(m._id)}
                style={{
                  background: m.sender === user.phone ? "#cceeff" : "#ffffff",
                  padding: 5,
                  borderRadius: 5,
                  marginBottom: 5
                }}
              >
                <b>{m.sender}</b>: {m.text}
              
              {m.sender === user.phone && (
              m.read ? <span style={{ color: "blue" }}> ✓✓</span> :
              m.received ? <span> ✓✓</span> :
              m.delivered ? <span> ✓</span> :
              <span> ⏳</span>
            )}

              </p>
            ))}
          </div>

          {typingUser && <div>{typingUser} is typing...</div>}

          

        <input
          value={msg}
          onChange={e => {
            setMsg(e.target.value);
            if (room) socket.emit("typing_start", { room, user: user.phone });
          }}
          onBlur={() => { if (room) socket.emit("typing_stop", { room }); }}
        />



          <button onClick={send}>Send</button>
        </>
      )}
    </div>
  )
}

