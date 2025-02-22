const {
  getMainMenu,
  getDailyPredictionsMenu,
  getOldPredictionsMenu,
  getAccountMenu,
  getInvalidInputMessage
} = require('../../data');
const { replyToMessage, sendMessageToNumber, sendMediaToNumber } = require('./whatsappMessaging');
const logService = require('../../services/log.service');
const userService = require('../../services/user.service');
const { listPredictions, listLastTenDaysPredictions } = require("../../services/predict.service");
const { generateImage } = require("../../services/generateImagePredict.service");
const { verifyUserVip, listSubscriptions } = require("../../services/subscription.service");
const { orderCommander, sendStepMessage } = require("./Order");
const { requestPaiement } = require('../../services/monetbil.service');
const {sendDeviceNotification} = require('../../services/notification.service');
const moment = require("moment");
const fetch = require('node-fetch');
moment.locale('fr');


class JsonBinService {
  static API_KEY = '$2a$10$i.xMsd3ow6gXVS6KvIMz9.TQySCf8BGDqdK5umo2aG9wWA1YRMKZO';
  static BASE_URL = 'https://api.jsonbin.io/v3/b';

  static async getOrder(binId) {
    try {
      const response = await fetch(
        `${this.BASE_URL}/${binId}`,
        {
          method: 'GET',
          headers: {
            'X-Master-Key': this.API_KEY
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erreur de récupération de la commande');
      }

      const data = await response.json();
      return data.record;
    } catch (error) {
      throw new Error('Erreur de récupération de la commande');
    }
  }
}

// Global state for tracking user steps
const Steps = {};

// Utility functions
const reset = (user) => {
  Steps[user.data.phoneNumber] = {
    currentMenu: 'mainMenu',
    isFirstContact: !user.exist
  };
};

const getTodaysDate = () => new Date().toISOString().split('T')[0];

// Prediction handling functions
const sendPrediction = async (client, vipChoice, user) => {
  try {
    const isVisible = true;
    const { predictions } = await listPredictions(1, 15, getTodaysDate(), isVisible, vipChoice);

    if (predictions.length === 0) {
      reset(user);
      let predictionType = vipChoice ? "VIP" : "gratuite";
      sendMessageToNumber(client, user.data.phoneNumber, `Aucune prédiction ${predictionType} disponible pour l'instant. Vous recevrez un message dès qu'elle sera disponible.\n\n _Tapez # pour revenir au menu principal_`);
      return;
    }

    if (vipChoice) {
      const { isVip } = await verifyUserVip(user.data.phoneNumber);
      if (isVip) {
        const imageData = await generateImage(predictions);
        await sendMediaToNumber(client, user.data.phoneNumber, "image/png", imageData.toString("base64"), "nameMedia");
      } else {
        sendMessageToNumber(client, user.data.phoneNumber, `Vous n'avez pas de forfait VIP activé. Voici les options d'abonnement disponibles :`);
        await handleSubscriptionMenu(client, user);
      }
    } else {
      const imageData = await generateImage(predictions);
      await sendMediaToNumber(client, user.data.phoneNumber, "image/png", imageData.toString("base64"), "nameMedia");
    }
  } catch (error) {
    console.log('Error sending predictions:', error);
  }
};

const sendPredictionHistory = async (client, user, vipChoice) => {
  try {
    const { data } = await listLastTenDaysPredictions(isVisible = true, vipChoice);
    if (data.length === 0) {
      reset(user);
      await sendMessageToNumber(client, user.data.phoneNumber, `Aucun historique de prédictions disponible pour le moment.\n\n _Tapez # pour revenir au menu principal_`);
      return;
    }

    let historyResponse = `📋 Sélectionnez une journée pour explorer les détails des prédictions ${vipChoice ? "VIP" : "gratuites"} :\n\n`;

    historyDates = data.map((rate, index) => {
      return rate.date;
    });

    data.forEach((rate, index) => {
      historyResponse += `${index + 1}- ${moment(rate.date).format('ddd DD/MM/YYYY')} • *${rate.rate}*, Tapez ${index + 1}\n`;
    });

    historyResponse += "\n_Tapez # pour revenir au menu principal ou sélectionnez une date pour voir les prédictions de cette journée._";
    await sendMessageToNumber(client, user.data.phoneNumber, historyResponse);
    Steps[user.data.phoneNumber].currentMenu = "SelectDateForPredictions";
    Steps[user.data.phoneNumber].predictions = data;
  } catch (error) {
    console.log('Error sending prediction history:', error);
  }
};

const sendDailyPredictions = async (client, user, dateIndex) => {
  const dateSelected = historyDates[dateIndex - 1];
  try {
    const userSteps = Steps[user.data.phoneNumber];
    const vipChoice = userSteps.isVipSelected;
    const isVisible = true;
    const { predictions } = await listPredictions(1, 15, dateSelected, isVisible, vipChoice);
    if (!predictions || predictions.length === 0) {
      await sendMessageToNumber(client, user.data.phoneNumber, `Aucune prédiction disponible pour cette date.\n\n_Tapez # pour revenir au menu principal_`);
      reset(user);
      return;
    }

    let dailyPredictionsResponse = `📅 *${moment(dateSelected).format("dddd DD MMMM YYYY")}* :\n\n`;

    predictions.forEach((prediction) => {
      const { prediction: predictionType, iswin } = prediction;
      const { homeTeam, awayTeam, score } = prediction.fixture;
      const outcome = iswin ? "✅" : "❌";
      const event = `${homeTeam.team_name} vs ${awayTeam.team_name} • *${predictionType}* • ${score.fulltime} ${outcome}`;
      dailyPredictionsResponse += `▶️ ${event}\n`;
    });

    dailyPredictionsResponse += "\n_Tapez * pour revenir en arrière ,# pour revenir au menu principal._";
    await sendMessageToNumber(client, user.data.phoneNumber, dailyPredictionsResponse);
  } catch (error) {
    console.error('Error sending daily predictions:', error);
    await sendMessageToNumber(client, user.data.phoneNumber, `Erreur lors de l'envoi des prédictions journalières.\n\n_Tapez # pour revenir au menu principal_`);
    reset(user);
  }
};

const sendPredictionHistoryMenu = async (client, user) => {
  try {
    await sendMessageToNumber(client, user.data.phoneNumber, "📅 Sélectionnez le type de pronostic pour consulter l'historique :\n\n1-Pronostic gratuit, Tapez 1 \n2-Pronostic VIP, Tapez 2\n\n _Tapez # pour revenir au menu principal_");
    Steps[user.data.phoneNumber].currentMenu = "oldPredictions";
  } catch (error) {
    console.log('Error sending prediction history menu:', error);
  }
};

// Main command handler
const UserCommander = async (user, msg, client) => {
  try {
    if (!msg.isGroup && !msg.isStatus) {
      // Initialize steps if not exists
      if (!Steps[user.data.phoneNumber]) {
        reset(user);
      }

      // Handle bot status off/on
      if (user.data.botStatus === "off") {
        if (msg.body.toLowerCase() === "on") {
          const updateResult = await userService.update(user.data.phoneNumber, { botStatus: "on" });
          if (updateResult.success) {
            await replyToMessage(client, msg, "🤖 Assistant activé");
            user.data.botStatus = "on";
            reset(user);
            await replyToMessage(client, msg, getMainMenu(Steps[user.data.phoneNumber].isFirstContact, user.data.pseudo));
          }
        }
        return;
      }

      // Command from app
      if (msg.body.startsWith("commande-")) {
        try {
          const orderId = msg.body.replace("commande-", "");

          try {
            // Récupérer les données de la commande depuis JSONBin
            const orderData = await JsonBinService.getOrder(orderId);

            // Vérifier la validité et l'âge de la commande
            const orderTime = new Date(orderData.timestamp);
            const now = new Date();
            const orderAgeMinutes = (now - orderTime) / (1000 * 60);

            if (orderAgeMinutes > 30) { // Rejeter les commandes de plus de 30 minutes
              await sendMessageToNumber(client, user.data.phoneNumber,
                "❌ Cette commande a expiré.\n\n" +
                "Veuillez refaire la commande dans l'application bigwin.\n\n" +
                "_Tapez # pour revenir au menu principal_"
              );
              reset(user);
              return;
            }

            await userService.update(user.data.phoneNumber, { fcmToken: orderData?.fcmToken });

            // Structure validation
            if (!orderData || !orderData.plan || !orderData.mobileMoneyPhone) {
              await sendMessageToNumber(client, user.data.phoneNumber,
                "❌ Commande invalide.\n\n" +
                "Veuillez refaire la commande dans l'application bigwin.\n\n" +
                "_Tapez # pour revenir au menu principal_"
              );
              reset(user);
              return;
            }

            const welcomeMessage =
              `👋 Salut ${user.data.pseudo} !\n` +
              `✨ *Bienvenue sur BIGWIN* – Votre assistant de prédictions football !\n` +
              `📱 Nous avons reçu votre commande depuis l'application :\n\n` +
              `📦 *📝 Récapitulatif de votre abonnement:*\n` +
              `Forfait : ${orderData.plan.name}\n` +
              `Prix : ${orderData.plan.price} FCFA\n` +
              `Durée : ${orderData.plan.duration} jours\n` +
              `Description : ${orderData.plan.description}\n\n` +
              `Numéro de paiement : +237 ${orderData.mobileMoneyPhone}\n\n` +
              `Confirmez-vous la souscription ?\n` +
              `Répondez par *Oui* ou *Non*`;

            await sendMessageToNumber(client, user.data.phoneNumber, welcomeMessage);
            Steps[user.data.phoneNumber] = {
              currentMenu: "appPaymentConfirmation",
              pendingOrder: orderData,
              isFirstContact: false
            };
            return;

          } catch (error) {
            console.error('Erreur JSONBin:', error);
            await sendMessageToNumber(client, user.data.phoneNumber,
              "❌ Commande invalide ou expirée.\n\n" +
              "Veuillez refaire la commande dans l'application bigwin.\n\n" +
              "_Tapez # pour revenir au menu principal_"
            );
            reset(user);
            return;
          }
        } catch (error) {
          console.error('Erreur générale:', error);
          await sendMessageToNumber(client, user.data.phoneNumber,
            "❌ Une erreur est survenue.\n\n" +
            "_Tapez # pour revenir au menu principal_"
          );
          reset(user);
          await replyToMessage(client, msg, getMainMenu(false, user.data.pseudo));
          return;
        }
      }


      // se connecter
      if (msg.body.startsWith("connecte-")) {
        try {
          const fcmToken = msg.body.replace("connecte-", "");

          try {

            await userService.update(user.data.phoneNumber, { fcmToken });
            const notificationData = {
              notification: {
                title: "Connexion réussie",
                body: "Bienvenue sur BigWin"
              },
              data: {
                type: "user_data",
                user: JSON.stringify(user.data),
              }
            }
            await sendDeviceNotification(fcmToken, notificationData);

            // Envoyer le message WhatsApp de confirmation avec lien deep link
            await sendMessageToNumber(client, user.data.phoneNumber,
              "✅ Connexion réussie !\n\n" +
              "📱 Cliquez sur ce lien pour ouvrir l'application :\n\n" +
              "https://play.google.com/store/apps/details?id=com.bigwin.application\n\n" +
              "_Bon pronostics ! 🎉_"
            );
          } catch (error) {
            await sendMessageToNumber(client, user.data.phoneNumber,
              "❌ Token de connexion invalide.\n\n" +
              "Veuillez réessayer la connexion dans l'application BigWin.\n\n" +
              "_Tapez # pour revenir au menu principal._"
            );
            reset(user);
            return;
          }
        } catch (error) {
          console.error('Erreur générale:', error);
          await sendMessageToNumber(client, user.data.phoneNumber,
            "❌ Une erreur est survenue.\n\n" +
            "_Tapez # pour revenir au menu principal_"
          );
          reset(user);
          await replyToMessage(client, msg, getMainMenu(false, user.data.pseudo));
          return;
        }
      }
      // Handle reset command
      if (msg.body === "#") {
        reset(user);
        await replyToMessage(client, msg, getMainMenu(false, user.data.pseudo));
        return;
      }

      // Handle bot deactivation
      if (msg.body.toLowerCase() === "off") {
        const updateResult = await userService.update(user.data.phoneNumber, { botStatus: "off" });
        if (updateResult.success) {
          await replyToMessage(client, msg, "🤖 Assistant désactivé. Tapez 'on' pour le réactiver.");
          reset(user);
        }
        return;
      }

      const { currentMenu, isFirstContact } = Steps[user.data.phoneNumber];

      // Handle first contact
      if ((isFirstContact && !msg.body.startsWith("commande-")) || (isFirstContact && !msg.body.startsWith("connecte-"))) {
        await replyToMessage(client, msg, getMainMenu(true, user.data.pseudo));
        Steps[user.data.phoneNumber].isFirstContact = false;
        return;
      }

      // Handle menu navigation
      switch (currentMenu) {
        case "appPaymentConfirmation":
          switch (msg.body.toUpperCase()) {
            case "OUI":
              try {
                const paymentResult = await requestPaiement(
                  user.data,
                  Steps[user.data.phoneNumber].pendingOrder.mobileMoneyPhone,
                  Steps[user.data.phoneNumber].pendingOrder.plan,
                  Steps[user.data.phoneNumber].pendingOrder.fcmToken,
                );
                await sendMessageToNumber(client, user.data.phoneNumber,
                  paymentResult
                );
                reset(user);
              } catch (error) {
                console.error('Error processing payment:', error);
                await sendMessageToNumber(client, user.data.phoneNumber,
                  "❌ Une erreur est survenue lors du traitement du paiement.\n" +
                  "Veuillez réessayer ou contacter le support.\n\n" +
                  "_Tapez # pour revenir au menu principal_"
                );
                reset(user);
              }
              break;

            case "NON":
              await sendMessageToNumber(client, user.data.phoneNumber,
                "❌ Commande annulée.\n\n" +
                "_Tapez # pour revenir au menu principal_"
              );
              reset(user);
              break;

            default:
              await sendMessageToNumber(client, user.data.phoneNumber,
                "⚠️ Veuillez répondre par *OUI* ou *NON* pour confirmer ou annuler votre commande."
              );
          }
          break;

        case "mainMenu":
          switch (msg.body) {
            case "1":
              Steps[user.data.phoneNumber].currentMenu = "dailyPredictions";
              await replyToMessage(client, msg, getDailyPredictionsMenu());
              break;
            case "2":
              await sendPredictionHistoryMenu(client, user);
              break;
            case "3":
              Steps[user.data.phoneNumber].currentMenu = "account";
              const { isVip, subscription } = await verifyUserVip(user.data.phoneNumber);
              await replyToMessage(client, msg, getAccountMenu(user.data, isVip, subscription));
              break;
            case "4":
              await replyToMessage(client, msg,
                `📱 *Suivez notre application sur la Play Store !*\n\n` +
                `Découvrez une expérience de prédictions football plus fluide et diversifiée directement depuis votre mobile !\n\n` +
                `⚡️ Profitez d'une interface intuitive et d'une variété de pronostics pour tous les goûts. Que vous soyez novice ou expert, notre application est faite pour vous !\n\n` +
                `💳 *Paiements sécurisés* : Effectuez vos paiements facilement via carte bancaire ou PayPal, pour une expérience sans tracas et rapide !\n\n` +
                `🔥 *Téléchargez maintenant* et commencez à maximiser vos gains dès aujourd'hui !\n\n` +
                `[*Télécharger sur Play Store*](https://play.google.com/store/apps/details?id=com.bigwin.application)\n\n` +
                `_*Tapez # pour revenir au menu principal.*_`
              );
              break;
            default:
              if(!msg.body.startsWith("connecte-")) {
                await replyToMessage(client, msg, getInvalidInputMessage(msg.body, "Veuillez choisir un numéro entre 1 et 4"));
                await replyToMessage(client, msg, getMainMenu(false, user.data.pseudo));
              }

          }
          break;
        case "dailyPredictions":
          const { isVip } = await verifyUserVip(user.data.phoneNumber);
          const vipChoice = msg.body === "2";
          if (msg.body === "1") {
            await sendPrediction(client, vipChoice, user);
          }
          else if (msg.body === "2") {
            if (isVip) {
              await sendPrediction(client, vipChoice, user);
            }
            else {
              await sendStepMessage(client, user.data.phoneNumber);
              Steps[user.data.phoneNumber].currentMenu = "orderMenu";
            }
          }
          else {
            await replyToMessage(client, msg, getInvalidInputMessage(msg.body, "Veuillez choisir un numéro entre 1 et 2"));
          }
          break;

        case "oldPredictions":
          if (msg.body === "1" || msg.body === "2") {
            const vipChoice = msg.body === "2";
            Steps[user.data.phoneNumber].isVipSelected = vipChoice;
            await sendPredictionHistory(client, user, vipChoice);
          } else {
            await replyToMessage(client, msg, getInvalidInputMessage(msg.body, "Veuillez choisir un numéro entre 1 et 2"));
          }
          break;

        case "SelectDateForPredictions":
          const dateIndex = parseInt(msg.body);
          if (!isNaN(dateIndex) && dateIndex > 0 && dateIndex <= Steps[user.data.phoneNumber].predictions.length) {
            await sendDailyPredictions(client, user, dateIndex);
          }
          else if (msg.body == "*") {
            await sendPredictionHistory(client, user, Steps[user.data.phoneNumber].isVipSelected);
          }
          else {
            await replyToMessage(client, msg, getInvalidInputMessage(msg.body, `Veuillez choisir un numéro entre 1 et ${Steps[user.data.phoneNumber].predictions.length}`));
          }
          break;

        case "orderMenu":
          if (msg.body.toLowerCase() === "non") {
            reset(user);
            await replyToMessage(client, msg, getMainMenu(false, user.data.pseudo));
          }
          else {
            await orderCommander(user, msg, client);
          }
          break;

        case "account":
          reset(user);
          await replyToMessage(client, msg, getMainMenu(false, user.data.pseudo));
          break;

        default:
          if(!msg.body.startsWith("connecte-")) {
            await replyToMessage(client, msg, getInvalidInputMessage(msg.body, "Veuillez choisir un numéro entre 1 et 4"));
            await replyToMessage(client, msg, getMainMenu(false, user.data.pseudo));
          }
      }
    }
  } catch (error) {
    await logService.addLog(`${error.message}`, 'UserCommander', 'error');
    await replyToMessage(client, msg, "Une erreur est survenue. Tapez # pour revenir au menu principal.");
  }
};

module.exports = {
  UserCommander
};