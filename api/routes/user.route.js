const express = require('express');
const router = express.Router();
const userHandler = require('../controllers/user.controller');

/**
 * Set up the user routes and link them to the corresponding controller functions.
 * @param {express.Application} app - The Express application.
 * @param {string} client - The client WhatsApp.
 */
const setupUserRoutes = (app, client) => {
    // Mount the 'router' to handle routes with the base path '/user'.
    app.use("/user", router);

    router.get('/list', (req, res) => {
        userHandler.getAllUser(req, res, client);
    });

    router.post('/login', (req, res) => {
        userHandler.login(req, res, client);
    });

    router.put('/update', (req, res) => {
        userHandler.updateUser(req, res, client);
    });
};

module.exports = { setupUserRoutes };
