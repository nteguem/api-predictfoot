const mongoose = require('mongoose');
const Group = require("./group.model");

const Types = ['Instantly', 'Automatically'];
const Periodicities = ['Daily', 'Weekly', 'Monthly'];

const campaignSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'Name is required'] },
    description: {
        hasMedia: { type: Boolean, required: [true, 'hasMedia is required'] },
        content: { type: String, required: [true, 'Content is required'] }
    }, 
    type: { type: String, required: [true, 'Type is required'], enum: Types, default: 'Instantly' },
    periodicity: { type: String, required: [true, 'periodicity is required'], enum: Periodicities, default: 'Daily' },
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: Group, required: [true, 'group is required'] }],
}); 

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;