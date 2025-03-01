const botService = require('../services/bot.service');
const { SESSION_FILE_PATH } = require('../views/whatsApp/whatappsHandler');
const logService = require('../services/log.service');

/**
 * Configure les gestionnaires d'événements pour Socket.io
 * @param {Object} io - Instance Socket.io
 * @param {Object} whatsAppClient - Client WhatsApp
 */
const setupSocketHandlers = (io, whatsAppClient) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Envoyer les informations initiales du bot si disponibles
    if (whatsAppClient?.info) {
      const { user, pushname } = whatsAppClient.info?.wid || {};
      if (user && pushname) {
        socket.emit('numberBot', `${user} (${pushname})`);
        socket.emit('qrCode', 'connected');
      }
    }

    // Gestionnaire pour la déconnexion du client WhatsApp
    socket.on('disconnectClient', async () => {
      try {
        // Informer tous les clients de la déconnexion avant de redémarrer
        io.emit('qrCode', 'disconnected');
        io.emit('numberBot', '');
        io.emit('botRestarting', true);
        
        // Appeler le service pour gérer la déconnexion complète
        await botService.disconnectWhatsApp(whatsAppClient, SESSION_FILE_PATH);
        
        // Le redémarrage de l'application se fait dans le service
        logService.addLog('Client WhatsApp déconnecté via Socket.io', 'Socket Handler', 'info');
      } catch (error) {
        logService.addLog(
          `Erreur lors de la déconnexion via Socket.io: ${error.message}`,
          'Socket Handler',
          'error'
        );
        
        // Informer le client de l'erreur
        socket.emit('error', {
          type: 'disconnect_error',
          message: `Erreur lors de la déconnexion: ${error.message}`
        });
      }
    });

    // Gestionnaire pour les messages du client
    socket.on('message', (data) => {
      console.log('Message from client:', data);
      // Traitement des messages...
    });

    // Gestionnaire pour la déconnexion Socket.io
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Gestionnaire d'erreurs Socket.io
    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      logService.addLog(`Erreur WebSocket: ${error.message}`, 'Socket Handler', 'error');
    });
  });
};

module.exports = setupSocketHandlers;