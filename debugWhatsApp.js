// debugWhatsApp.js
const { Client } = require('whatsapp-web.js');
const mongoose = require('mongoose');

async function testWhatsAppConnection() {
  console.log('🧪 INICIANDO TESTE DE CONEXÃO WHATSAPP...');
  
  const client = new Client({
    puppeteer: {
      headless: false, // Mudar para TRUE em produção
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    },
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    }
  });

  // Adicionar TODOS os eventos possíveis para debug
  client.on('qr', (qr) => {
    console.log('🔵 QR CODE RECEBIDO - Escaneie este QR Code');
  });

  client.on('authenticated', () => {
    console.log('🟢 WHATSAPP AUTENTICADO COM SUCESSO!');
  });

  client.on('auth_failure', (msg) => {
    console.log('🔴 FALHA NA AUTENTICAÇÃO:', msg);
  });

  client.on('ready', () => {
    console.log('🟢 WHATSAPP PRONTO E CONECTADO!');
    console.log('🟢 O BOT DEVERIA ESTAR OUVINDO MENSAGENS AGORA');
  });

  client.on('message', async (msg) => {
    console.log('🎉 MENSAGEM RECEBIDA NO DEBUG!');
    console.log('De:', msg.from);
    console.log('Conteúdo:', msg.body);
    console.log('Tipo:', msg.type);
    console.log('---');
  });

  client.on('message_create', (msg) => {
    console.log('📝 MENSAGEM CRIADA (enviada):', msg.body);
  });

  client.on('message_revoke_everyone', (msg) => {
    console.log('🗑️ MENSAGEM APAGADA:', msg);
  });

  client.on('disconnected', (reason) => {
    console.log('🔴 WHATSAPP DESCONECTADO:', reason);
  });

  client.on('change_state', (state) => {
    console.log('🔄 MUDANÇA DE ESTADO:', state);
  });

  client.on('loading_screen', (percent, message) => {
    console.log(`📊 LOADING: ${percent}% - ${message}`);
  });

  console.log('🔄 INICIALIZANDO CLIENTE WHATSAPP...');
  await client.initialize();
  
  return client;
}

module.exports = { testWhatsAppConnection };