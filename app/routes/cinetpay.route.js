const express = require('express');
const router = express.Router();
const cinetpayController = require('../controllers/cinetpay.controller');

const setupCinetpayRoutes = (app) => {
    // Préfixe pour toutes les routes CinetPay
    app.use('/payments/cinetpay', router);
    // Initialiser un paiement CinetPay
    router.post('/initiate', cinetpayController.initiatePayment);
    
      // Vérifier le statut d'un paiement
    router.get('/status/:transactionId', cinetpayController.checkStatus);
    
    // Webhook pour les notifications de paiement CinetPay
    router.post('/webhook', cinetpayController.webhook);
      // Route additionnelle pour la page de succès (return_url)
    app.get('/success', cinetpayController.paymentSuccess);
    app.post('/success', cinetpayController.paymentSuccess);
};

module.exports = { setupCinetpayRoutes };