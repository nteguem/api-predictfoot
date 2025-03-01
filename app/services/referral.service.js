const Referral = require('../models/referral.model');
const InfluencerService = require('./influencer.service');
const logService = require('./log.service'); // Assurez-vous d'avoir un logService

class ReferralService {
  // Analyser les paramètres UTM
  parseUtmParams(referrerUrl) {
    if (!referrerUrl) return {};

    const params = {};
    const urlParams = referrerUrl.split('&');

    for (const param of urlParams) {
      if (param.startsWith('utm_source=')) {
        params.utm_source = decodeURIComponent(param.substring(11));
      } else if (param.startsWith('utm_medium=')) {
        params.utm_medium = decodeURIComponent(param.substring(11));
      } else if (param.startsWith('utm_campaign=')) {
        params.utm_campaign = decodeURIComponent(param.substring(13));
      } else if (param.startsWith('utm_content=')) {
        params.utm_content = decodeURIComponent(param.substring(12));
      } else if (param.startsWith('utm_term=')) {
        params.utm_term = decodeURIComponent(param.substring(9));
      }
    }

    return params;
  }

  // Enregistrer une installation
  async recordInstallation(referralData) {
    try {
      const utmParams = this.parseUtmParams(referralData.referrerUrl);
      const referralCode = utmParams.utm_source;

      if (!referralCode) {
        return { success: false, message: 'No referral code found', data: null };
      }

      // Trouver l'influenceur correspondant
      const influencer = await InfluencerService.getInfluencerByReferralCode(referralCode);
      if (!influencer) {
        return { success: false, message: 'Influencer not found', data: null };
      }

      // Mettre à jour les stats de l'influenceur
      await InfluencerService.recordInstall(referralCode);

      // Créer l'enregistrement de l'installation
      const newReferral = new Referral({
        influencerId: influencer._id,
        deviceId: referralData.deviceId,
        clickTimestamp: referralData.referrerClickTime,
        installTimestamp: referralData.appInstallTime,
        referrerUrl: referralData.referrerUrl,
        ...utmParams,
        deviceInfo: referralData.deviceInfo
      });

      await newReferral.save();

      return { 
        success: true, 
        message: 'Installation recorded successfully',
        data: { influencer: influencer.name, referralCode }
      };
    } catch (error) {
      logService.addLog('recordInstallation error', error);
      return { success: false, message: 'An error occurred', data: null };
    }
  }

  // Obtenir les statistiques pour un influenceur
  async getInfluencerStats(influencerId) {
    try {
      const referrals = await Referral.find({ influencerId });

      const totalInstalls = referrals.length;

      // Installations par jour
      const installsByDay = referrals.reduce((acc, referral) => {
        const date = new Date(referral.createdAt).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      // Installations par appareil
      const installsByDevice = referrals.reduce((acc, referral) => {
        if (referral.deviceInfo?.model) {
          acc[referral.deviceInfo.model] = (acc[referral.deviceInfo.model] || 0) + 1;
        }
        return acc;
      }, {});

      return { 
        success: true, 
        message: 'Influencer stats retrieved successfully',
        data: { totalInstalls, installsByDay, installsByDevice }
      };
    } catch (error) {
      logService.addLog('getInfluencerStats error', error);
      return { success: false, message: 'An error occurred', data: null };
    }
  }

  // Obtenir toutes les installations
  async getAllReferrals() {
    try {
      const referrals = await Referral.find().populate('influencerId');
      return { success: true, message: 'Referrals retrieved successfully', data: referrals };
    } catch (error) {
      logService.addLog('getAllReferrals error', error);
      return { success: false, message: 'An error occurred', data: null };
    }
  }
}

module.exports = new ReferralService();
