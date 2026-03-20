const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')
require('dotenv').config()

const Message = require('./models/Message')
const User = require('./models/User')
const Chat = require('./models/Chat')
const UserRouter = require('./routes/user')
const ChatRouter = require('./routes/chat')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: "*" } })

app.use(cors())
app.use(express.json())
app.use('/chat', ChatRouter)
app.use('/user', UserRouter)

app.get('/', (req, res) => res.send('server running'))

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('db connected'))
  .catch(err => console.log(err))

io.on('connection', socket => {
  socket.on('join_room', room => socket.join(room))

  socket.on('send_message', async data => {
    const m = new Message({
      sender: data.sender,
      receiver: data.receiver,
      text: data.text
    })
    await m.save()
    io.to(data.room).emit('receive_message', m)
  })
})

const PORT = process.env.PORT || 5001
server.listen(PORT, () => console.log('server started on port', PORT))