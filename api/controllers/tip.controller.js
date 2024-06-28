const TipService = require('../services/tip.service');
const ResponseService = require('../services/response.service');

async function createTip(req, res) {
  const tipData = req.body;
  try {
    const response = await TipService.createTip(tipData);
    if (response.success) {
      return ResponseService.created(res, { message: response.message, tip: response.tip });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  } catch (error) {
    console.log('Error creating tip:', error);
    return ResponseService.internalServerError(res, { error: 'Error creating tip' });
  }
}

async function updateTip(req, res) {
  const tipId = req.query.id;
  const updatedData = req.body;
  try {
    const response = await TipService.updateTip(tipId, updatedData);
    if (response.success) {
      return ResponseService.success(res, { message: response.message, tip: response.tip });
    } else {
      if (response.error === 'Tip not found') {
        return ResponseService.notFound(res, { message: response.error });
      } else {
        return ResponseService.internalServerError(res, { error: response.error });
      }
    }
  } catch (error) {
    console.log('Error updating tip:', error);
    return ResponseService.internalServerError(res, { error: 'Error updating tip' });
  }
}

async function deleteTip(req, res) {
  const tipId = req.query.id;
  try {
    const response = await TipService.deleteTip(tipId);
    if (response.success) {
      return ResponseService.success(res, { message: response.message });
    } else {
      if (response.error === 'Tip not found') {
        return ResponseService.notFound(res, { message: response.error });
      } else {
        return ResponseService.internalServerError(res, { error: response.error });
      }
    }
  } catch (error) {
    console.log('Error deleting tip:', error);
    return ResponseService.internalServerError(res, { error: 'Error deleting tip' });
  }
}

async function listTips(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const isVip = req.query.isVip || null;
    const date = req.query.date || null;
    const response = await TipService.listTips(page, limit, isVip, date);
    if (response.success) {
      return ResponseService.success(res, { tips: response.tips, pagination: response.pagination });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  } catch (error) {
    console.log('Error listing tips:', error);
    return ResponseService.internalServerError(res, { error: 'Error listing tips' });
  }
}

module.exports = {
  createTip,
  updateTip,
  deleteTip,
  listTips
};
