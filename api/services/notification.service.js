const admin = require('firebase-admin');
const Notification = require('../models/notification.model');
const logger = require('../helpers/logger');

async function sendGeneralNotification(notificationData, client) {
  try {
    const message = {
      notification: { 
        title: notificationData.title, 
        body: notificationData.body 
      },
      topic: 'all_devices',
      data: notificationData.data || {}
    };

    const fcmResponse = await admin.messaging().send(message);
    
    const newNotification = new Notification({
      type: 'general',
      ...notificationData
    });
    await newNotification.save();

    return { 
      success: true, 
      message: 'Notification générale envoyée', 
      notification: newNotification,
      fcmResponse 
    };
  } catch (error) {
    logger(client).error('Error sending general notification:', error);
    return { success: false, error: error.message };
  }
}

async function sendDeviceNotification(deviceToken, notificationData, client) {
  try {
    const message = {
      notification: { 
        title: notificationData.title, 
        body: notificationData.body 
      },
      token: deviceToken,
      data: notificationData.data || {}
    };

    const fcmResponse = await admin.messaging().send(message);
    
    const newNotification = new Notification({
      type: 'device',
      target: { deviceToken },
      ...notificationData
    });
    await newNotification.save();

    return { 
      success: true, 
      message: 'Notification d\'appareil envoyée', 
      notification: newNotification,
      fcmResponse 
    };
  } catch (error) {
    logger(client).error('Error sending device notification:', error);
    return { success: false, error: error.message };
  }
}

async function sendGroupNotification(groupTopic, notificationData, client) {
  try {
    const message = {
      notification: { 
        title: notificationData.title, 
        body: notificationData.body 
      },
      topic: groupTopic,
      data: notificationData.data || {}
    };

    const fcmResponse = await admin.messaging().send(message);
    
    const newNotification = new Notification({
      type: 'group',
      target: { groupTopic },
      ...notificationData
    });
    await newNotification.save();

    return { 
      success: true, 
      message: 'Notification de groupe envoyée', 
      notification: newNotification,
      fcmResponse 
    };
  } catch (error) {
    logger(client).error('Error sending group notification:', error);
    return { success: false, error: error.message };
  }
}

async function subscribeToTopic(deviceToken, topic, client) {
  try {
    const response = await admin.messaging().subscribeToTopic(deviceToken, topic);
    return { success: true, message: 'Abonnement au topic réussi', response };
  } catch (error) {
    logger(client).error('Error subscribing to topic:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendGeneralNotification,
  sendDeviceNotification,
  sendGroupNotification,
  subscribeToTopic
};
