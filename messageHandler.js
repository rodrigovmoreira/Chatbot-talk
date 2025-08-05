// === messageHandler.js ===
const { saveMessage, getLastMessages } = require('./services/message');
const { getOrCreateSession, setSessionState } = require('./services/session');
const { simulateTyping } = require('./utils/chatUtils');
const { generateAIResponse } = require('./services/ai');
const Flow = require('./models/Flow');

// Configurações
const MAX_HISTORY = 5; // Número de mensagens para contexto
const ERROR_MESSAGE = '⚠️ Ops! Tive um problema. Pode tentar novamente?';

// Serviço de menus (pode ser migrado para DB depois)
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
        `Um atendente humano será notificado e entrará em contato em breve.\n` +
        `Enquanto isso, deseja:\n\n` +
        `1 - Voltar ao menu principal\n` +
        `2 - Deixar seu número para retorno`,

      '2': `📦 *Informações sobre produtos*:\n\n` +
        `1 - Lista completa de produtos\n` +
        `2 - Promoções da semana\n` +
        `3 - Condições de pagamento\n` +
        `4 - Voltar ao menu principal`,

      '3': `🔧 *Suporte técnico*:\n\n` +
        `1 - Problemas com produto\n` +
        `2 - Dúvidas de instalação\n` +
        `3 - Garantia\n` +
        `4 - Voltar ao menu principal`,

      '4': `📦 *Status do pedido*:\n\n` +
        `Por favor, digite o número do seu pedido ou:\n\n` +
        `1 - Voltar ao menu principal`
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

    // Obtém sessão e define resposta padrão
    const session = await getOrCreateSession(phone);
    let response = menuService.getMainMenu(); // Padrão: mostra menu
    let newState = null;

    // Se estiver em modo livre, processa com IA
    if (session.state === 'FREE_CHAT') {
      if (userMessage.toLowerCase() === 'sair') {
        response = menuService.getMainMenu();
      } else {
        const history = await getLastMessages(phone, MAX_HISTORY);
        const context = history
          .reverse()
          .map(m => `${m.role}: ${m.content}`)
          .join('\n');

        const aiResponse = await generateAIResponse(userMessage, context);
        response = aiResponse || "🤖 Não entendi. Pode reformular?";
        newState = 'FREE_CHAT'; // Mantém no modo livre
      }
    }
    // Processa opções do menu
    else {
      switch (userMessage) {
        case '1':
        case '2':
        case '3':
        case '4':
          response = menuService.getMenuForOption(userMessage);
          newState = `MENU_${userMessage}`;
          break;

        case '5':
          response = "💡 *Modo conversa livre ativado*:\n\n" +
            "Pergunte qualquer coisa! Digite *sair* para voltar ao menu.";
          newState = 'FREE_CHAT';
          break;

        default:
          // Se não for opção válida, mostra menu com mensagem de ajuda
          response = "⚠️ Por favor, escolha uma opção válida:\n\n" +
            menuService.getMainMenu();
      }
    }

    // Atualiza estado e envia resposta
    await setSessionState(phone, newState);
    await saveMessage(phone, 'user', userMessage);
    await simulateTyping(chat);
    await client.sendMessage(phone, response);
    await saveMessage(phone, 'bot', response);

  } catch (error) {
    console.error('Erro:', error);
    await client.sendMessage(msg.from, ERROR_MESSAGE);
  }

    try {
    const phone = msg.from;
    const userMessage = msg.body.trim().toLowerCase();

    // 1. Verifica se é um comando administrativo
    if (userMessage.startsWith('/admin')) {
      return handleAdminCommand(client, msg);
    }

    // 2. Busca fluxo correspondente
    const flow = await Flow.findOne({
      $or: [
        { trigger: userMessage },
        { trigger: 'default' }
      ],
      isActive: true
    }).sort('-createdAt');

    // 3. Processa resposta
    if (flow) {
      switch(flow.responseType) {
        case 'text':
          await client.sendMessage(phone, flow.content);
          break;
          
        case 'menu':
          const menu = JSON.parse(flow.content);
          let reply = `*${menu.title}*\n\n${menu.text}\n\n`;
          
          menu.options.forEach((opt, i) => {
            reply += `${i+1} - ${opt.text}\n`;
          });
          
          await client.sendMessage(phone, reply);
          break;
          
        case 'redirect':
          const nextFlow = await Flow.findById(flow.redirectTo);
          if (nextFlow) {
            await client.sendMessage(phone, nextFlow.content);
          }
          break;
      }
    } else {
      // Resposta padrão se nenhum fluxo for encontrado
      await client.sendMessage(phone, "Desculpe, não entendi. Digite *menu* para ver as opções.");
    }

  } catch (error) {
    console.error('Erro:', error);
    await client.sendMessage(msg.from, ERROR_MESSAGE);
  }
  
}

module.exports = { handleMessage };