const express = require('express');
const router = express.Router();
const transactionHandler = require('../controllers/transaction.controller');

/**
 * Set up the transaction routes.
 * @param {express.Application} app - The Express application.
 */
const setupTransactionRoutes = (app) => {
  app.use("/transaction", router);

  router.get('/list', (req, res) => transactionHandler.listTransactions(req, res));
};

module.exports = { setupTransactionRoutes };
