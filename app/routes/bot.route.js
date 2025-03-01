
const express = require('express');
const router = express.Router();
const botController = require('../controllers/bot.controller');

/**
 * Configure les routes pour la gestion du bot WhatsApp
 * @param {express.Application} app - L'application Express
 * @param {Object} client - Le client WhatsApp
 */
const setupBotRoutes = (app, client) => {
  app.use('/bot', router);
  
  // GET /bot/info - Récupère les informations du bot WhatsApp
  router.get('/info', (req, res) => {
    botController.getBotInfo(req, res, client);
  });
  
  // POST /bot/disconnect - Déconnecte le bot WhatsApp
  router.post('/disconnect', (req, res) => {
    botController.disconnectBot(req, res, client);
  });
  
  // POST /bot/reconnect - Reconnecte le bot WhatsApp
  router.post('/reconnect', (req, res) => {
    botController.reconnectBot(req, res, client);
  });
};

module.exports = { setupBotRoutes };