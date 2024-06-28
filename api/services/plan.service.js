const Plan = require('../models/plan.model');
const {defaultPlans} = require("../data/defaultPlan");

async function getAllPlans() {
  try {
    const plans = await Plan.find();
    return plans;
  } catch (error) {
    console.log('Error fetching plans:', error);
  }
}


async function createPlan(planData) {
  try {
    const newPlan = new Plan(planData);
    const savedPlan = await newPlan.save();
    return savedPlan;
  } catch (error) {
    console.log('Error creating plan:', error);
  }
}

async function updatePlan(planId, updatedData) {
  try {
    const updatedPlan = await Plan.findByIdAndUpdate(planId, updatedData, { new: true });
    return updatedPlan;
  } catch (error) {
    console.log('Error updating plan:', error);
  }
}

async function deletePlan(planId) {
  try {
    const deletedPlan = await Plan.findByIdAndDelete(planId);
    return deletedPlan;
  } catch (error) {
    console.log('Error deleting plan:', error);
  }
}

async function ensureDefaultPlansExist() {
    try {
      for (const defaultPlan of defaultPlans) {
        const planExists = await Plan.findOne({ name: defaultPlan.name });
        if (!planExists) {
          await createPlan(defaultPlan);
          console.log(`Default plan ${defaultPlan.name} created.`);
        }
      }
    } catch (error) {
      console.log('Error ensuring default plans exist:', error.message);
    }
  }

module.exports = {
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  ensureDefaultPlansExist
};
