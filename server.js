const express = require('express');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const path = require('path');
const http = require('http');

function startServer(whatsappClient) {
  const app = express();
  const server = http.createServer(app);
  const io = socketIO(server);
  const PORT = process.env.PORT || 3000;

  // Configuração do servidor web
  app.use(express.static(path.join(__dirname, 'public')));
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Manipulador de QR Code
  whatsappClient.on('qr', async (qr) => {
    console.log('🔁 Atualizando QR Code...');
    try {
      const qrImageUrl = await qrcode.toDataURL(qr);
      io.emit('qr', qrImageUrl);
      io.emit('status', 'Escaneie o QR Code no WhatsApp');
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    }
  });

  whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp conectado!');
    io.emit('status', 'Conectado com sucesso!');
  });

  whatsappClient.on('disconnected', () => {
    console.log('❌ WhatsApp desconectado');
    io.emit('status', 'Desconectado - Reinicie o servidor');
  });

  // Rotas
  app.get('/', (req, res) => {
    res.render('index', { title: 'Conectar WhatsApp Bot' });
  });

  server.listen(PORT, () => {
    console.log(`🌐 Servidor web rodando em http://localhost:${PORT}`);
  });

  return server;
}

module.exports = { startServer };