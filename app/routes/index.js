// Import the 'express' module to create an instance of the router.
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth.middleware');
const { setupUserRoutes } = require('./user.route');
const { setupGroup } = require('./group.route');
const { setupUpload } = require('./upload.route');
const { setupFixture } = require('./fixture.route');
const { setupPredict } = require('./predict.route');
const { setupCampaign } = require('./campaign.route');
const { setupEvent } = require('./event.route');
const { setupSubscription } = require('./subscription.route');
const { setupPlan } = require('./plan.route');
const {setupNotification} = require("./notification.route");
const {setupLogRoutes} = require('./log.route');
const {setupTransactionRoutes} = require('./transaction.route');
const {setupWalletRoutes} = require('./wallet.route');
const {setupBotRoutes}  = require('./bot.route');
const {setupReferralRoutes} = require("./referral.routes");
const {setupInfluencerRoutes} = require('./influencer.routes');
const {setupMonetbil} = require('./monetbil.route');
const {setupSmobilpayRoutes} = require('./smobilpay.route');
const { setupCinetpayRoutes } = require('./cinetpay.route');
const { setupAfribaPayRoutes } = require('./afribapay.route'); // ✅ NOUVEAU

/* GET home page. */
// Define a route for the home page ('/') that renders the 'index' template with the title 'Predictfoot'.
router.get('/', function (req, res, next) {
  res.json({ title: 'chatbot Predictfoot' });
});

/**
 * Global middleware to secure all routes except for specified exclusions.
 * @param {Array} excludedPaths - List of routes to exclude from authentication.
 */
const globalAuthenticate = (excludedPaths = []) => {
  return (req, res, next) => {
    // Check if the current route is part of the exclusions
    if (excludedPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }
    authenticateToken(req, res, next);
  };
};

/**
 * Function to set up all the app routes and connect them to their corresponding route modules.
 * @returns {express.Router} - The configured router instance.
 */
const setupAppRoutes = (client) => {
  const app = router;
  
  // Apply the global middleware to all routes with specified exclusions
  app.use(globalAuthenticate([
    '/user/login',
    '/user/loginmobile',
    '/user/add',
    '/predict/list',
    '/subscription/notification-payment',
    '/plan/list',
    '/subscription/is-vip',
    '/user/getOne',
    '/bot/info',
    '/bot/disconnect',
    '/bot/reconnect',
    '/referrals/installation',
    '/payments/cinetpay/webhook',
    '/payments/cinetpay/success',
    '/payments/afribapay/webhook',
    '/payments/afribapay/success',
    '/payments/afribapay/cancel',
  ]));

  setupUserRoutes(app, client);
  setupGroup(app, client);
  setupFixture(app, client);
  setupPredict(app, client);
  setupUpload(app);
  setupMonetbil(app);
  setupSmobilpayRoutes(app);
  setupCinetpayRoutes(app);
  setupAfribaPayRoutes(app); 
  setupCampaign(app, client);
  setupEvent(app, client);
  setupSubscription(app, client);
  setupPlan(app);
  setupNotification(app,client);
  setupLogRoutes(app);
  setupTransactionRoutes(app,client);
  setupWalletRoutes(app,client);
  setupBotRoutes(app, client);
  setupInfluencerRoutes(app);
  setupReferralRoutes(app);
  
  return app;
};

module.exports = setupAppRoutes;