const router = require('express').Router()
const Chat = require('../models/Chat')

router.post('/', async (req, res) => {
  const { user1, user2 } = req.body
  let c = await Chat.findOne({ members: { $all: [user1, user2] } })
  if (!c) {
    c = new Chat({ members: [user1, user2] })
    await c.save()
  }
  res.json(c)
})

module.exports = router