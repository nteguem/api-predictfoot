const fetch = require('node-fetch');
const moment = require('moment');
require('dotenv').config();

const monetbilService = process.env.MONETBIL_SERVICE;
const monetbilUrl = 'https://api.monetbil.com/payment/v1/placePayment/';

const makePayment = async (user, amount, phonenumber,selectedPlan,whatappNumber) => {
  const payload = {
    service: monetbilService,
    phonenumber,
    amount:1,
    user,
    first_name:selectedPlan.name,
    last_name:selectedPlan.description,
    email:selectedPlan.price,
    item_ref: moment().add(selectedPlan.duration, 'days'),
    payment_ref:whatappNumber,
  };

  try {
    const response = await fetch(monetbilUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.log(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error making payment:', error);
  }
};

module.exports = { makePayment };
