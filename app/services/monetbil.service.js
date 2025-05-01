const fetch = require('node-fetch');
const logService = require('./log.service');
const { createTransaction } = require("./transaction.service");
require('dotenv').config();

const monetbilService = process.env.PAYMENT_SERVICE_ID;
const notify_url = process.env.NOTIFICATION_URL_PAIEMENT || "";
const paiement_url = process.env.PAYMENT_API_ENDPOINT;

const makePayment = async (user, mobileMoneyPhone, plan, fcmToken = null) => {
  // Fonction pour nettoyer le pseudo en supprimant les emojis
  const removeEmojis = (text) => {
    return text.replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F700}-\u{1F77F}|\u{1F780}-\u{1F7FF}|\u{1F800}-\u{1F8FF}|\u{1F900}-\u{1F9FF}|\u{1FA00}-\u{1FA6F}|\u{1FA70}-\u{1FAFF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu, '');
  };

  // Nettoyer le pseudo et s'assurer qu'il ne dépasse pas 30 caractères
  const cleanedPseudo = user?.pseudo ? removeEmojis(user.pseudo).trim().slice(0, 30) : 'Anonymous';

  const payload = {
    service: monetbilService,
    user: cleanedPseudo,
    phonenumber: mobileMoneyPhone,
    // amount:1,
    amount: plan.price,
    item_ref: JSON.stringify({
      plan,
      user,
      fcmToken
    }),
    notify_url
  };

  try {
    const response = await fetch(paiement_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    console.log("Payment API paiement_url:", paiement_url);
    if (!response.ok) {
      console.log(`HTTP error! status: ${response.status}`);
      throw new Error(`Payment API returned status ${response.status}`);
    }

    const data = await response.json();

    const transactionPayload = {
      paymentId: data.paymentId,
      status: data.status,
      paymentMethod: data.channel,
      amount: plan.price,
      phoneNumber: mobileMoneyPhone,
      notifyUrl: payload.notify_url,
      type: 'MONETBIL',
      plan: plan._id || plan.id,
      user: user._id
    };
    await createTransaction(transactionPayload);

    return data;
  } catch (error) {
    await logService.addLog(
      `${error.message} , payload: ${JSON.stringify(payload)}`,
      'makePayment',
      'error'
    );
    throw error;
  }
};

const requestPaiement = async (user ,mobileMoneyPhone, plan,fcmToken = null) => {
  const paymentResponse = await makePayment(user, mobileMoneyPhone, plan,fcmToken);

  try {
      if (paymentResponse.status === "REQUEST_ACCEPTED") {
          return `Paiement en cours. Utilisez le code USSD ${paymentResponse.channel_ussd} pour compléter le paiement via ${paymentResponse.channel_name}.\n\n_Tapez # pour revenir au menu principal._`;
      } else {
          return `Erreur lors de l'initiation du paiement : ${paymentResponse.message} \n\n_Tapez * pour revenir en arrière, # pour revenir au menu principal._`;
      }
  }
  catch (error) {
      await logService.addLog(
          `${error.message}`,
          'requestPaiement',
          'error'
      );
      return `Erreur lors de l'initiation du paiement`;
  }
}

module.exports = { makePayment,requestPaiement };
