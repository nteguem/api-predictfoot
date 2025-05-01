const { Boom } = require('@hapi/boom');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { save } = require('../../services/user.service');
const { UserCommander } = require("./user");
const { AdminCommander } = require("./admin");
const logService = require('../../services/log.service');
const botService = require('../../services/bot.service');
const fs = require('fs');

const SESSION_FILE_PATH = '../sessions/bigwin';

/**
 * Initialise le client WhatsApp et configure les gestionnaires d'événements
 * @param {Object} io - Instance Socket.io
 * @returns {Object} - Client WhatsApp initialisé
 */
const initializeWhatsAppClient = async (io) => {
  // Ensure session directory exists
  if (!fs.existsSync(SESSION_FILE_PATH)) {
    fs.mkdirSync(SESSION_FILE_PATH, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_FILE_PATH);
  
  const client = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  // Handle QR code
  client.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      // Emit QR code to frontend
      io.emit('qrCode', qr);
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom) ? 
        lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
      
      io.emit('qrCode', "disconnected");
      io.emit('numberBot', "");
      
      try {
        // Update bot status in database
        await botService.updateBotStatus('disconnected');
        logService.addLog('Client WhatsApp déconnecté', 'WhatsApp Client', 'info');
      } catch (error) {
        logService.addLog(
          `Erreur lors de la déconnexion du client WhatsApp: ${error.message}`,
          'WhatsApp Client',
          'error'
        );
      }
      
      if (shouldReconnect) {
        setTimeout(() => {
          logService.addLog('Tentative de reconnexion...', 'WhatsApp Client', 'info');
          initializeWhatsAppClient(io);
        }, 2000);
      }
    }
    
    if (connection === 'open') {
      console.log('Client is ready');
      io.emit('qrCode', "connected");
      
      // Get bot information
      const botNumber = client.user?.id?.split(':')[0];
      const botName = client.user?.name || 'Bot WhatsApp';
      
      // Save bot info to MongoDB
      try {
        await botService.saveOrUpdateBotInfo({
          phoneNumber: botNumber,
          name: botName,
          status: 'connected'
        });
      } catch (error) {
        logService.addLog(
          `Erreur lors de la sauvegarde des informations du bot: ${error.message}`,
          'WhatsApp Client',
          'error'
        );
      }
      
      // Inform all clients of the connection
      io.emit('numberBot', `${botNumber} (${botName})`);
    }
  });

  // Handle auth updates
  client.ev.on('creds.update', saveCreds);
  
  client.ev.on('messages.upsert', async ({ messages }) => {
    for (const message of messages) {
      // Only process new messages
      if (message.key.fromMe) continue;
      handleMessage(client, message);
    }
  });

  // Handle message status updates
  client.ev.on('message.update', (updates) => {
    for (const update of updates) {
      if (update.status === 3) { // Read status in Baileys
        logService.addLog(`Message lu par le destinataire: ${update.key.remoteJid}`, 'WhatsApp Client', 'info');
      }
    }
  });

  return client;
};

/**
 * Traite un message individuel
 * @param {Object} client - Client WhatsApp
 * @param {Object} message - Message reçu
 */
const handleMessage = async (client, message) => {
  try {
    const senderJid = message.key.remoteJid;
    const messageContent = message.message;

    // Extract sender's number from JID (remove "@s.whatsapp.net")
    const senderNumber = senderJid.split('@')[0];
    
    // Get sender's name from message info or use default
    const senderName = message.pushName || 'Unknown';
    
    const response = await save(senderNumber, senderName);
    if (response?.data?.role === "user") {
      await UserCommander(response, { 
        from: senderJid, 
        body: messageContent?.conversation || messageContent?.extendedTextMessage?.text || '', 
        _data: message 
      }, client);
    } else if (response?.data?.role === "admin") {
      await AdminCommander(response, { 
        from: senderJid, 
        body: messageContent?.conversation || messageContent?.extendedTextMessage?.text || '', 
        _data: message 
      }, client);
    } else {
      // Reply to the message
      await client.sendMessage(senderJid, { text: response?.message });
    }
  } catch (error) {
    await logService.addLog(
      `${error.message}`,
      'handleMessage',
      'error'
    );
  }
};


module.exports = {
  initializeWhatsAppClient,
  SESSION_FILE_PATH
};