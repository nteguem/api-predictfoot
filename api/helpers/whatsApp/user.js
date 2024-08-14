const { menuData } = require("../../data");
const { faqOptions } = require("../../data/faqOptions")
const logger = require('../logger');
const { sendMessageToNumber, sendMediaToNumber } = require('./whatsappMessaging');
const { listPredictions ,listLastTenDaysPredictions} = require("../../services/predict.service");
const { deleteUser } = require("../../services/user.service")
const { generateImage } = require("../../services/generateImagePredict.service");
const { verifyUserVip, listSubscriptions } = require("../../services/subscription.service");
const { getAllPlans } = require("../../services/plan.service");
const { makePayment } = require("../../services/monetbil.service");
const { listTips } = require('../../services/tip.service');
const moment = require("moment");
moment.locale('fr');

const Steps = {};
let historyDates = [];
const reset = (user) => {
  Steps[user.data.phoneNumber] = { currentMenu: "mainMenu" };
};
const playstoreLink = "https://play.google.com/store/apps/details?id=com.example.yourapp"; 
const appstoreLink = "https://apps.apple.com/app/id123456789"; 

const replyInvalid = async (msg, client, user) => {
  reset(user);
      const menuMessage = `*${user.data.pseudo}*, veuillez choisir une option dans le menu principal ci-dessus pour continuer.`;
      await sendMessageToNumber(client, user.data.phoneNumber, menuData(user.data.pseudo, user.exist));
      msg.reply(menuMessage); 
};

const getTodaysDate = () => new Date().toISOString().split('T')[0];

const isSubscriptionActive = (subscription) => {
  const now = new Date();
  return new Date(subscription.endDate) > now;
};

const UserCommander = async (user, msg, client) => {
  try {
    if (!msg.isGroup) {
      if (!Steps[user.data.phoneNumber]) {
        reset(user);
      }

      if (msg.body === "#") {
        reset(user);
        msg.reply(menuData(user.data.pseudo, user.exist));
        return;
      }

      const { currentMenu } = Steps[user.data.phoneNumber];
      switch (currentMenu) {
        case "mainMenu":
          switch (msg.body) {
            case "1":
              msg.reply("📋 Sélectionnez le type de pronostic :\n1-Gratuit, Tapez 1\n2-VIP, Tapez 2\n\n _Tapez # pour revenir au menu principal_");
              Steps[user.data.phoneNumber].currentMenu = "DailyPronoMenu";
              break;
            // case "2":
            //   const vipStatusExclusive = await verifyUserVip(user.data.phoneNumber);
            //   if (vipStatusExclusive) {
            //     await sendExclusiveTips(client, user)
            //   } else {
            //     await sendMessageToNumber(client, user.data.phoneNumber, `Vous n'avez pas de forfait VIP activé pour bénéficier des astuces et conseils exclusifs. Voici les options d'abonnement disponibles  :`);
            //     await handleSubscriptionMenu(client, user);
            //   }
            //   break;
            case "2":
              await sendPredictionHistoryMenu(client, user);
              break;
            case "3":
              const vipStatus = await verifyUserVip(user.data.phoneNumber);
              if (vipStatus) {
                await listSubscriptionUser(msg, user)
              } else {
                await handleSubscriptionMenu(client, user);
              }
              break;
            case "4":
              let faqResponse = "Bienvenue dans la section 'Informations et Aide'. Trouvez ici toutes les réponses et informations essentielles pour utiliser notre service de pronostics :\n\n";
              faqOptions.forEach((option, index) => {
                faqResponse += `${index + 1}. ${option.title}\n`;
              });
              faqResponse += "\n_Tapez # pour revenir au menu principal._";
              sendMessageToNumber(client, user.data.phoneNumber, faqResponse);
              Steps[user.data.phoneNumber].currentMenu = "FAQSubMenu";
              Steps[user.data.phoneNumber].faqOptions = faqOptions;
              break;
              case '5':
                await sendAppLinks(client, user);
                break;
            case "6":
              msg.reply("Êtes-vous sûr de vouloir ne plus recevoir les prédictions journalières via ce bot ? Répondez 'oui' pour confirmer, ou tapez # pour revenir au menu principal.");
              Steps[user.data.phoneNumber].currentMenu = "ConfirmDisableNotifications";
              break;
            default:
              await replyInvalid(msg, client, user);
          }
          break;

        case "DailyPronoMenu":
          if (msg.body === "1" || msg.body === "2") {
            const isVip = msg.body === "2";
            await sendPrediction(client, isVip, user);
          } else {
            await replyInvalid(msg, client, user);
          }
          break;

        case "SubscriptionMenu":
          const selectedPlanIndex = parseInt(msg.body);
          const plans = Steps[user.data.phoneNumber].plans;
          if (isNaN(selectedPlanIndex) || selectedPlanIndex < 1 || selectedPlanIndex > plans.length) {
            await replyInvalid(msg, client, user);
            break;
          }

          const selectedPlan = plans[selectedPlanIndex - 1];
          msg.reply(`*Détail du forfait* \nNom : ${selectedPlan.name}\nPrix : ${selectedPlan.price} XAF\nDurée : ${selectedPlan.duration}\nDescription : ${selectedPlan.description}\n\nVeuillez saisir votre numéro de téléphone mobile money pour procéder au paiement.`);
          Steps[user.data.phoneNumber].currentMenu = "EnterMobileMoneyNumber";
          Steps[user.data.phoneNumber].selectedPlan = selectedPlan; // Stockage du forfait sélectionné pour le paiement
          break;

        case "EnterMobileMoneyNumber":
          const mobileMoneyNumber = msg.body;
          if (!/^\d+$/.test(mobileMoneyNumber)) {
            msg.reply("Numéro de téléphone mobile money invalide. Veuillez saisir un numéro valide.");
            break;
          }

          const selectedPlanForPayment = Steps[user.data.phoneNumber].selectedPlan;
          msg.reply(`Vous avez saisi le numéro : ${mobileMoneyNumber}. Confirmez-vous le paiement de ${selectedPlanForPayment.price} XAF pour le "${selectedPlanForPayment.name}" ? Répondez "oui" pour confirmer.`);
          Steps[user.data.phoneNumber].currentMenu = "ConfirmPayment";
          Steps[user.data.phoneNumber].mobileMoneyNumber = mobileMoneyNumber; // Stockage du numéro de mobile money pour le paiement
          break;

        case "ConfirmPayment":
          if (msg.body.toLowerCase() === "oui") {
            const selectedPlanToPay = Steps[user.data.phoneNumber].selectedPlan;
            const userPseudo = user.data.pseudo;
            const amount = selectedPlanToPay.price;
            const phonenumber = Steps[user.data.phoneNumber].mobileMoneyNumber;
            const paymentResponse = await makePayment(userPseudo, amount, phonenumber,Steps[user.data.phoneNumber].selectedPlan,user.data.phoneNumber);

            if (paymentResponse.status === "REQUEST_ACCEPTED") {
              msg.reply(`Paiement en cours. Utilisez le code USSD ${paymentResponse.channel_ussd} pour compléter le paiement via ${paymentResponse.channel_name}.`);
              // Ici, vous pouvez ajouter une logique pour traiter le succès ou l'échec du paiement via le callback que vous allez implémenter.
              reset(user);
            } else {
              msg.reply(`Erreur lors de l'initiation du paiement : ${paymentResponse.message}\n\n_Tapez # pour revenir au menu principal._`);
              reset(user);
            }
          } else {
            msg.reply("Paiement annulé.\n\n_Tapez # pour revenir au menu principal._");
            reset(user);
          }
          break;
        case "SubscriptionDetailsMenu":
          const selectedSubscriptionIndex = parseInt(msg.body);
          const subscriptions = Steps[user.data.phoneNumber].subscriptions;
          if (isNaN(selectedSubscriptionIndex) || selectedSubscriptionIndex < 1 || selectedSubscriptionIndex > subscriptions.length) {
            await replyInvalid(msg, client, user);
            break;
          }
          const selectedSubscription = subscriptions[selectedSubscriptionIndex - 1];
          const status = isSubscriptionActive(selectedSubscription) ? "En cours" : "Expiré";
          const planDetails = selectedSubscription.plan;
          msg.reply(`*Détail du forfait*\nNom : ${planDetails.name}\nPrix : ${planDetails.price} XAF\nDurée : ${planDetails.duration} jours\nDescription : ${planDetails.description}\nStatut : ${status}\nDate de début : ${new Date(selectedSubscription.startDate).toLocaleDateString()}\nDate de fin : ${new Date(selectedSubscription.endDate).toLocaleDateString()}\n\n_Tapez # pour revenir au menu principal._`);
          Steps[user.data.phoneNumber].currentMenu = "mainMenu";
          break;
        case "FAQSubMenu":
          const faqIndex = parseInt(msg.body);
          const storedFaqOptions = Steps[user.data.phoneNumber].faqOptions;

          if (!isNaN(faqIndex) && faqIndex > 0 && faqIndex <= storedFaqOptions.length) {
            const selectedFaq = storedFaqOptions[faqIndex - 1];
            let faqDetailsResponse = `Détails pour "${selectedFaq.title}" :\n\n`;
            selectedFaq.details.forEach(detail => {
              faqDetailsResponse += `   - ${detail}\n`;
            });
            faqDetailsResponse += "\n_Tapez * pour revenir en arrière ,# pour revenir au menu principal._";
            sendMessageToNumber(client, user.data.phoneNumber, faqDetailsResponse);
            Steps[user.data.phoneNumber].currentMenu = "FAQSubMenu";
          } else if (msg.body === "*") {
            // Retour au menu précédent (option 3 du mainMenu)
            let faqResponse = "Bienvenue dans la section 'Informations et Aide'. Trouvez ici toutes les réponses et informations essentielles pour utiliser notre service de pronostics :\n\n";
            storedFaqOptions.forEach((option, index) => {
              faqResponse += `${index + 1}. ${option.title}\n`;
            });
            faqResponse += "\n_Tapez # pour revenir au menu principal._";
            sendMessageToNumber(client, user.data.phoneNumber, faqResponse);
          } else {
            await replyInvalid(msg, client, user); // Gestion de réponse invalide si l'index est incorrect
          }
          break;
        case "ConfirmDisableNotifications":
          if (msg.body.toLowerCase() === "oui") {
            const { success } = await deleteUser(user.data.phoneNumber);
            if (success) {
              msg.reply("Vous n'allez plus recevoir des prédictions sur ce bot. Si vous souhaitez réactiver, écrivez à nouveau au bot.");
            } else {
              msg.reply("Erreur lors de la désactivation des notifications. Veuillez réessayer plus tard.");
            }
            reset(user);
          } else {
            msg.reply("Désactivation annulée.\n\n_Tapez # pour revenir au menu principal._");
            reset(user);
          }
          break;
          case "HistoryPredictionType":
            if (msg.body === "1" || msg.body === "2") {
              const isVip = msg.body === "2";
              Steps[user.data.phoneNumber].isVipSelected = isVip; // Stocker le choix de l'utilisateur
              await sendPredictionHistory(client, user, isVip);
            } else {
              await replyInvalid(msg, client, user);
            }
            break;
          case "SelectDateForPredictions":
        const dateIndex = parseInt(msg.body);
        if (!isNaN(dateIndex) && dateIndex > 0 && dateIndex <= Steps[user.data.phoneNumber].predictions.length) {
          await sendDailyPredictions(client, user, dateIndex);
        }
           else if(msg.body == "*")
            {
             await sendPredictionHistory(client, user, Steps[user.data.phoneNumber].isVipSelected);
            } 
        else {
          await replyInvalid(msg, client, user);
        }
        break; 
        default:
          await replyInvalid(msg, client, user);

      }
    }
  } catch (error) {
    logger(client).error('Erreur rencontrée User', error);
    msg.reply(`Une erreur interne du serveur s'est produite suite à une action de l'utilisateur : ${user.data.pseudo}. Notre équipe y travaille.\n\n_Tapez # pour revenir au menu principal._`);
  }
};

const sendPrediction = async (client, isVip, user) => {
  try {
    const isVisible = true;
    const { predictions } = await listPredictions(1, 15, getTodaysDate(), isVisible, isVip);

    if (predictions.length === 0) {
      reset(user);
      let predictionType = isVip ? "VIP" : "gratuite";
      sendMessageToNumber(client, user.data.phoneNumber, `Aucune prédiction ${predictionType} disponible pour l'instant. Vous recevrez un message dès qu'elle sera disponible.\n\n _Tapez # pour revenir au menu principal_`);
      return;
    }

    if (isVip) {
      const verifyUser = await verifyUserVip(user.data.phoneNumber);
      if (verifyUser) {
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

const handleSubscriptionMenu = async (client, user, msg) => {
  const plans = await getAllPlans();
  if (plans.length > 0) {
    let response = "📋 Sélectionnez un abonnement :\n";
    plans.forEach((plan, index) => {
      response += `${index + 1}. ${plan.name} (${plan.price} XAF)\n`; // Affichage numéroté des abonnements avec prix
    });
    response += "\n _Tapez # pour revenir au menu principal_";
    sendMessageToNumber(client, user.data.phoneNumber, response);
    Steps[user.data.phoneNumber].currentMenu = "SubscriptionMenu";
    Steps[user.data.phoneNumber].plans = plans; // Stockage des plans pour référence ultérieure
  } else {
    sendMessageToNumber(client, user.data.phoneNumber, "Aucun abonnement disponible pour le moment.\n\n _Tapez # pour revenir au menu principal_");
  }
};

const listSubscriptionUser = async (msg, user) => {
  const { subscriptions } = await listSubscriptions(user.data.phoneNumber);
  let response = "📋 Vos abonnements :\n";
  subscriptions.forEach((subscription, index) => {
    const status = isSubscriptionActive(subscription) ? "En cours" : "Expiré";
    response += `${index + 1}. ${subscription.plan.name} (${status})\n`;
  });
  response += "\n_Sélectionnez un abonnement pour voir les détails, ou tapez # pour revenir au menu principal._";
  msg.reply(response);
  Steps[user.data.phoneNumber].currentMenu = "SubscriptionDetailsMenu";
  Steps[user.data.phoneNumber].subscriptions = subscriptions;
}

const sendPredictionHistoryMenu = async (client, user) => {
  try {
    await sendMessageToNumber(client, user.data.phoneNumber, "📅 Sélectionnez le type de pronostic pour consulter l'historique :\n\n1-Pronostic gratuit, Tapez 1 \n2-Pronostic VIP, Tapez 2\n\n _Tapez # pour revenir au menu principal_");
    Steps[user.data.phoneNumber].currentMenu = "HistoryPredictionType";
  } catch (error) {
    console.log('Error sending prediction history menu:', error);
  }
};

const sendPredictionHistory = async (client, user, isVip) => {
  try {
    const { data } = await listLastTenDaysPredictions(isVisible = true, isVip);
    if (data.length === 0) {
      reset(user);
      await sendMessageToNumber(client, user.data.phoneNumber, `Aucun historique de prédictions disponible pour le moment.\n\n _Tapez # pour revenir au menu principal_`);
      return;
    }

    let historyResponse = `📅 Sélectionnez une journée pour explorer les détails des prédictions ${isVip ? "VIP" : "gratuites"} :\n\n`;

    historyDates = data.map((rate, index) => {
      return rate.date; 
    });

    data.forEach((rate, index) => {
      historyResponse += `${index + 1}- ${moment(rate.date).format('ddd DD/MM/YYYY')} • *${rate.rate}*, Tapez ${index+1}\n`;
    });

    historyResponse += "\n_Tapez # pour revenir au menu principal ou sélectionnez une date pour voir les prédictions de cette journée._";
    await sendMessageToNumber(client, user.data.phoneNumber, historyResponse);
    Steps[user.data.phoneNumber].currentMenu = "SelectDateForPredictions";
    Steps[user.data.phoneNumber].predictions = data; // Stocke les prédictions pour la sélection ultérieure

  } catch (error) {
    console.log('Error sending prediction history:', error);
  }
};

const sendDailyPredictions = async (client, user, dateIndex) => {
  const dateSelected = historyDates[dateIndex-1]
  try {
    const userSteps = Steps[user.data.phoneNumber];
    const isVip = userSteps.isVipSelected;
    // Appel à listPredictions avec la date sélectionnée et isVip
    const isVisible = true;
    const { predictions } = await listPredictions(1, 15, dateSelected, isVisible, isVip);
    if (!predictions || predictions.length === 0) {
      await sendMessageToNumber(client, user.data.phoneNumber, `Aucune prédiction disponible pour cette date.\n\n_Tapez # pour revenir au menu principal_`);
      reset(user);
      return;
    }
    
    let dailyPredictionsResponse = `📅 Prédictions pour le *${moment(dateSelected).format("dddd DD MMMM YYYY")}* :\n\n`;

    predictions.forEach((prediction, index) => {
      const { prediction: predictionType, iswin } = prediction;
      const { homeTeam, awayTeam,score} = prediction.fixture
      const outcome = iswin ? "✅" : "❌";
      const event = `${homeTeam.team_name} vs ${awayTeam.team_name} • *${predictionType}* • ${score.fulltime} ${outcome}`;
      dailyPredictionsResponse += `▶️ ${event}\n`;
    });

    dailyPredictionsResponse += "\n_Tapez * pour revenir en arrière ,# pour revenir au menu principal._";
    await sendMessageToNumber(client, user.data.phoneNumber, dailyPredictionsResponse);
    // reset(user);

  } catch (error) {
    console.error('Error sending daily predictions:', error);
    await sendMessageToNumber(client, user.data.phoneNumber, `Erreur lors de l'envoi des prédictions journalières.\n\n_Tapez # pour revenir au menu principal_`);
    reset(user);
  }
};

const sendAppLinks = async (client, user) => {
  const message = `📲 Suivez nos applications :

- [Playstore](${playstoreLink})
- [Appstore](${appstoreLink})

_Tapez # pour revenir au menu principal._`;
  await sendMessageToNumber(client, user.data.phoneNumber, message);
};

// Fonction pour envoyer les astuces et conseils exclusifs
// const sendExclusiveTips = async (client, user) => {
//   try {
   
//     const tipsData = await listTips();
//     const tips = tipsData.tips.filter(tip => tip.isVip);
    
//     if (!tips || tips.length === 0) {
//       await sendMessageToNumber(client, user.data.phoneNumber, `Aucune astuce ou conseil exclusif disponible pour le moment.\n\n_Tapez # pour revenir au menu principal._`);
//       return;
//     }

//     let tipsResponse = `📅 Astuces et conseils exclusifs du jour :\n\n`;

//     tips.forEach((tip, index) => {
//       const formattedDate = new Date(tip.tipDate).toLocaleDateString();
//       tipsResponse += `*****************\n${tip.title} - ${formattedDate}\n\n${tip.content}\n\n`;
//     });

//     tipsResponse += "\n_Tapez # pour revenir au menu principal._";
//     await sendMessageToNumber(client, user.data.phoneNumber, tipsResponse);

//   } catch (error) {
//     console.error('Error sending exclusive tips:', error);
//     await sendMessageToNumber(client, user.data.phoneNumber, `Erreur lors de l'envoi des astuces et conseils exclusifs.\n\n_Tapez # pour revenir au menu principal._`);
//   }
// };

module.exports = {
  UserCommander
};
