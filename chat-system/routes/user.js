const router = require('express').Router()
const User = require('../models/User')

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body
    console.log(`HI! Received signup request with body:`, req.body)
    let u = await User.findOne({ email })
    if (u) return res.status(400).send('Email already registered')
    u = new User({ name, email, password, phone })
    await u.save()
    res.send(u)
  } catch (e) {
    console.log("hi")
    res.status(500).send('error')
  }
})


// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const u = await User.findOne({ email })
    if (!u || u.password !== password) return res.status(400).send('Invalid credentials')
    res.send(u)
  } catch (e) {
    res.status(500).send('error')
  }
})

router.post("/check", async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    res.json({ exists: !!user });
  } catch (e) {
    res.status(500).json({ exists: false });
  }
});

module.exports = router