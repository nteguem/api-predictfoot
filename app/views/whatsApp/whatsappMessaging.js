const { MessageMedia } = require('whatsapp-web.js');
const logService = require('../../services/log.service');


const sendWithTyping = async (client, chatId, message, isMedia = false, options = {}) => {
  try {
    const typingDuration = Math.min(5000, message.length * 100);
    const chat = await client.getChatById(chatId);
    await chat.sendStateTyping();

    const automatedMessage = `${message}`;

    setTimeout(async () => {
      if (isMedia) {
        await client.sendMessage(chatId, message, options);
      } else {
        await client.sendMessage(chatId, automatedMessage);
      }
    }, typingDuration);
  } catch (error) {
    await logService.addLog(
      `${error.message}`,
      'sendWithTyping',
      'error'
    );
  }
};

const sendMessageToNumber = async (client, phoneNumber, message) => {
  await sendWithTyping(client, `${phoneNumber}@c.us`, message);
};

const sendMediaToNumber = async (client, phoneNumber, mediaType, mediaBase64, filename, caption = '') => {
  const media = new MessageMedia(mediaType, mediaBase64, filename);
  await sendWithTyping(client, `${phoneNumber}@c.us`, media, true, { caption: caption });
};

const replyToMessage = async (client, message, replyText) => {
  await sendWithTyping(client, message.from, replyText);
};


module.exports = {
  sendMessageToNumber,
  sendMediaToNumber,
  replyToMessage,
};