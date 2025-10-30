const { saveMessage, getLastMessages } = require('./services/message');
const { getOrCreateSession } = require('./models/Session');
const { simulateTyping } = require('./utils/chatUtils');
const { generateAIResponse } = require('./services/ai');
const BusinessConfig = require('./models/BusinessConfig');

async function handleMessage(client, msg) {
  if (!msg?.from || !msg?.body || !msg.from.endsWith('@c.us')) {
    return;
  }

  try {
    const userMessage = msg.body.trim();
    if (!userMessage) return;

    // Buscar configuração do negócio (assumindo primeiro usuário por enquanto)
    const businessConfig = await BusinessConfig.findOne({});
    
    if (!businessConfig) {
      await client.sendMessage(msg.from, '⚠️ Sistema em configuração. Por favor, aguarde.');
      return;
    }

    // Verificar se é novo cliente
    const messageCount = await getLastMessages(msg.from, 1);
    const isNewCustomer = messageCount.length === 0;

    // Mensagem de boas-vindas para novos clientes
    if (isNewCustomer) {
      await client.sendMessage(msg.from, businessConfig.welcomeMessage);
      await showMainMenu(client, msg.from, businessConfig);
      await saveMessage(msg.from, 'bot', businessConfig.welcomeMessage);
      return;
    }

    // Processar comando do menu
    const menuResponse = await processMenuCommand(userMessage, businessConfig);
    if (menuResponse) {
      await client.sendMessage(msg.from, menuResponse);
      await saveMessage(msg.from, 'bot', menuResponse);
      return;
    }

    // Se não for comando de menu, usar IA contextual
    const history = await getLastMessages(msg.from, 5);
    const context = createBusinessContext(history, businessConfig);
    
    const aiResponse = await generateBusinessAIResponse(userMessage, context, businessConfig);
    await client.sendMessage(msg.from, aiResponse);
    await saveMessage(msg.from, 'bot', aiResponse);

  } catch (error) {
    console.error('❌ Erro no atendimento:', error);
    await client.sendMessage(msg.from, '⚠️ Ops! Tive um problema. Pode tentar novamente?');
  }
}

// Mostrar menu principal
async function showMainMenu(client, phone, businessConfig) {
  const menuText = `🗂️ *Menu Principal*:\n\n` +
    businessConfig.menuOptions.map((opt, index) => 
      `${index + 1}️⃣ *${opt.keyword}* - ${opt.description}`
    ).join('\n') +
    `\n\nDigite o número ou palavra-chave da opção desejada.`;
  
  await client.sendMessage(phone, menuText);
}

// Processar comandos do menu
async function processMenuCommand(message, businessConfig) {
  const lowerMessage = message.toLowerCase().trim();
  
  // Buscar opção por número ou palavra-chave
  const option = businessConfig.menuOptions.find((opt, index) => 
    lowerMessage === (index + 1).toString() || 
    lowerMessage.includes(opt.keyword.toLowerCase())
  );
  
  if (option) {
    if (option.requiresHuman) {
      return `👨‍💼 ${option.response}\n\nUm de nossos vendedores entrará em contato em breve!`;
    }
    return option.response;
  }
  
  return null;
}

// Criar contexto para IA com informações do negócio
function createBusinessContext(history, businessConfig) {
  const businessInfo = `
Empresa: ${businessConfig.businessName}
Segmento: ${businessConfig.businessType}
Produtos: ${businessConfig.products.map(p => p.name).join(', ')}
Horário: ${businessConfig.operatingHours.opening} às ${businessConfig.operatingHours.closing}
  `.trim();
  
  const conversationHistory = history
    .reverse()
    .map(m => `${m.role === 'user' ? 'Cliente' : 'Atendente'}: ${m.content}`)
    .join('\n');
  
  return `Informações da Empresa:\n${businessInfo}\n\nHistórico:\n${conversationHistory}`;
}

// Gerar resposta da IA contextualizada para o negócio
async function generateBusinessAIResponse(message, context, businessConfig) {
  const prompt = `
Você é um atendente virtual da empresa ${businessConfig.businessName}, que atua no segmento de ${businessConfig.businessType}.

INSTRUÇÕES IMPORTANTES:
- Seja prestativo e educado
- Mantenha respostas curtas e objetivas
- Use emojis moderadamente
- Não invente informações sobre produtos ou preços
- Encaminhe para atendimento humano quando necessário

INFORMAÇÕES DA EMPRESA:
${context}

PRODUTOS DISPONÍVEIS:
${businessConfig.products.map(p => `- ${p.name}: R$ ${p.price} | ${p.description}`).join('\n')}

Cliente: ${message}
Atendente:`.trim();

  const response = await generateAIResponse(prompt);
  return response || "🤖 Não consegui entender. Pode reformular sua pergunta?";
}

module.exports = { handleMessage };