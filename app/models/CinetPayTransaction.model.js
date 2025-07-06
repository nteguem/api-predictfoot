const mongoose = require('mongoose');

const cinetpayTransactionSchema = new mongoose.Schema({
    transactionId: {
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
    paymentToken: {
        type: String
    },
    paymentUrl: {
        type: String
    },
    operatorId: {
        type: String // ID de l'opérateur (optionnel pour CinetPay)
    },
    operatorName: {
        type: String // Nom de l'opérateur (ex: Orange Money, MTN, etc.)
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'XOF' // Devise unique pour CinetPay
    },
    status: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'REFUSED', 'WAITING_FOR_CUSTOMER', 'CANCELED'],
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
    customerSurname: {
        type: String
    },
    customerAddress: {
        type: String
    },
    customerCity: {
        type: String
    },
    customerCountry: {
        type: String
    },
    paymentMethod: {
        type: String // OMCM, MOMO, CARD, etc.
    },
    operatorTransactionId: {
        type: String // operator_id retourné par CinetPay
    },
    paymentDate: {
        type: Date
    },
    fundAvailabilityDate: {
        type: Date
    },
    description: {
        type: String
    },
    metadata: {
        type: String
    },
    channels: {
        type: String,
        default: 'ALL' // ALL, MOBILE_MONEY, CARD, etc.
    },
    notifyUrl: {
        type: String
    },
    returnUrl: {
        type: String
    },
    lang: {
        type: String,
        default: 'FR'
    },
    invoiceData: {
        type: mongoose.Schema.Types.Mixed // Données de facture flexibles
    },
    apiResponseId: {
        type: String // ID de réponse de l'API CinetPay
    },
    
    // Champs spécifiques webhook CinetPay
    cpmTransDate: {
        type: Date // cpm_trans_date du webhook
    },
    cpmErrorMessage: {
        type: String // SUCCES, PAYMENT_FAILED, TRANSACTION_CANCEL
    },
    cpmPhonePrefix: {
        type: String // 237, 225, etc.
    },
    cpmLanguage: {
        type: String // fr, en
    },
    cpmVersion: {
        type: String // V3
    },
    cpmPaymentConfig: {
        type: String // SINGLE
    },
    cpmPageAction: {
        type: String // PAYMENT
    },
    cpmCustom: {
        type: String // Données custom
    },
    cpmDesignation: {
        type: String // Description du paiement
    },
    webhookSignature: {
        type: String // Signature du webhook pour vérification
    },
    errorCode: {
        type: String
    },
    errorMessage: {
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
}, { 
    timestamps: true 
});

// Index pour améliorer les performances des requêtes
cinetpayTransactionSchema.index({ transactionId: 1 });
cinetpayTransactionSchema.index({ user: 1 });
cinetpayTransactionSchema.index({ status: 1 });
cinetpayTransactionSchema.index({ paymentToken: 1 });

const CinetpayTransaction = mongoose.model('CinetpayTransaction', cinetpayTransactionSchema);

module.exports = CinetpayTransaction;