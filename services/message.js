const mongoose = require('mongoose');
const Config = require('../services/models/Config');
const Message = require('../services/models/Message');

// Removida a constante STOP_WORDS (agora vem do banco)

async function getStopWords() {
  return await Config.getConfig('stop_words', []);
}

async function saveMessage(phone, role, content, sentiment = 'neutral') {
  try {
    const newMessage = new Message({
      phone,
      role,
      content,
      sentiment
    });
    await newMessage.save();
  } catch (err) {
    console.error('Erro ao salvar mensagem:', err);
  }
}

async function getLastMessages(phone, limit = 5) {
  try {
    return await Message.find({ phone })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    console.error('Erro ao buscar mensagens:', err);
    return [];
  }
}

async function getConversationTopics(phone) {
  const messages = await Message.find({ phone }).sort({ timestamp: -1 }).limit(50).lean();
  const stopWords = await getStopWords();
  
  const topics = {};
  messages.forEach(msg => {
    const words = msg.content.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 4 && !stopWords.includes(word)) {
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
  saveMessage, // Certifique-se que está exportando
  getLastMessages,
  getConversationTopics
  // ... outras exportações
};