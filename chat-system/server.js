const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const http = require("http")
const { Server } = require("socket.io")
require("dotenv").config()

const Message = require("./models/Message")
const UserRouter = require("./routes/user")
const ChatRouter = require("./routes/chat")

const app = express()
const server = http.createServer(app)

app.use(cors())
app.use(express.json())
app.use("/chat", ChatRouter)
app.use("/user", UserRouter)
app.get("/", (req, res) => res.send("server running"))

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("db connected"))
  .catch(err => console.log(err))

const io = new Server(server, { cors: { origin: "*" } })

io.on("connection", (socket) => {
  socket.on("join_room", (room) => {
    socket.join(room)
    console.log(`Socket ${socket.id} joined room ${room}`)
  })

  socket.on("send_message", async (data) => {
    const m = new Message(data)
    await m.save()
    io.to(data.room).emit("receive_message", m)
  })

  socket.on("typing_start", ({ room, user }) => {
    socket.to(room).emit("typing", user)
  })

  socket.on("typing_stop", ({ room }) => {
    socket.to(room).emit("typing", "")
  })
  socket.on("message_read", async ({ room, messageId, reader }) => {
  // Update DB
  await Message.findByIdAndUpdate(messageId, { read: true })

  // Notify sender that this message was read
  io.to(room).emit("message_read", messageId)
})


  socket.on("user_online", (phone) => {
    socket.user = phone
    io.emit("online_users",
      [...new Set(Array.from(io.sockets.sockets.values()).map(s => s.user))]
    )
  })
})

const PORT = process.env.PORT || 5001
server.listen(PORT, () => console.log("server started on port", PORT))
