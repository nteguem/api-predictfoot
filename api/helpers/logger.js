const winston = require('winston');
const { format } = winston;
const fs = require('fs');
const path = require('path');
const { sendMessageToNumber } = require("../helpers/whatsApp/whatsappMessaging");

const logDirectory = './api/logging';

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Définition du transport personnalisé
class WhatsAppTransport extends winston.Transport {
  constructor(options) {
    super(options);
    this.client = options.client;
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });
    const message = `log d'erreur api-Predictfoot : ${info.level}: ${JSON.stringify(info)}`;
    sendMessageToNumber(this.client, `23797874621@c\.us`, message);
    callback();
  }
}

// Configuration du logger avec le transport personnalisé
const logger = (client) => winston.createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    // Transport pour écrire dans un fichier
    new winston.transports.File({ 
      filename: path.join(logDirectory, 'logger.log'),
      maxsize: 5242880, 
      maxFiles: 5,
    }),
    // Transport pour afficher les logs dans la console
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    // Transport personnalisé pour envoyer des messages WhatsApp
    new WhatsAppTransport({ client }),
  ]
});

module.exports = logger;
