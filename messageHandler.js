const { saveMessage } = require('./services/message');
const { simulateTyping } = require('./utils/chatUtils');
const Flow = require('./models/Flow');

const ERROR_MESSAGE = '⚠️ Ops! Tive um problema. Tente novamente.';
const DEFAULT_RESPONSE = '❌ Opção inválida. Por favor, tente novamente.';
const MAIN_MENU_TRIGGER = 'menu';

// Cache de sessões dos usuários
const userSessions = {};

async function getMainMenu() {
  try {
    const menuFlow = await Flow.findOne({ trigger: MAIN_MENU_TRIGGER });
    if (!menuFlow) {
      return {
        text: '🤖 *Menu Principal* 🤖\n\n1. Falar com atendente\n2. Informações\n3. Suporte\n\nDigite o número da opção:',
        options: {
          '1': 'Você escolheu falar com atendente',
          '2': 'Você escolheu informações',
          '3': 'Você escolheu suporte'
        }
      };
    }
    
    return {
      text: menuFlow.content,
      options: JSON.parse(menuFlow.options || '{}')
    };
  } catch (error) {
    console.error('Erro ao carregar menu:', error);
    return {
      text: '🤖 *Menu Principal* 🤖\n\n1. Falar com atendente\n2. Informações\n3. Suporte\n\nDigite o número da opção:',
      options: {
        '1': 'Você escolheu falar com atendente',
        '2': 'Você escolheu informações',
        '3': 'Você escolheu suporte'
      }
    };
  }
}

async function handleMessage(client, msg) {
  if (!msg?.from || !msg?.body || !msg.from.endsWith('@c.us')) return;

  try {
    const chat = await msg.getChat();
    const userMessage = msg.body.trim();
    const phone = msg.from;

    if (!userMessage) return;

    // Salva mensagem do usuário
    await saveMessage(phone, 'user', userMessage);

    // Inicializa sessão se não existir
    if (!userSessions[phone]) {
      userSessions[phone] = {
        inMenu: true,
        currentMenu: 'main'
      };
    }

    let response = '';
    const session = userSessions[phone];

    // Se estiver no menu principal
    if (session.inMenu) {
      const menu = await getMainMenu();
      
      if (menu.options[userMessage]) {
        // Opção válida selecionada
        response = menu.options[userMessage] + '\n\nDigite *voltar* para retornar ao menu.';
        session.inMenu = false;
      } else {
        // Opção inválida
        response = DEFAULT_RESPONSE + '\n\n' + menu.text;
      }
    } else {
      // Fora do menu - verifica se quer voltar
      if (userMessage.toLowerCase() === 'voltar') {
        const menu = await getMainMenu();
        response = menu.text;
        session.inMenu = true;
      } else {
        response = 'Opção inválida. Digite *voltar* para retornar ao menu principal.';
      }
    }

    // Envia a resposta
    await simulateTyping(chat);
    await client.sendMessage(phone, response);
    await saveMessage(phone, 'bot', response);

  } catch (error) {
    console.error('Erro no handler de mensagens:', error);
    await client.sendMessage(msg.from, ERROR_MESSAGE);
  }
}

module.exports = { handleMessage };