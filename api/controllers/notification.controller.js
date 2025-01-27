const NotificationService = require('../services/notification.service');
const ResponseService = require('../services/response.service');

async function sendGeneralNotification(req, res, client) {
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

async function sendDeviceNotification(req, res, client) {
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

async function sendGroupNotification(req, res, client) {
  const { groupTopic, ...notificationData } = req.body;
  const response = await NotificationService.sendGroupNotification(groupTopic, notificationData, client);
  
  if (response.success) {
    return ResponseService.created(res, { 
      message: response.message, 
      notification: response.notification 
    });
  } else {
    return ResponseService.internalServerError(res, { error: response.error });
  }
}

async function subscribeToTopic(req, res, client) {
  const { deviceToken, topic } = req.body;
  const response = await NotificationService.subscribeToTopic(deviceToken, topic, client);
  
  if (response.success) {
    return ResponseService.success(res, { 
      message: response.message 
    });
  } else {
    return ResponseService.internalServerError(res, { error: response.error });
  }
}

module.exports = {
  sendGeneralNotification,
  sendDeviceNotification,
  sendGroupNotification,
  subscribeToTopic
};