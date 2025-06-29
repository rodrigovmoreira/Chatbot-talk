require('dotenv').config();
const { Client } = require('whatsapp-web.js');
const { handleMessage } = require('./messageHandler');
const dbConnect = require('./services/database');
const { startServer } = require('./server'); // Importamos o servidor

// Inicializações
dbConnect();
const client = new Client();

// Configuração do WhatsApp Client
client.on('ready', () => {
  console.log('✅ Bot conectado ao WhatsApp');
});

client.on('message', async msg => handleMessage(client, msg));

// Inicia tanto o servidor web quanto o WhatsApp client
startServer(client); // Passamos o client para o servidor

client.initialize();