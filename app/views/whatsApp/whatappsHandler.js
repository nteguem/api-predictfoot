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
  // Configuration améliorée pour Puppeteer avec options de stabilité
  const puppeteerConfig = {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-extensions',
      '--disable-gpu',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list'
    ],
    headless: true,
    timeout: 60000,
    protocolTimeout: 60000,
    defaultViewport: null
  };

  // Add executablePath only on Linux
  if (process.platform === 'linux') {
    puppeteerConfig.executablePath = '/usr/bin/google-chrome-stable';
  }

  const client = new Client({
    puppeteer: puppeteerConfig,
    authStrategy: new LocalAuth({
      dataPath: SESSION_FILE_PATH,
    }),
    restartOnAuthFail: true,
    takeoverOnConflict: true,
    qrMaxRetries: 5,
    qrRefreshIntervalMs: 20000 // Rafraîchit le QR code après 20 secondes
  });

  // Variable pour suivre l'état de reconnexion
  let isReconnecting = false;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  let heartbeatInterval;

  // Fonction pour démarrer le client de manière sécurisée
  const startClient = () => {
    if (isReconnecting) return;
    
    client.initialize()
      .catch(err => {
        logService.addLog(`Erreur lors de l'initialisation du client: ${err.message}`, 'WhatsApp Client', 'error');
        handleReconnect(err);
      });
  };

  // Fonction pour gérer les tentatives de reconnexion
  const handleReconnect = (error) => {
    if (isReconnecting) return;
    
    isReconnecting = true;
    reconnectAttempts++;
    
    const delay = Math.min(reconnectAttempts * 3000, 30000); // Backoff exponentiel plafonné à 30 secondes
    
    logService.addLog(
      `Tentative de reconnexion ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} dans ${delay/1000} secondes...`,
      'WhatsApp Client',
      'warning'
    );
    
    if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      logService.addLog(
        `Nombre maximum de tentatives de reconnexion atteint. Réinitialisation complète requise.`,
        'WhatsApp Client',
        'error'
      );
      io.emit('error', { message: 'Échec de connexion persistant. Veuillez vérifier manuellement le service.' });
      
      // Réinitialiser les compteurs mais ne pas tenter de reconnexion automatique
      isReconnecting = false;
      reconnectAttempts = 0;
      return;
    }
    
    setTimeout(() => {
      // Destruction sécurisée avant réinitialisation
      destroyClientSafely().then(() => {
        isReconnecting = false;
        startClient();
      }).catch(err => {
        logService.addLog(
          `Erreur lors de la destruction du client: ${err.message}`,
          'WhatsApp Client',
          'error'
        );
        isReconnecting = false;
        startClient();
      });
    }, delay);
  };

  // Destruction propre du client
  const destroyClientSafely = async () => {
    try {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      // Vérifier si le client est dans un état où il peut être déconnecté
      if (client.pupPage && !client.pupPage.isClosed()) {
        try {
          await client.logout();
        } catch (logoutErr) {
          logService.addLog(
            `Erreur lors de la déconnexion: ${logoutErr.message}`, 
            'WhatsApp Client', 
            'warning'
          );
        }
      }
      
      await client.destroy();
      logService.addLog('Client détruit avec succès', 'WhatsApp Client', 'info');
    } catch (error) {
      logService.addLog(
        `Erreur non bloquante lors de la destruction: ${error.message}`,
        'WhatsApp Client',
        'warning'
      );
    }
  };

  // Mise en place d'un système de heartbeat
  const setupHeartbeat = () => {
    let lastSuccessfulCheck = Date.now();
    
    heartbeatInterval = setInterval(async () => {
      try {
        // Vérifier si le client est toujours opérationnel
        if (client.info && client.pupPage && !client.pupPage.isClosed()) {
          // Test simple pour vérifier si le contexte d'exécution est valide
          await client.pupPage.evaluate(() => true).then(() => {
            lastSuccessfulCheck = Date.now();
          }).catch(err => {
            logService.addLog(
              `Erreur lors du heartbeat: ${err.message}`,
              'WhatsApp Client',
              'warning'
            );
            
            if (err.message.includes('Execution context was destroyed')) {
              throw err; // Remonter pour déclencher la reconnexion
            }
          });
        } else if (Date.now() - lastSuccessfulCheck > 90000) { // 1.5 minutes sans heartbeat
          throw new Error('Pas de heartbeat détecté depuis 90 secondes');
        }
      } catch (error) {
        logService.addLog(
          `Problème détecté par le heartbeat: ${error.message}`,
          'WhatsApp Client',
          'error'
        );
        
        if (!isReconnecting) {
          handleReconnect(error);
        }
      }
    }, 30000); // Vérification toutes les 30 secondes
  };

  // Gestionnaires d'événements pour WhatsApp

  client.on('qr', (qrCode) => {
    io.emit('qrCode', qrCode);
    logService.addLog('Code QR généré', 'WhatsApp Client', 'info');
    
    // Réinitialiser les compteurs de reconnexion puisque nous avons un QR code
    reconnectAttempts = 0;
  });

  client.on('authenticated', () => {
    io.emit('qrCode', "");
    logService.addLog('Client WhatsApp authentifié', 'WhatsApp Client', 'info');
    console.log('Client is authenticated');
    
    // Réinitialiser les compteurs de reconnexion
    reconnectAttempts = 0;
  });

  client.on('auth_failure', (msg) => {
    logService.addLog(`Échec d'authentification: ${msg}`, 'WhatsApp Client', 'error');
    io.emit('error', { message: `Échec d'authentification: ${msg}` });
    
    // Ne pas augmenter le compteur de reconnexion ici car WhatsApp peut gérer ses propres tentatives
  });

  client.on('ready', async () => {
    console.log('Client is ready');
    
    // Mettre en place le heartbeat une fois que le client est prêt
    setupHeartbeat();
    
    // Réinitialiser les compteurs de reconnexion
    reconnectAttempts = 0;
    
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
      logService.addLog(`Bot WhatsApp connecté: ${botNumber} (${botName})`, 'WhatsApp Client', 'info');
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

  client.on('disconnected', async (reason) => {
    io.emit('qrCode', "disconnected");
    io.emit('numberBot', "");
    
    logService.addLog(`Client WhatsApp déconnecté. Raison: ${reason || 'inconnue'}`, 'WhatsApp Client', 'warning');
    
    try {
      // Mettre à jour le statut dans la base de données
      await botService.updateBotStatus('disconnected');
      
      // Ne pas tenter de se déconnecter lors d'une déconnexion, cela pourrait causer des erreurs
    } catch (error) {
      logService.addLog(
        `Erreur lors de la mise à jour du statut de déconnexion: ${error.message}`,
        'WhatsApp Client',
        'error'
      );
    }
    
    // Gérer la reconnexion
    handleReconnect(new Error(`Déconnecté: ${reason || 'Raison inconnue'}`));
  });

  // Gestionnaire pour les erreurs de Puppeteer
  client.on('change_state', (state) => {
    logService.addLog(`Changement d'état: ${state}`, 'WhatsApp Client', 'info');
    console.log('State changed to:', state);
    
    if (state === 'CONFLICT' || state === 'UNLAUNCHED') {
      handleReconnect(new Error(`État problématique: ${state}`));
    }
  });

  client.on('message_ack', (msg, ack) => {
    // Statut d'envoi des messages
    // 0: non envoyé, 1: envoyé, 2: reçu, 3: lu
    if (ack === 3) {
      logService.addLog(`Message lu par le destinataire: ${msg.to}`, 'WhatsApp Client', 'info');
    }
  });

  // Gestionnaire d'erreurs pour la page Puppeteer
  client.once('puppeteer_page_initialized', () => {
    if (client.pupPage) {
      client.pupPage.on('error', (err) => {
        logService.addLog(`Erreur Puppeteer: ${err.message}`, 'WhatsApp Client', 'error');
        handleReconnect(err);
      });
      
      client.pupPage.on('close', () => {
        logService.addLog('Page Puppeteer fermée de manière inattendue', 'WhatsApp Client', 'warning');
        handleReconnect(new Error('Page fermée'));
      });
    }
  });

  // Gestion des erreurs non capturées au niveau de l'application
  process.on('unhandledRejection', (reason, promise) => {
    logService.addLog(
      `Rejet de promesse non géré: ${reason && reason.message ? reason.message : reason}`,
      'WhatsApp Client',
      'error'
    );
    
    // Si l'erreur est liée à WhatsApp, tenter de reconnecter
    if (reason && reason.message && 
        (reason.message.includes('Execution context was destroyed') || 
         reason.message.includes('Protocol error') ||
         reason.message.includes('Target closed'))) {
      handleReconnect(reason);
    }
  });

  // Démarrer le client
  startClient();

  return client;
};

/**
 * Configure le gestionnaire de messages entrants
 * @param {Object} client - Client WhatsApp
 */
const handleIncomingMessages = (client) => {
  client.on('message', async (msg) => {
    try {
      const contact = await msg.getContact().catch(err => {
        logService.addLog(`Erreur lors de la récupération du contact: ${err.message}`, 'handleIncomingMessages', 'error');
        return null;
      });
      
      if (!contact) {
        logService.addLog('Contact non disponible pour le message entrant', 'handleIncomingMessages', 'warning');
        return;
      }
      
      const response = await save(contact.number, contact.pushname).catch(err => {
        logService.addLog(`Erreur lors de la sauvegarde du contact: ${err.message}`, 'handleIncomingMessages', 'error');
        return { error: true, message: "Erreur interne, veuillez réessayer plus tard." };
      });
      
      if (!response) {
        return;
      }
      
      try {
        if (response?.data?.role === "user") {
          await UserCommander(response, msg, client);
        } else if (response?.data?.role === "admin") {
          await AdminCommander(response, msg, client);
        } else { 
          await msg.reply(response?.message || "Désolé, je n'ai pas pu traiter votre message.").catch(err => {
            logService.addLog(`Erreur lors de la réponse au message: ${err.message}`, 'handleIncomingMessages', 'error');
          });
        }
      } catch (commandError) {
        logService.addLog(
          `Erreur lors de l'exécution de la commande: ${commandError.message}`,
          'handleIncomingMessages',
          'error'
        );
        
        try {
          await msg.reply("Désolé, une erreur est survenue lors du traitement de votre message.").catch(() => {
            // Ignorer les erreurs de réponse ici pour éviter les boucles
          });
        } catch (replyError) {
          // Ignorer les erreurs de réponse
        }
      }
    } catch (error) {
      await logService.addLog(
        `Erreur générale dans handleIncomingMessages: ${error.message}`,
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