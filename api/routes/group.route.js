const express = require('express');
const router = express.Router();
const groupHandler = require('../controllers/group.controller');

/**
 * Set up the group routes and link them to the corresponding controller functions.
 * @param {express.Application} app - The Express application.
 * @param {string} client - The client WhatsApp.
 */
const setupGroup = (app, client) => {
    // Mount the 'router' to handle routes with the base path '/group'.
    app.use("/group", router);

    router.get('/list', (req, res) => {
        groupHandler.listGroups(req, res, client);
    });

    router.post('/add', (req, res) => {
        groupHandler.createGroup(req, res, client);
    });

    router.get('/download', (req, res) => {
        groupHandler.generateAndDownloadCSV(req, res, client);
    });

    router.put('/update', (req, res) => {
        groupHandler.updateGroup(req, res, client);
    });

    router.delete('/delete', (req, res) => {
        groupHandler.deleteGroup(req, res, client);
    });
};

module.exports = { setupGroup };
