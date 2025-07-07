const mongoose = require('mongoose');

const STOP_WORDS = [
  'que', 'com', 'para', 'por', 'uma', 'uns', 'uma', 'uns', 'isso', 'tão',
  'como', 'mais', 'mas', 'nao', 'sim', 'sem', 'ate', 'so', 'mesmo', 'ate',
  'pelo', 'pela', 'pelos', 'pelas', 'de', 'da', 'do', 'das', 'dos', 'em',
  'no', 'na', 'nos', 'nas', 'a', 'o', 'as', 'os', 'e', 'é', 'um'
];

const messageSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  role: { type: String, enum: ['user', 'bot'], required: true },
  content: { type: String, required: true },
  sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

async function saveMessage(phone, role, content) {
  const sentiment = analyzeSentiment(content);
  await Message.create({ phone, role, content, sentiment });
}

function analyzeSentiment(text) {
  const positiveWords = ['bom', 'ótimo', 'gostei', 'feliz', 'obrigado', 'obrigada', 'excelente'];
  const negativeWords = ['ruim', 'péssimo', 'odeio', 'triste', 'raiva', 'chateado', 'insatisfeito'];
  
  const lowerText = text.toLowerCase();
  if (positiveWords.some(w => lowerText.includes(w))) return 'positive';
  if (negativeWords.some(w => lowerText.includes(w))) return 'negative';
  return 'neutral';
}

async function getLastMessages(phone, limit = 15) {
  return await Message.find({ phone }).sort({ timestamp: -1 }).limit(limit).lean();
}

async function getConversationTopics(phone) {
  const messages = await Message.find({ phone })
    .sort({ timestamp: -1 })
    .limit(50)
    .lean();
  
  const topics = {};
  messages.forEach(msg => {
    const words = msg.content.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 4 && !STOP_WORDS.includes(word)) {
        topics[word] = (topics[word] || 0) + 1;
      }
    });
  });
  
  return Object.entries(topics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);
}

module.exports = { 
  saveMessage, 
  getLastMessages, 
  getConversationTopics,
  analyzeSentiment
};