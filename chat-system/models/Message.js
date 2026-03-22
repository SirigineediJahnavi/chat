const mongoose = require("mongoose")

const MessageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  text: String,
  room: String,
  delivered: { type: Boolean, default: false }, // server got it
  received: { type: Boolean, default: false },  // recipient's client got it
  read: { type: Boolean, default: false },      // recipient opened chat
  isScheduled: { type: Boolean, default: false },
  scheduledTime: Date,
  senderName: String
}, { timestamps: true });


module.exports = mongoose.model("Message", MessageSchema)


