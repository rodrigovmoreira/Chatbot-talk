const axios = require('axios');

// Lista de palavras irrelevantes para análise de tópicos
const STOP_WORDS = ['que', 'com', 'para', 'por', 'uma', 'uns', 'uma', 'uns', 'isso', 'tão'];

async function generateAIResponse(message, context = '', topics = [], sentiment = 'neutral') {
  console.time('⏳ Tempo IA');

  try {
    const moodContext = sentiment === 'negative' 
      ? 'O usuário parece chateado. Seja empático e cuidadoso.' 
      : sentiment === 'positive'
      ? 'O usuário está de bom humor. Pode ser mais descontraído.'
      : '';

    const prompt = `
Você é o Moreira Bot, uma IA conversacional para WhatsApp. Siga estas diretrizes:
1. Linguagem informal mas educada
2. Respostas curtas (1-2 frases geralmente)
3. Varie seu estilo de resposta
4. Use emojis ocasionalmente (1-2 por resposta)
5. Se não souber algo, diga claramente

Contexto histórico:
${context}

Tópicos recentes: ${topics.join(', ') || 'nenhum tópico específico'}
${moodContext}

Usuário: ${message}
Moreira Bot:`.trim();

    const res = await axios.post(
      process.env.DEEPSEEK_API_URL,
      {
        model: process.env.DEEPSEEK_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: sentiment === 'negative' ? 0.3 : 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.timeEnd('⏳ Tempo IA');
    return applyResponseVariations(res.data.choices[0].message.content.trim());
  } catch (err) {
    console.error('❌ Erro na IA:', err.message);
    console.timeEnd('⏳ Tempo IA');
    return null;
  }
}

function applyResponseVariations(response) {
  const variations = [
    text => text.replace(/\.$/, '!'),
    text => text.replace(/\.$/, '...'),
    text => text.charAt(0).toLowerCase() + text.slice(1),
    text => Math.random() > 0.5 ? text + ' 😊' : text
  ];
  
  if (Math.random() < 0.3) {
    return variations[Math.floor(Math.random() * variations.length)](response);
  }
  return response;
}

module.exports = { generateAIResponse, applyResponseVariations };