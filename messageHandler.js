// === messageHandler.js ===
const { saveMessage, getLastMessages } = require('./services/message');
const { getOrCreateSession, setSessionState } = require('./services/session');
const { simulateTyping } = require('./utils/chatUtils');
const { generateAIResponse } = require('./services/ai');

// Configurações
const MAX_HISTORY = 5;
const ERROR_MESSAGE = '⚠️ Ops! Tive um problema. Pode tentar novamente?';

const menuService = {
  getMainMenu: () => {
    return `🤖 *Atendimento Moreira Bot* 🤖\n\n` +
      `Por favor, escolha uma opção:\n` +
      `1️⃣ - Falar com atendente\n` +
      `2️⃣ - Informações sobre produtos\n` +
      `3️⃣ - Suporte técnico\n` +
      `4️⃣ - Status do pedido\n` +
      `5️⃣ - Conversa livre com a IA\n\n` +
      `Digite apenas o *número* da opção desejada.`;
  },

  getMenuForOption: (option) => {
    const menus = {
      '1': `📞 *Falar com atendente*:\n\n` +
           `Um atendente será contactado em breve. Enquanto isso:\n\n` +
           `1 - Voltar ao menu\n` +
           `2 - Deixar meu número`,
      '2': `📦 *Produtos*:\n\n` +
           `1 - Lista de produtos\n` +
           `2 - Promoções\n` +
           `3 - Voltar`,
      '3': `🔧 *Suporte*:\n\n` +
           `1 - Problemas com produto\n` +
           `2 - Dúvidas técnicas\n` +
           `3 - Voltar`,
      '4': `📦 *Status do pedido*:\n\n` +
           `Digite o número do pedido ou:\n\n` +
           `1 - Voltar`
    };
    return menus[option] || menuService.getMainMenu();
  }
};

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
    let newState = session.state;

    // Verifica se está em modo de conversa livre
    if (session.state === 'FREE_CHAT') {
      if (userMessage.toLowerCase() === 'sair') {
        response = menuService.getMainMenu();
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
    // Processa opções do menu
    else if (/^[1-5]$/.test(userMessage)) {
      switch(userMessage) {
        case '5':
          response = "💡 *Modo conversa livre ativado*:\n\n" +
                    "Pergunte qualquer coisa! Digite *sair* para voltar ao menu.";
          newState = 'FREE_CHAT';
          break;
        default:
          response = menuService.getMenuForOption(userMessage);
          newState = `MENU_${userMessage}`;
      }
    }
    // Resposta padrão para entradas inválidas
    else {
      response = "⚠️ Por favor, escolha uma opção válida:\n\n" + 
                menuService.getMainMenu();
    }

    // Envia a resposta
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