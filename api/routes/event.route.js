const express = require('express');
const router = express.Router();
const eventHandler = require('../controllers/event.controller');

/**
 * Set up the event routes and link them to the corresponding controller functions.
 * @param {express.Application} app - The Express application.
 * @param {string} client - The client WhatsApp.
 */
const setupEvent = (app, client) => {
    // Mount the 'router' to handle routes with the base path '/event'.
    app.use("/event", router);

    router.get('/list', (req, res) => {
        eventHandler.listEvents(req, res, client);
    });

    router.post('/add', (req, res) => {
        eventHandler.createEvent(req, res, client);
    });

    router.put('/update', (req, res) => {
        eventHandler.updateEvent(req, res, client);
    });

    router.delete('/delete', (req, res) => {
        eventHandler.deleteEvent(req, res, client);
    });
};

module.exports = { setupEvent };
