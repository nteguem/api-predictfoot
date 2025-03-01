const ReferralService = require('../services/referral.service');

class ReferralController {
  // Enregistrer une installation
  async recordInstallation(req, res) {
    try {
      const result = await ReferralService.recordInstallation(req.body);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // Obtenir toutes les installations
  async getAllReferrals(req, res) {
    try {
      const referrals = await ReferralService.getAllReferrals();
      res.status(200).json(referrals);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ReferralController();