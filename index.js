require('dotenv').config();
const { Client } = require('whatsapp-web.js');
const { handleMessage } = require('./messageHandler');
const dbConnect = require('./services/database');
const { startServer } = require('./server');
const menuService = require('./services/menuService'); // Adicione esta linha

// Inicializações
dbConnect();
const client = new Client();

client.on('ready', () => {
  console.log('✅ Bot conectado ao WhatsApp');
  menuService.initializeDefaultMenus(); // Inicializa menus padrão
});

client.on('message', async msg => handleMessage(client, msg));

startServer(client);
client.initialize();