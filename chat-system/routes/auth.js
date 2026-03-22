const router = require('express').Router()
const User = require('../models/User')

router.post('/signup', async(req,res)=>{
    try{
        const {name,email}=req.body
        let u = await User.findOne({email})
        if(u) return res.status(400).send('User exists')
        u = new User({name,email})
        await u.save()
        res.send(u)
    }catch(e){res.status(500).send('error')}
})

router.post('/login', async(req,res)=>{
    try{
        const {email}=req.body
        const u = await User.findOne({email})
        if(!u) return res.status(400).send('Not registered')
        res.send(u)
    }catch(e){res.status(500).send('error')}
})

module.exports = router