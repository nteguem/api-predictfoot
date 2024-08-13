const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

/**
 * Set up the notification routes and link them to the corresponding controller functions.
 * @param {express.Application} app - The Express application.
 */
const setupNotificationRoutes = (app) => {
  // Mount the 'router' to handle routes with the base path '/notification'.
  app.use('/notification', router);

  // Route to send notification to a group
  router.post('/send', (req, res) => {
    notificationController.sendNotificationController(req, res);
  });

};

module.exports = { setupNotificationRoutes };
