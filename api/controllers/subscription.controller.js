const SubscriptionService = require('../services/subscription.service');
const ResponseService = require('../services/response.service');

async function buySubscription(req, res) {
  const { userId, planId } = req.body;
  try {
    const response = await SubscriptionService.buySubscription(userId, planId);
    if (response.success) {
      return ResponseService.success(res, { message: response.message });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  } catch (error) {
    console.log('Error buying subscription:', error);
    return ResponseService.internalServerError(res, { error: 'Error buying subscription' });
  }
}

async function isVip(req, res) {
  const { phoneNumber } = req.params;
  try {
    const vipStatus = await SubscriptionService.verifyUserVip(phoneNumber);
    return ResponseService.success(res, { isVip: vipStatus });
  } catch (error) {
    console.log('Error checking VIP status:', error);
    return ResponseService.internalServerError(res, { error: 'Error checking VIP status' });
  }
}

async function listSubscriptions(req, res) {
  const { phoneNumber } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  try {
    const response = await SubscriptionService.listSubscriptions(phoneNumber, page, limit);
    if (response.success) {
      const { totalPages, totalSubscriptions, currentPage, subscriptions } = response;
      const paginationInfo = {
        totalPages,
        totalSubscriptions,
        currentPage
      };
      return ResponseService.success(res, { subscriptions, pagination: paginationInfo });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  } catch (error) {
    console.log('Error listing subscriptions:', error);
    return ResponseService.internalServerError(res, { error: 'Error listing subscriptions' });
  }
}

module.exports = {
  buySubscription,
  isVip,
  listSubscriptions
};
