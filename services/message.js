// services/message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  phone: String,
  role: String,
  content: String,
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

async function saveMessage(phone, role, content) {
  await Message.create({ phone, role, content });
}

module.exports = { saveMessage };