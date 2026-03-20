const express=require('express')
const router=express.Router()
const User=require('../models/User')

router.post('/signup',async(req,res)=>{
    try{
        const {name,email,password}=req.body
        const u=await User.findOne({email})
        if(u) return res.status(400).send('user exists')
        const n=new User({name,email,password})
        await n.save()
        res.send('created')
    }catch(e){
        res.status(500).send('error')
    }
})

router.post('/login',async(req,res)=>{
    try{
        const {email,password}=req.body
        const u=await User.findOne({email,password})
        if(!u) return res.status(400).send('invalid')
        res.send('success')
    }catch(e){
        res.status(500).send('error')
    }
})

module.exports=router