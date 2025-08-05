const express = require('express');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');

function startServer(whatsappClient) {
  const app = express();
  const server = http.createServer(app);
  const io = socketIO(server);
  const PORT = process.env.PORT || 3000;

  // Configurações de middleware
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(session({
    secret: process.env.SESSION_SECRET || 'secret123',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: 'sessions'
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 dia
  }));

  // Configurações de views e arquivos estáticos
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.static(path.join(__dirname, 'public')));

  // Variável para armazenar o último QR Code gerado
  let lastQr = null;

  // Função para gerar e emitir QR Code
  const generateAndEmitQr = async (io, qr) => {
    try {
      const qrImageUrl = await qrcode.toDataURL(qr);
      io.emit('qr', qrImageUrl);
      io.emit('status', 'Escaneie o QR Code no WhatsApp');
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    }
  };

  // Handlers de eventos do WhatsApp
  whatsappClient.on('qr', (qr) => {
    lastQr = qr;
    generateAndEmitQr(io, qr);
  });

  whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp conectado!');
    io.emit('status', 'Conectado com sucesso!');
  });

  whatsappClient.on('disconnected', () => {
    console.log('❌ WhatsApp desconectado');
    io.emit('status', 'Desconectado - Reinicie o servidor');
  });

  // Rotas públicas
  app.get('/', (req, res) => {
    res.render('index', { title: 'Conectar WhatsApp Bot' });
    if (lastQr) {
      generateAndEmitQr(io, lastQr);
    }
  });

  // Rotas de autenticação
  app.get('/login', (req, res) => {
    res.render('admin/login', { error: req.query.error });
  });

  app.post('/login', (req, res) => {
    if (req.body.password === process.env.ADMIN_PASSWORD) {
      req.session.user = { name: "Admin" };
      return res.redirect('/admin');
    }
    res.redirect('/login?error=1');
  });

  // Middleware para proteger rotas admin
  const authMiddleware = (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    next();
  };

  // Rotas administrativas protegidas
  app.get('/admin', authMiddleware, (req, res) => {
    res.render('admin/dashboard');
  });

  // API para gerenciar fluxos (protegida)
  app.get('/api/flows', authMiddleware, async (req, res) => {
    try {
      const flows = await Flow.find();
      res.json(flows);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar fluxos' });
    }
  });

  app.post('/api/flows', authMiddleware, async (req, res) => {
    try {
      const newFlow = await Flow.create(req.body);
      res.json(newFlow);
    } catch (error) {
      res.status(400).json({ error: 'Erro ao criar fluxo' });
    }
  });

  // Socket.IO connections
  io.on('connection', (socket) => {
    console.log('Novo cliente conectado');
    if (lastQr) {
      generateAndEmitQr(socket, lastQr);
    }

    socket.on('disconnect', () => {
      console.log('Cliente desconectado');
    });
  });

  // Inicia o servidor
  server.listen(PORT, () => {
    console.log(`🌐 Servidor web rodando em http://localhost:${PORT}`);
  });

  return server;
}

module.exports = { startServer };