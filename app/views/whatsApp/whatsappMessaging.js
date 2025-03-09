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
  const jid = `${phoneNumber}@s.whatsapp.net`;
  
  try {
    // Prepare caption with assistant prefix
    const formattedCaption = caption ? `*_[Assistant virtuel]_*\n\n${caption}` : '';
    
    let mediaMessage;
    
    // Create appropriate media message based on type
    if (mediaType.startsWith('image/')) {
      mediaMessage = {
        image: Buffer.from(mediaBase64, 'base64'),
        caption: formattedCaption,
        fileName: filename
      };
    } else if (mediaType.startsWith('video/')) {
      mediaMessage = {
        video: Buffer.from(mediaBase64, 'base64'),
        caption: formattedCaption,
        fileName: filename
      };
    } else if (mediaType.startsWith('audio/')) {
      mediaMessage = {
        audio: Buffer.from(mediaBase64, 'base64'),
        mimetype: mediaType,
        fileName: filename
      };
    } else if (mediaType === 'application/pdf' || mediaType.includes('document')) {
      mediaMessage = {
        document: Buffer.from(mediaBase64, 'base64'),
        mimetype: mediaType,
        fileName: filename,
        caption: formattedCaption
      };
    } else {
      // Generic file
      mediaMessage = {
        document: Buffer.from(mediaBase64, 'base64'),
        mimetype: mediaType,
        fileName: filename,
        caption: formattedCaption
      };
    }
    
    await sendWithTyping(client, jid, mediaMessage, true);
  } catch (error) {
    await logService.addLog(
      `Error sending media: ${error.message}`,
      'sendMediaToNumber',
      'error'
    );
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