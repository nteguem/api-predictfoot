const { MessageMedia } = require('whatsapp-web.js');


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
 console.log("error", error);
  }
};

const sendMessageToNumber = async (client, phoneNumber, message) => {
  await sendWithTyping(client, `${phoneNumber}`, message);
};

const sendMediaToNumber = async (client, phoneNumber, mediaType, mediaBase64, filename, caption = '') => {
  const media = new MessageMedia(mediaType, mediaBase64, filename);
  await sendWithTyping(client, `${phoneNumber}`, media, true, { caption: caption });
};

const replyToMessage = async (client, message, replyText) => {
  await sendWithTyping(client, message.from, replyText);
};


/**
 * Envoie un lien avec prévisualisation
 * @param {Object} client - Client WhatsApp
 * @param {String} phoneNumber - Numéro de téléphone du destinataire
 * @param {String} url - URL à envoyer
 * @param {String} caption - Texte accompagnant le lien (optionnel)
 */
const sendLinkWithPreview = async (client, phoneNumber, url, caption = '') => {
  try {
    // Formater le numéro de téléphone pour WhatsApp Web JS
    let chatId = phoneNumber;
    if (!chatId.includes('@')) {
      chatId = `${chatId}@c.us`;
    }
    
    // Construire le message avec le lien
    const message = caption ? `${caption}\n\n${url}` : url;
    
    // Envoyer le message (WhatsApp Web JS génère automatiquement la prévisualisation)
    const result = await client.sendMessage(chatId, message);
    
    await logService.addLog(
      `Lien envoyé avec succès à ${phoneNumber}`,
      'sendLinkWithPreview',
      'info'
    );
    
    return result;
  } catch (error) {
    await logService.addLog(
      `Échec de l'envoi du lien à ${phoneNumber}: ${error.message}`,
      'sendLinkWithPreview',
      'error'
    );
    throw error;
  }
};


module.exports = {
  sendMessageToNumber,
  sendMediaToNumber,
  sendLinkWithPreview,
  replyToMessage,
};