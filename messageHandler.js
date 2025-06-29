// === messageHandler.js ===
const { saveMessage, getLastMessages } = require('./services/message');
const { getOrCreateSession } = require('./services/session');
const { simulateTyping } = require('./utils/chatUtils');
const { generateAIResponse } = require('./services/ai');

// Configurações
const MAX_HISTORY = 5; // Número de mensagens para contexto
const ERROR_MESSAGE = '⚠️ Ops! Tive um problema. Pode tentar novamente?';

async function handleMessage(client, msg) {
  // Validação básica da mensagem
  if (!msg?.from || !msg?.body || !msg.from.endsWith('@c.us')) {
    console.log('Mensagem inválida ignorada');
    return;
  }

  try {
    console.log('📩 Mensagem recebida de:', msg.from.replace('@c.us', ''), 'Conteúdo:', msg.body);

    const chat = await msg.getChat();
    const userMessage = msg.body.trim();

    // Ignora mensagens vazias
    if (!userMessage) return;

    // Prepara contexto da conversa
    const history = await getLastMessages(msg.from, MAX_HISTORY).catch(() => []);
    const context = history
      .reverse()
      .map(m => `${m.role === 'user' ? 'Usuário' : 'Bot'}: ${m.content}`)
      .join('\n');

    // Salva mensagem do usuário
    await saveMessage(msg.from, 'user', userMessage);

    // Simula digitação e gera resposta
    await simulateTyping(chat);
    const aiResponse = await generateAIResponse(userMessage, context) || 
                      "🤖 Não consegui entender. Pode reformular?";

    // Envia e salva resposta
    await client.sendMessage(msg.from, aiResponse);
    await saveMessage(msg.from, 'bot', aiResponse);

  } catch (error) {
    console.error('❌ Erro no handleMessage:', error);
    try {
      await client.sendMessage(msg.from, ERROR_MESSAGE);
    } catch (sendError) {
      console.error('Falha ao enviar mensagem de erro:', sendError);
    }
  }
}

module.exports = { handleMessage };