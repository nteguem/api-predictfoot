const express = require('express');
const router = express.Router();
const predictHandler = require('../controllers/predict.controller');

/**
 * Set up the predict routes and link them to the corresponding controller functions.
 * @param {express.Application} app - The Express application.
 * @param {string} client - The client WhatsApp.
 */
const setupPredict = (app, client) => {
    // Mount the 'router' to handle routes with the base path '/predict'.
    app.use("/predict", router);

    router.post('/add', (req, res) => {
        predictHandler.createPrediction(req, res, client);
    });

    router.put('/update', (req, res) => {
        predictHandler.updatePrediction(req, res, client);
    });

    router.get('/list', (req, res) => {
        predictHandler.listPredictions(req, res, client);
    });

    router.get('/stats', (req, res) => {
        predictHandler.listLastTenDaysPredictions(req, res, client);
    });


    router.delete('/delete', (req, res) => {
        predictHandler.deletePrediction(req, res, client);
    });
};

module.exports = { setupPredict };
