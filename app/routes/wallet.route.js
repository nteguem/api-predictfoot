const express = require('express');
const router = express.Router();
const walletHandler = require('../controllers/wallet.controller');

/**
 * Set up the wallet routes.
 * @param {express.Application} app - The Express application.
 */
const setupWalletRoutes = (app) => {
  app.use("/wallet", router);

  // Route to list wallets
  router.get('/list', (req, res) => walletHandler.listWallets(req, res));
};

module.exports = { setupWalletRoutes };
