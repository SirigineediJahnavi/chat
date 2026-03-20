const mongoose = require('mongoose')

const s = new mongoose.Schema({
    members: [String]
}, { timestamps: true })

module.exports = mongoose.model('Chat', s)