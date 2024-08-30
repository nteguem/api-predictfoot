const ServiceCampaign = require('../services/campaign.service');
const ResponseService = require('../services/response.service');

async function createCampaign(req, res, client) {
  const campaignData = req.body;
  const response = await ServiceCampaign.createCampaign(campaignData, client);
  if (response.success) {
    return ResponseService.created(res, { message: response.message });
  } else {
    return ResponseService.internalServerError(res, { error: response.error });
  }
}

async function updateCampaign(req, res, client) {
  const campaignId = req.query.id;
  const updatedData = req.body;
  const response = await ServiceCampaign.updateCampaign(campaignId, updatedData, client);
  if (response.success) {
    return ResponseService.success(res, { message: response.message, campaign: response.campaign });
  } else {
    if (response.error === 'Campagne non trouvée') {
      return ResponseService.notFound(res, { message: response.error });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  }
}

async function deleteCampaign(req, res, client) {
  const campaignId = req.query.id;
  const response = await ServiceCampaign.deleteCampaign(campaignId,client);
  if (response.success) {
    return ResponseService.success(res, { message: response.message });
  } else {
    if (response.error === 'Campagne non trouvée') {
      return ResponseService.notFound(res, { message: response.error });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  }
}

async function listCampaigns(req, res, client) {
  try {
    // Extract pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Include pagination parameters in the data object
    const response = await ServiceCampaign.listCampaigns({ ...req.query, page, limit }, client);

    if (response.success) {
      const { campaigns, pagination } = response;
      return ResponseService.success(res, { campaigns, pagination });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  } catch (error) {
    logger(client).error('Error listing campaigns:', error);
    return ResponseService.internalServerError(res, { error: 'Error listing campaigns' });
  }
}


module.exports = {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  listCampaigns,
};
