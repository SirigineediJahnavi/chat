const router = require('express').Router()
const User = require('../models/User')
const jwt = require('jsonwebtoken')

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body
    console.log(`HI! Received signup request with body:`, req.body)
    let u = await User.findOne({ email })
    if (u) return res.status(400).send('Email already registered')
    u = new User({ name, email, password, phone })
    await u.save()
    
    // Generate JWT token
    const token = jwt.sign({ phone: u.phone, email: u.email }, 'secretkey', { expiresIn: '7d' })
    res.send({ user: u, token })
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
    
    // Generate JWT token
    const token = jwt.sign({ phone: u.phone, email: u.email }, 'secretkey', { expiresIn: '7d' })
    res.send({ user: u, token })
  } catch (e) {
    res.status(500).send('error')
  }
})

router.post("/check", async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    res.json({ exists: !!user, user });
  } catch (e) {
    res.status(500).json({ exists: false });
  }
});

// Search user by phone
router.post("/search", async (req, res) => {
  try {
    const { phone, currentPhone } = req.body;
    const user = await User.findOne({ phone, phone: { $ne: currentPhone } });
    if (!user) return res.status(404).send('User not found');
    res.send(user);
  } catch (e) {
    res.status(500).send('error');
  }
});

// Subscription for notifications
router.post("/subscribe", async (req, res) => {
  try {
    const { phone, subscription } = req.body;
    await User.findOneAndUpdate({ phone }, { subscription }, { new: true });
    res.send('Subscribed to notifications');
  } catch (e) {
    res.status(500).send('error');
  }
});

module.exports = router