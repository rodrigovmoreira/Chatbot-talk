// services/database.js
const mongoose = require('mongoose');

module.exports = () => {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => console.log('✅ Banco de dados conectado'))
    .catch(err => console.error('❌ Erro na conexão:', err));
};