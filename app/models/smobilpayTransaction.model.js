// models/smobilpayTransaction.model.js

const mongoose = require('mongoose');
const Wallet = require('./wallet.model');
const Plan = require('./plan.model');
const User = require('./user.model');
const { addLog } = require('../services/log.service');

const smobilpayTransactionSchema = new mongoose.Schema({
    // Identifiants de transaction
    ptn: { type: Object, required: true, unique: true }, // Payment Transaction Number de Smobilpay
    quoteId: { type: String, required: true },
    payItemId: { type: String, required: true },
    
    // Statut de la transaction
    status: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELED'],
        default: 'PENDING',
        required: true
    },
    
    // Informations de paiement
    paymentMethod: {
        type: String,
        enum: ['CM_MTNMOBILEMONEY', 'CM_ORANGEMONEY', 'CM_EUMM'],
        required: true
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'XAF', required: true },
    phoneNumber: { type: String, required: true },
    
    // Métadonnées de la transaction
    customerName: { type: String, required: true },
    customerEmail: { type: String },
    customerAddress: { type: String },
    description: { type: String, default: null },
    
    // Information géographique
    countryCode: { 
        type: String, 
        enum: ['CM', 'CG', 'RCA', 'TCD', 'GAB'], 
        default: 'CM', 
        required: true 
    },
    
    // Relations avec les autres entités
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Middleware pour vérifier et mettre à jour le statut de la transaction
smobilpayTransactionSchema.methods.updateStatus = async function(newStatus) {
    try {
        this.status = newStatus;
        this.updatedAt = Date.now();
        await this.save();

        // Si la transaction est réussie, mettre à jour le portefeuille et créer l'abonnement
        if (newStatus === 'SUCCESS') {
            await this.processSuccessfulPayment();
        }
        
        return this;
    } catch (error) {
        await addLog(
            `Erreur lors de la mise à jour du statut de la transaction Smobilpay: ${error.message}`,
            'updateStatus smobilpayTransaction',
            'error'
        );
        throw error;
    }
};

// Méthode pour traiter un paiement réussi
smobilpayTransactionSchema.methods.processSuccessfulPayment = async function() {
    try {
        const { paymentMethod, amount, user, plan } = this;
        
        // 🔹 Mise à jour du portefeuille
        let wallet = await Wallet.findOne({ operator: paymentMethod });
        if (!wallet) {
            wallet = new Wallet({ operator: paymentMethod, totalRevenue: 0 });
        }
        wallet.totalRevenue += amount;
        wallet.lastUpdated = Date.now();
        await wallet.save();
        
        // 🔹 Récupération du plan pour avoir sa durée
        const planDoc = await Plan.findById(plan);
        if (!planDoc) {
            throw new Error('Plan not found');
        }
        
        // 🔹 Création de la période de l'abonnement
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + planDoc.duration);
        
        // 🔹 Création de l'abonnement
        const SubscriptionModel = mongoose.model('Subscription');
        const subscription = new SubscriptionModel({
            user: user,
            plan: plan,
            transaction: this._id,
            startDate,
            endDate
        });
        await subscription.save();
        
        await addLog(
            `Abonnement créé avec succès pour l'utilisateur ${user} sur le plan ${plan}`,
            'processSuccessfulPayment smobilpayTransaction',
            'info'
        );
    } catch (error) {
        await addLog(
            `Erreur lors du traitement du paiement réussi: ${error.message}`,
            'processSuccessfulPayment smobilpayTransaction',
            'error'
        );
        throw error;
    }
};

const SmobilpayTransaction = mongoose.model('SmobilpayTransaction', smobilpayTransactionSchema);
module.exports = SmobilpayTransaction;