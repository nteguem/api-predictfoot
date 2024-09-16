const express = require('express');
const router = express.Router();
const notificationHandler = require('../controllers/notification.controller');

/**
 * Set up the notification routes and link them to the corresponding controller functions.
 * @param {express.Application} app - The Express application.
 * @param {string} client - The client (if needed).
 */
const setupNotificationRoutes = (app, client) => {
    // Mount the 'router' to handle routes with the base path '/notification'.
    app.use("/notification", router);

    router.post('/register-token', (req, res) => {
        notificationHandler.registerToken(req, res);
    });
    
    // Route to send a notification to a specific device
    router.post('/send-to-device', (req, res) => {
        notificationHandler.sendNotificationToDevice(req, res, client);
    });

    // Route to send notifications to a group of devices
    router.post('/send-to-group', (req, res) => {
        notificationHandler.sendNotificationToGroup(req, res, client);
    });

    // Route to check notification receipts
    router.post('/check-receipts', (req, res) => {
        notificationHandler.checkNotificationReceipts(req, res, client);
    });
};

module.exports = { setupNotificationRoutes };
