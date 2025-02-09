const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    operator: {
        type: String,
        enum: ['CM_ORANGEMONEY', 'CM_MTNMOBILEMONEY'],
        required: true
    },
    totalRevenue: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;
