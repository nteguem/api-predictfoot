const Tip = require('../models/tip.model');
const moment = require('moment');

async function createTip(tipData) {
  try {
    const newTip = new Tip(tipData);
    await newTip.save();
    return { success: true, message: 'Tip created successfully', tip: newTip };
  } catch (error) {
    console.log('Error creating tip:', error);
    return { success: false, error: error.message };
  }
}

async function updateTip(tipId, updatedData) {
  try {
    const tip = await Tip.findByIdAndUpdate(tipId, updatedData, { new: true });
    if (!tip) {
      return { success: false, error: 'Tip not found' };
    }
    return { success: true, message: 'Tip updated successfully', tip };
  } catch (error) {
    console.log('Error updating tip:', error);
    return { success: false, error: error.message };
  }
}

async function deleteTip(tipId) {
  try {
    const tip = await Tip.findByIdAndDelete(tipId);
    if (!tip) {
      return { success: false, error: 'Tip not found' };
    }
    return { success: true, message: 'Tip deleted successfully' };
  } catch (error) {
    console.log('Error deleting tip:', error);
    return { success: false, error: error.message };
  }
}

async function listTips(page = 1, limit = 5, isVip = null, date = null) {
  try {
    const query = {};
    if (isVip !== null) {
      query.isVip = isVip;
    }

    if (date) {
      const startOfDay = moment(date).startOf('day').toISOString();
      const endOfDay = moment(date).endOf('day').toISOString();
      query.createdAt = { $gte: startOfDay, $lt: endOfDay };
    }

    const tips = await Tip.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    const totalTips = await Tip.countDocuments(query);
    const totalPages = Math.ceil(totalTips / limit);

    return {
      success: true,
      tips,
      pagination: {
        totalPages,
        currentPage: page,
        totalTips
      }
    };
  } catch (error) {
    console.log('Error listing tips:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  createTip,
  updateTip,
  deleteTip,
  listTips
};
