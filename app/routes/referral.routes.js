const express = require('express');
const router = express.Router();
const ReferralController = require('../controllers/referral.controller');

/**
 * Configure les routes pour la gestion des références
 * @param {express.Application} app - L'application Express
 */
const setupReferralRoutes = (app) => {
  app.use('/referrals', router);

  router.post('/installation', ReferralController.recordInstallation);
  router.get('/', ReferralController.getAllReferrals);
};

module.exports = { setupReferralRoutes };
