const botService = require('../services/bot.service');
const logService = require('../../services/log.service');
const SESSION_FILE_PATH = '../sessions/bigwin'; // Chemin du dossier de session

/**
 * Récupère les informations du bot WhatsApp
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} client - Client WhatsApp
 */
const getBotInfo = async (req, res, client) => {
  try {
    const response = await botService.getBotInfo();
    
    if (response.success) {
      return res.status(200).json(response);
    } else {
      return res.status(404).json(response);
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Erreur serveur: ${error.message}`
    });
  }
};

/**
 * Déconnecte le bot WhatsApp et supprime la session
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} client - Client WhatsApp
 */
const disconnectBot = async (req, res, client) => {
  try {
    // Utiliser le service pour gérer toute la logique de déconnexion
    const response = await botService.disconnectWhatsApp(client, SESSION_FILE_PATH);
    
    if (response.success) {
      return res.status(200).json(response);
    } else {
      return res.status(400).json(response);
    }
  } catch (error) {
    await logService.addLog(
      `Erreur non gérée lors de la déconnexion du bot: ${error.message}`,
      'disconnectBot',
      'error'
    );
    
    return res.status(500).json({
      success: false,
      message: `Erreur serveur: ${error.message}`
    });
  }
};

/**
 * Reconnecte le bot WhatsApp
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} client - Client WhatsApp
 */
const reconnectBot = async (req, res, client) => {
  try {
    // Réinitialiser le client
    client.initialize();
    
    return res.status(200).json({
      success: true,
      message: 'Tentative de reconnexion initiée'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Erreur lors de la reconnexion: ${error.message}`
    });
  }
};

module.exports = {
  getBotInfo,
  disconnectBot,
  reconnectBot
};
