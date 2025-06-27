const axios = require('axios');

async function generateAIResponse(message, context = '') {
  console.time('⏳ Tempo IA');

  try {
    const prompt = `
Você é o MoreiraBot, um assistente útil, simpático e direto.
Responda como se estivesse conversando no WhatsApp, com uma linguagem informal e clara.
Se você não souber a resposta ou não tiver certeza absoluta, diga que não sabe.
NUNCA invente endereços, telefones ou nomes de empresas.
Use emoji com moderação, só quando fizer sentido.

Contexto da conversa:
${context}

Usuário: ${message}
Moreira Bot:
`.trim();

    const res = await axios.post(
      process.env.DEEPSEEK_API_URL,
      {
        model: process.env.DEEPSEEK_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.5
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.timeEnd('⏳ Tempo IA');

    return res.data.choices[0].message.content.trim();
  } catch (err) {
    console.error('❌ Erro na IA:', err.message);
    console.timeEnd('⏳ Tempo IA');
    return null;
  }
}

module.exports = { generateAIResponse };
