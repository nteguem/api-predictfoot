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
          logService.addLog(
            `Dossier de session supprimé: ${sessionPath}`,
            'deleteSessionFolder',
            'info'
          );
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
 * Redémarre l'application avec PM2
 * @returns {Promise<Object>} - Résultat de l'opération
 */
const restartApplication = async () => {
  try {
    return new Promise((resolve, reject) => {
      exec('pm2 restart launch.js', (error, stdout, stderr) => {
        if (error) {
          logService.addLog(
            `Erreur lors du redémarrage de l'application: ${error.message}`,
            'restartApplication',
            'error'
          );
          reject({
            success: false,
            message: `Erreur lors du redémarrage: ${error.message}`
          });
          return;
        }
        
        if (stderr) {
          logService.addLog(
            `Avertissement lors du redémarrage: ${stderr}`,
            'restartApplication',
            'warning'
          );
        }
        
        console.log(`Application redémarrée avec PM2: ${stdout}`);
        logService.addLog(
          'Application redémarrée avec PM2',
          'restartApplication',
          'info'
        );
        
        resolve({
          success: true,
          message: 'Application redémarrée avec succès'
        });
      });
    });
  } catch (error) {
    await logService.addLog(
      `Exception lors du redémarrage de l'application: ${error.message}`,
      'restartApplication',
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
 * Supprime toutes les informations du bot de la base de données
 * @returns {Promise<Object>} - Résultat de l'opération
 */
const clearBotInfo = async () => {
  try {
    await Bot.deleteMany({});
    
    logService.addLog(
      'Informations du bot supprimées de la base de données',
      'clearBotInfo',
      'info'
    );
    
    return {
      success: true,
      message: 'Informations du bot supprimées avec succès'
    };
  } catch (error) {
    await logService.addLog(
      `Erreur lors de la suppression des informations du bot: ${error.message}`,
      'clearBotInfo',
      'error'
    );
    
    return {
      success: false,
      message: `Erreur: ${error.message}`
    };
  }
};

/**
 * Déconnecte complètement le bot WhatsApp, supprime la session et redémarre l'application
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
    
    // 2. Mettre à jour le statut dans la base de données ou supprimer les infos
    await clearBotInfo(); // Supprime les informations de l'ancien numéro
    
    // 3. Supprimer le dossier de session
    console.log(`Suppression du dossier de session: ${sessionPath}`);
    const deleteResult = await deleteSessionFolder(sessionPath);
    
    // 4. Redémarrer l'application avec PM2
    console.log('Redémarrage de l\'application...');
    const restartResult = await restartApplication();
    
    if (deleteResult.success && restartResult.success) {
      return {
        success: true,
        message: 'Bot déconnecté, session supprimée et application redémarrée avec succès'
      };
    } else {
      // Construire un message détaillé en cas d'erreur partielle
      let message = 'Déconnexion partielle : ';
      
      if (!deleteResult.success) {
        message += `échec de la suppression de la session (${deleteResult.message}). `;
      }
      
      if (!restartResult.success) {
        message += `échec du redémarrage (${restartResult.message}).`;
      }
      
      return {
        success: false,
        message: message
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
  disconnectWhatsApp,
  clearBotInfo,
  restartApplication
};