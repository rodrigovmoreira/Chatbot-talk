// ===index.js===
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./messageHandler');
const dbConnect = require('./services/database');
require('dotenv').config();

// Conectar ao banco de dados MongoDB
const client = new Client();
dbConnect();

// Configurar o cliente WhatsApp
client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('Bot conectado ao WhatsApp'));
client.on('message', async msg => handleMessage(client, msg));

client.initialize();
