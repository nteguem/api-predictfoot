const express = require('express');
const router = express.Router();
const InfluencerController = require('../controllers/influencer.controller');

/**
 * Configure les routes pour la gestion des influenceurs
 * @param {express.Application} app - L'application Express
 */
const setupInfluencerRoutes = (app) => {
  app.use('/influencers', router);

  router.post('/', (req, res) => InfluencerController.createInfluencer(req, res));
  router.get('/', (req, res) => InfluencerController.getAllInfluencers(req, res));
  router.get('/:id', (req, res) => InfluencerController.getInfluencerById(req, res));
  router.put('/:id', (req, res) => InfluencerController.updateInfluencer(req, res));
  router.get('/:id/stats', (req, res) => InfluencerController.getInfluencerStats(req, res));
  router.post('/:id/regenerate-link', (req, res) => InfluencerController.regenerateLink(req, res));
};

module.exports = { setupInfluencerRoutes };
