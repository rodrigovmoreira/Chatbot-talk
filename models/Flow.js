const mongoose = require('mongoose');

const flowSchema = new mongoose.Schema({
  trigger: { type: String, required: true }, // Palavra-chave ou 'menu'
  responseType: { 
    type: String, 
    enum: ['text', 'menu', 'redirect'], 
    required: true 
  },
  content: { type: String, required: true }, // Texto ou JSON do menu
  quickReplies: [{ 
    text: String,
    nextFlow: { type: mongoose.Schema.Types.ObjectId, ref: 'Flow' }
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Flow', flowSchema);