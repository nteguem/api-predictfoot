const Log = require('../models/log.model');

/**
 * Enregistre un log dans la base de données.
 * @param {String} message - Message d'erreur ou d'information.
 * @param {String} functionName - Nom de la fonction où s'est produit l'erreur.
 * @param {String} type - Type de log : 'error', 'info', 'warning'.
 * @returns {Promise<Object>} - Le log enregistré.
 */
async function addLog(message, functionName, type = 'info') {
  const log = new Log({
    message,
    functionName,
    type,
  });
  return await log.save();
}

/**
 * @param {Number} offset - Position de départ pour la pagination.
 * @param {Number} limit - Nombre d'éléments par page.
 * @param {String} [type] - Type de log à filtrer : 'error', 'info', 'warning'.
 * @returns {Promise<Object>} - Liste des logs avec pagination.
 */
async function getLogs(offset = 0, limit = 10, type = null) {
    const query = type ? { type } : {};
    const logs = await Log.find(query)
      .skip(offset)
      .limit(limit)
      .sort({ timestamp: -1 }); 
  
    const total = await Log.countDocuments(query); 
  
    return {
      logs,
      total
    };
  }

  /**
 * Met à jour l'état 'resolved' d'un log.
 * @param {String} logId - ID du log à mettre à jour.
 * @param {Boolean} resolved - Nouvel état du log (true ou false).
 * @returns {Promise<Object>} - Le log mis à jour.
 */
async function updateLogResolved(logId, resolved) {
  return await Log.findByIdAndUpdate(
    logId,
    { resolved },
    { new: true }
  );
}
  
  module.exports = {
    addLog,
    getLogs,
    updateLogResolved
  };
  
