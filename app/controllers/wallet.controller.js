const walletService = require('../services/wallet.service');
const ResponseService = require('../services/response.service');

const listWallets = async (req, res) => {
  const { limit, offset } = req.query;
  const response = await walletService.listWallets(limit, offset);
  
  if (response.success) {
    return ResponseService.success(res, { wallets: response.wallets, total: response.total });
  } else {
    return ResponseService.internalServerError(res, { error: response.message });
  }
};


module.exports = {
  listWallets,
};
