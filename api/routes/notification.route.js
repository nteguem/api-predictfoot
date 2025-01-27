const express = require('express');
const router = express.Router();
const notificationHandler = require('../controllers/notification.controller');

const setupNotification = (app, client) => {
    app.use("/notification", router);

    router.post('/general', (req, res) => {
        notificationHandler.sendGeneralNotification(req, res, client);
    });

    router.post('/device', (req, res) => {
        notificationHandler.sendDeviceNotification(req, res, client);
    });

    router.post('/group', (req, res) => {
        notificationHandler.sendGroupNotification(req, res, client);
    });

    router.post('/subscribe', (req, res) => {
        notificationHandler.subscribeToTopic(req, res, client);
    });
};

module.exports = { setupNotification };