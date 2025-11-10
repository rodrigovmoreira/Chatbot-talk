const mongoose = require('mongoose');

const businessConfigSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'SystemUser', required: true },

  // 🔹 Identificação do negócio
  businessName: { type: String, required: true },
  businessType: { 
    type: String, 
    enum: ['varejo', 'servicos', 'restaurante', 'imoveis', 'outros'],
    required: true 
  },

  // 🔹 Configurações básicas de atendimento
  welcomeMessage: { type: String, default: 'Olá! Bem-vindo à nossa loja. Como posso ajudar?' },
  awayMessage: { type: String, default: 'No momento estamos fechados. Horário de atendimento: 09h às 18h.' },
  operatingHours: {
    opening: { type: String, default: '09:00' },
    closing: { type: String, default: '18:00' },
    timezone: { type: String, default: 'America/Sao_Paulo' }
  },

  // 🔹 Menu de atendimento configurável
  menuOptions: [{
    keyword: String,
    description: String,
    response: String,
    requiresHuman: { type: Boolean, default: false }
  }],

  // 🔹 Catálogo de produtos (para bots comerciais)
  products: [{
    name: String,
    category: String,
    price: Number,
    description: String,
    imageUrl: String,
    available: { type: Boolean, default: true }
  }],

  // 🔹 Configurações de venda
  paymentMethods: [String],
  deliveryOptions: [String],

  // 🧠 NOVO: Regras de comportamento e IA
  behaviorRules: {
    useAIOnFallback: { type: Boolean, default: true }, // usa IA se não achar menu
    forwardToHumanIfNotUnderstood: { type: Boolean, default: false }, // encaminhar humano
    respondOutsideHours: { type: Boolean, default: false } // responder fora do horário
  },

  // 💬 NOVO: Mensagens padrão personalizáveis
  messages: {
    defaultError: { type: String, default: 'Desculpe, não entendi sua mensagem.' },
    humanForward: { type: String, default: 'Vou encaminhar você para um atendente humano.' },
    aiFallback: { type: String, default: 'Não encontrei essa opção, mas posso tentar entender o que você precisa.' }
  },

  // ⚙️ Metadados
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Atualiza automaticamente o campo updatedAt
businessConfigSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('BusinessConfig', businessConfigSchema);
