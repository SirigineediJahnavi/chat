const mongoose = require('mongoose')

const s = new mongoose.Schema({
    sender: String,
    receiver: String,
    text: String
}, { timestamps: true })

module.exports = mongoose.model('Message', s)