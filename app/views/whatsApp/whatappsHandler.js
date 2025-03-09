const { Client, LocalAuth } = require('whatsapp-web.js');
const { save } = require('../../services/user.service');
const { UserCommander } = require("./user");
const { AdminCommander } = require("./admin");
const logService = require('../../services/log.service');
const botService = require('../../services/bot.service');
const SESSION_FILE_PATH = '../sessions/bigwin';


/**
 * Initialise le client WhatsApp et configure les gestionnaires d'événements
 * @param {Object} io - Instance Socket.io
 * @returns {Object} - Client WhatsApp initialisé
 */
const initializeWhatsAppClient = (io) => {
  const puppeteerConfig = {
    args: ['--no-sandbox'],
  };

  // Add executablePath only on Linux
  if (process.platform === 'linux') {
    puppeteerConfig.executablePath = '/usr/bin/google-chrome-stable';
  }

  const client = new Client({
    puppeteer: puppeteerConfig,
  });

  client.on('qr', (qrCode) => {
    io.emit('qrCode', qrCode);
  });

  client.on('authenticated', () => {
    io.emit('qrCode', "");
    console.log('Client is authenticated');
  });

  client.on('auth_failure', (msg) => {
    logService.addLog(`Échec d'authentification: ${msg}`, 'WhatsApp Client', 'error');
    io.emit('error', { message: `Échec d'authentification: ${msg}` });
  });

  client.on('ready', async () => {
    console.log('Client is ready');
    
    // Récupérer les informations du bot
    const botNumber = client.info?.wid?.user;
    const botName = client.info?.pushname;
    
    // Sauvegarder les informations dans MongoDB
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
    
    // Informer tous les clients de la connexion
    io.emit('numberBot', `${botNumber} (${botName})`);
    io.emit('qrCode', "connected");
  });

  client.on('disconnected', async () => {
    io.emit('qrCode', "disconnected");
    io.emit('numberBot', "");
    
    try {
      // Mettre à jour le statut dans la base de données
      await botService.updateBotStatus('disconnected');
      logService.addLog('Client WhatsApp déconnecté', 'WhatsApp Client', 'info');
      
      // Déconnexion propre du client
      await client.logout();
    } catch (error) {
      logService.addLog(
        `Erreur lors de la déconnexion du client WhatsApp: ${error.message}`,
        'WhatsApp Client',
        'error'
      );
    }
    
    setTimeout(() => {
      client.initialize();
    }, 2000);
  });

  // Gérer les erreurs potentielles
  client.on('change_state', (state) => {
    logService.addLog(`Changement d'état: ${state}`, 'WhatsApp Client', 'info');
    console.log('State changed to:', state);
  });

  client.on('message_ack', (msg, ack) => {
    // Statut d'envoi des messages
    // 0: non envoyé, 1: envoyé, 2: reçu, 3: lu
    if (ack === 3) {
      logService.addLog(`Message lu par le destinataire: ${msg.to}`, 'WhatsApp Client', 'info');
    }
  });

  return client;
};

/**
 * Configure le gestionnaire de messages entrants
 * @param {Object} client - Client WhatsApp
 */
const handleIncomingMessages = (client) => {
  client.on('message', async (msg) => {
    try {
      const contact = await msg.getContact();
      const response = await save(contact.number, contact.pushname);
      console.log("roland",msg);
      console.log("roland1",contact);
      if (response?.data?.role === "user") {
        await UserCommander(response, msg, client);
      } else if (response?.data?.role === "admin") {
        await AdminCommander(response, msg, client);
      } else { 
        msg.reply(response?.message);
      }
    } catch (error) {
      await logService.addLog(
        `${error.message}`,
        'handleIncomingMessages',
        'error'
      );
    }
  });
};

module.exports = {
  initializeWhatsAppClient,
  handleIncomingMessages,
  SESSION_FILE_PATH
};