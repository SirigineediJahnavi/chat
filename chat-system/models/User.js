const mongoose = require('mongoose')
const s = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    phone: { type: String, unique: true },
}, { timestamps: true })
module.exports = mongoose.model('User', s)

