const mongoose = require('mongoose');
const Wallet = require('./wallet.model');
const Plan = require('./plan.model');
const User = require('./user.model');
const {addLog} = require('../services/log.service')

const transactionSchema = new mongoose.Schema({
    paymentId: { type: String, required: true },
    operatorTransactionId: { type: String, default: null },
    status: {
        type: String,
        enum: ['REQUEST_ACCEPTED', 'REQUEST_FAILED', 'COMPLETED', 'CANCELED'],
        default: 'REQUEST_ACCEPTED',
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['CM_ORANGEMONEY', 'CM_MTNMOBILEMONEY', 'CM_EUMM'],
        required: true
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'XAF', required: true },
    phoneNumber: { type: String, required: true },
    description: { type: String, default: null },
    notifyUrl: { type: String, default: null },
    type: { type: String, enum: ['MONETBIL'], default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    createdAt: { type: Date, default: Date.now }
});

// Middleware Post-Save pour la mise à jour du portefeuille et création de l'abonnement
transactionSchema.post('findOneAndUpdate', async function(doc, next) {
    try {
        if (!doc) return next();

        if (doc.status === 'COMPLETED') {
            const { paymentMethod, amount, user, plan } = doc;

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
                transaction: doc._id,
                startDate,
                endDate
            });
            await subscription.save();
        } else {
            // Pour tous les autres cas, mise à jour simple du statut
            await Transaction.findByIdAndUpdate(
                doc._id,
                { status: doc.status },
                { new: true }
            );
        }

        next();
    } catch (error) {
            await addLog(
              `${error.message}`,
              'findOneAndUpdate transaction',
              'error'
            );
        next(error);
    }
});

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;