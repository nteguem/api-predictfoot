const mongoose = require('mongoose');

/**
 * Schéma pour les informations du bot WhatsApp
 * Ce schéma représente un document unique dans la collection
 */
const botSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['connected', 'disconnected'],
    default: 'disconnected'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Ajouter un index pour s'assurer qu'il n'y a qu'un seul document
botSchema.index({ phoneNumber: 1 }, { unique: true });

// Créer et exporter le modèle
const Bot = mongoose.model('Bot', botSchema);

module.exports = Bot;