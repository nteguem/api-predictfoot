// Import the 'express' module to create an instance of the router.
const express = require('express');
const router = express.Router();
const { setupUserRoutes } = require('./user.route');
const {setupGroup} = require('./group.route');
const {setupUpload} = require('./upload.route');
const {setupFixture} = require('./fixture.route');
const {setupPredict} = require("./predict.route");
const {setupCampaign} = require("./campaign.route");
const {setupEvent} = require("./event.route");
const {setupSubscription} = require("./subscription.route")
const {setupPlan} = require("./plan.route")
const {setupTip} = require("./tip.route")
/* GET home page. */
// Define a route for the home page ('/') that renders the 'index' template with the title 'Bibemella'.
router.get('/', function(req, res, next) {
  res.json({ title: 'chatbot Predictfoot' });
});

/**
 * Function to set up all the app routes and connect them to their corresponding route modules.
 * @returns {express.Router} - The configured router instance.
 */
const setupAppRoutes = (client) => {
  const app = router;
  setupUserRoutes(app,client);
  setupGroup(app,client);
  setupFixture(app,client);
  setupPredict(app,client);
  setupUpload(app);
  setupCampaign(app);
  setupEvent(app,client);
  setupSubscription(app,client);
  setupPlan(app);
  setupTip(app,client);
  return app;
}

module.exports = setupAppRoutes;
