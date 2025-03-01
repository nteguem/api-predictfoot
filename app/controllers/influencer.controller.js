const InfluencerService = require('../services/influencer.service');
const ReferralService = require('../services/referral.service');
const ResponseService = require('../services/response.service');

class InfluencerController {
  async createInfluencer(req, res) {
    try {
      const influencer = await InfluencerService.createInfluencer(req.body);
      ResponseService.success(res, influencer, 'Influencer created successfully', 201);
    } catch (error) {
      ResponseService.error(res, error);
    }
  }

  async getAllInfluencers(req, res) {
    try {
      const influencers = await InfluencerService.getAllInfluencers();
      ResponseService.success(res, influencers, 'Influencers retrieved successfully');
    } catch (error) {
      ResponseService.error(res, error);
    }
  }

  async getInfluencerById(req, res) {
    try {
      const influencer = await InfluencerService.getInfluencerById(req.params.id);
      if (!influencer) {
        return ResponseService.notFound(res, 'Influencer not found');
      }
      ResponseService.success(res, influencer, 'Influencer retrieved successfully');
    } catch (error) {
      ResponseService.error(res, error);
    }
  }

  async updateInfluencer(req, res) {
    try {
      const influencer = await InfluencerService.updateInfluencer(req.params.id, req.body);
      if (!influencer) {
        return ResponseService.notFound(res, 'Influencer not found');
      }
      ResponseService.success(res, influencer, 'Influencer updated successfully');
    } catch (error) {
      ResponseService.error(res, error);
    }
  }

  async getInfluencerStats(req, res) {
    try {
      const stats = await ReferralService.getInfluencerStats(req.params.id);
      ResponseService.success(res, stats, 'Influencer stats retrieved successfully');
    } catch (error) {
      ResponseService.error(res, error);
    }
  }

  async regenerateLink(req, res) {
    try {
      const influencer = await InfluencerService.getInfluencerById(req.params.id);
      if (!influencer) {
        return ResponseService.notFound(res, 'Influencer not found');
      }
      
      const medium = req.body.medium || 'influencer';
      const campaign = req.body.campaign || 'app_install';
      const newLink = InfluencerService.generatePlayStoreLink(
        influencer.referralCode, medium, campaign
      );
      
      influencer.referralLink = newLink;
      await influencer.save();
      ResponseService.success(res, { link: newLink }, 'Referral link regenerated successfully');
    } catch (error) {
      ResponseService.error(res, error);
    }
  }
}

module.exports = new InfluencerController();
