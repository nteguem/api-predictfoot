const { Expo } = require('expo-server-sdk');
const Notification = require('../models/notification.model');
const UserService = require('./user.service'); // Service pour obtenir les détails des utilisateurs (VIP/non-VIP)

// Créez une nouvelle instance d'Expo SDK
let expo = new Expo({});


registerToken = async (token, userId=null) => {
    try {
        const existingToken = await Notification.findOne({ where: { token } });

        if (existingToken) {
            return { success: false, message: 'Token already registered' };
        }

        await Notification.create({ token, userId });
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Failed to register token' };
    }
};
// Fonction pour envoyer une notification à un périphérique spécifique
async function sendNotificationToDevice(token, message) {
  if (!Expo.isExpoPushToken(token)) {
    console.log(`Push token ${token} is not a valid Expo push token`);
    return { success: false, message: `Invalid token: ${token}` };
  }

  const messages = [{
    to: token,
    sound: 'default',
    body: message.body,
    data: message.data,
  }];

  const chunks = expo.chunkPushNotifications(messages);

  try {
    let tickets = [];
    for (let chunk of chunks) {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
    return { success: true, tickets };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
}

// Fonction pour envoyer une notification à un groupe de périphériques
async function sendNotificationToGroup(groupType, message) {
  try {
    let tokens = [];

    if (groupType === 'all') {
      tokens = await Notification.find().distinct('token');
    } else if (groupType === 'vip') {
      const vipUserIds = await UserService.getVipUserIds();
      tokens = await Notification.find({ userId: { $in: vipUserIds } }).distinct('token');
    } else if (groupType === 'non-vip') {
      const nonVipUserIds = await UserService.getNonVipUserIds();
      tokens = await Notification.find({ userId: { $in: nonVipUserIds } }).distinct('token');
    } else {
      return { success: false, message: 'Invalid group type' };
    }

    if (tokens.length === 0) {
      return { success: false, message: 'No tokens found' };
    }

    // Créez les messages à envoyer
    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      body: message.body,
      data: message.data,
    }));

    const chunks = expo.chunkPushNotifications(messages);

    let tickets = [];
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending chunk:', error);
      }
    }

    return { success: true, tickets };
  } catch (error) {
    console.error('Error sending notification to group:', error);
    return { success: false, error: error.message };
  }
}

// Fonction pour vérifier les confirmations de livraison
async function checkNotificationReceipts(receiptIds) {
  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

  try {
    let receipts = [];
    for (let chunk of receiptIdChunks) {
      try {
        let receiptChunk = await expo.getPushNotificationReceiptsAsync(chunk);
        receipts.push(receiptChunk);
      } catch (error) {
        console.error('Error retrieving receipts:', error);
      }
    }

    return receipts.flat(); // Combine all receipt chunks into a single array
  } catch (error) {
    console.error('Error checking receipts:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendNotificationToDevice,
  sendNotificationToGroup,
  checkNotificationReceipts,
  registerToken
};
