const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification.controller');

const setupNotification = (app, client) => {
  app.use("/notification", router);

  router.post('/general', (req, res) => {
    NotificationController.sendGeneralNotification(req, res, client);
  });

  router.post('/device', (req, res) => {
    NotificationController.sendDeviceNotification(req, res, client);
  });

  router.post('/topic', (req, res) => {
    NotificationController.sendTopicNotification(req, res, client);
  });

  // Routes pour la gestion des abonnements aux topics
  router.post('/topic/subscribe', (req, res) => {
    NotificationController.subscribeToTopic(req, res, client);
  });

  router.post('/topic/unsubscribe', (req, res) => {
    NotificationController.unsubscribeFromTopic(req, res, client);
  });

  router.get('/topic/subscriptions', (req, res) => {
    NotificationController.getTopicSubscriptions(req, res, client);
  });

  router.post('/topic/handle-expired', (req, res) => {
    NotificationController.handleExpiredSubscriptions(req, res, client);
  });
};

module.exports = { setupNotification };