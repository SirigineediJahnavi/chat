import { useEffect, useState, useRef } from "react"
import { io } from "socket.io-client"
import axios from "axios"
import SimplePeer from "simple-peer"

const SOCKET_URL = "https://chitchat-ny5e.onrender.com";
const API_BASE = "https://chitchat-ny5e.onrender.com";
  
const socket = io(SOCKET_URL);

export default function ChatPage({ user }) {
  const [arr, setArr] = useState([]) // Chat list
  const [sel, setSel] = useState(null) // Selected user
  const [msg, setMsg] = useState("") // Message input
  const [list, setList] = useState([]) // Messages
  const [online, setOnline] = useState([]) // Online users
  const [typingUser, setTypingUser] = useState("")
  const [search, setSearch] = useState("")
  const [searchResult, setSearchResult] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)
  const [onCall, setOnCall] = useState(false)
  const [currentCallId, setCurrentCallId] = useState(null)
  const [isVideoCall, setIsVideoCall] = useState(false)
  
  // Important contacts & features
  const [importantContacts, setImportantContacts] = useState([])
  const [showScheduleMsg, setShowScheduleMsg] = useState(false)
  const [scheduleTime, setScheduleTime] = useState("")
  const [scheduleMsg, setScheduleMsg] = useState("")
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  // WebRTC refs
  const peerRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const localAudioRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const callDataRef = useRef(null)
  const pendingSignalsRef = useRef([])

  // Subscribe to notifications on mount and handle permissions
  useEffect(() => {
    const saved = localStorage.getItem("importantContacts")
    if (saved) setImportantContacts(JSON.parse(saved))

    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        console.log("Microphone permission granted")
        stream.getTracks().forEach(track => track.stop())
      })
      .catch(err => {
        console.error("Microphone permission error:", err)
      })

    if ("serviceWorker" in navigator && "Notification" in window) {
      navigator.serviceWorker.register("/sw.js")
        .then(registration => {
          console.log("Service Worker registered");
          
          if (Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
              if (permission === "granted") {
                console.log("Notification permission granted")
              }
            })
          }

          if (Notification.permission === "granted" && user?.phone) {
            registration.pushManager.getSubscription()
              .then(subscription => {
                if (!subscription) {
                  const vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY
                  if (vapidKey && vapidKey !== "Your_VAPID_Public_Key") {
                    return registration.pushManager.subscribe({
                      userVisibleOnly: true,
                      applicationServerKey: urlBase64ToUint8Array(vapidKey)
                    })
                  }
                }
                return subscription
              })
              .then(subscription => {
                if (subscription) {
                  axios.post(`${API_BASE}/user/subscribe`, {
                    phone: user.phone,
                    subscription: subscription
                  }).catch(err => console.log("Subscription save error:", err))
                }
              })
              .catch(err => console.log("Subscription error:", err));
          }
        })
        .catch(err => console.log("SW registration failed:", err));
    }

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [user?.phone])

  const urlBase64ToUint8Array = (base64String) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  useEffect(() => {
    const f = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(`${API_BASE}/chat/getChats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setArr(res.data)
      } catch (e) {
        console.error("Error loading chats:", e)
      }
    }
    if (user) f()
  }, [user])

  const load = async (u) => {
    setSel(u)
    const r = [user.phone, u.phone].sort().join("_")
    socket.emit("join_room", r)
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${API_BASE}/chat/getMessages/${u.phone}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setList(res.data)
      setTimeout(() => {
        res.data.forEach(m => {
          if (m.receiver === user.phone && !m.delivered) {
            socket.emit("message_delivered", { messageId: m._id, room: r })
          }
          if (m.receiver === user.phone && !m.read) {
            socket.emit("message_read", { messageId: m._id, room: r, reader: user.phone })
          }
        })
      }, 100)
    } catch (e) {
      console.error("Error loading messages:", e)
    }
  }

  useEffect(() => {
    socket.emit("user_online", user?.phone)
    socket.on("online_users", setOnline)
    socket.on("receive_message", m => {
      setList(prev => [...prev, m])
      if (m.receiver === user.phone && sel?.phone === m.sender) {
        socket.emit("message_delivered", { messageId: m._id, room: m.room })
      }
      if (m.receiver === user.phone && importantContacts.includes(m.sender)) {
        playAlarm()
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("🔔 IMPORTANT MESSAGE!", {
            body: `From: ${m.senderName || m.sender}`,
            tag: "important-msg",
            requireInteraction: true
          })
        }
      }
    })

    socket.on("message_delivered", ({ messageId }) => {
      setList(prev => prev.map(m => m._id === messageId ? { ...m, delivered: true, received: true } : m))
    })

    socket.on("message_read", ({ messageId }) => {
      setList(prev => prev.map(m => m._id === messageId ? { ...m, read: true } : m))
    })

    socket.on("incoming_call", ({ caller, callerName, callId, isVideoCall }) => {
      console.log("Incoming call payload received:", { caller, callerName, callId, isVideoCall })
      const videoFlag = Boolean(isVideoCall)
      setIncomingCall({ caller, callerName, callId, isVideoCall: videoFlag })
      setIsVideoCall(videoFlag)
      
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(videoFlag ? "📹 Incoming Video Call" : "📞 Incoming Call", {
          body: `${callerName} is calling...`,
          icon: "/phone-icon.png",
          requireInteraction: true
        })
      }
    })

    socket.on("call_accepted", ({ callId }) => {
      setOnCall(true)
      setCurrentCallId(callId)
    })

    socket.on("webrtc_signal", ({ signal, from }) => {
      if (peerRef.current) {
        peerRef.current.signal(signal)
      } else {
        pendingSignalsRef.current.push(signal)
      }
    })

    socket.on("call_rejected", ({ callId }) => {
      if (peerRef.current) {
        peerRef.current.destroy()
        peerRef.current = null
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
        localStreamRef.current = null
      }
      alert("Call rejected")
      setOnCall(false)
      setCurrentCallId(null)
    })

    socket.on("call_ended", ({ callId }) => {
      if (peerRef.current) {
        peerRef.current.destroy()
        peerRef.current = null
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
        localStreamRef.current = null
      }
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach(track => track.stop())
        remoteStreamRef.current = null
      }
      setOnCall(false)
      setCurrentCallId(null)
    })

    socket.on("call_failed", ({ message }) => alert(message))

    return () => {
      socket.off("online_users")
      socket.off("receive_message")
      socket.off("message_delivered")
      socket.off("message_read")
      socket.off("incoming_call")
      socket.off("call_accepted")
      socket.off("webrtc_signal")
      socket.off("call_rejected")
      socket.off("call_ended")
      socket.off("call_failed")
    }
  }, [user?.phone, sel?.phone])

  useEffect(() => {
    let t
    socket.on("typing", u => {
      setTypingUser(u)
      clearTimeout(t)
      t = setTimeout(() => setTypingUser(""), 2000)
    })
    return () => socket.off("typing")
  }, [])

  const send = () => {
    if (!msg || !sel) return
    const r = [user.phone, sel.phone].sort().join("_")
    const data = {
      sender: user.phone, receiver: sel.phone, text: msg, room: r, senderName: user.name
    }
    socket.emit("send_message", data)
    setMsg("")
  }

  const searchUser = async () => {
    if (!search) return
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(`${API_BASE}/chat/searchUser`, 
        { phone: search }, { headers: { Authorization: `Bearer ${token}` } }
      )
      setSearchResult(res.data)
    } catch (e) {
      console.error("User not found:", e)
      setSearchResult(null)
    }
  }

  const toggleImportantContact = (phone) => {
    let updated
    if (importantContacts.includes(phone)) {
      updated = importantContacts.filter(p => p !== phone)
    } else {
      updated = [...importantContacts, phone]
    }
    setImportantContacts(updated)
    localStorage.setItem("importantContacts", JSON.stringify(updated))
  }

  const playAlarm = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.frequency.value = 1000
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
    setTimeout(() => playAlarmBeep(audioContext, 1500), 600)
    setTimeout(() => playAlarmBeep(audioContext, 1500), 1200)
  }

  const playAlarmBeep = (audioContext, freq) => {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.frequency.value = freq
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }

  const scheduleMessage = async () => {
    if (!sel || !scheduleTime || !scheduleMsg) return
    try {
      const token = localStorage.getItem("token")
      await axios.post(`${API_BASE}/chat/scheduleMessage`, {
        sender: user.phone, receiver: sel.phone, text: scheduleMsg, scheduledTime: scheduleTime
      }, { headers: { Authorization: `Bearer ${token}` } })
      
      alert("Message scheduled successfully!")
      setShowScheduleMsg(false)
      setScheduleMsg("")
      setScheduleTime("")
    } catch (err) {
      console.error("Schedule error:", err)
      alert("Failed to schedule message")
    }
  }

  const initiateCall = async (withVideo = false) => {
    if (!sel || onCall) return
    try {
      const stream = await getLocalStream(withVideo)
      if (!stream) {
        alert("Unable to access microphone/camera. Please check permissions.")
        return
      }
      setIsVideoCall(withVideo)

      const peer = createPeerConnection({
        initiator: true, stream
      })

      peer.on("signal", handleSignal)

      if (withVideo && localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.play().catch(err => console.error("Local video play error:", err))
      }

      peerRef.current = peer
      callDataRef.current = { initiated: true, stream, peer }

      const callId = `${user.phone}_${Date.now()}`
      socket.emit("initiate_call", {
        caller: user.phone, callee: sel.phone, callerName: user.name, isVideoCall: withVideo
      })
      
      setOnCall(true)
      setCurrentCallId(callId)
    } catch (err) {
      console.error("Error initiating call:", err)
      alert("Error starting call: " + err.message)
    }
  }

  const acceptCall = async (withVideo = false) => {
    if (!incomingCall) return
    try {
      const stream = await getLocalStream(withVideo)
      if (!stream) {
        alert("Unable to access microphone/camera. Please check permissions.")
        return
      }
      setIsVideoCall(withVideo)

      const peer = createPeerConnection({
        initiator: false, stream
      })

      peerRef.current = peer
      callDataRef.current = { initiated: false, stream, peer }

      // CRITICAL FIX: Attach signal listener BEFORE processing pending signals
      peer.on("signal", handleSignal)

      if (pendingSignalsRef.current.length > 0) {
        pendingSignalsRef.current.forEach(sig => peer.signal(sig))
        pendingSignalsRef.current = []
      }

      if (withVideo && localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.play().catch(err => console.error("Local video play error:", err))
      }

      socket.emit("accept_call", {
        callId: incomingCall.callId, callee: user.phone, caller: incomingCall.caller, isVideoCall: withVideo
      })

      setIncomingCall(null)
      setOnCall(true)
    } catch (err) {
      console.error("Error accepting call:", err)
      alert("Error accepting call: " + err.message)
    }
  }

  const getLocalStream = async (withVideo = false) => {
    try {
      const constraints = {
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: withVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      if (withVideo && localVideoRef.current) localVideoRef.current.srcObject = stream
      else if (localAudioRef.current) localAudioRef.current.srcObject = stream
      return stream
    } catch (err) {
      console.warn("Video device locked/unavailable, falling back to audio-only:", err)
      if (withVideo) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          localStreamRef.current = audioStream
          setIsVideoCall(false)
          alert("Webcam is busy or locked by another app. Connected with audio instead.")
          return audioStream
        } catch (audioErr) {
          console.error("Audio fallback also failed:", audioErr)
        }
      }
      return null
    }
  }

  const createPeerConnection = ({ initiator, stream }) => {
    const peer = new SimplePeer({
      initiator, 
      trickleIce: true, 
      stream,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      }
    })

    peer.on("stream", (remoteStream) => {
      console.log("Remote stream received successfully!", remoteStream)
      remoteStreamRef.current = remoteStream
      
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream
        remoteAudioRef.current.play().catch((err) => {
          console.error("Audio autoplay failed:", err)
        })
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
        remoteVideoRef.current.play().catch((err) => {
          console.error("Video autoplay failed:", err)
        })
      }
    })

    peer.on("error", (err) => {
      console.error("SimplePeer error:", err)
    })

    return peer
  }

  const handleSignal = (data) => {
    if (!sel) return
    socket.emit("webrtc_signal", { to: sel.phone, signal: data, from: user.phone })
  }

  const rejectCall = () => {
    if (!incomingCall) return
    socket.emit("reject_call", { callId: incomingCall.callId, caller: incomingCall.caller })
    setIncomingCall(null)
    pendingSignalsRef.current = []
  }

  const endCall = () => {
    if (!sel || !currentCallId) return
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop())
      remoteStreamRef.current = null
    }
    if (localAudioRef.current) localAudioRef.current.srcObject = null
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
    callDataRef.current = null
    socket.emit("end_call", { callId: currentCallId, otherUser: sel.phone })
    setOnCall(false)
    setCurrentCallId(null)
    pendingSignalsRef.current = []
  }

  const renderMessageStatus = (m) => {
    if (m.sender !== user.phone) return null
    if (m.read) return <span style={{ color: "#0284c7", fontWeight: "bold", fontSize: 14 }}>✓✓</span>
    else if (m.delivered && m.received) return <span style={{ color: "gray", fontSize: 14 }}>✓✓</span>
    else return <span style={{ color: "lightgray", fontSize: 14 }}>✓</span>
  }

  return (
    <div style={{ display: "flex", height: "100vh", position: "relative" }}>
      
      {/* Hidden audio elements for call streams - local is MUTED to prevent echo */}
      <audio ref={localAudioRef} autoPlay playsInline muted />
      <audio ref={remoteAudioRef} autoPlay playsInline />
      
      {/* INCOMING CALL NOTIFICATION */}
      {incomingCall && (
        <div className="glass-panel" style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", borderRadius: 24, padding: 20, zIndex: 1000, minWidth: 300, textAlign: "center"
        }}>
          <h2 style={{ color: "#0c4a6e" }}>📞 Incoming Call</h2>
          <p style={{ fontSize: 16, marginBottom: 15, color: "#0c4a6e" }}>{incomingCall.callerName} is {incomingCall.isVideoCall ? "📹 video " : ""}calling...</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => acceptCall(incomingCall.isVideoCall)}
              style={{ padding: "10px 20px", backgroundColor: "#25D366", color: "white", border: "none", borderRadius: 20, cursor: "pointer", fontWeight: "bold", fontSize: 14 }}
            >
              ✓ Accept {incomingCall.isVideoCall ? "Video" : "Audio"}
            </button>
            <button
              onClick={rejectCall}
              style={{ padding: "10px 20px", backgroundColor: "#FF4444", color: "white", border: "none", borderRadius: 20, cursor: "pointer", fontWeight: "bold", fontSize: 14 }}
            >
              ✕ Reject
            </button>
          </div>
        </div>
      )}

      {/* ON CALL INDICATOR */}
      {onCall && (
        <div className="glass-panel" style={{
          position: "fixed", top: 20, left: isMobile ? 10 : "50%", transform: isMobile ? "none" : "translateX(-50%)", padding: "10px 20px", borderRadius: 20, zIndex: 999, width: isMobile ? "90%" : "auto", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#0c4a6e", fontWeight: "bold"
        }}>
          <span>{isVideoCall ? "📹 Video Call" : "📞 Audio Call"} with {sel?.name}</span>
          <button
            onClick={endCall}
            style={{ marginLeft: 15, padding: "5px 15px", backgroundColor: "#FF4444", color: "white", border: "none", borderRadius: 15, cursor: "pointer" }}
          >
            End Call
          </button>
        </div>
      )}

      {/* VIDEO DISPLAY AREA */}
      <div className="glass-panel" style={{
        position: "fixed", bottom: 20, right: 20, width: isMobile ? "100%" : 300, height: isMobile ? "100%" : 300, borderRadius: 24, overflow: "hidden", zIndex: 998,
        display: onCall && isVideoCall ? "block" : "none"
      }}>
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <video
          ref={localVideoRef} autoPlay playsInline muted
          style={{ position: "absolute", bottom: 10, right: 10, width: isMobile ? 100 : 150, height: isMobile ? 100 : 150, borderRadius: 16, border: "2px solid rgba(255,255,255,0.5)" }}
        />
      </div>

      {/* LEFT PANEL - CHAT LIST & SEARCH */}
      <div className="glass-panel" style={{ 
        width: isMobile ? sel ? "0%" : "100%" : "30%", 
        borderRight: "1px solid rgba(255,255,255,0.3)", 
        padding: isMobile ? (sel ? 0 : 10) : 15, 
        overflowY: "auto", 
        display: isMobile && sel ? "none" : "block",
        height: "100%",
        borderRadius: isMobile ? "0" : "0 24px 24px 0",
        borderTop: "none", borderBottom: "none", borderLeft: "none"
      }}>
        <h3 style={{ color: "#0369a1" }}>💬 Chats</h3>
        
        <div style={{ marginBottom: 15 }}>
          <input
            type="tel" placeholder="Search by phone" value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && searchUser()}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <button 
            onClick={searchUser} 
            style={{ width: "100%", padding: 10, backgroundColor: "rgba(59, 130, 246, 0.8)", color: "white", border: "none", borderRadius: 20, cursor: "pointer", fontWeight: "bold" }}
          >
            Search
          </button>
        </div>

        {searchResult && (
          <div
            className="glass-panel"
            onClick={() => {
              load(searchResult)
              setSearchResult(null)
              setSearch("")
            }}
            style={{ padding: 15, marginBottom: 10, borderRadius: 20, cursor: "pointer" }}
          >
            <strong style={{ color: "#0369a1" }}>🔍 {searchResult.name}</strong><br/>
            <small>{searchResult.phone}</small>
          </div>
        )}

        <div style={{ marginTop: 15 }}>
          <h4 style={{ color: "#0369a1" }}>Recent Chats</h4>
          {arr.length === 0 ? (
            <p style={{ color: "#334155" }}>No chats yet. Search to start a conversation!</p>
          ) : (
            arr.map(u => (
              <div
                key={u._id}
                className="glass-panel"
                onClick={() => load(u)}
                style={{
                  cursor: "pointer", padding: 12, marginBottom: 8, borderRadius: 20,
                  backgroundColor: sel?._id === u._id ? "rgba(59, 130, 246, 0.5)" : "transparent",
                  color: sel?._id === u._id ? "#fff" : "inherit",
                  transition: "all 0.2s"
                }}
              >
                <strong>{u.name}</strong>
                <small style={{ display: "block", fontSize: 12 }}>{u.phone}</small>
                {online.includes(u.phone) && (
                  <small style={{ color: sel?._id === u._id ? "#fff" : "#0284c7", fontWeight: "bold" }}>● Online</small>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL - CHAT MESSAGES */}
      <div style={{ 
        width: isMobile ? (sel ? "100%" : "0%") : "70%",
        display: isMobile ? (sel ? "flex" : "none") : "flex",
        flexDirection: "column", padding: isMobile ? 10 : 15, height: "100%"
      }}>
        {sel ? (
          <>
            <div style={{ 
              borderBottom: "1px solid rgba(255,255,255,0.4)", paddingBottom: 10, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10
            }}>
              <div>
                <h3 style={{ margin: 0, marginBottom: 5, color: "#0369a1" }}>{sel.name}</h3>
                <small style={{ color: online.includes(sel.phone) ? "#0284c7" : "#64748b" }}>
                  {online.includes(sel.phone) ? "🟢 Online" : "🔘 Offline"}
                </small>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => initiateCall(false)}
                  disabled={!online.includes(sel.phone) || onCall}
                  style={{
                    padding: isMobile ? "8px 12px" : "10px 20px", backgroundColor: online.includes(sel.phone) && !onCall ? "rgba(37, 211, 102, 0.9)" : "rgba(255,255,255,0.4)", color: "white", border: "none", borderRadius: 20, cursor: online.includes(sel.phone) && !onCall ? "pointer" : "not-allowed", fontWeight: "bold", fontSize: isMobile ? 12 : 14
                  }}
                >
                  📞 Call
                </button>
                <button
                  onClick={() => initiateCall(true)}
                  disabled={!online.includes(sel.phone) || onCall}
                  style={{
                    padding: isMobile ? "8px 12px" : "10px 20px", backgroundColor: online.includes(sel.phone) && !onCall ? "rgba(59, 130, 246, 0.9)" : "rgba(255,255,255,0.4)", color: "white", border: "none", borderRadius: 20, cursor: online.includes(sel.phone) && !onCall ? "pointer" : "not-allowed", fontWeight: "bold", fontSize: isMobile ? 12 : 14
                  }}
                >
                  📹 Video
                </button>
                <button
                  onClick={() => toggleImportantContact(sel.phone)}
                  style={{
                    padding: isMobile ? "8px 12px" : "10px 20px", backgroundColor: importantContacts.includes(sel.phone) ? "rgba(255, 107, 107, 0.9)" : "rgba(255, 179, 71, 0.9)", color: "white", border: "none", borderRadius: 20, cursor: "pointer", fontWeight: "bold", fontSize: isMobile ? 12 : 14
                  }}
                >
                  {importantContacts.includes(sel.phone) ? "⭐ Important" : "☆ Add"}
                </button>
              </div>
            </div>

            <div className="glass-panel" style={{ 
              flex: 1, overflowY: "auto", marginBottom: 15, padding: 20, borderRadius: 24, display: "flex", flexDirection: "column"
            }}>
              {list.length === 0 ? (
                <p style={{ textAlign: "center", color: "#334155" }}>Start a conversation</p>
              ) : (
                list.map((m, i) => (
                  <div
                    key={m._id || i}
                    className={`droplet-message ${m.sender === user.phone ? 'droplet-sent' : 'droplet-received'}`}
                    onMouseEnter={() => {
                      if (m.receiver === user.phone && !m.read) {
                        socket.emit("message_read", { messageId: m._id, room: m.room, reader: user.phone })
                      }
                    }}
                  >
                    <div>{m.text}</div>
                    <div style={{ fontSize: 12, marginTop: 5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: m.sender === user.phone ? "#0284c7" : "#0369a1", opacity: 0.8 }}>
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </span>
                      {renderMessageStatus(m)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {typingUser && (
              <div style={{ fontStyle: "italic", color: "#334155", marginBottom: 5, fontSize: 13 }}>
                ✏️ {typingUser} is typing...
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
              <div style={{ display: "flex", gap: 8, flex: 1 }}>
                <input
                  value={msg}
                  onChange={e => {
                    setMsg(e.target.value)
                    socket.emit("typing_start", { room: [user.phone, sel.phone].sort().join("_"), user: user.name })
                  }}
                  onKeyPress={e => e.key === 'Enter' && send()}
                  placeholder="Type a message..."
                  style={{ flex: 1, padding: 12, fontSize: 14 }}
                />
                <button 
                  onClick={send}
                  style={{
                    padding: isMobile ? "10px 15px" : "10px 24px", backgroundColor: "rgba(59, 130, 246, 0.9)", color: "white", border: "none", borderRadius: 20, cursor: "pointer", fontWeight: "bold", fontSize: isMobile ? 12 : 14, whiteSpace: "nowrap"
                  }}
                >
                  Send
                </button>
              </div>
              <button
                onClick={() => setShowScheduleMsg(!showScheduleMsg)}
                style={{
                  padding: isMobile ? "10px 15px" : "10px 20px", backgroundColor: "rgba(156, 39, 176, 0.8)", color: "white", border: "none", borderRadius: 20, cursor: "pointer", fontWeight: "bold", fontSize: isMobile ? 12 : 14
                }}
              >
                ⏰ Schedule
              </button>
            </div>

            {showScheduleMsg && (
              <div className="glass-panel" style={{ padding: 15, borderRadius: 24, marginTop: 10 }}>
                <h4 style={{ marginTop: 0, color: "#0369a1" }}>Schedule Message</h4>
                <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row", marginBottom: 10 }}>
                  <input type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} style={{ flex: 1 }} />
                  <input type="text" placeholder="Message to send..." value={scheduleMsg} onChange={e => setScheduleMsg(e.target.value)} style={{ flex: 1 }} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={scheduleMessage} style={{ flex: 1, padding: 10, backgroundColor: "rgba(156, 39, 176, 0.9)", color: "white", border: "none", borderRadius: 20, cursor: "pointer", fontWeight: "bold" }}>
                    Schedule
                  </button>
                  <button onClick={() => setShowScheduleMsg(false)} style={{ padding: 10, backgroundColor: "rgba(255,255,255,0.6)", color: "#333", border: "none", borderRadius: 20, cursor: "pointer", fontWeight: "bold" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#334155" }}>
            <h3>👈 Select a chat to start messaging</h3>
          </div>
        )}
      </div>
    </div>
  )
}