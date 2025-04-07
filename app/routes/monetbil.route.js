// monetbil.route.js
const express = require('express');
const router = express.Router();
const monetbilController = require('../controllers/monetbil.controller');

/**
 * Set up the monetbil payment routes and link them to the corresponding controller functions.
 * @param {express.Application} app - The Express application.
 */
const setupMonetbil = (app) => {
    // Mount the 'router' to handle routes with the base path '/payment'.
    app.use("/payment", router);
    
    // Route to initiate a payment (requires authentication)
    router.post('/initiate', (req, res) => {
        monetbilController.initiatePayment(req, res);
    });
    
    // Route to check payment status - changed to POST to match service implementation
    router.post('/status', (req, res) => {
        monetbilController.checkPaymentStatus(req, res);
    });

};

module.exports = { setupMonetbil };