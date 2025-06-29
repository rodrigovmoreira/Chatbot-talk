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

  let lastQr = null;

  // Manipulador de QR Code
 whatsappClient.on('qr', (qr) => {
    lastQr = qr;
    generateAndEmitQr(io, qr);
  });

  // Função para gerar e emitir o QR Code
  const generateAndEmitQr = async (io, qr) => {
    try {
      const qrImageUrl = await qrcode.toDataURL(qr);
      io.emit('qr', qrImageUrl);
      io.emit('status', 'Escaneie o QR Code no WhatsApp');
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    }
  };

    app.get('/', (req, res) => {
    res.render('index');
    if (lastQr) {
      generateAndEmitQr(io, lastQr);
    }
  });

  // Quando um cliente se conecta via Socket.IO
  io.on('connection', (socket) => {
    console.log('Novo cliente conectado');
    
    // Se já tivermos um QR Code, envia imediatamente para o novo cliente
    if (lastQr) {
      generateAndEmitQr(socket, lastQr);
    }

    socket.on('disconnect', () => {
      console.log('Cliente desconectado');
    });
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