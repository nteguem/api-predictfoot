const express = require('express');
const router = express.Router();
const campaignHandler = require('../controllers/campaign.controller');

/**
 * Set up the campaign routes and link them to the corresponding controller functions.
 * @param {express.Application} app - The Express application.
 * @param {string} client - The client whatapp .
 */
const setupCampaign = (app, client) => {
    app.use("/campaign", router);
     
    router.get('/list', (req, res) => {
        campaignHandler.listCampaigns(req, res, client);
    });

    router.post('/add', (req, res) => {
        campaignHandler.createCampaign(req, res, client);
    });

    router.put('/update', (req, res) => {
        campaignHandler.updateCampaign(req, res, client);
    });

    router.delete('/delete', (req, res) => {
        campaignHandler.deleteCampaign(req, res, client);
    });
};

module.exports = { setupCampaign };
