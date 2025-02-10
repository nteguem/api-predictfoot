const transactionService = require('../services/transaction.service');
const ResponseService = require('../services/response.service');


const listTransactions = async (req, res) => {
  const { limit, offset } = req.query;
  const response = await transactionService.listTransactions(limit, offset);
  if (response.success) {
    return ResponseService.success(res, { transactions: response.transactions, total: response.total });
  } else {
    return ResponseService.internalServerError(res, { error: response.message });
  }
};

const getTransactionById = async (req, res) => {
  const transactionId = req.params.transactionId;
  const response = await transactionService.getTransactionById(transactionId);
  if (response.success) {
    return ResponseService.success(res, { transaction: response.transaction });
  } else {
    return ResponseService.notFound(res, { message: response.message });
  }
};

module.exports = {
  listTransactions,
  getTransactionById,
};
