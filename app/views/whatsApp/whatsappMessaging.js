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
  // Format correct du JID pour Baileys
  const jid = `${phoneNumber}@s.whatsapp.net`;
  
  try {
    // Vérifier si le client est correctement initialisé
    if (!client || typeof client.sendMessage !== 'function') {
      throw new Error('Client WhatsApp non initialisé correctement');
    }
    
    // Prepare caption with assistant prefix if provided
    const formattedCaption = caption ? `*_[Assistant virtuel]_*\n\n${caption}` : '';
    
    // Simulate typing
    if (typeof client.presenceSubscribe === 'function') {
      await client.presenceSubscribe(jid);
    }
    if (typeof client.sendPresenceUpdate === 'function') {
      await client.sendPresenceUpdate('composing', jid);
    }
    
    // Délai de simulation de frappe
    const typingDuration = caption ? Math.min(3000, caption.length * 50) : 1000;
    
    // Préparer le message selon le type de média
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // Reset presence
          if (typeof client.sendPresenceUpdate === 'function') {
            await client.sendPresenceUpdate('paused', jid);
          }
          
          let messageContent;
          
          // PDF documents
          if (mediaType === 'application/pdf') {
            messageContent = {
              document: Buffer.from(mediaBase64, 'base64'),
              mimetype: 'application/pdf',
              fileName: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
              caption: formattedCaption
            };
          } 
          // Images
          else if (mediaType.startsWith('image/')) {
            messageContent = {
              image: Buffer.from(mediaBase64, 'base64'),
              caption: formattedCaption,
              fileName: filename
            };
          } 
          // Videos
          else if (mediaType.startsWith('video/')) {
            messageContent = {
              video: Buffer.from(mediaBase64, 'base64'),
              caption: formattedCaption,
              fileName: filename
            };
          } 
          // Audios
          else if (mediaType.startsWith('audio/')) {
            messageContent = {
              audio: Buffer.from(mediaBase64, 'base64'),
              mimetype: mediaType,
              fileName: filename
            };
          } 
          // Other documents
          else {
            messageContent = {
              document: Buffer.from(mediaBase64, 'base64'),
              mimetype: mediaType || 'application/octet-stream',
              fileName: filename,
              caption: formattedCaption
            };
          }
          
          // Envoyer le message
          await client.sendMessage(jid, messageContent);
          resolve();
        } catch (err) {
          await logService.addLog(
            `Failed to send media: ${err.message}`,
            'sendMediaToNumber',
            'error'
          );
          reject(err);
        }
      }, typingDuration);
    });
  } catch (error) {
    await logService.addLog(
      `Error in sendMediaToNumber: ${error.message}`,
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