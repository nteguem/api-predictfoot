const mongoose = require('mongoose');
const Wallet = require('./wallet.model');
const Subscription = require('./subscription.model'); 
const Plan = require('./plan.model');
const User = require('./user.model');

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
    user: { type: mongoose.Schema.Types.ObjectId, ref: User, required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: Plan, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Middleware Post-Save pour la mise à jour du portefeuille et création de l'abonnement
transactionSchema.post('findOneAndUpdate', async function (doc, next) {
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

         

            // 🔹 Création de la période de l'abonnement
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + planData.duration); // Ajout des jours du plan

            // 🔹 Création de l'abonnement
            const subscription = new Subscription({
                user:user._id,
                plan:plan._id,
                transaction: doc._id,
                startDate,
                endDate
            });

            await subscription.save();
            console.log(`✅ Abonnement créé pour l'utilisateur ${user} avec le plan ${plan} (durée : ${planData.duration} jours)`);
        }

        next();
    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour après transaction:', error);
        next(error);
    }
});

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
