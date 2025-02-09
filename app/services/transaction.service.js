const Transaction = require('../models/transaction.model');
const logService = require('./log.service');

async function createTransaction(transactionData) {
  try {
    const newTransaction = new Transaction(transactionData);
    const transaction = await newTransaction.save();
    return { success: true, transaction, message: "Transaction created successfully." };
  } catch (error) {
    await logService.addLog(`${error.message}`, 'createTransaction', 'error');
    return { 
      success: false,
      message: "An error occurred while creating the transaction.",
      error: error.message,
    };
  }
}

async function updateTransaction(paymentId, updatedData) {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { paymentId },
      { $set: updatedData },
      { new: true }
    );

    if (transaction) {
      return { success: true, transaction, message: "Transaction updated successfully." };
    } else {
      return { success: false, message: "Transaction not found." };
    }
  } catch (error) {
    await logService.addLog(`${error.message}`, 'updateTransaction', 'error');
    return {
      success: false,
      message: "An error occurred while updating the transaction.",
      error: error.message,
    };
  }
}


async function deleteTransaction(transactionId) {
  try {
    const deletedTransaction = await Transaction.findByIdAndDelete(transactionId);
    if (deletedTransaction) {
      return { success: true, message: "Transaction deleted successfully.", transaction: deletedTransaction };
    } else {
      return { success: false, message: "Transaction not found." };
    }
  } catch (error) {
    await logService.addLog(`${error.message}`, 'deleteTransaction', 'error');
    return {
      success: false,
      message: "An error occurred while deleting the transaction.",
      error: error.message,
    };
  }
}

async function listTransactions(limit = 10, offset = 0) {
  try {
    limit = Math.max(1, parseInt(limit, 10));
    offset = Math.max(0, parseInt(offset, 10));

    const totalCount = await Transaction.countDocuments();
    const transactions = await Transaction.find()
      .limit(limit)
      .skip(offset)
      .exec();

    return { success: true, total: totalCount, transactions };
  } catch (error) {
    await logService.addLog(`${error.message}`, 'listTransactions', 'error');
    return {
      success: false,
      message: "An error occurred while fetching the transaction list.",
      error: error.message,
    };
  }
}

async function getTransactionById(paymentId) {
  try {
    // Trouver la transaction basée sur le champ paymentId
    const transaction = await Transaction.findOne({ paymentId });
    
    // Vérifier si la transaction existe
    if (transaction) {
      return { success: true, transaction };
    } else {
      return { success: false, message: "Transaction not found." };
    }
  } catch (error) {
    await logService.addLog(`${error.message}`, 'getTransactionById', 'error');
    return {
      success: false,
      message: "An error occurred while retrieving the transaction.",
      error: error.message,
    };
  }
}


module.exports = {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  listTransactions,
  getTransactionById,
};
