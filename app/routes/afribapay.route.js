const express = require('express');
const router = express.Router();
const afribaPayController = require('../controllers/afribapay.controller');

const setupAfribaPayRoutes = (app) => {
    // Préfixe pour toutes les routes AfribaPay
    app.use('/payments/afribapay', router);
    
    // Initialiser un paiement AfribaPay
    router.post('/initiate', afribaPayController.initiatePayment);
    
    // Vérifier le statut d'un paiement
    router.get('/status/:orderId', afribaPayController.checkStatus);
    
    // Webhook pour les notifications de paiement AfribaPay
    router.post('/webhook', afribaPayController.webhook);
    
    // Routes additionnelles pour les pages de retour (return_url et cancel_url)
    app.get('/payments/afribapay/success', afribaPayController.paymentSuccess);
    app.post('/payments/afribapay/success', afribaPayController.paymentSuccess);
    
    app.get('/payments/afribapay/cancel', afribaPayController.paymentCancel);
    app.post('/payments/afribapay/cancel', afribaPayController.paymentCancel);
};

module.exports = { setupAfribaPayRoutes };