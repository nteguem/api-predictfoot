const express = require('express');
const router = express.Router();
const planController = require('../controllers/plan.controller');

const setupPlan = (app) => {
  app.use('/plan', router);

  router.get('/list', planController.getAllPlans);
  router.post('/add', planController.createPlan);
  router.put('/update', planController.updatePlan);
  router.delete('/delete', planController.deletePlan);
};

module.exports = { setupPlan };
