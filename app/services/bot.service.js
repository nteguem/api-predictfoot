const Bot = require('../models/bot.model');
const logService = require('./log.service');
const { exec } = require('child_process');

/**
 * Supprime le dossier de session WhatsApp
 * @param {string} sessionPath - Chemin du dossier de session
 * @returns {Promise<Object>} - Résultat de l'opération
 */
const deleteSessionFolder = async (sessionPath) => {
  try {
    return new Promise((resolve, reject) => {
      exec(`rm -rf ${sessionPath}`, (error) => {
        if (error) {
          logService.addLog(
            `Erreur lors de la suppression du dossier de session: ${error.message}`,
            'deleteSessionFolder',
            'error'
          );
          reject({
            success: false,
            message: `Erreur lors de la suppression: ${error.message}`
          });
        } else {
          console.log(`Dossier de session supprimé avec succès: ${sessionPath}`);
          resolve({
            success: true,
            message: 'Dossier de session supprimé avec succès'
          });
        }
      });
    });
  } catch (error) {
    await logService.addLog(
      `Exception lors de la suppression du dossier: ${error.message}`,
      'deleteSessionFolder',
      'error'
    );
    return {
      success: false,
      message: `Exception: ${error.message}`
    };
  }
};

/**
 * Sauvegarde ou met à jour les informations du bot WhatsApp
 * @param {Object} botInfo - Les informations du bot
 * @param {string} botInfo.phoneNumber - Le numéro de téléphone du bot
 * @param {string} botInfo.name - Le nom du bot
 * @param {string} botInfo.status - Le statut du bot ('connected' ou 'disconnected')
 * @returns {Promise<Object>} - Les informations du bot sauvegardées
 */
const saveOrUpdateBotInfo = async (botInfo) => {
  try {
    // Chercher si on a déjà un document (on n'en aura qu'un seul)
    const existingBot = await Bot.findOne();
    
    if (existingBot) {
      // Mettre à jour le document existant
      existingBot.phoneNumber = botInfo.phoneNumber;
      existingBot.name = botInfo.name;
      existingBot.status = botInfo.status;
      existingBot.lastUpdated = new Date();
      
      await existingBot.save();
      return { success: true, data: existingBot };
    } else {
      // Créer un nouveau document
      const newBot = new Bot({
        phoneNumber: botInfo.phoneNumber,
        name: botInfo.name,
        status: botInfo.status,
        lastUpdated: new Date()
      });
      
      await newBot.save();
      return { success: true, data: newBot };
    }
  } catch (error) {
    await logService.addLog(
      `Erreur lors de la sauvegarde des informations du bot: ${error.message}`,
      'saveOrUpdateBotInfo',
      'error'
    );
    return { success: false, message: `Erreur: ${error.message}` };
  }
};

/**
 * Met à jour le statut du bot
 * @param {string} status - Le nouveau statut ('connected' ou 'disconnected')
 * @returns {Promise<Object>} - Le résultat de l'opération
 */
const updateBotStatus = async (status) => {
  try {
    const bot = await Bot.findOne();
    
    if (!bot) {
      await logService.addLog(
        'Tentative de mise à jour du statut mais aucun bot n\'est enregistré',
        'updateBotStatus',
        'warning'
      );
      return { success: false, message: 'Aucun bot trouvé' };
    }
    
    bot.status = status;
    bot.lastUpdated = new Date();
    await bot.save();
    
    return { success: true, data: bot };
  } catch (error) {
    await logService.addLog(
      `Erreur lors de la mise à jour du statut du bot: ${error.message}`,
      'updateBotStatus',
      'error'
    );
    return { success: false, message: `Erreur: ${error.message}` };
  }
};

/**
 * Déconnecte complètement le bot WhatsApp
 * @param {Object} client - Le client WhatsApp
 * @param {string} sessionPath - Chemin du dossier de session
 * @returns {Promise<Object>} - Résultat de l'opération
 */
const disconnectWhatsApp = async (client, sessionPath) => {
  try {
    // 1. Déconnecter le client WhatsApp
    console.log('Déconnexion du client WhatsApp...');
    await client.logout();
    console.log('Client WhatsApp déconnecté avec succès');
    
    // 2. Mettre à jour le statut dans la base de données
    const statusUpdate = await updateBotStatus('disconnected');
    if (!statusUpdate.success) {
      await logService.addLog(
        `Échec de la mise à jour du statut: ${statusUpdate.message}`,
        'disconnectWhatsApp',
        'warning'
      );
    }
    
    // 3. Supprimer le dossier de session
    console.log(`Suppression du dossier de session: ${sessionPath}`);
    const deleteResult = await deleteSessionFolder(sessionPath);
    
    if (deleteResult.success) {
      return {
        success: true,
        message: 'Bot déconnecté et session supprimée avec succès',
        data: statusUpdate.data
      };
    } else {
      return {
        success: false,
        message: `Bot déconnecté mais échec de la suppression de la session: ${deleteResult.message}`,
        data: statusUpdate.data
      };
    }
  } catch (error) {
    await logService.addLog(
      `Erreur lors de la déconnexion complète du bot: ${error.message}`,
      'disconnectWhatsApp',
      'error'
    );
    
    return {
      success: false,
      message: `Erreur lors de la déconnexion: ${error.message}`
    };
  }
};

/**
 * Récupère les informations du bot
 * @returns {Promise<Object>} - Les informations du bot
 */
const getBotInfo = async () => {
  try {
    const bot = await Bot.findOne();
    
    if (!bot) {
      return { success: false, message: 'Aucun bot trouvé' };
    }
    
    return { success: true, data: bot };
  } catch (error) {
    await logService.addLog(
      `Erreur lors de la récupération des informations du bot: ${error.message}`,
      'getBotInfo',
      'error'
    );
    return { success: false, message: `Erreur: ${error.message}` };
  }
};

module.exports = {
  saveOrUpdateBotInfo,
  updateBotStatus,
  getBotInfo,
  disconnectWhatsApp
};