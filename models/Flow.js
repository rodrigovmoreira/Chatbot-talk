const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const flowSchema = new mongoose.Schema({
  // Identificador único do fluxo
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  
  // Palavra-chave que ativa este fluxo (ou 'menu' para o menu principal)
  trigger: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  
  // Tipo de resposta que este fluxo fornece
  responseType: { 
    type: String, 
    enum: ['text', 'menu', 'redirect', 'api'], 
    required: true,
    default: 'text'
  },
  
  // Conteúdo principal da resposta
  content: { 
    type: String, 
    required: true,
    trim: true
  },
  
  // Opções para menus (armazenadas como JSON)
  options: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    validate: {
      validator: function(v) {
        if (this.responseType === 'menu') {
          try {
            JSON.stringify(v); // Verifica se é um JSON válido
            return true;
          } catch {
            return false;
          }
        }
        return true;
      },
      message: 'As opções do menu devem ser um JSON válido'
    }
  },
  
  // Respostas rápidas (para menus)
  quickReplies: [{
    text: {
      type: String,
      required: true,
      trim: true
    },
    nextFlow: { 
      type: String, 
      ref: 'Flow' 
    }
  }],
  
  // Prioridade (para quando múltiplos fluxos correspondem)
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Se o fluxo está ativo
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  // Metadados
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    default: 'system'
  }
}, { 
  // Opções do schema
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true 
  }
});

// Índices para melhor performance
flowSchema.index({ trigger: 1, isActive: 1 });
flowSchema.index({ isActive: 1, priority: -1 });
flowSchema.index({ responseType: 1 });

// Middleware para atualizar o timestamp de modificação
flowSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Método estático para buscar o menu principal
flowSchema.statics.getMainMenu = async function() {
  return this.findOne({ trigger: 'menu', isActive: true })
    .sort({ priority: -1 })
    .exec();
};

// Método para formatar a resposta
flowSchema.methods.formatResponse = function() {
  switch (this.responseType) {
    case 'menu':
      try {
        const menuOptions = typeof this.options === 'string' 
          ? JSON.parse(this.options) 
          : this.options;
        
        let response = this.content + '\n\n';
        Object.entries(menuOptions).forEach(([key, value]) => {
          response += `${key}. ${value.split('\n')[0]}\n`;
        });
        return response.trim();
      } catch (error) {
        return this.content;
      }
      
    default:
      return this.content;
  }
};

// Validação customizada para fluxos do tipo menu
flowSchema.pre('validate', function(next) {
  if (this.responseType === 'menu' && !this.options) {
    this.invalidate('options', 'Fluxos do tipo menu requerem opções');
  }
  next();
});

const Flow = mongoose.model('Flow', flowSchema);

module.exports = Flow;