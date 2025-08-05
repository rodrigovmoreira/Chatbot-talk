const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  role: { type: String, enum: ['user', 'bot'], required: true },
  content: { type: String, required: true },
  sentiment: { type: String, default: 'neutral' },
  timestamp: { type: Date, default: Date.now }
});

// Exporte o modelo diretamente
const Message = mongoose.model('Message', messageSchema);
module.exports = Message; 