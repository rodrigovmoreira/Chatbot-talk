// === messageHandler.js ===
const { saveMessage, getLastMessages } = require('./services/message');
const { getOrCreateSession, setSessionState } = require('./services/session');
const { simulateTyping } = require('./utils/chatUtils');
const { generateAIResponse } = require('./services/ai');
const menuService = require('./services/menuService');

// Configurações
const MAX_HISTORY = 5;
const ERROR_MESSAGE = '⚠️ Ops! Tive um problema. Pode tentar novamente?';

async function handleMessage(client, msg) {
  if (!msg?.from || !msg?.body || !msg.from.endsWith('@c.us')) {
    return;
  }

  try {
    const chat = await msg.getChat();
    const userMessage = msg.body.trim();
    const phone = msg.from;
    
    if (!userMessage) return;

    const session = await getOrCreateSession(phone);
    let response = '';
    let newState = null;

    // 1. Verifica se está em modo de conversa livre
    if (session.state === 'FREE_CHAT') {
      if (userMessage.toLowerCase() === 'sair') {
        response = await menuService.getMainMenu();
        newState = null;
      } else {
        const history = await getLastMessages(phone, MAX_HISTORY);
        const context = history
          .reverse()
          .map(m => `${m.role === 'user' ? 'Usuário' : 'Bot'}: ${m.content}`)
          .join('\n');

        response = await generateAIResponse(userMessage, context) || 
                  "🤖 Não entendi. Pode reformular?";
        newState = 'FREE_CHAT';
      }
    } 
    // 2. Se não está em FREE_CHAT, sempre começa com o menu
    else {
      // Verifica se é uma opção de menu válida (1-5)
      if (/^[1-5]$/.test(userMessage)) {
        switch(userMessage) {
          case '5':
            response = "💡 *Modo conversa livre ativado*:\n\n" +
                      "Pergunte qualquer coisa! Digite *sair* para voltar ao menu.";
            newState = 'FREE_CHAT';
            break;
          default:
            response = await menuService.getMenuForOption(userMessage);
        }
      } else {
        // Se não for opção válida, mostra menu com mensagem de ajuda
        response = "⚠️ Por favor, escolha uma opção válida:\n\n" + 
                  await menuService.getMainMenu();
      }
    }

    // Atualiza estado e envia resposta
    await setSessionState(phone, newState);
    await saveMessage(phone, 'user', userMessage);
    await simulateTyping(chat);
    await client.sendMessage(phone, response);
    await saveMessage(phone, 'bot', response);

  } catch (error) {
    console.error('Erro no handleMessage:', error);
    try {
      await client.sendMessage(msg.from, ERROR_MESSAGE);
    } catch (sendError) {
      console.error('Falha ao enviar mensagem de erro:', sendError);
    }
  }
}

module.exports = { handleMessage };