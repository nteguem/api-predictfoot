const express = require('express');
const router = express.Router();
const logHandler = require('../controllers/log.controller');

/**
 * Set up the log routes and link them to the corresponding controller functions.
 * @param {express.Application} app - The Express application.
 * @param {string} client - The client (e.g., WhatsApp or external system).
 */
const setupLogRoutes = (app) => {
    app.use("/logs", router);

    router.get('/list', (req, res) => {
        logHandler.getLogs(req, res);
    });

    router.put('/update/:id', (req, res) => {
        logHandler.updateLogResolved(req, res);
    });

};

module.exports = { setupLogRoutes };
