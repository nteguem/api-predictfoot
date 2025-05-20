const NotificationService = require('../services/notification.service');
const ResponseService = require('../services/response.service');

class NotificationController {
  static async sendGeneralNotification(req, res, client) {
    const notificationData = req.body;
    const response = await NotificationService.sendGeneralNotification(notificationData, client);
    
    if (response.success) {
      return ResponseService.created(res, {
        message: response.message,
        notification: response.notification
      });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  }

  static async sendDeviceNotification(req, res, client) {
    const { deviceToken, ...notificationData } = req.body;
    const response = await NotificationService.sendDeviceNotification(deviceToken, notificationData, client);
    
    if (response.success) {
      return ResponseService.created(res, {
        message: response.message,
        notification: response.notification
      });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  }

  static async sendTopicNotification(req, res, client) {
    const { topic, ...notificationData } = req.body;
    const response = await NotificationService.sendTopicNotification(topic, notificationData);
    
    if (response.success) {
      return ResponseService.created(res, {
        message: response.message,
        notification: response.notification
      });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  }

  static async subscribeToTopic(req, res, client) {
    const { deviceToken, topic, type, expiresAt } = req.body;
    const response = await NotificationService.subscribeToTopic(
      deviceToken,
      topic,
      type,
      expiresAt,
      client
    );
    
    if (response.success) {
      return ResponseService.created(res, {
        message: response.message,
        subscription: response.subscription
      });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  }

  static async unsubscribeFromTopic(req, res, client) {
    const { deviceToken, topic } = req.body;
    const response = await NotificationService.unsubscribeFromTopic(deviceToken, topic, client);
    
    if (response.success) {
      return ResponseService.success(res, {
        message: response.message
      });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  }

  static async getTopicSubscriptions(req, res, client) {
    const filters = {
      topic: req.query.topic,
      type: req.query.type,
      deviceToken: req.query.deviceToken,
      activeOnly: req.query.activeOnly === 'true'
    };

    const pagination = {
      offset: req.query.offset,
      limit: req.query.limit
    };

    const response = await NotificationService.getTopicSubscriptions(filters, pagination, client);
    
    if (response.success) {
      return ResponseService.success(res, {
        subscriptions: response.subscriptions,
        pagination: response.pagination
      });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  }

  static async handleExpiredSubscriptions(req, res, client) {
    const response = await NotificationService.handleExpiredSubscriptions(client);
    
    if (response.success) {
      return ResponseService.success(res, {
        message: response.message,
        details: response.details
      });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  }
}

module.exports = NotificationController;