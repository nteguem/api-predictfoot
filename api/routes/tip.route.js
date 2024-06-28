const express = require('express');
const router = express.Router();
const tipHandler = require('../controllers/tip.controller');

/**
 * Set up the tip routes and link them to the corresponding controller functions.
 * @param {express.Application} app - The Express application.
 * @param {string} client - The client WhatsApp (if needed).
 */
const setupTip = (app, client) => {
    // Mount the 'router' to handle routes with the base path '/tip'.
    app.use("/tip", router);

    router.post('/add', (req, res) => {
        tipHandler.createTip(req, res, client);
    });

    router.put('/update', (req, res) => {
        tipHandler.updateTip(req, res, client);
    });

    router.get('/list', (req, res) => {
        tipHandler.listTips(req, res, client);
    });

    router.delete('/delete', (req, res) => {
        tipHandler.deleteTip(req, res, client);
    });
};

module.exports = { setupTip };
