const router = require("express").Router()
const Chat = require("../models/Chat")
const Message = require("../models/Message")

router.post("/", async (req, res) => {
  try {
    const { user1, user2 } = req.body

    let c = await Chat.findOne({ members: { $all: [user1, user2] } })
    if (!c) {
      c = new Chat({ members: [user1, user2] })
      await c.save()
    }

    const roomName = [user1, user2].sort().join("_")
    const messages = await Message.find({ room: roomName }).sort({ createdAt: 1 })

    res.json({ chat: c, messages })
  } catch (e) {
    console.error("Chat route error:", e)
    res.status(500).send("error")
  }
})

module.exports = router
