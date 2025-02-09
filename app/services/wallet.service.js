const Wallet = require('../models/wallet.model');
const logService = require('./log.service');

/**
 * Liste les wallets avec pagination.
 * @param {number} limit - Nombre maximum de wallets à récupérer.
 * @param {number} offset - Décalage pour la pagination.
 * @returns {Promise<Object>} - Résultat contenant la liste des wallets et le total.
 */
async function listWallets(limit = 10, offset = 0) {
  try {
    limit = Math.max(1, parseInt(limit, 10));
    offset = Math.max(0, parseInt(offset, 10));

    const totalCount = await Wallet.countDocuments();
    const wallets = await Wallet.find()
      .limit(limit)
      .skip(offset)
      .exec();

    return { success: true, total: totalCount, wallets };
  } catch (error) {
    await logService.addLog(`${error.message}`, 'listWallets', 'error');
    return {
      success: false,
      message: "An error occurred while fetching the wallet list.",
      error: error.message,
    };
  }
}

module.exports = {
  listWallets,
};
