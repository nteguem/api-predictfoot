const { Client, LocalAuth } = require('whatsapp-web.js');
const { save } = require('../../services/user.service');
const { UserCommander } = require("./user");
const { AdminCommander } = require("./admin")
const logger = require('../logger');
const initializeWhatsAppClient = (io) => {
  const client = new Client({
    puppeteer: {
      args: ['--no-sandbox'],
      // executablePath: '/usr/bin/google-chrome-stable',
    },
    webVersionCache: {
      type: "remote",
      remotePath:
        "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
    },
    authStrategy: new LocalAuth(
      {
        dataPath: '../sessions/predictfoot'
      }
    ),
  });

  client.on('qr', (qrCode) => {
    io.emit('qrCode', qrCode);
  });

  client.on('authenticated', () => {
    io.emit('qrCode', "");
    console.log('Client is authenticated');
  });

  client.on('ready', () => {
    console.log('Client is ready');
    io.emit('numberBot', `${client.info?.wid?.user} (${client.info?.pushname})`);
    io.emit('qrCode', "connected");
  });

  client.on('disconnected', () => {
    io.emit('qrCode', "disconnected");
    io.emit('numberBot', "");
    // Sauvegarde de la session localement avant de réinitialiser
    client.authInfo && client.authInfo.saveSession && client.authInfo.saveSession();
    client.initialize();
  });

  return client;
};

const handleIncomingMessages = (client) => {
  client.on('message', async (msg) => {
    const contact = await msg.getContact();
    const response = await save(contact.number, contact.pushname);
    try {
      if (response?.data?.role == "user") {
        await UserCommander(response, msg, client);
      }
      else if (response?.data?.role == "admin") {
        await AdminCommander(response, msg, client)
      }
      else {
        logger(client).error('Erreur rencontrée handleIncomingMessages', response.error);
        msg.reply(response.message)
      }
    }
    catch (err) {
      logger(client).error('Erreur rencontrée handleIncomingMessages', err);
      msg.reply("We're sorry, but an internal server error has occurred. Our team has been alerted and is working to resolve the issue. Please try again later.")
    }
  });
};

module.exports = {
  initializeWhatsAppClient,
  handleIncomingMessages
};
