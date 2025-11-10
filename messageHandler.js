const BusinessConfig = require('./models/BusinessConfig');
const Contact = require('./models/Contact');
const { getOrCreateSession, setSessionState } = require('./models/Session');
const { generateAIResponse } = require('./services/ai');

/**
 * Verifica se o horário atual está dentro do funcionamento configurado
 */
function isWithinOperatingHours(hours) {
  try {
    const now = new Date();
    const [openH, openM] = hours.opening.split(':').map(Number);
    const [closeH, closeM] = hours.closing.split(':').map(Number);

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    return nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
  } catch {
    return true; // fallback: assume aberto se erro
  }
}

/**
 * Busca a configuração do negócio pelo usuário (único)
 */
async function getBusinessConfig() {
  const config = await BusinessConfig.findOne();
  if (!config) throw new Error('Configuração do negócio não encontrada');
  return config;
}

/**
 * Processa o texto recebido comparando com as opções do menu
 */
function matchMenuOption(config, text) {
  if (!config.menuOptions || config.menuOptions.length === 0) return null;
  const normalized = text.trim().toLowerCase();
  return config.menuOptions.find(opt => normalized.includes(opt.keyword.toLowerCase()));
}

/**
 * Envia uma mensagem via WhatsApp
 */
async function sendMessage(client, to, content) {
  try {
    await client.sendMessage(to, content);
  } catch (err) {
    console.error('💥 Erro ao enviar mensagem para', to, err.message);
  }
}

/**
 * Manipulador principal de mensagens recebidas
 */
async function handleMessage(client, msg) {
  try {
    const phone = msg.from.replace('@c.us', '');
    const text = msg.body?.trim();

    console.log(`📩 Mensagem recebida de ${phone}: ${text}`);

    const config = await getBusinessConfig();

    // Cria ou atualiza contato
    const contact = await Contact.findOneAndUpdate(
      { phone },
      { lastInteraction: new Date(), $inc: { totalMessages: 1 } },
      { new: true, upsert: true }
    );

    // Cria sessão se não existir
    const session = await getOrCreateSession(phone);

    // ⏰ Verifica horário de atendimento
    const dentroDoHorario = isWithinOperatingHours(config.operatingHours);
    if (!dentroDoHorario && !config.behaviorRules.respondOutsideHours) {
      await sendMessage(client, msg.from, config.awayMessage);
      return;
    }

    // 🙌 Se for a primeira interação, envia mensagem de boas-vindas
    if (contact.totalMessages <= 1 && config.welcomeMessage) {
      await sendMessage(client, msg.from, config.welcomeMessage);
    }

    // 🔍 Verifica se a mensagem corresponde a alguma opção do menu
    const matchedOption = matchMenuOption(config, text);
    if (matchedOption) {
      console.log(`✅ Comando reconhecido: ${matchedOption.keyword}`);

      await sendMessage(client, msg.from, matchedOption.response);

      if (matchedOption.requiresHuman) {
        await sendMessage(client, msg.from, config.messages.humanForward);
        await setSessionState(phone, 'aguardando_atendente');
      } else {
        await setSessionState(phone, matchedOption.keyword);
      }

      return;
    }

    // 🤖 Fallback: nenhum comando reconhecido
    if (config.behaviorRules.useAIOnFallback) {
      console.log('🧠 Nenhum comando reconhecido, gerando resposta da IA...');
      const aiResponse = await generateAIResponse(phone, text, config);
      await sendMessage(client, msg.from, aiResponse);
      return;
    }

    // ☎️ Encaminhar para humano se configurado
    if (config.behaviorRules.forwardToHumanIfNotUnderstood) {
      await sendMessage(client, msg.from, config.messages.humanForward);
      await setSessionState(phone, 'aguardando_atendente');
      return;
    }

    // ❌ Resposta padrão se nenhuma regra se aplicar
    await sendMessage(client, msg.from, config.messages.defaultError);

  } catch (error) {
    console.error('💥 Erro no handleMessage:', error);
  }
}

module.exports = { handleMessage };
