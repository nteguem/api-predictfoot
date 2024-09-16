const NotificationService = require('../services/notification.service');

// Fonction pour envoyer une notification à un périphérique spécifique
sendNotificationToDevice = async (req, res) => {
  try {
    const { token, message } = req.body;
    const result = await NotificationService.sendNotificationToDevice(token, message);
    if (result.success) {
      res.status(200).json({ message: 'Notification sent successfully', tickets: result.tickets });
    } else {
      res.status(400).json({ message: result.message || 'Failed to send notification' });
    }
  } catch (error) {
    console.error('Error in sendNotificationToDevice:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Fonction pour envoyer une notification à un groupe de périphériques
sendNotificationToGroup = async (req, res) => {
  try {
    const { groupType, message } = req.body;
    const result = await NotificationService.sendNotificationToGroup(groupType, message);
    if (result.success) {
      res.status(200).json({ message: 'Notifications sent successfully', tickets: result.tickets });
    } else {
      res.status(400).json({ message: result.message || 'Failed to send notifications' });
    }
  } catch (error) {
    console.error('Error in sendNotificationToGroup:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Fonction pour vérifier les confirmations de livraison
checkNotificationReceipts = async (req, res) => {
  try {
    const { receiptIds } = req.body;
    const receipts = await NotificationService.checkNotificationReceipts(receiptIds);
    if (receipts.success !== false) {
      res.status(200).json({ message: 'Receipts retrieved successfully', receipts });
    } else {
      res.status(400).json({ message: receipts.message || 'Failed to retrieve receipts' });
    }
  } catch (error) {
    console.error('Error in checkNotificationReceipts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Register push notification token
registerToken = async (req, res) => {
    try {
        const { token, userId } = req.body; // Assuming you'll send both token and userId
        if (!token || !userId) {
            return res.status(400).json({ message: 'Token and userId are required' });
        }

        const result = await NotificationService.registerToken(token, userId);
        if (result.success) {
            res.status(200).json({ message: 'Token registered successfully' });
        } else {
            res.status(400).json({ message: result.message || 'Failed to register token' });
        }
    } catch (error) {
        console.error('Error in registerToken:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


async function removeToken(req, res) {
  const { token } = req.body;
  const response = await NotificationService.removeToken(token);
  if (response.success) {
    return ResponseService.success(res, { message: response.message });
  } else {
    return ResponseService.internalServerError(res, { error: response.error });
  }
}



module.exports = {
  checkNotificationReceipts,
  removeToken,
  registerToken,
  sendNotificationToGroup,
  sendNotificationToDevice,
};
