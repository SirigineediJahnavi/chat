const mongoose = require('mongoose')

const s = new mongoose.Schema({
    email: { type: String, unique: true },
    name: String
}, { timestamps: true })

module.exports = mongoose.model('User', s)