const Plan = require('../models/plan.model');

async function getAllPlans(currency = 'XAF') {
  return await Plan.find({ currency }).sort({ position: 1 });
}

async function createPlan(planData) {
  const newPlan = new Plan(planData);
  return await newPlan.save();
}

async function updatePlan(planId, updatedData) {
  return await Plan.findByIdAndUpdate(planId, updatedData, { new: true });
}

async function deletePlan(planId) {
  return await Plan.findByIdAndDelete(planId);
}

async function getPlanById(planId) {
  return await Plan.findById(planId);
}

async function ensureDefaultPlansExist(defaultPlans) {
  for (const defaultPlan of defaultPlans) {
    const exists = await Plan.findOne({ name: defaultPlan.name });
    if (!exists) await createPlan(defaultPlan);
  }
}

module.exports = {
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getPlanById,
  ensureDefaultPlansExist
};
