const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const User = require("./models/User");
const Chat = require("./models/Chat");
const Message = require("./models/Message");
const UserRouter = require("./routes/user");
const ChatRouter = require("./routes/chat");
const auth = require("./middleware/auth");

const webpush = require("web-push");
webpush.setVapidDetails(
  "mailto:you@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://chat-silk-one.vercel.app",
    "https://chit-chat-zeta-five.vercel.app"
  ],
  credentials: true
}));

app.use(express.json());
app.use("/user", UserRouter);
app.use("/chat", ChatRouter);

app.get("/", (req, res) => res.send("server running"));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("db connected"))
  .catch(err => console.log(err));


const io = new Server(server, { 
  cors: { 
    origin: [
      "http://localhost:3000",
      "https://chat-silk-one.vercel.app",
      "https://chit-chat-zeta-five.vercel.app"
    ],
    credentials: true 
  } 
});

// Store user socket connections
const userSockets = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("user_online", (phone) => {
    socket.user = phone;
    userSockets[phone] = socket.id;
    io.emit("online_users", Object.keys(userSockets));
    console.log(`${phone} is online`);
  });

  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on("send_message", async (data) => {
    try {
      // Create message with initial status
      const m = new Message({
        sender: data.sender,
        receiver: data.receiver,
        text: data.text,
        room: data.room,
        delivered: false,
        received: false,
        read: false
      });
      await m.save();
      
      // Mark as delivered immediately on server
      m.delivered = true;
      
      // Emit to both sender and receiver in the room
      io.to(data.room).emit("receive_message", m);
      console.log(`Message sent from ${data.sender} to ${data.receiver}`);

      // Send notification to offline/online recipient
      const recipient = await User.findOne({ phone: data.receiver });
      if (recipient?.subscription) {
        try {
          const payload = JSON.stringify({
            title: "New Message",
            body: `From ${data.sender}: ${data.text}`,
            icon: "/firebase-logo.png"
          });
          await webpush.sendNotification(recipient.subscription, payload);
          console.log("Notification sent to", data.receiver);
        } catch (notifErr) {
          console.log("Notification failed:", notifErr.message);
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  });

  // Update when message is delivered to recipient's device
  socket.on("message_delivered", async ({ messageId, room }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { delivered: true, received: true });
      io.to(room).emit("message_delivered", { messageId });
      console.log(`Message ${messageId} delivered`);
    } catch (err) {
      console.error("Error updating delivery:", err);
    }
  });

  // Update when message is read
  socket.on("message_read", async ({ messageId, room, reader }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { read: true });
      io.to(room).emit("message_read", { messageId });
      console.log(`Message ${messageId} read by ${reader}`);
    } catch (err) {
      console.error("Error updating read status:", err);
    }
  });

  socket.on("typing_start", ({ room, user }) => {
    socket.to(room).emit("typing", user);
  });

  socket.on("typing_stop", ({ room }) => {
    socket.to(room).emit("typing", "");
  });

  // CALL FEATURE
  // socket.on("initiate_call", ({ caller, callee, callerName }) => {
  //   const calleeSocket = userSockets[callee];
  //   if (calleeSocket) {
  //     io.to(calleeSocket).emit("incoming_call", { 
  //       caller, 
  //       callerName,
  //       callId: `${caller}_${Date.now()}`
  //     });
  //     console.log(`Call initiated from ${caller} to ${callee}`);
  //   } else {
  //     socket.emit("call_failed", { message: "User is offline" });
  //   }
  // });

  socket.on("initiate_call", ({ caller, callee, callerName, isVideoCall }) => {
    const calleeSocket = userSockets[callee];
    if (calleeSocket) {
      io.to(calleeSocket).emit("incoming_call", { 
        caller, 
        callerName,
        callId: `${caller}_${Date.now()}`,
        isVideoCall // <-- Add this right here!
      });
      console.log(`Call initiated from ${caller} to ${callee} (Video: ${isVideoCall})`);
    } else {
      socket.emit("call_failed", { message: "User is offline" });
    }
  });

  socket.on("accept_call", ({ callId, callee, caller }) => {
    const callerSocket = userSockets[caller];
    if (callerSocket) {
      io.to(callerSocket).emit("call_accepted", { callId, callee });
      console.log(`Call ${callId} accepted by ${callee}`);
    }
  });

  // WebRTC Signal relay
  socket.on("webrtc_signal", ({ to, signal, from }) => {
    const recipientSocket = userSockets[to];
    if (recipientSocket) {
      io.to(recipientSocket).emit("webrtc_signal", { signal, from });
      console.log(`WebRTC signal relayed from ${from} to ${to}`);
    }
  });

  socket.on("reject_call", ({ callId, caller }) => {
    const callerSocket = userSockets[caller];
    if (callerSocket) {
      io.to(callerSocket).emit("call_rejected", { callId });
      console.log(`Call ${callId} rejected`);
    }
  });

  socket.on("end_call", ({ callId, otherUser }) => {
    const otherSocket = userSockets[otherUser];
    if (otherSocket) {
      io.to(otherSocket).emit("call_ended", { callId });
    }
    console.log(`Call ${callId} ended`);
  });

  socket.on("disconnect", () => {
    if (socket.user) {
      delete userSockets[socket.user];
      io.emit("online_users", Object.keys(userSockets));
      console.log(`${socket.user} disconnected`);
    }
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log("server started on port", PORT));