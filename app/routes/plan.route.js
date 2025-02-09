// plan.route.js
const express = require('express');
const router = express.Router();
const planController = require('../controllers/plan.controller');

/**
 * Set up the plan routes and link them to the corresponding controller functions.
 * @param {express.Application} app - The Express application.
 */
const setupPlan = (app) => {
    // Mount the 'router' to handle routes with the base path '/plan'.
    app.use("/plan", router);

    router.get('/list', (req, res) => {
        planController.getAllPlans(req, res);
    });

    router.post('/add', (req, res) => {
        planController.createPlan(req, res);
    });

    router.put('/update', (req, res) => {
        planController.updatePlan(req, res);
    });

    router.delete('/delete', (req, res) => {
        planController.deletePlan(req, res);
    });
};

module.exports = { setupPlan };
