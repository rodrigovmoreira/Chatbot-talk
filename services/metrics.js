const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
  eventType: String,
  phone: String,
  messageLength: Number,
  processingTime: Number,
  sentiment: String,
  timestamp: { type: Date, default: Date.now }
});

const Metric = mongoose.model('Metric', metricSchema);

async function logMetric(event) {
  try {
    await Metric.create(event);
  } catch (err) {
    console.error('Erro ao registrar métrica:', err);
  }
}

async function getConversationMetrics(phone) {
  return await Metric.find({ phone })
    .sort({ timestamp: -1 })
    .limit(100)
    .lean();
}

module.exports = { 
  logMetric,
  getConversationMetrics
};