const mongoose = require('mongoose');
const NotificationService = require('../services/notification.service');
const WhatsAppService = require('../services/whatsapp.service');

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
  author: { type: String},
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

// Fonction pour vérifier et définir isWin en fonction de la prédiction
PredictSchema.post('findOneAndUpdate', async function(doc) {
  const { fixture,prediction } = doc; // Obtenir le document mis à jour
  const { score } = fixture || {}; // Accéder à score et prediction
  if (!score || !score.fulltime) {
    return; // Si fulltime n'est pas défini, ne rien faire
  }

  const { halftime, fulltime } = score;
  const [halftimeHome, halftimeAway] = halftime ? halftime.split('-').map(Number) : [0, 0];
  const [fulltimeHome, fulltimeAway] = fulltime ? fulltime.split('-').map(Number) : [0, 0];
  // Conditions basées sur les valeurs de buts
  switch (prediction) {
    case 'Home Win':
      iswin = fulltimeHome > fulltimeAway;
      break;
    case 'Away Win':
      iswin = fulltimeHome < fulltimeAway;
      break;
    case 'Draw':
      iswin = fulltimeHome === fulltimeAway;
      break;
    case 'Double Chance Home':
      iswin = fulltimeHome >= fulltimeAway;
      break;
    case 'Double Chance Away':
      iswin = fulltimeHome <= fulltimeAway;
      break;
    case 'Two Teams Goals':
      iswin = halftimeHome > 0 && halftimeAway > 0 && fulltimeHome > 0 && fulltimeAway > 0;
      break;
    case 'Two Teams Don\'t Goals':
      iswin = (halftimeHome === 0 || halftimeAway === 0) && (fulltimeHome === 0 || fulltimeAway === 0);
      break;
    case 'Over 0.5':
      iswin = fulltimeHome + fulltimeAway > 0;
      break;
    case 'Under 0.5':
      iswin = fulltimeHome + fulltimeAway === 0;
      break;
    case 'Over 1.5':
      iswin = fulltimeHome + fulltimeAway > 1;
      break;
    case 'Under 1.5':
      iswin = fulltimeHome + fulltimeAway <= 1;
      break;
    case 'Over 2.5':
      iswin = fulltimeHome + fulltimeAway > 2;
      break;
    case 'Under 2.5':
      iswin = fulltimeHome + fulltimeAway <= 2;
      break;
    case 'Over 3.5':
      iswin = fulltimeHome + fulltimeAway > 3;
      break;
    case 'Under 3.5':
      iswin = fulltimeHome + fulltimeAway <= 3;
      break;
    case 'Home Team Scores':
      iswin = fulltimeHome > 0;
      break;
    case 'Away Team Scores':
      iswin = fulltimeAway > 0;
      break;
    case 'Home Team Doesn\'t Score':
      iswin = fulltimeHome === 0;
      break;
    case 'Away Team Doesn\'t Score':
      iswin = fulltimeAway === 0;
      break;
    case 'Clean Sheet Home Team':
      iswin = fulltimeHome === 0 && fulltimeAway > 0;
      break;
    case 'Clean Sheet Away Team':
      iswin = fulltimeAway === 0 && fulltimeHome > 0;
      break;
    case 'First Half Goals Over 0.5':
      iswin = halftimeHome + halftimeAway > 0;
      break;
    case 'First Half Goals Under 0.5':
      iswin = halftimeHome + halftimeAway === 0;
      break;
    case 'First Half Goals Over 1.5':
      iswin = halftimeHome + halftimeAway > 1;
      break;
    case 'First Half Goals Under 1.5':
      iswin = halftimeHome + halftimeAway <= 1;
      break;
    case 'Second Half Goals Over 0.5':
      iswin = fulltimeHome + fulltimeAway - (halftimeHome + halftimeAway) > 0;
      break;
    case 'Second Half Goals Under 0.5':
      iswin = fulltimeHome + fulltimeAway - (halftimeHome + halftimeAway) === 0;
      break;
    case 'Second Half Goals Over 1.5':
      iswin = fulltimeHome + fulltimeAway - (halftimeHome + halftimeAway) > 1;
      break;
    case 'Second Half Goals Under 1.5':
      iswin = fulltimeHome + fulltimeAway - (halftimeHome + halftimeAway) <= 1;
      break;
    // Ajoute d'autres cas ici...
    default:
      iswin = false;
  }
  await doc.updateOne({ iswin });
});



// Création de l'index TTL
PredictSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

function calculateExpirationDate(matchDate) {
  const MATCH_DURATION = 90 * 60 * 1000;
  const EXTRA_TIME = 15 * 60 * 1000;
  return new Date(matchDate.getTime() + MATCH_DURATION + EXTRA_TIME);
}

function formatMatchNotification(fixture) {
  return [
    `🔴 LIVE PREDICTION!`,
    `\n🏆 ${fixture.homeTeam.team_name} vs ${fixture.awayTeam.team_name}`,
    `📍 ${fixture.venue || 'Venue TBD'}`,
    `⏰ ${new Date(fixture.event_date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}`,
    '\n👉 Tap to see prediction details!'
  ].join('\n');
}

// Fonction pour définir le client WhatsApp
PredictSchema.statics.setWhatsappClient = function(client) {
  tempWhatsappClient = client;
};

// Middleware pre-save modifié
PredictSchema.pre('save', async function(next) {
  if (this.isLive) {
    this.isVip = true;
    this.isPlatinum = true;
    this.expiresAt = calculateExpirationDate(this.fixture.event_date);
    
    try {
      // Notification Firebase
      const notificationData = {
        title: '🔴 LIVE PREDICTION!',
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

      // Gestion de WhatsApp
      if ( this._whatsappClient) {

        // Formatage du message WhatsApp directement
        const messageText = [
          `🎯 *NOUVELLE PRÉDICTION* 🔴 LIVE\n`,
          `🏆 ${this.championship.name}`,
          `⏰ En cours`,
          `\n${this.fixture.homeTeam.team_name} 🆚 ${this.fixture.awayTeam.team_name}`,
          `📍 ${this.fixture.venue || 'Stade à confirmer'}`,
          `\n💫 Notre Prédiction: ${this.prediction}`,
          '\n⚡️ Ne tardez pas! Les cotes peuvent baisser rapidement!',
          '\n⚠️ PRÉDICTION LIVE: Placez votre pari maintenant!',
          '\nBonne chance à tous! 🍀'
        ].join('\n');

        try {
          const User = mongoose.model('User');
          const { verifyUserVip } = require('../services/subscription.service');
          const { sendMessageToNumber } = require('../views/whatsApp/whatsappMessaging');
          const users = await User.find({});
          
          for (const user of users) {
            const {isVip} = await verifyUserVip(user.phoneNumber);
            if (isVip) {
              await sendMessageToNumber(this._whatsappClient, user.phoneNumber, messageText);
              await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
            }
          }
        } catch (whatsappError) {
          console.error('Error sending WhatsApp messages:', whatsappError);
        }
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }
  next();
});

const Predict = mongoose.model('Predict', PredictSchema);

module.exports = Predict;
