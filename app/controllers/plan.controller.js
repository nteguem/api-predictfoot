const ResponseService = require('../services/response.service');
const PlanService = require('../services/plan.service');

async function getAllPlans(req, res) {
  try {
    const plans = await PlanService.getAllPlans();
    return ResponseService.success(res, { plans });
  } catch (error) {
    console.log('Error fetching plans:', error);
    return ResponseService.internalServerError(res, { error: 'Error fetching plans' });
  }
}

async function createPlan(req, res) {
  const planData = req.body;
  try {
    const newPlan = await PlanService.createPlan(planData);
    return ResponseService.created(res, { message: 'Plan created successfully', plan: newPlan });
  } catch (error) {
    console.log('Error creating plan:', error);
    return ResponseService.internalServerError(res, { error: 'Error creating plan' });
  }
}

async function updatePlan(req, res) {
  const planId = req.query.id;
  const updatedData = req.body;
  try {
    const updatedPlan = await PlanService.updatePlan(planId, updatedData);
    if (!updatedPlan) {
      return ResponseService.notFound(res, { message: 'Plan not found' });
    }
    return ResponseService.success(res, { message: 'Plan updated successfully', plan: updatedPlan });
  } catch (error) {
    console.log('Error updating plan:', error);
    return ResponseService.internalServerError(res, { error: 'Error updating plan' });
  }
}

async function deletePlan(req, res) {
  const planId = req.query.id;
  try {
    const deletedPlan = await PlanService.deletePlan(planId);
    if (!deletedPlan) {
      return ResponseService.notFound(res, { message: 'Plan not found' });
    }
    return ResponseService.success(res, { message: 'Plan deleted successfully' });
  } catch (error) {
    console.log('Error deleting plan:', error);
    return ResponseService.internalServerError(res, { error: 'Error deleting plan' });
  }
}

module.exports = {
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan
};
