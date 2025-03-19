const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const logService = require('../../services/log.service');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

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
        caption: formattedCaption,
        mimetype: 'image/jpeg',
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

// Nouvelle fonction pour envoyer un lien avec prévisualisation
const sendLinkWithPreview = async (client, phoneNumber, url, caption = '') => {
  try {
    const jid = `${phoneNumber}@s.whatsapp.net`;
    const formattedCaption = caption ? `*_[Assistant virtuel]_*\n\n${caption}` : '';
    
    // Message avec lien pour afficher la prévisualisation
    const messageContent = {
      text: formattedCaption,
      canonicalUrl: url, // Pour la prévisualisation du lien
      matchedText: url,
      detectLinks: true // Assure que Baileys détecte les liens
    };
    
    // Envoyer le message avec prévisualisation
    return await client.sendMessage(jid, messageContent);
  } catch (error) {
    await logService.addLog(
      `Failed to send link preview to ${phoneNumber}: ${error.message}`,
      'sendLinkWithPreview',
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
  sendLinkWithPreview,
  replyToMessage,
};