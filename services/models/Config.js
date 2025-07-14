const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed },
  updatedAt: { type: Date, default: Date.now }
});

// Métodos estáticos para acessar configurações
ConfigSchema.statics.getConfig = async function(name, defaultValue = null) {
  const config = await this.findOne({ name });
  return config ? config.value : defaultValue;
};

module.exports = mongoose.model('Config', ConfigSchema);