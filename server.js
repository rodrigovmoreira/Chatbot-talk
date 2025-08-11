require('dotenv').config();
const express = require('express');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Flow = require('./models/Flow');

function startServer(whatsappClient) {
  const app = express();
  const server = http.createServer(app);
  const io = socketIO(server);
  const PORT = process.env.PORT || 3000;

  // Conexão com o MongoDB
  mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chatbot', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  // Configurações de middleware
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/chatbot',
      collectionName: 'sessions',
      autoRemove: 'interval',
      autoRemoveInterval: 10 // Limpa sessões a cada 10 minutos
    }),
    cookie: { 
      maxAge: 1000 * 60 * 60 * 24, // 1 dia
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    }
  }));

  // Configurações de views e arquivos estáticos
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.static(path.join(__dirname, 'public')));

  // Variável para armazenar o último QR Code gerado
  let lastQr = null;

  // Função para gerar e emitir QR Code
  const generateAndEmitQr = async (qr) => {
    try {
      const qrImageUrl = await qrcode.toDataURL(qr);
      lastQr = qr;
      io.of('/admin').emit('qr', qrImageUrl);
      io.of('/admin').emit('status', 'Escaneie o QR Code no WhatsApp');
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    }
  };

  // Handlers do WhatsApp Client
  whatsappClient.on('qr', async (qr) => {
    console.log('Evento QR recebido do WhatsApp Web');
    await generateAndEmitQr(qr);
  });

  whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp conectado!');
    io.of('/admin').emit('status', 'Conectado com sucesso!');
    io.of('/admin').emit('qr', null);
  });

  whatsappClient.on('disconnected', () => {
    console.log('❌ WhatsApp desconectado');
    io.of('/admin').emit('status', 'Desconectado - Reinicie o servidor');
  });

  // Configuração do Socket.IO namespace admin
  io.of('/admin').on('connection', (socket) => {
    console.log('Cliente conectado ao namespace /admin');

    socket.on('request_qr', () => {
      if (lastQr) {
        generateAndEmitQr(lastQr);
      }
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado do namespace /admin');
    });
  });

  // Middleware para verificar autenticação
  const authMiddleware = (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    next();
  };

  // Rotas públicas
  app.get('/', (req, res) => {
    res.render('index', { title: 'Chatbot WhatsApp' });
  });

  // Rotas de autenticação
  app.get('/login', (req, res) => {
    if (req.session.user) {
      return res.redirect('/admin');
    }
    res.render('admin/login', { error: req.query.error });
  });

  app.post('/login', (req, res) => {
    if (req.body.password === process.env.ADMIN_PASSWORD) {
      req.session.user = { 
        name: "Admin",
        sessionId: crypto.randomBytes(16).toString('hex')
      };
      
      req.session.save(err => {
        if (err) {
          console.error('Erro ao salvar sessão:', err);
          return res.redirect('/login?error=1');
        }
        res.redirect('/admin');
      });
    } else {
      res.redirect('/login?error=1');
    }
  });

  app.get('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error('Erro ao destruir sessão:', err);
      }
      res.redirect('/login');
    });
  });

  // Rotas administrativas protegidas
  app.get('/admin', authMiddleware, (req, res) => {
    res.render('admin/dashboard', {
      title: 'Painel Administrativo',
      user: req.session.user
    });
  });

  // Rotas para gerenciamento de fluxos
  app.get('/admin/flows', authMiddleware, async (req, res) => {
    try {
      const flows = await mongoose.model('Flow').find().sort({ priority: -1 });
      res.render('admin/flows', { 
        flows,
        user: req.session.user
      });
    } catch (error) {
      console.error('Erro ao carregar fluxos:', error);
      res.status(500).render('admin/error', { 
        error: 'Erro ao carregar fluxos',
        user: req.session.user
      });
    }
  });

  // Inicia o servidor
  server.listen(PORT, () => {
    console.log(`🌐 Servidor web rodando em http://localhost:${PORT}`);
    console.log(`🔒 Painel admin em http://localhost:${PORT}/admin`);
  });

  return server;
}

module.exports = { startServer };