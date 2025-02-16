const User = require('../models/user.model');
const { verifyUserVip } = require('./subscription.service');
const { sendMessageToNumber } = require('../views/whatsApp/whatsappMessaging');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const { getRandomDelay } = require("../helpers/utils");

async function formatPredictionText(prediction) {
  let message = [
    `🎯 *NOUVELLE PRÉDICTION* ${prediction.isLive ? '🔴 LIVE' : ''}\n`,
    `🏆 ${prediction.championship.name}`,
    `⏰ En cours`,
    `\n${prediction.fixture.homeTeam.team_name} 🆚 ${prediction.fixture.awayTeam.team_name}`,
    `📍 ${prediction.fixture.venue || 'Stade à confirmer'}`,
    `\n💫 Notre Prédiction: ${prediction.prediction}`,
    '\n⚡️ Ne tardez pas! Les cotes peuvent baisser rapidement!',
    prediction.isLive ? '\n⚠️ PRÉDICTION LIVE: Placez votre pari maintenant!' : '',
    '\nBonne chance à tous! 🍀'
  ].filter(Boolean).join('\n');

  return message;
}

async function sendPredictionToVipUsers(prediction, client) {
  try {
    const messageText = await formatPredictionText(prediction);
    const users = await User.find({});
    const vipUsers = [];

    for (const user of users) {
      const {isVip} = await verifyUserVip(user.phoneNumber);
      if (isVip) {
        vipUsers.push(user);
      }
    }

    let successCount = 0;
    let errorCount = 0;

    for (const user of vipUsers) {
      try {
        await sendMessageToNumber(client, user.phoneNumber, messageText);
        successCount++;
        await delay(getRandomDelay(1000, 2000));
      } catch (error) {
        console.error(`Erreur d'envoi à ${user.phoneNumber}:`, error);
        errorCount++;
        continue;
      }
    }

    return {
      success: true,
      message: `Prédiction envoyée à ${successCount} utilisateurs VIP (${errorCount} échecs)`
    };
  } catch (error) {
    console.error('Erreur lors de l\'envoi des prédictions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendPredictionToVipUsers
};