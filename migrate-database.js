require('dotenv').config();
const mongoose = require('mongoose');

async function migrateDatabase() {
  console.log('🔄 Iniciando migração do banco de dados...');
  
  // Usar MONGO_URI do .env com fallback
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/chatbot-platform';
  console.log('📡 Conectando ao MongoDB:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
  
  // Conexão simples sem opções deprecated
  await mongoose.connect(mongoUri);
  console.log('✅ Conectado ao MongoDB');

  const db = mongoose.connection.db;
  
  try {
    console.log('📋 Verificando coleções existentes...');
    const collections = await db.listCollections().toArray();
    
    // 1. Renomear coleções antigas para backup
    const collectionsToRename = [
      { old: 'users', new: 'backup_users' },
      { old: 'sessions', new: 'backup_sessions' },
    ];
    
    for (const { old, new: newName } of collectionsToRename) {
      const oldCollection = collections.find(c => c.name === old);
      if (oldCollection) {
        console.log(`🔄 Renomeando ${old} para ${newName}...`);
        try {
          await db.collection(old).rename(newName);
          console.log(`✅ ${old} renomeada para ${newName}`);
        } catch (error) {
          console.log(`⚠️  Não foi possível renomear ${old}:`, error.message);
        }
      }
    }
    
    // 2. Criar novas coleções
    console.log('🏗️ Criando novas coleções com estrutura separada...');
    
    const newCollections = [
      'systemusers',
      'contacts', 
      'messages',
      'sessions',
      'businessconfigs'
    ];
    
    for (const collectionName of newCollections) {
      try {
        const exists = collections.find(c => c.name === collectionName);
        if (!exists) {
          await db.createCollection(collectionName);
          console.log(`✅ ${collectionName} criada`);
        } else {
          console.log(`⚠️  ${collectionName} já existe, pulando...`);
        }
      } catch (error) {
        console.log(`⚠️  Erro ao criar ${collectionName}:`, error.message);
      }
    }
    
    console.log('📊 Criando índices...');
    
    // Índices para systemusers
    try {
      await db.collection('systemusers').createIndex({ email: 1 }, { unique: true });
      console.log('✅ Índice único em email para systemusers');
    } catch (error) {
      console.log('⚠️  Índice systemusers/email já existe');
    }
    
    // Índices para contacts
    try {
      await db.collection('contacts').createIndex({ phone: 1 }, { unique: true });
      console.log('✅ Índice único em phone para contacts');
    } catch (error) {
      console.log('⚠️  Índice contacts/phone já existe');
    }
    
    try {
      await db.collection('contacts').createIndex({ lastInteraction: -1 });
      console.log('✅ Índice em lastInteraction para contacts');
    } catch (error) {
      console.log('⚠️  Índice contacts/lastInteraction já existe');
    }
    
    // Índices para sessions
    try {
      await db.collection('sessions').createIndex({ contactId: 1 });
      console.log('✅ Índice em contactId para sessions');
    } catch (error) {
      console.log('⚠️  Índice sessions/contactId já existe');
    }
    
    try {
      await db.collection('sessions').createIndex({ phone: 1 });
      console.log('✅ Índice em phone para sessions');
    } catch (error) {
      console.log('⚠️  Índice sessions/phone já existe');
    }
    
    // Índices para messages
    try {
      await db.collection('messages').createIndex({ contactId: 1 });
      console.log('✅ Índice em contactId para messages');
    } catch (error) {
      console.log('⚠️  Índice messages/contactId já existe');
    }
    
    try {
      await db.collection('messages').createIndex({ phone: 1 });
      console.log('✅ Índice em phone para messages');
    } catch (error) {
      console.log('⚠️  Índice messages/phone já existe');
    }
    
    console.log('🎉 Migração concluída! Nova estrutura:');
    console.log('   📁 models/SystemUser.js → systemusers');
    console.log('   📁 models/Contact.js → contacts');
    console.log('   📁 models/Session.js → sessions');
    console.log('   📁 models/Message.js → messages');
    console.log('   📁 models/BusinessConfig.js → businessconfigs');
    
  } catch (error) {
    console.error('💥 ERRO durante a migração:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão com MongoDB fechada.');
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  migrateDatabase().catch(console.error);
}

module.exports = { migrateDatabase };