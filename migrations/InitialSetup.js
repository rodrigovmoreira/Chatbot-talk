require('dotenv').config({ path: `${__dirname}/../.env` });
const mongoose = require('mongoose');
const Config = require('../services/models/Config');
const Intent = require('../services/models/Intent');

async function migrate() {
  // Migrar STOP_WORDS
  await Config.updateOne(
    { name: 'stop_words' },
    { 
      value: [
        'que', 'com', 'para', 'por', 'uma', 'uns', 'isso', 'tão',
        'como', 'mais', 'mas', 'nao', 'sim', 'sem', 'ate', 'so'
      ]
    },
    { upsert: true }
  );

  // Migrar saudações
  await Intent.create({
    name: 'saudacao',
    patterns: ['oi', 'olá', 'ola', 'eae', 'bom dia', 'boa tarde', 'boa noite'],
    responses: [
      "Oi! Como vai? 😊",
      "Olá! Tudo bem por aí?",
      "E aí! Bom te ver por aqui!",
      "Oi! Pronto pra bater um papo?"
    ]
  });

  // Migrar comandos
  await Intent.create({
    name: 'ajuda',
    patterns: ['ajuda'],
    responses: [
      "📌 Comandos disponíveis:\n" +
      "/ajuda - Mostra esta ajuda\n" +
      "/topicos - Mostra tópicos que conversamos\n" +
      "/reset - Reinicia nossa conversa"
    ],
    isCommand: true
  });

  console.log('✅ Migração concluída!');
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => migrate())
  .catch(err => console.error('❌ Erro na migração:', err))
  .finally(() => mongoose.disconnect());