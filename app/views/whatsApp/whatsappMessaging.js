const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const logService = require('../../services/log.service');
const fs = require('fs');
const path = require('path');

const sendWithTyping = async (client, chatId, message, isMedia = false, options = {}) => {
  try {
    // Simulate typing in Baileys
    await client.sendPresenceUpdate('composing', chatId);
    
    // Calculate typing duration based on message length
    const typingDuration = Math.min(5000, message.length * 100);
    
    // Prepare message with assistant prefix if not media
    const automatedMessage = isMedia ? message : `*_[Assistant virtuel]_*\n\n${message}`;
    
    setTimeout(async () => {
      // Reset presence after typing
      await client.sendPresenceUpdate('paused', chatId);
      
      if (isMedia) {
        await client.sendMessage(chatId, automatedMessage, options);
      } else {
        await client.sendMessage(chatId, { text: automatedMessage });
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
  const jid = `${phoneNumber}@s.whatsapp.net`;
  await sendWithTyping(client, jid, message);
};

const sendMediaToNumber = async (client, phoneNumber, mediaType, mediaBase64, filename, caption = '') => {
  try {
    const jid = `${phoneNumber}@s.whatsapp.net`;
    const formattedCaption = caption ? `*_[Assistant virtuel]_*\n\n${caption}` : '';
    
    // Créer le message selon le type de média
    let messageContent;
    
    if (mediaType === 'application/pdf') {
      messageContent = {
        document: Buffer.from(mediaBase64, 'base64'),
        mimetype: 'application/pdf',
        fileName: `${filename}.pdf`,
        caption: formattedCaption
      };
    } else if (mediaType.startsWith('image/')) {
      messageContent = {
        image: Buffer.from(mediaBase64, 'base64'),
        caption: formattedCaption
      };
    } else {
      // Document générique
      messageContent = {
        document: Buffer.from(mediaBase64, 'base64'),
        mimetype: mediaType,
        fileName: filename,
        caption: formattedCaption
      };
    }
    
    // Envoyer le message directement
    return await client.sendMessage(jid, messageContent);
  } catch (error) {
    await logService.addLog(
      `Failed to send media to ${phoneNumber}: ${error.message}`,
      'sendMediaToNumber',
      'error'
    );
    throw error;
  }
};

const replyToMessage = async (client, message, replyText) => {
  try {
    const jid = message.from;
    const quotedMessage = message._data;
    
    await sendWithTyping(client, jid, replyText);
  } catch (error) {
    await logService.addLog(
      `${error.message}`,
      'replyToMessage',
      'error'
    );
  }
};

module.exports = {
  sendMessageToNumber,
  sendMediaToNumber,
  replyToMessage,
};