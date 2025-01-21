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
const { setupTip } = require('./tip.route');

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
  app.use(globalAuthenticate(['/user/login', '/predict/list', '/subscription/verify-payment']));

  setupUserRoutes(app, client);
  setupGroup(app, client);
  setupFixture(app, client);
  setupPredict(app, client);
  setupUpload(app);
  setupCampaign(app, client);
  setupEvent(app, client);
  setupSubscription(app, client);
  setupPlan(app);
  setupTip(app, client);

  return app;
};

module.exports = setupAppRoutes;
