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
      io.of('/admin').emit('qr', qrImageUrl);
      io.of('/admin').emit('status', 'Escaneie o QR Code no WhatsApp');
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    }
  };

  // No handler do WhatsApp Client:
  whatsappClient.on('qr', async (qr) => {
    console.log('Evento QR recebido do WhatsApp Web');
    try {
      const qrImageUrl = await qrcode.toDataURL(qr);
      io.of('/admin').emit('qr', qrImageUrl);
      io.of('/admin').emit('status', 'Escaneie o QR Code no WhatsApp');
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      io.of('/admin').emit('status', 'Erro ao gerar QR Code');
    }
  });

  // Adicione este handler para o namespace admin
  io.of('/admin').on('connection', (socket) => {
    console.log('Cliente conectado ao namespace /admin');

    // Responde a solicitações de QR Code
    socket.on('request_qr', () => {
      console.log('Cliente solicitou QR Code');
      if (lastQr) {
        qrcode.toDataURL(lastQr)
          .then(url => {
            socket.emit('qr', url);
            socket.emit('status', 'Escaneie o QR Code no WhatsApp');
          })
          .catch(err => {
            console.error('Erro ao regenerar QR:', err);
            socket.emit('status', 'Erro ao gerar QR Code');
          });
      }
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado do namespace /admin');
    });
  });

  whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp conectado!');
    io.of('/admin').emit('status', 'Conectado com sucesso!');
  });

  whatsappClient.on('disconnected', () => {
    console.log('❌ WhatsApp desconectado');
    io.of('/admin').emit('status', 'Desconectado - Reinicie o servidor');
  });

  // Rotas públicas
  app.get('/', (req, res) => {
    res.render('index', { title: 'Chatbot WhatsApp' });
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
    res.render('admin/dashboard', {
      title: 'Painel Administrativo',
      user: req.session.user
    });
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

  // Configuração do Socket.IO namespaces
  const adminNamespace = io.of('/admin');

  adminNamespace.on('connection', (socket) => {
    console.log('Novo cliente conectado ao namespace /admin');
    if (lastQr) {
      generateAndEmitQr(adminNamespace, lastQr);
    }

    socket.on('disconnect', () => {
      console.log('Cliente desconectado do namespace /admin');
    });
  });

  // Inicia o servidor
  server.listen(PORT, () => {
    console.log(`🌐 Servidor web rodando em http://localhost:${PORT}`);
  });

  return server;
}

module.exports = { startServer };