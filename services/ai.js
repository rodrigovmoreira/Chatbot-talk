const axios = require('axios');
const Session = require('../models/Session');
const Contact = require('../models/Contact');

/**
 * Função utilitária para montar o contexto da conversa
 */
async function buildContext(phone) {
  const session = await Session.findOne({ phone });
  if (!session) return [];

  // Aqui você pode expandir futuramente para buscar o histórico do contato
  // ou armazenar os últimos prompts/respostas.
  return [
    {
      role: 'system',
      content: 'Você é um assistente virtual amigável e prestativo, focado em ajudar o cliente conforme o contexto do negócio.'
    }
  ];
}

/**
 * Gera uma resposta da IA (DeepSeek, OpenAI, etc.)
 * @param {string} phone - Telefone do cliente
 * @param {string} userMessage - Mensagem enviada pelo usuário
 * @param {object} config - Configuração do negócio (BusinessConfig)
 */
async function generateAIResponse(phone, userMessage, config) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    if (!apiKey) {
      console.warn('⚠️ API Key da IA ausente. Resposta padrão será usada.');
      return config.messages.aiFallback || 'Não encontrei essa opção, mas posso tentar te ajudar com outra coisa.';
    }

    const context = await buildContext(phone);

    const promptMessages = [
      ...context,
      {
        role: 'system',
        content: `Negócio: ${config.businessName}. Tipo: ${config.businessType}. 
        Regras: responda sempre de forma simpática e útil, e não saia do contexto do negócio, a menos que o cliente peça explicitamente.`
      },
      { role: 'user', content: userMessage }
    ];

    console.log('🧠 Enviando prompt IA...');
    console.log('📄 Prompt:', userMessage);

    const response = await axios.post(
      apiUrl,
      {
        model,
        messages: promptMessages,
        temperature: 0.7,
        max_tokens: 250
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiReply =
      response.data?.choices?.[0]?.message?.content?.trim() ||
      config.messages.aiFallback ||
      'Desculpe, não consegui entender bem. Pode reformular?';

    console.log('✅ Resposta IA:', aiReply);

    // Atualiza timestamp da sessão (mantém controle de atividade)
    await Session.findOneAndUpdate(
      { phone },
      { updatedAt: new Date() },
      { upsert: true }
    );

    // Atualiza interação do contato
    await Contact.findOneAndUpdate(
      { phone },
      { lastInteraction: new Date(), $inc: { totalMessages: 1 } },
      { upsert: true }
    );

    return aiReply;
  } catch (error) {
    console.error('💥 Erro ao gerar resposta da IA:', error.response?.data || error.message);
    return config.messages.aiFallback || 'Não consegui gerar uma resposta agora. Tente novamente mais tarde.';
  }
}

module.exports = { generateAIResponse };
