const PlanService = require('../services/plan.service');
const ResponseService = require('../services/response.service');

async function getAllPlans(req, res) {
  try {
    const currency = req.query.currency || 'XAF';
    const plans = await PlanService.getAllPlans(currency);
    return ResponseService.success(res, { plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return ResponseService.internalServerError(res, { error: 'Error fetching plans' });
  }
}

async function createPlan(req, res) {
  try {
    const newPlan = await PlanService.createPlan(req.body);
    return ResponseService.created(res, { message: 'Plan created successfully', plan: newPlan });
  } catch (error) {
    console.error('Error creating plan:', error);
    return ResponseService.internalServerError(res, { error: 'Error creating plan' });
  }
}

async function updatePlan(req, res) {
  try {
    const updatedPlan = await PlanService.updatePlan(req.query.id, req.body);
    if (!updatedPlan) return ResponseService.notFound(res, { message: 'Plan not found' });
    return ResponseService.success(res, { message: 'Plan updated successfully', plan: updatedPlan });
  } catch (error) {
    console.error('Error updating plan:', error);
    return ResponseService.internalServerError(res, { error: 'Error updating plan' });
  }
}

async function deletePlan(req, res) {
  try {
    const deletedPlan = await PlanService.deletePlan(req.query.id);
    if (!deletedPlan) return ResponseService.notFound(res, { message: 'Plan not found' });
    return ResponseService.success(res, { message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    return ResponseService.internalServerError(res, { error: 'Error deleting plan' });
  }
}

module.exports = {
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan
};
