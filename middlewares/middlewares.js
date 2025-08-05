const { getConversationTopics } = require('../services/models/Message');
const Intent = require('../services/models/Intent');
const Config = require('../services/models/Config');

async function isCommand(message) {
  const commandPrefix = await Config.getConfig('command_prefix', '/');
  return message.startsWith(commandPrefix);
}

async function messagePreprocessor(client, msg) {
  if (msg.from.includes('@g.us') || msg.isStatus) return false;
  
  // Primeiro verifica se é um comando
  if (await isCommand(msg.body)) {
    await handleCommand(client, msg);
    return false; // Impede o processamento posterior
  }

  // Depois verifica intenções genéricas
  const intent = await detectIntent(msg.body);
  if (intent) {
    const response = intent.responses[Math.floor(Math.random() * intent.responses.length)];
    await client.sendMessage(msg.from, response);
    return false;
  }

  return true; // Permite o processamento normal pela IA
}

async function detectIntent(message) {
  const intents = await Intent.find().sort({ priority: -1 });
  const lowerMsg = message.toLowerCase();
  
  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      if (lowerMsg.includes(pattern.toLowerCase())) {
        return intent;
      }
    }
  }
  return null;
}

async function handleCommand(client, msg) {
  const command = msg.body.split(' ')[0].substring(1).toLowerCase();
  const intent = await Intent.findOne({ 
    name: command,
    isCommand: true 
  });

  if (intent) {
    const response = intent.responses[0]; // Resposta principal para comandos
    await client.sendMessage(msg.from, response);
  } else {
    const defaultResponse = await Config.getConfig('default_command_response', 
      "⚠️ Comando não reconhecido. Use /ajuda para ver os comandos disponíveis.");
    await client.sendMessage(msg.from, defaultResponse);
  }
}

module.exports = {
  messagePreprocessor,
  handleCommand,
  isCommand,
  detectIntent
};