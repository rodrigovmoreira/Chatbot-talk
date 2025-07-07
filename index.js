require('dotenv').config();
const { Client } = require('whatsapp-web.js');
const { handleMessage } = require('./handlers/messageHandler');
const dbConnect = require('./services/database');
const { startServer } = require('./server');
const { User } = require('./services/userModel');

dbConnect();
const client = new Client();

client.on('ready', async () => {
  console.log('✅ Bot conectado ao WhatsApp');
  // Atualizar status dos usuários
  await User.updateMany({}, { $set: { lastSeen: new Date() } });
});

client.on('message', async msg => handleMessage(client, msg));

// Lidar com desconexões
client.on('disconnected', () => {
  console.log('❌ WhatsApp desconectado');
  process.exit(1);
});

startServer(client);
client.initialize();