const Influencer = require('../models/influencer.model');
const logService = require('./log.service');
require('dotenv').config();
const crypto = require('crypto');

class InfluencerService {
  generateReferralCode(name) {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomStr = crypto.randomBytes(3).toString('hex');
    return `${base.substring(0, 6)}_${randomStr}`;
  }

  generatePlayStoreLink(referralCode, medium = 'influencer', campaign = 'app_install') {
    const appPackage = process.env.APP_PACKAGE;
    const referrerParams = `utm_source=${referralCode}&utm_medium=${medium}&utm_campaign=${campaign}`;
    const encodedParams = encodeURIComponent(referrerParams);
    return `https://play.google.com/store/apps/details?id=${appPackage}&referrer=${encodedParams}`;
  }

  async createInfluencer(influencerData) {
    try {
      const referralCode = this.generateReferralCode(influencerData.name);
      const referralLink = this.generatePlayStoreLink(referralCode, influencerData.platform);
      const newInfluencer = new Influencer({ ...influencerData, referralCode, referralLink });
      const savedInfluencer = await newInfluencer.save();
      return { success: true, data: savedInfluencer };
    } catch (error) {
      await logService.addLog(error.message, 'createInfluencer', 'error');
      return { success: false, message: 'An error occurred while creating influencer' };
    }
  }

  async getAllInfluencers() {
    try {
      const influencers = await Influencer.find();
      return { success: true, data: influencers };
    } catch (error) {
      await logService.addLog(error.message, 'getAllInfluencers', 'error');
      return { success: false, message: 'An error occurred while fetching influencers' };
    }
  }

  async getInfluencerById(id) {
    try {
      const influencer = await Influencer.findById(id);
      return { success: true, data: influencer };
    } catch (error) {
      await logService.addLog(error.message, 'getInfluencerById', 'error');
      return { success: false, message: 'An error occurred while fetching influencer' };
    }
  }

  async getInfluencerByReferralCode(code) {
    try {
      const influencer = await Influencer.findOne({ referralCode: code });
      return { success: true, data: influencer };
    } catch (error) {
      await logService.addLog(error.message, 'getInfluencerByReferralCode', 'error');
      return { success: false, message: 'An error occurred while fetching influencer by referral code' };
    }
  }

  async updateInfluencer(id, updateData) {
    try {
      const updatedInfluencer = await Influencer.findByIdAndUpdate(id, updateData, { new: true });
      return { success: true, data: updatedInfluencer };
    } catch (error) {
      await logService.addLog(error.message, 'updateInfluencer', 'error');
      return { success: false, message: 'An error occurred while updating influencer' };
    }
  }

  async recordClick(referralCode) {
    try {
      const influencer = await Influencer.findOne({ referralCode });
      if (!influencer) return { success: false, message: 'Influencer not found' };
      influencer.stats.clicks += 1;
      influencer.stats.lastClickDate = new Date();
      await influencer.save();
      return { success: true, message: 'Click recorded successfully' };
    } catch (error) {
      await logService.addLog(error.message, 'recordClick', 'error');
      return { success: false, message: 'An error occurred while recording click' };
    }
  }

  async recordInstall(referralCode) {
    try {
      const influencer = await Influencer.findOne({ referralCode });
      if (!influencer) return { success: false, message: 'Influencer not found' };
      influencer.stats.installs += 1;
      influencer.stats.lastInstallDate = new Date();
      await influencer.save();
      return { success: true, message: 'Install recorded successfully' };
    } catch (error) {
      await logService.addLog(error.message, 'recordInstall', 'error');
      return { success: false, message: 'An error occurred while recording install' };
    }
  }
}

module.exports = new InfluencerService();
