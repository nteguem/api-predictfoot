const express = require('express');
const router = express.Router();
const fixtureHandler = require('../controllers/fixture.controller');

/**
 * Set up the fixture routes and link them to the corresponding controller functions.
 * @param {express.Application} app - The Express application.
 * @param {string} client - The client WhatsApp.
 */
const setupFixture = (app, client) => {
    // Mount the 'router' to handle routes with the base path '/fixture'.
    app.use("/fixture", router);

    router.get('/countries', (req, res) => {
        fixtureHandler.getCountries(req, res, client);
    });

    router.get('/leagues', (req, res) => {
        fixtureHandler.getLeaguesByCountry(req, res, client);
    });

    router.get('/matches', (req, res) => {
        fixtureHandler.getMatchesByLeague(req, res, client);
    });

    router.get('/available-days', (req, res) => {
        fixtureHandler.getAvailableMatchDays(req, res, client);
    });
};

module.exports = { setupFixture };
