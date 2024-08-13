const { Expo } = require('expo-server-sdk');
let expo = new Expo();

const sendNotifications = async (tokens, title, body, data = {}) => {
  let messages = [];

  for (let pushToken of tokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Invalid Expo push token: ${pushToken}`);
      continue;
    }

    messages.push({
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    });
  }

  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];

  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error(error);
    }
  }

  return tickets;
};

module.exports = {
  sendNotifications,
};
