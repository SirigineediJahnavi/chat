const router = require("express").Router()
const mongoose = require("mongoose")
const Chat = require("../models/Chat")
const Message = require("../models/Message")
const User = require("../models/User")
const auth = require("../middleware/auth")

router.post("/", async (req, res) => {
  try {
    const { user1, user2 } = req.body

    let c = await Chat.findOne({ members: { $all: [user1, user2] } })

    if (!c) {
      c = new Chat({ members: [user1, user2] })
      await c.save()
    }

    const r = [user1, user2].sort().join("_")

    const m = await Message.find({ room: r }).sort({ createdAt: 1 })

    res.json({ chat: c, messages: m })
  } catch (e) {
    console.log(e)
    res.status(500).send("error")
  }
})
router.get("/getChats", auth, async (req, res) => {
  try {
    const u = req.user.phone

    const m = await Message.find({
      $or: [
        { sender: u },
        { receiver: u }
      ]
    })

    const s = new Set()

    m.forEach(x => {
      if (x.sender !== u) s.add(x.sender)
      if (x.receiver !== u) s.add(x.receiver)
    })

    const arr = [...s]

    const users = await User.find({ phone: { $in: arr } })

    res.json(users)
  } catch (e) {
    console.log(e)
    res.status(500).send("error")
  }
})
router.get("/getMessages/:phone", auth, async (req, res) => {
  try {
    const other = req.params.phone;
    const r = [req.user.phone, other].sort().join("_");
    const msgs = await Message.find({ room: r }).sort({ createdAt: 1 });
    res.send(msgs);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// Search user by phone
router.post("/searchUser", auth, async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).send("User not found");
    res.send(user);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// Schedule message
router.post("/scheduleMessage", auth, async (req, res) => {
  try {
    const { receiver, text, scheduledTime } = req.body;
    const sender = req.user.phone;
    
    const room = [sender, receiver].sort().join("_");
    const scheduleDate = new Date(scheduledTime);
    
    // Store scheduled message (in production, use a job queue like Redis or Bull)
    const message = new Message({
      sender,
      receiver,
      text,
      room,
      delivered: false,
      received: false,
      read: false,
      scheduledTime: scheduleDate,
      isScheduled: true
    });
    
    await message.save();
    res.json({ message: "Message scheduled successfully" });
    
    // Set timeout for sending (only works if server is running)
    const delay = scheduleDate.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        const io = require("../server").io;
        io.to(room).emit("receive_message", message);
      }, delay);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Scheduling error");
  }
});

module.exports = router