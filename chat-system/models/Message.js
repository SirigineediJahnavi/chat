const mongoose = require("mongoose")

const MessageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  text: String,
  room: String,
  read: { type: Boolean, default: false }
}, { timestamps: true })

module.exports = mongoose.model("Message", MessageSchema)
