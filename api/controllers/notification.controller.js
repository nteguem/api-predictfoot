const notificationService = require('../services/notification.service');

const sendNotificationController = async (req, res) => {
  try {
    const { tokens, title, body, data } = req.body;
    const tickets = await notificationService.sendNotifications(tokens, title, body, data);
    res.status(200).json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  sendNotificationController,
};
