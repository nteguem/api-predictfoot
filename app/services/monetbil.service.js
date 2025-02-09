const fetch = require('node-fetch');
const logService = require('./log.service');
const { createTransaction } = require("./transaction.service");
require('dotenv').config();

const monetbilService = process.env.PAYMENT_SERVICE_ID;
const notify_url = process.env.NOTIFICATION_URL_PAIEMENT || "";
const paiement_url = process.env.PAYMENT_API_ENDPOINT;

const makePayment = async (user, mobileMoneyPhone, plan) => {
  const payload = {
    service: monetbilService,
    user:user?.pseudo.slice(0,30),
    phonenumber: mobileMoneyPhone,
    amount:1,
    item_ref: JSON.stringify({
       plan,
       user
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

    if (!response.ok) {
      console.log(`HTTP error! status: ${response.status}`);
      throw new Error(`Payment API returned status ${response.status}`);
    }

    const data = await response.json();

    const transactionPayload = {
      paymentId:data.paymentId,
      status:data.status,
      paymentMethod:data.channel,
      amount:plan.price,
      phoneNumber:mobileMoneyPhone,
      notifyUrl:payload.notify_url,
      type:'MONETBIL',
      plan:plan._id,
      user:user._id
    };

    await createTransaction(transactionPayload);

    return data;
  } catch (error) {
    await logService.addLog(
      `${error.message}`,
      'makePayment',
      'error'
    );
    throw error; 
  }
};

const requestPaiement = async (user ,mobileMoneyPhone, plan) => {
  const paymentResponse = await makePayment(user, mobileMoneyPhone, plan);

  try {
      if (paymentResponse.status === "REQUEST_ACCEPTED") {
          return `Paiement en cours. Utilisez le code USSD ${paymentResponse.channel_ussd} pour compléter le paiement via ${paymentResponse.channel_name}.`;
      } else {
          return `Erreur lors de l'initiation du paiement : ${paymentResponse.message}`;
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
