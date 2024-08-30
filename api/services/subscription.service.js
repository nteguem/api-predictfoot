const Subscription = require('../models/subscription.model');
const Plan = require('../models/plan.model');
const User = require("../models/user.model");

async function buySubscription(userId, planId) {
  try {
    const plan = await Plan.findById(planId);
    if (!plan) console.log('Plan not found');

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + plan.duration);

    const existingSubscription = await Subscription.findOne({ user: userId, endDate: { $gte: new Date() } });

    if (existingSubscription) {
      existingSubscription.plan = plan._id;
      existingSubscription.startDate = now;
      existingSubscription.endDate = endDate;
      await existingSubscription.save();
    } else {
      const newSubscription = new Subscription({
        user: userId,
        plan: plan._id,
        startDate: now,
        endDate: endDate
      });
      await newSubscription.save();
    }

    return { success: true, message: 'Subscription purchased successfully' };
  } catch (error) {
    console.log('Error buying subscription:', error);
    return { success: false, error: error.message };
  }
}

async function verifyUserVip(phoneNumber) {
  try {
    // Trouver l'utilisateur par son numéro de téléphone
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      console.log('User not found with phone number:', phoneNumber);
      return false;
    }

    // Trouver un abonnement valide pour cet utilisateur
    const subscription = await Subscription.findOne({
      user: user._id,
      endDate: { $gte: new Date() } // Assurez-vous que l'abonnement n'est pas expiré
    }).populate('plan');

    // Vérifiez si un abonnement valide a été trouvé
    return subscription !== null;
  } catch (error) {
    console.log('Error checking VIP status:', error);
    return false;
  }
}

async function listSubscriptions(phoneNumber, page = 1, limit = 5) {
  try {
    const user = await User.findOne({ phoneNumber });
    const totalSubscriptions = await Subscription.countDocuments({ user: user._id });
    const totalPages = Math.ceil(totalSubscriptions / limit);

    const subscriptions = await Subscription.find({ user: user._id })
      .populate('plan')
      .skip((page - 1) * limit)
      .limit(limit);

    return { 
      success: true,
      totalPages,
      totalSubscriptions,
      currentPage: page,
      subscriptions
    };
  } catch (error) {
    console.log('Error listing subscriptions:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  buySubscription,
  verifyUserVip,
  listSubscriptions
};
