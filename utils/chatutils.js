function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function simulateTyping(chat, ms = 3000) {
  // Tempo base + variação aleatória (entre -1s e +2s)
  const typingTime = ms + (Math.random() * 3000 - 1000);
  await delay(typingTime);
  await chat.sendStateTyping();
  await delay(typingTime);
}

module.exports = { delay, simulateTyping };