const ResponseService = require('../services/response.service');
const MonetbilService = require('../services/monetbil.service');
const PlanService = require('../services/plan.service');
const UserService = require('../services/user.service');

async function initiatePayment(req, res) {
  const { planId, phoneNumber, fcmToken } = req.body;
  const userId = req.user?._id; // Assuming you have authentication middleware

  try {
    // Get the user
    const user = await UserService.getUserById(userId);
    if (!user) {
      return ResponseService.notFound(res, { message: 'User not found' });
    }

    // Get the plan
    const plan = await PlanService.getPlanById(planId);
    if (!plan) {
      return ResponseService.notFound(res, { message: 'Plan not found' });
    }

    // Initiate payment
    const paymentResult = await MonetbilService.requestPaiement(user, phoneNumber, plan, fcmToken);
    
    if (paymentResult.success) {
      return ResponseService.success(res, paymentResult);
    } else {
      return ResponseService.badRequest(res, paymentResult);
    }
  } catch (error) {
    console.log('Error initiating payment:', error);
    return ResponseService.internalServerError(res, { error: 'Error initiating payment' });
  }
}

async function checkPaymentStatus(req, res) {
  const { paymentId } = req.body;

  try {
    const paymentStatus = await MonetbilService.verifyPayment(paymentId);
    return ResponseService.success(res, { status: paymentStatus });
  } catch (error) {
    console.log('Error checking payment status:', error);
    return ResponseService.internalServerError(res, { error: 'Error checking payment status' });
  }
}

module.exports = {
  initiatePayment,
  checkPaymentStatus,
};