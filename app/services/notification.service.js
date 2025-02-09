const admin = require('firebase-admin');
const Notification = require('../models/notification.model');
const TopicSubscription = require('../models/topicSubscription.model');

class NotificationService {
  static async sendGeneralNotification(notificationData, client) {
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
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data
      });
      await newNotification.save();

      return {
        success: true,
        message: 'Notification générale envoyée',
        notification: newNotification,
        fcmResponse
      };
    } catch (error) {
      console.log('Error sending general notification:', error)
      return { success: false, error: error.message };
    }
  }

  static async sendDeviceNotification(deviceToken, notificationData, client) {
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
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data
      });
      await newNotification.save();

      return {
        success: true,
        message: 'Notification device envoyée',
        notification: newNotification,
        fcmResponse
      };
    } catch (error) {
      console.log('Error sending device notification:', error)
      return { success: false, error: error.message };
    }
  }

  static async sendTopicNotification(topic, notificationData, client) {
    try {
      const message = {
        notification: {
          title: notificationData.title,
          body: notificationData.body
        },
        topic: topic,
        data: notificationData.data || {}
      };

      const fcmResponse = await admin.messaging().send(message);
      
      const newNotification = new Notification({
        type: 'group',
        target: { groupTopic: topic },
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data
      });
      await newNotification.save();

      return {
        success: true,
        message: 'Notification topic envoyée',
        notification: newNotification,
        fcmResponse
      };
    } catch (error) {
      console.log('Error sending topic notification:', error)
      return { success: false, error: error.message };
    }
  }

  static async subscribeToTopic(deviceToken, topic, type = 'public', expiresAt = null, client) {
    try {
      await admin.messaging().subscribeToTopic(deviceToken, topic);
      
      const subscription = new TopicSubscription({
        topic,
        deviceToken,
        type,
        expiresAt
      });
      await subscription.save();

      return {
        success: true,
        message: 'Abonnement au topic réussi',
        subscription
      };
    } catch (error) {
      console.log('Error subscribing to topic:', error)
      return { success: false, error: error.message };
    }
  }

  static async unsubscribeFromTopic(deviceToken, topic, client) {
    try {
      await admin.messaging().unsubscribeFromTopic(deviceToken, topic);
      
      await TopicSubscription.findOneAndUpdate(
        { deviceToken, topic },
        { fcmUnsubscribed: true }
      );

      return {
        success: true,
        message: 'Désabonnement du topic réussi'
      };
    } catch (error) {
      console.log('Error unsubscribing from topic:', error)
      return { success: false, error: error.message };
    }
  }

  static async getTopicSubscriptions(filters = {}, pagination = {}, client) {
    try {
      const { topic, type, deviceToken, activeOnly } = filters;
      const { offset = 0, limit = 10 } = pagination;

      const matchQuery = {};
      if (topic) matchQuery.topic = topic;
      if (type) matchQuery.type = type;
      if (deviceToken) matchQuery.deviceToken = deviceToken;
      if (activeOnly) {
        matchQuery.$or = [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ];
      }

      const [subscriptions, totalCount] = await Promise.all([
        TopicSubscription.find(matchQuery)
          .sort({ createdAt: -1 })
          .skip(parseInt(offset))
          .limit(parseInt(limit)),
        TopicSubscription.countDocuments(matchQuery)
      ]);

      return {
        success: true,
        subscriptions,
        pagination: {
          total: totalCount,
          offset: parseInt(offset),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.log('Error getting topic subscriptions:', error)
      return { success: false, error: error.message };
    }
  }

  static async handleExpiredSubscriptions(client) {
    try {
      const expiredSubscriptions = await TopicSubscription.find({
        expiresAt: { $lt: new Date() },
        fcmUnsubscribed: { $ne: true }
      });

      const results = await Promise.all(
        expiredSubscriptions.map(async (subscription) => {
          try {
            await admin.messaging().unsubscribeFromTopic(
              subscription.deviceToken, 
              subscription.topic
            );

            await TopicSubscription.updateOne(
              { _id: subscription._id },
              { $set: { fcmUnsubscribed: true } }
            );

            return { success: true, subscription };
          } catch (error) {
            return { success: false, subscription, error: error.message };
          }
        })
      );

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return {
        success: true,
        message: `${successful} désabonnements réussis, ${failed} échecs`,
        details: results.filter(r => !r.success)
      };
    } catch (error) {
      console.log('Error handling expired subscriptions:', error)
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationService;