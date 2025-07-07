const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: String,
  preferences: {
    responseStyle: { type: String, enum: ['direto', 'detalhado', 'engraçado'], default: 'direto' },
    emojiFrequency: { type: Number, default: 0.3, min: 0, max: 1 }
  },
  conversationHistory: [{
    date: Date,
    topic: String,
    sentiment: String
  }],
  lastSeen: Date
});

userSchema.methods.updatePreferences = function(prefs) {
  this.preferences = { ...this.preferences, ...prefs };
  return this.save();
};

const User = mongoose.model('User', userSchema);

async function getOrCreateUser(phone) {
  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({ 
      phone,
      preferences: {
        responseStyle: 'direto',
        emojiFrequency: 0.3
      }
    });
  }
  return user;
}

module.exports = {
  User,
  getOrCreateUser
};