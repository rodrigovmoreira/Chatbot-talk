require('dotenv').config();
const express = require('express');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SystemUser = require('./models/SystemUser');
const Contact = require('./models/Contact');
const BusinessConfig = require('./models/BusinessConfig');

function startServer(whatsappClient) {
  const app = express();
  const server = http.createServer(app);
  const io = socketIO(server);
  const PORT = process.env.PORT || 3000;

  console.log('🔄 Iniciando servidor...');

  // Middlewares
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Middleware de autenticação
  const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    console.log('🔐 Verificando token:', token ? 'Token presente' : 'Token ausente');
    
    if (!token) {
      return res.status(401).json({ message: 'Token de acesso necessário' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'seu_jwt_secret', (err, user) => {
      if (err) {
        console.log('❌ Token inválido:', err.message);
        return res.status(403).json({ message: 'Token inválido' });
      }
      req.user = user;
      console.log('✅ Token válido para usuário:', user.userId);
      next();
    });
  };

  let lastQr = null;

  // Rotas de Autenticação
  
  app.post('/api/register', async (req, res) => {
    try {
      console.log('📝 Iniciando registro:', req.body);
      const { name, email, password, company } = req.body;

      // Validação básica
      if (!name || !email || !password) {
        console.log('❌ Dados incompletos no registro');
        return res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });
      }

      console.log('🔍 Verificando usuário existente:', email);
      const existingUser = await SystemUser.findOne({ email });
      if (existingUser) {
        console.log('❌ Usuário já existe:', email);
        return res.status(400).json({ message: 'Usuário já existe com este email' });
      }

      console.log('👤 Criando novo usuário...');
      const user = await SystemUser.create({ 
        name, 
        email, 
        password, 
        company: company || 'Meu Negócio' 
      });
      console.log('✅ Usuário criado com ID:', user._id);

      console.log('🏢 Criando configuração padrão do negócio...');
      await BusinessConfig.create({
        userId: user._id,
        businessName: company || 'Meu Negócio',
        businessType: 'outros',
        menuOptions: [
          {
            keyword: 'produtos',
            description: 'Ver produtos',
            response: 'Aqui estão nossos produtos principais...'
          },
          {
            keyword: 'horario',
            description: 'Horário de funcionamento',
            response: 'Funcionamos de segunda a sexta, das 9h às 18h.'
          }
        ]
      });
      console.log('✅ Configuração de negócio criada');

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'seu_jwt_secret',
        { expiresIn: '7d' }
      );

      console.log('✅ Registro concluído com sucesso para:', email);
      res.status(201).json({
        token,
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email, 
          company: user.company 
        }
      });

    } catch (error) {
      console.error('💥 ERRO NO REGISTRO:', error);
      res.status(500).json({ 
        message: 'Erro interno do servidor',
        error: error.message 
      });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      console.log('🔐 Tentativa de login:', req.body.email);
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios' });
      }

      console.log('🔍 Buscando usuário:', email);
      const user = await SystemUser.findOne({ email }).select('+password');
      
      if (!user) {
        console.log('❌ Usuário não encontrado:', email);
        return res.status(400).json({ message: 'Credenciais inválidas' });
      }

      console.log('🔑 Verificando senha...');
      const validPassword = await user.correctPassword(password, user.password);
      if (!validPassword) {
        console.log('❌ Senha incorreta para:', email);
        return res.status(400).json({ message: 'Credenciais inválidas' });
      }

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'seu_jwt_secret',
        { expiresIn: '7d' }
      );

      console.log('✅ Login bem-sucedido para:', email);
      res.json({
        token,
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email, 
          company: user.company 
        }
      });

    } catch (error) {
      console.error('💥 ERRO NO LOGIN:', error);
      res.status(500).json({ 
        message: 'Erro interno do servidor',
        error: error.message 
      });
    }
  });

  // Rotas do Business Config
  app.get('/api/business-config', authenticateToken, async (req, res) => {
    try {
      console.log('📋 Buscando configuração para usuário:', req.user.userId);
      const config = await BusinessConfig.findOne({ userId: req.user.userId });
      
      if (!config) {
        console.log('❌ Configuração não encontrada, criando padrão...');
        const newConfig = await BusinessConfig.create({
          userId: req.user.userId,
          businessName: 'Meu Negócio',
          businessType: 'outros'
        });
        return res.json(newConfig);
      }
      
      res.json(config);
    } catch (error) {
      console.error('💥 ERRO ao buscar configuração:', error);
      res.status(500).json({ message: 'Erro ao buscar configuração' });
    }
  });

  app.put('/api/business-config', authenticateToken, async (req, res) => {
    try {
      console.log('📝 Atualizando configuração para usuário:', req.user.userId);
      const config = await BusinessConfig.findOneAndUpdate(
        { userId: req.user.userId },
        { ...req.body, updatedAt: new Date() },
        { new: true, upsert: true }
      );
      res.json(config);
    } catch (error) {
      console.error('💥 ERRO ao atualizar configuração:', error);
      res.status(500).json({ message: 'Erro ao atualizar configuração' });
    }
  });

  // Rotas de visualização - SEMPRE redirecionar para login
  app.get('/', (req, res) => {
    console.log('🏠 Redirecionando raiz para login...');
    res.redirect('/admin/login');
  });

  app.get('/admin/login', (req, res) => {
    console.log('🔐 Servindo página de login...');
    res.render('admin/login', { title: 'Login - ChatBot Platform' });
  });

  app.get('/admin/dashboard', authenticateToken, (req, res) => {
    console.log('📊 Servindo dashboard para usuário:', req.user.userId);
    res.render('admin/dashboard', { title: 'Dashboard - ChatBot Platform' });
  });

  // Rota antiga do WhatsApp - redirecionar para login
  app.get('/whatsapp', (req, res) => {
    console.log('🔀 Redirecionando /whatsapp para login...');
    res.redirect('/admin/login');
  });

  // Socket.IO com autenticação
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    console.log('🔐 Autenticando socket, token presente:', !!token);
    
    if (!token) {
      console.log('❌ Socket sem token - rejeitando');
      return next(new Error('Autenticação necessária'));
    }

    jwt.verify(token, process.env.JWT_SECRET || 'seu_jwt_secret', (err, decoded) => {
      if (err) {
        console.log('❌ Token de socket inválido:', err.message);
        return next(new Error('Token inválido'));
      }
      socket.userId = decoded.userId;
      console.log('✅ Socket autenticado para usuário:', decoded.userId);
      next();
    });
  });

  // Manipulador de QR Code
  whatsappClient.on('qr', (qr) => {
    console.log('📱 QR Code gerado pelo WhatsApp');
    lastQr = qr;
    generateAndEmitQr(io, qr);
  });

  const generateAndEmitQr = async (io, qr) => {
    try {
      console.log('🎨 Convertendo QR Code para imagem...');
      const qrImageUrl = await qrcode.toDataURL(qr);
      console.log('📤 Emitindo QR Code via Socket.IO');
      io.emit('qr', qrImageUrl);
      io.emit('status', 'Escaneie o QR Code no WhatsApp');
    } catch (error) {
      console.error('💥 ERRO ao gerar QR Code:', error);
    }
  };

  io.on('connection', (socket) => {
    console.log('🔌 Novo cliente conectado via Socket.IO, usuário:', socket.userId);
    
    if (lastQr) {
      console.log('📱 Enviando QR Code existente para novo cliente');
      generateAndEmitQr(socket, lastQr);
    }

    socket.on('disconnect', () => {
      console.log('🔌 Cliente desconectado:', socket.userId);
    });
  });

  whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp conectado e pronto!');
    io.emit('status', 'Conectado com sucesso!');
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('❌ WhatsApp desconectado:', reason);
    io.emit('status', 'Desconectado - Reinicie o servidor');
  });

  whatsappClient.on('auth_failure', (error) => {
    console.error('💥 Falha na autenticação do WhatsApp:', error);
    io.emit('status', 'Falha na autenticação - Recarregue a página');
  });

  server.listen(PORT, () => {
    console.log(`🌐 Servidor web rodando em http://localhost:${PORT}`);
    console.log(`🔐 Página de login: http://localhost:${PORT}/admin/login`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/admin/dashboard`);
  });

  return server;
}

module.exports = { startServer };