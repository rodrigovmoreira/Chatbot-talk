const mongoose = require('mongoose');

const IntentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  patterns: { type: [String], required: true },
  responses: { type: [String], required: true },
  isCommand: { type: Boolean, default: false },
  priority: { type: Number, default: 1 }
});

module.exports = mongoose.model('Intent', IntentSchema);