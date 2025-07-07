const { getConversationTopics } = require('../services/message');

function isCommand(message) {
  return message.startsWith('/');
}

async function messagePreprocessor(client, msg) {
  if (msg.from.includes('@g.us') || msg.isStatus) return false;
  
  if (isCommand(msg.body)) {
    await handleCommand(client, msg);
    return false;
  }

  // Saudação inicial
  if (detectIntent(msg.body) === 'saudacao') {
    await client.sendMessage(msg.from, getGreetingVariation());
    return false;
  }

  return true;
}

function detectIntent(message) {
  const lowerMsg = message.toLowerCase();
  if (/oi|olá|ola|eae|bom dia|boa tarde|boa noite/.test(lowerMsg)) return 'saudacao';
  if (/obrigad|obrigado|valeu|agradeço/.test(lowerMsg)) return 'agradecimento';
  return 'outro';
}

function getGreetingVariation() {
  const greetings = [
    "Oi! Como vai? 😊",
    "Olá! Tudo bem por aí?",
    "E aí! Bom te ver por aqui!",
    "Oi! Pronto pra bater um papo?"
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

async function handleCommand(client, msg) {
  const command = msg.body.split(' ')[0].substring(1).toLowerCase();
  
  switch(command) {
    case 'ajuda':
      await client.sendMessage(msg.from, 
        "📌 Comandos disponíveis:\n" +
        "/ajuda - Mostra esta ajuda\n" +
        "/topicos - Mostra tópicos que conversamos\n" +
        "/reset - Reinicia nossa conversa");
      break;
      
    case 'topicos':
      const topics = await getConversationTopics(msg.from);
      await client.sendMessage(msg.from, 
        `📚 Tópicos que conversamos:\n${topics.join(', ') || 'Ainda não identificamos tópicos específicos'}`);
      break;
      
    case 'reset':
      await Message.deleteMany({ phone: msg.from });
      await client.sendMessage(msg.from, "🔄 Conversa reiniciada! Vamos começar de novo.");
      break;
      
    default:
      await client.sendMessage(msg.from, "⚠️ Comando não reconhecido. Use /ajuda para ver os comandos disponíveis.");
  }
}

module.exports = {
  messagePreprocessor,
  handleCommand,
  isCommand,
  detectIntent
};