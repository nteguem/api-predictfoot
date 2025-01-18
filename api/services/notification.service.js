const { Expo } = require('expo-server-sdk');
const Notification = require('../models/notification.model');
const UserService = require('./user.service');
const cron = require('node-cron');

let notificationTasks = {};
let expo = new Expo({});

async function registerToken(token, userId = null) {
  try {
    const existingToken = await Notification.findOne({ token });
    if (existingToken) {
      return { success: false, message: 'Token already registered' };
    }
    await Notification.create({ token, userId });
    return { success: true };
  } catch (error) {
    console.error('Error registering token:', error);
    return { success: false, message: 'Failed to register token' };
  }
}

async function sendNotificationToDevice(token, message) {
  if (!Expo.isExpoPushToken(token)) {
    console.log(`Push token ${token} is not a valid Expo push token`);
    return { success: false, message: `Invalid token: ${token}` };
  }

  const messages = [{ to: token, sound: 'default', body: message.body, data: message.data }];
  const chunks = expo.chunkPushNotifications(messages);

  try {
    const tickets = [];
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
    return { success: true, tickets };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
}

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

    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      body: message.body,
      data: message.data,
    }));

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
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

async function checkNotificationReceipts(receiptIds) {
  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

  try {
    const receipts = [];
    for (const chunk of receiptIdChunks) {
      try {
        const receiptChunk = await expo.getPushNotificationReceiptsAsync(chunk);
        receipts.push(receiptChunk);
      } catch (error) {
        console.error('Error retrieving receipts:', error);
      }
    }
    return { success: true, receipts: receipts.flat() };
  } catch (error) {
    console.error('Error checking receipts:', error);
    return { success: false, error: error.message };
  }
}

async function removeToken(token) {
  try {
    const result = await Notification.deleteOne({ token });
    if (result.deletedCount === 0) {
      return { success: false, message: 'Token not found' };
    }
    return { success: true, message: 'Token removed successfully' };
  } catch (error) {
    console.error('Error removing token:', error);
    return { success: false, message: 'Failed to remove token' };
  }
}

module.exports = {
  sendNotificationToDevice,
  sendNotificationToGroup,
  checkNotificationReceipts,
  registerToken,
  removeToken
};
