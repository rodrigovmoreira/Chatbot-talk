const { isCommand } = require('../middlewares/middlewares');
const { saveMessage, getLastMessages, getConversationTopics } = require('../services/models/Message');
const { simulateTyping } = require('../utils/chatUtils');
const { generateAIResponse } = require('../services/ai');
const { messagePreprocessor, handleCommand } = require('../middlewares/middlewares');


const MAX_HISTORY = 5;
const ERROR_MESSAGE = '⚠️ Ops! Tive um problema. Pode tentar novamente?';

async function handleMessage(client, msg) {
  if (!msg?.from || !msg?.body || !msg.from.endsWith('@c.us')) return;

  try {
    console.log('📩 Mensagem recebida de:', msg.from.replace('@c.us', ''), 'Conteúdo:', msg.body);

    // Pré-processamento e comandos
    if (!(await messagePreprocessor(client, msg))) {
      return;
    }

    const chat = await msg.getChat();
    const userMessage = msg.body.trim();
    if (!userMessage) return;

    // Salvar mensagem do usuário
    await saveMessage(msg.from, 'user', userMessage);

    // Preparar contexto
    const history = await getLastMessages(msg.from, MAX_HISTORY);
    const topics = await getConversationTopics(msg.from);
    const sentiment = history[0]?.sentiment || 'neutral';

    const context = history
      .reverse()
      .map(m => `${m.role === 'user' ? 'Usuário' : 'Bot'}: ${m.content}`)
      .join('\n');

    // Simular digitação e gerar resposta
    await simulateTyping(chat);
    const aiResponse = await generateAIResponse(userMessage, context, topics, sentiment) ||
      "🤖 Não consegui entender. Pode reformular?";

    // Enviar e salvar resposta
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