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
    // Prepare caption with assistant prefix if provided
    const formattedCaption = caption ? `*_[Assistant virtuel]_*\n\n${caption}` : '';
    
    // Simulate typing for better user experience
    await client.sendPresenceUpdate('composing', jid);
    
    // Calculate typing duration based on caption length if present
    const typingDuration = caption ? Math.min(5000, caption.length * 100) : 2000;
    
    setTimeout(async () => {
      // Reset presence after typing
      await client.sendPresenceUpdate('paused', jid);
      
      // PDF documents need special handling in Baileys
      if (mediaType === 'application/pdf') {
        await client.sendMessage(jid, {
          document: Buffer.from(mediaBase64, 'base64'),
          mimetype: 'application/pdf',
          fileName: `${filename}.pdf`,
          caption: formattedCaption
        });
      } else if (mediaType.startsWith('image/')) {
        await client.sendMessage(jid, {
          image: Buffer.from(mediaBase64, 'base64'),
          caption: formattedCaption,
          fileName: filename
        });
      } else if (mediaType.startsWith('video/')) {
        await client.sendMessage(jid, {
          video: Buffer.from(mediaBase64, 'base64'),
          caption: formattedCaption,
          fileName: filename
        });
      } else if (mediaType.startsWith('audio/')) {
        await client.sendMessage(jid, {
          audio: Buffer.from(mediaBase64, 'base64'),
          mimetype: mediaType,
          fileName: filename
        });
      } else {
        // Generic file/document for other types
        await client.sendMessage(jid, {
          document: Buffer.from(mediaBase64, 'base64'),
          mimetype: mediaType,
          fileName: filename,
          caption: formattedCaption
        });
      }
    }, typingDuration);
    
  } catch (error) {
    await logService.addLog(
      `Error sending media to ${phoneNumber}: ${error.message}`,
      'sendMediaToNumber',
      'error'
    );
    
    // Attempt to send error message to the user
    try {
      await client.sendMessage(jid, { 
        text: "*_[Assistant virtuel]_*\n\nDésolé, une erreur est survenue lors de l'envoi du média. Veuillez réessayer plus tard."
      });
    } catch (secondError) {
      await logService.addLog(
        `Failed to send error message: ${secondError.message}`,
        'sendMediaToNumber',
        'error'
      );
    }
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