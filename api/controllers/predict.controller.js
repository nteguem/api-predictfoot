const PredictService = require('../services/predict.service');
const ResponseService = require('../services/response.service');

async function createPrediction(req, res) {
  const predictionData = req.body;
  try {
    const response = await PredictService.createPrediction(predictionData);
    if (response.success) {
      return ResponseService.created(res, { message: response.message, prediction: response.prediction });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  } catch (error) {
    console.log('Error creating prediction:', error);
    return ResponseService.internalServerError(res, { error: 'Error creating prediction' });
  }
}

async function updatePrediction(req, res) {
  const predictionId = req.query.id;
  const updatedData = req.body;
  try {
    const response = await PredictService.updatePrediction(predictionId, updatedData);
    if (response.success) {
      return ResponseService.success(res, { message: response.message, prediction: response.prediction });
    } else {
      if (response.error === 'Prediction not found') {
        return ResponseService.notFound(res, { message: response.error });
      } else {
        return ResponseService.internalServerError(res, { error: response.error });
      }
    }
  } catch (error) {
    console.log('Error updating prediction:', error);
    return ResponseService.internalServerError(res, { error: 'Error updating prediction' });
  }
}

async function deletePrediction(req, res) {
  const predictionId = req.query.id;
  try {
    const response = await PredictService.deletePrediction(predictionId);
    if (response.success) {
      return ResponseService.success(res, { message: response.message });
    } else {
      if (response.error === 'Prediction not found') {
        return ResponseService.notFound(res, { message: response.error });
      } else {
        return ResponseService.internalServerError(res, { error: response.error });
      }
    }
  } catch (error) {
    console.log('Error deleting prediction:', error);
    return ResponseService.internalServerError(res, { error: 'Error deleting prediction' });
  }
}



async function listPredictions(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const date = req.query.date || null;
    const isVisible = req.query.isVisible || null;
    const isVip = req.query.isVip || null;
    const response = await PredictService.listPredictions(page, limit, date,isVisible,isVip);
    if (response.success) {
      if (response.isFiltered) {
        return ResponseService.success(res, { predictions: response.predictions });
      }
      else {
        const { totalPages, totalDates, currentPage, groupedPredictions } = response;
        const paginationInfo = {
          totalPages,
          totalDates,
          currentPage
        };
        return ResponseService.success(res, { groupedPredictions, pagination: paginationInfo });
      }

    }
    else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  } catch (error) {
    console.log('Error listing predictions:', error);
    return ResponseService.internalServerError(res, { error: 'Error listing predictions' });
  }
}

async function listLastTenDaysPredictions(req, res) {
  try {
    const isVisible = req.query.isVisible || null;
    const isVip = req.query.isVip || false;
    const response = await PredictService.listLastTenDaysPredictions(isVisible, isVip);
    if (response.success) {
      return ResponseService.success(res, { rates: response.data });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  } catch (error) {
    console.log('Error listing last ten days predictions:', error);
    return ResponseService.internalServerError(res, { error: 'Error listing last ten days predictions' });
  }
}

async function oldTips(req, res) {
  try {
    const isVisible = req.query.isVisible || null;
    const isVip = req.query.isVip || false;
    const response = await PredictService.oldTips(isVisible, isVip);
    if (response.success) {
      return ResponseService.success(res, { oldTips: response.data });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  } catch (error) {
    console.log('Error listing old tips:', error);
    return ResponseService.internalServerError(res, { error: 'Error listing old tips' });
  }
}


module.exports = {
  createPrediction,
  updatePrediction,
  deletePrediction,
  listPredictions,
  listLastTenDaysPredictions,
  oldTips
};
