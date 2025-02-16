const mongoose = require('mongoose');
const NotificationService = require('../services/notification.service');
const { publishPredictionText } = require('../services/predict.service');

const PredictSchema = new mongoose.Schema({
  country: {
    logo: { type: String, default: "https://media.api-sports.io/football/teams/24051.png" },
    name: { type: String, required: true }
  },
  championship: {
    logo: { type: String, default: "https://media.api-sports.io/football/teams/24051.png" },
    name: { type: String, required: true }
  },
  fixture: {
    homeTeam: {
      team_id: { type: Number, required: true },
      team_name: { type: String, required: true },
      logo: { type: String, required: true }
    },
    awayTeam: {
      team_id: { type: Number, required: true },
      team_name: { type: String, required: true },
      logo: { type: String, required: true }
    },
    event_date: { type: Date, required: true },
    venue: { type: String },
    status: { type: String, required: true },
    statusShort: { type: String, required: true },
    score: {
      halftime: { type: String, default: null },
      fulltime: { type: String, default: null }
    }
  },
  iswin: { type: Boolean, default: false },
  prediction: { type: String, required: true },
  coast: { type: Number, required: true },
  author: { type: String },
  isVisible: { type: Boolean, default: false },
  isWhatapp: { type: Boolean, default: false },
  isVip: { type: Boolean, default: false },
  isPlatinum: { type: Boolean, default: false },
  isLive: { type: Boolean, default: false },
  expiresAt: { type: Date } 
}, {
  timestamps: true,
  strict: false 
});

// Création de l'index TTL sur le champ expiresAt
PredictSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Fonction pour calculer la date d'expiration (match time + durée estimée + 15 minutes)
function calculateExpirationDate(matchDate) {
  const MATCH_DURATION = 90 * 60 * 1000; // 90 minutes en millisecondes
  const EXTRA_TIME = 15 * 60 * 1000; // 15 minutes supplémentaires en millisecondes
  
  return new Date(matchDate.getTime() + MATCH_DURATION + EXTRA_TIME);
}

// Middleware pre-save modifié
PredictSchema.pre('save', async function(next) {
  if (this.isLive) {
    this.isVip = true;
    this.isPlatinum = true;
    
    // Définir la date d'expiration pour les prédictions live
    this.expiresAt = calculateExpirationDate(this.fixture.event_date);
    
    try {
      const notificationData = {
        title: '🔥 LIVE PREDICTION ALERT!',
        body: formatMatchNotification(this.fixture),
        data: {
          predictId: this._id.toString(),
          type: 'live_prediction',
          homeTeam: this.fixture.homeTeam.team_name,
          awayTeam: this.fixture.awayTeam.team_name,
          matchTime: this.fixture.event_date.toISOString(),
          venue: this.fixture.venue || '',
          isLive: 'true',
          status: this.fixture.status || ''
        }
      };

      await NotificationService.sendGeneralNotification(notificationData);
      await publishPredictionText(this, this._whatsappClient);
      delete this._whatsappClient;
    } catch (error) {
      console.error('Error sending live prediction notification:', error);
    }
  }
  next();
});

// Fonction utilitaire pour le formatage des notifications
function formatMatchNotification(fixture) {
  return [
    `🏆 ${fixture.homeTeam.team_name} vs ${fixture.awayTeam.team_name}`,
    `⚽ ${fixture.venue || 'Venue TBD'}`,
    `🕒 ${new Date(fixture.event_date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}`,
    '\n👉 Tap to see prediction details!'
  ].join('\n');
}

const Predict = mongoose.model('Predict', PredictSchema);

module.exports = Predict;