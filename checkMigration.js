require('dotenv').config();
const mongoose = require('mongoose');
const Config = require('./services/models/Config');
const Intent = require('./services/models/Intent');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('=== 🧪 VALIDAÇÃO DA MIGRAÇÃO ===\n');
    
    // 1. Verificar STOP_WORDS
    const stopWords = await Config.findOne({ name: 'stop_words' });
    console.log('✅ STOP_WORDS:', stopWords.value.slice(0, 5), '...\n');
    
    // 2. Verificar saudações
    const saudacao = await Intent.findOne({ name: 'saudacao' });
    console.log('✅ SAUDAÇÃO - Padrões:', saudacao.patterns);
    console.log('✅ SAUDAÇÃO - Respostas:', saudacao.responses, '\n');
    
    // 3. Verificar comando /ajuda
    const ajuda = await Intent.findOne({ name: 'ajuda', isCommand: true });
    console.log('✅ COMANDO /ajuda:', ajuda.responses[0].substring(0, 50) + '...');
    
  } catch (err) {
    console.error('❌ Erro na validação:', err);
  } finally {
    await mongoose.disconnect();
  }
})();