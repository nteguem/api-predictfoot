const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  functionName: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  type: {
    type: String,
    enum: ['error', 'info', 'warning'],
    default: 'info',
  },
  resolved: {
    type: Boolean,
    default: false,  
  },
  // Ajout d'un champ spécifique pour les TTL
  expiresAt: {
    type: Date,
    default: function() {
      const now = new Date();
      if (this.type === 'error') {
        // 3 jours pour les logs de type error
        return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      } else {
        // 24 jours pour les logs de type info et warning
        return new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000);
      }
    }
  }
});

// Création de l'index TTL sur le champ expiresAt
logSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Log = mongoose.model('Log', logSchema);

module.exports = Log;