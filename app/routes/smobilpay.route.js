const express = require('express');
const router = express.Router();
const smobilpayController = require('../controllers/smobilpay.controller');

const setupSmobilpayRoutes = (app) => {
    // Obtenir la liste des services par pays
    app.use('/payments/smobilpay', router);

    router.get('/services', smobilpayController.getServices);
    
    // Initialiser un paiement
    router.post('/initiate', smobilpayController.initiatePayment);
    
    // Vérifier le statut d'un paiement
    router.get('/status/:paymentId', smobilpayController.checkStatus);
    
    // Webhook pour les notifications de paiement
    router.post('/webhook', smobilpayController.webhook);
};

module.exports = { setupSmobilpayRoutes };