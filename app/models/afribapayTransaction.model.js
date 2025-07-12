const mongoose = require('mongoose');

const afribaPayTransactionSchema = new mongoose.Schema({
    // Identifiants transaction
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    orderId: {
        type: String,
        required: true,
        unique: true // order_id généré côté client
    },
    
    // Relations
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
    
    // Données paiement de base
    operator: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true, // CI, SN, BF, CM, etc.
    },
    phoneNumber: {
        type: String,
        required: true
    },
    otpCode: {
        type: String // Code OTP pour certains opérateurs
    },
    
    // Montants et devise
    amount: {
        type: Number,
        required: true // Montant initial
    },
    taxes: {
        type: Number,
        default: 0
    },
    fees: {
        type: Number,
        default: 0
    },
    feesTaxesTtc: {
        type: Number,
        default: 0
    },
    amountTotal: {
        type: Number // Montant final avec taxes et frais
    },
    currency: {
        type: String,
        required: true,
        enum: ['XOF', 'XAF', 'GNF', 'CDF', 'USD','GMD']
    },
    
    // Statut et état
    status: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELED'],
        default: 'PENDING'
    },
    
    // URLs et configuration
    merchantKey: {
        type: String,
        required: true
    },
    referenceId: {
        type: String // Référence interne
    },
    notifyUrl: {
        type: String
    },
    returnUrl: {
        type: String
    },
    cancelUrl: {
        type: String
    },
    lang: {
        type: String,
        default: 'fr',
        enum: ['fr', 'en']
    },
    
    // Réponse AfribaPay API
    providerId: {
        type: String // provider_id retourné par AfribaPay
    },
    providerLink: {
        type: String // provider_link pour Wave
    },
    apiRequestId: {
        type: String // request_id de AfribaPay
    },
    apiRequestTime: {
        type: Number // request_time timestamp
    },
    apiRequestIp: {
        type: String // request_ip
    },
    
    // Données opérateur final
    operatorId: {
        type: String // operator_id de l'opérateur final
    },
    operatorName: {
        type: String // Nom de l'opérateur
    },
    
    // Dates
    dateCreated: {
        type: Date // date_created depuis AfribaPay
    },
    statusDate: {
        type: Date // status_date quand le statut change
    },
    paymentDate: {
        type: Date // Date de paiement effectif
    },
    
    // Données webhook AfribaPay
    webhookReceived: {
        type: Boolean,
        default: false
    },
    webhookData: {
        type: mongoose.Schema.Types.Mixed // Données brutes du webhook
    },
    webhookSignature: {
        type: String // Signature HMAC reçue
    },
    webhookVerified: {
        type: Boolean,
        default: false // Si la signature HMAC est valide
    },
    
    // Gestion erreurs
    errorCode: {
        type: String
    },
    errorMessage: {
        type: String
    },
    apiError: {
        type: mongoose.Schema.Types.Mixed // Erreur complète de l'API
    },
    
    // Traitement
    processed: {
        type: Boolean,
        default: false // Pour éviter double traitement
    },
    subscriptionCreated: {
        type: Boolean,
        default: false // Flag spécifique création subscription
    },
    notificationSent: {
        type: Boolean,
        default: false // Flag notification utilisateur
    },
    
    // Métadonnées
    userAgent: {
        type: String
    },
    clientIp: {
        type: String
    },
    
    // Timestamps automatiques
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'afribapay_transactions'
});

// Index pour performances
afribaPayTransactionSchema.index({ transactionId: 1 });
afribaPayTransactionSchema.index({ orderId: 1 });
afribaPayTransactionSchema.index({ user: 1 });
afribaPayTransactionSchema.index({ status: 1 });
afribaPayTransactionSchema.index({ providerId: 1 });
afribaPayTransactionSchema.index({ operator: 1, country: 1 });
afribaPayTransactionSchema.index({ processed: 1 });
afribaPayTransactionSchema.index({ createdAt: -1 });

// Middleware pour mise à jour automatique du updatedAt
afribaPayTransactionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Méthode pour vérifier si la transaction est finalisée
afribaPayTransactionSchema.methods.isFinal = function() {
    return ['SUCCESS', 'FAILED', 'CANCELED'].includes(this.status);
};

// Méthode pour vérifier si la transaction est réussie
afribaPayTransactionSchema.methods.isSuccessful = function() {
    return this.status === 'SUCCESS';
};

// Méthode pour générer un résumé de la transaction
afribaPayTransactionSchema.methods.getSummary = function() {
    return {
        transactionId: this.transactionId,
        orderId: this.orderId,
        operator: this.operator,
        country: this.country,
        amount: this.amount,
        amountTotal: this.amountTotal,
        currency: this.currency,
        status: this.status,
        phoneNumber: this.phoneNumber,
        dateCreated: this.dateCreated,
        processed: this.processed
    };
};

const AfribaPayTransaction = mongoose.model('AfribaPayTransaction', afribaPayTransactionSchema);

module.exports = AfribaPayTransaction;