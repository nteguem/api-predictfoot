// models/smobilpay-transaction.model.js
const mongoose = require('mongoose');

const smobilpayTransactionSchema = new mongoose.Schema({
    paymentId: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
        required: true
    },
    ptn: {
        type: String
    },
    quoteId: {
        type: String
    },
    payItemId: {
        type: String,
        required: true
    },
    operatorId: {
        type: String,
        required: true
    },
    operatorName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'XAF'
    },
    status: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELED', 'EXPIRED'],
        default: 'PENDING'
    },
    phoneNumber: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    receiptNumber: {
        type: String
    },
    veriCode: {
        type: String
    },
    timestamp: {
        type: Date
    },
    clearingDate: {
        type: Date
    },
    priceLocalCur: {
        type: String
    },
    pin: {
        type: String
    },
    tag: {
        type: String
    },
    errorCode: {
        type: String
    },
    processed: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const SmobilpayTransaction = mongoose.model('SmobilpayTransaction', smobilpayTransactionSchema);

module.exports = SmobilpayTransaction;