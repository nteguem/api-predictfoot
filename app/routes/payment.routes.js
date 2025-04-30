// routes/payment.js

const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/payment.controller');

const setupPaymentRoutes = (app) => {
  app.use("/payments", router);

  // Routes pour l'intégration Smobilpay
  router.post('/smobilpay/initiate', (req, res) => {
    PaymentController.initiateSmobilpayPayment(req, res);
  });

  router.get('/smobilpay/status/:transactionId', (req, res) => {
    PaymentController.checkSmobilpayPaymentStatus(req, res);
  });

  router.post('/smobilpay/webhook', (req, res) => {
    PaymentController.smobilpayWebhook(req, res);
  });

  // Route pour récupérer les services de paiement par pays
  router.get('/smobilpay/services/:countryCode?', (req, res) => {
    PaymentController.getPaymentServicesByCountry(req, res);
  });
};

module.exports = { setupPaymentRoutes };