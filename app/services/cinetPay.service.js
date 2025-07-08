const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const CinetpayTransaction = require('../models/CinetPayTransaction.model');
const Plan = require('../models/plan.model');
const User = require('../models/user.model');
const { sendDeviceNotification } = require('./notification.service');
const moment = require('moment');
const Subscription = require('../models/subscription.model');
const Wallet = require('../models/wallet.model');
const { addLog } = require('./log.service');

// Configuration
const API_URL = process.env.CINETPAY_API_URL;
const API_KEY = process.env.CINETPAY_API_KEY;
const SITE_ID = process.env.CINETPAY_SITE_ID;
const SECRET_KEY = process.env.CINETPAY_SECRET_KEY; // Pour la vérification HMAC

// Classe d'erreur personnalisée pour CinetPay
class CinetpayError extends Error {
    constructor(message, statusCode, responseData) {
        super(message);
        this.name = 'CinetpayError';
        this.statusCode = statusCode;
        this.responseData = responseData;
    }
}

// Fonction pour générer l'URL de notification et de retour
function generateUrls() {
    const baseUrl = process.env.APP_BASE_URL;
    return {
        notify_url: `${baseUrl}/payments/cinetpay/webhook`,
        return_url: `${baseUrl}/payment/success`
    };
}

// Fonction pour vérifier le token HMAC du webhook
function verifyHmacToken(receivedToken, data) {
    try {
        // Construction de la chaîne selon la documentation CinetPay
        // Format des données reçues en form-urlencoded
        const concatenatedString = 
            data.cpm_site_id +
            data.cpm_trans_id +
            data.cpm_trans_date +
            data.cpm_amount +
            data.cpm_currency +
            data.signature +
            data.payment_method +
            data.cel_phone_num +
            data.cpm_phone_prefixe +
            data.cel_phone_num +
            data.cpm_language +
            data.cpm_version +
            data.cpm_payment_config +
            data.cpm_page_action +
            data.cpm_custom +
            data.cpm_designation +
            ''; // buyer_name peut être vide

        // Calcul du HMAC avec la clé secrète
        const calculatedToken = crypto
            .createHmac('sha256', SECRET_KEY)
            .update(concatenatedString)
            .digest('hex');

        return calculatedToken === receivedToken;
    } catch (error) {
        console.error('Error verifying HMAC token:', error);
        return false;
    }
}

// Initialiser un paiement CinetPay
async function initiatePayment(transactionData) {
    const { userId, planId, phoneNumber } = transactionData;
    
    try {
        // 1. Récupérer l'utilisateur et le plan
        const user = await User.findById(userId);
        const plan = await Plan.findById(planId);
        
        if (!user) {
            throw new Error('User not found');
        }
        if (!plan) {
            throw new Error('Plan not found');
        }
        
        // 2. Générer un ID de transaction unique
        const transactionId = `TXN_${Date.now()}_${uuidv4().substring(0, 8)}`;
        
        // 3. Générer les URLs
        const { notify_url, return_url } = generateUrls();
        
        // 4. Créer la transaction en base
        const cinetpayTransaction = new CinetpayTransaction({
            transactionId,
            user: userId,
            plan: planId,
            amount: plan.price,
            currency: 'XAF',
            phoneNumber,
            customerName: user.pseudo,
            description: `Bigwin ${plan.name}`,
            metadata: `user_${userId}`,
            channels: 'ALL',
            notifyUrl: notify_url,
            returnUrl: return_url,
            lang: 'FR'
        });
        
        await cinetpayTransaction.save();
        
        // 5. Préparer les données pour l'API CinetPay
        const paymentData = {
            apikey: API_KEY,
            site_id: parseInt(SITE_ID),
            transaction_id: transactionId,
            amount: plan.price,
            description: `Bigwin ${plan.name}`,
            customer_id: userId,
            customer_name: user.pseudo,
            currency: 'XAF',
            notify_url,
            return_url,
            channels: 'ALL',
            lang: 'FR'
        };
        
        // 6. Appeler l'API CinetPay pour initialiser le paiement
        const response = await axios.post(`${API_URL}`, paymentData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('CinetPay payment initialization response:', response.data);
        
        // 7. Vérifier la réponse
        if (response.data.code !== '201') {
            throw new CinetpayError(
                response.data.message || 'Payment initialization failed',
                response.status,
                response.data
            );
        }
        
        // 8. Mettre à jour la transaction avec les données CinetPay
        cinetpayTransaction.paymentToken = response.data.data.payment_token;
        cinetpayTransaction.paymentUrl = response.data.data.payment_url;
        cinetpayTransaction.apiResponseId = response.data.api_response_id;
        await cinetpayTransaction.save();
        
        await addLog(
            `CinetPay payment initialized for user ${userId}, transaction ${transactionId}`,
            'CinetpayService.initiatePayment',
            'info'
        );
        
        // 9. Récupérer la transaction mise à jour avec les relations
        const updatedTransaction = await CinetpayTransaction.findById(cinetpayTransaction._id)
            .populate('plan')
            .populate('user');
        
        return {
            transaction: updatedTransaction,
            paymentUrl: response.data.data.payment_url
        };
        
    } catch (error) {
        if (error instanceof CinetpayError) {
            await addLog(`CinetPay API error during payment initiation: ${error.message}`, 'CinetpayService.initiatePayment', 'error');
            throw error;
        }
        
        if (error.response) {
            console.error('CinetPay API error:', error.response.data);
            throw new CinetpayError(
                error.response.data.message || error.response.data.description || error.message,
                error.response.status,
                error.response.data
            );
        }
        
        await addLog(`Payment initiation failed: ${error.message}`, 'CinetpayService.initiatePayment', 'error');
        throw error;
    }
}

// Vérifier le statut d'une transaction
async function checkTransactionStatus(transactionId) {
    try {
        // 1. Trouver la transaction en base
        const cinetpayTransaction = await CinetpayTransaction.findOne({ transactionId });
        if (!cinetpayTransaction) {
            throw new CinetpayError(
                `Transaction not found for transactionId: ${transactionId}`,
                404,
                {
                    message: `Transaction not found for transactionId: ${transactionId}`,
                    description: `La transaction demandée n'existe pas`,
                    code: '404'
                }
            );
        }
        
        // 2. Appeler l'API CinetPay pour vérifier le statut
        const checkData = {
            apikey: API_KEY,
            site_id: parseInt(SITE_ID),
            transaction_id: transactionId
        };
        
        const response = await axios.post(`${API_URL}/check`, checkData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
                
        // 3. Traiter la réponse selon le code
        if (response.data.code === '00') {
            // Transaction trouvée et réussie
            const paymentData = response.data.data;
            
            // Mettre à jour la transaction
            cinetpayTransaction.status = paymentData.status;
            cinetpayTransaction.paymentMethod = paymentData.payment_method;
            cinetpayTransaction.operatorTransactionId = paymentData.operator_id;
            cinetpayTransaction.paymentDate = paymentData.payment_date ? new Date(paymentData.payment_date) : null;
            cinetpayTransaction.fundAvailabilityDate = paymentData.fund_availability_date ? new Date(paymentData.fund_availability_date) : null;
            cinetpayTransaction.apiResponseId = response.data.api_response_id;
            
            await cinetpayTransaction.save();
            
            // Si la transaction est acceptée et pas encore traitée
            if (paymentData.status === 'ACCEPTED' && !cinetpayTransaction.processed) {
                console.log(`Creating subscription for transaction ${cinetpayTransaction._id}`);
                
                try {
                    // Créer la souscription
                    await createSubscription(cinetpayTransaction);
                    
                    // Envoyer une notification de succès
                    await sendPaymentNotification(cinetpayTransaction, 'success');
                    
                    // Marquer comme traitée
                    cinetpayTransaction.processed = true;
                    await cinetpayTransaction.save();
                    
                    console.log(`Transaction ${cinetpayTransaction._id} marked as processed`);
                } catch (subscriptionError) {
                    console.error(`Error creating subscription: ${subscriptionError.message}`);
                    await addLog(`Error creating subscription: ${subscriptionError.message}`, 'CinetpayService.checkTransactionStatus', 'error');
                }
            }
        } else if (response.data.code === '662') {
            // En attente de confirmation client (WAITING_CUSTOMER_PAYMENT)
            const paymentData = response.data.error?.data || response.data.data;
            
            cinetpayTransaction.status = 'WAITING_FOR_CUSTOMER';
            cinetpayTransaction.cpmErrorMessage = 'WAITING_CUSTOMER_PAYMENT';
            cinetpayTransaction.errorCode = response.data.code;
            cinetpayTransaction.errorMessage = response.data.message;
            cinetpayTransaction.apiResponseId = response.data.api_response_id;
            
            if (paymentData) {
                cinetpayTransaction.paymentMethod = paymentData.payment_method;
                cinetpayTransaction.fundAvailabilityDate = paymentData.fund_availability_date ? new Date(paymentData.fund_availability_date) : null;
            }
            
            await cinetpayTransaction.save();
            
        } else if (response.data.code === '600') {
            // Paiement échoué - fonds insuffisants ou autre erreur de paiement
            const paymentData = response.data.error?.data || response.data.data;
            
            cinetpayTransaction.status = paymentData?.status || 'REFUSED';
            cinetpayTransaction.errorCode = response.data.code;
            cinetpayTransaction.errorMessage = response.data.message; // "PAYMENT_FAILED"
            cinetpayTransaction.cpmErrorMessage = 'PAYMENT_FAILED';
            cinetpayTransaction.apiResponseId = response.data.api_response_id;
            
            if (paymentData) {
                cinetpayTransaction.paymentMethod = paymentData.payment_method;
                cinetpayTransaction.operatorTransactionId = paymentData.operator_id;
                cinetpayTransaction.fundAvailabilityDate = paymentData.fund_availability_date ? new Date(paymentData.fund_availability_date) : null;
            }
            
            await cinetpayTransaction.save();
            
            // Envoyer une notification d'échec spécifique
            await sendPaymentNotification(cinetpayTransaction, 'failed');
            
            console.log(`Transaction ${transactionId} échouée: ${response.data.message}`);
            
        } else if (response.data.code === '627') {
            // Transaction annulée/refusée
            const paymentData = response.data.data;
            
            cinetpayTransaction.status = paymentData?.status || 'CANCELED';
            cinetpayTransaction.errorCode = response.data.code;
            cinetpayTransaction.errorMessage = response.data.message;
            cinetpayTransaction.cpmErrorMessage = 'TRANSACTION_CANCEL';
            cinetpayTransaction.apiResponseId = response.data.api_response_id;
            
            if (paymentData) {
                cinetpayTransaction.paymentMethod = paymentData.payment_method;
                cinetpayTransaction.operatorTransactionId = paymentData.operator_id;
                cinetpayTransaction.fundAvailabilityDate = paymentData.fund_availability_date ? new Date(paymentData.fund_availability_date) : null;
            }
            
            await cinetpayTransaction.save();
            
            // Envoyer une notification d'échec
            await sendPaymentNotification(cinetpayTransaction, 'failed');
            
            console.log(`Transaction ${transactionId} annulée: ${response.data.message}`);
            
        } else {
            // Autre erreur non gérée
            throw new CinetpayError(
                response.data.message || 'Transaction check failed',
                response.status || 400,
                response.data
            );
        }
        
        // 4. Récupérer la transaction mise à jour
        const updatedTransaction = await CinetpayTransaction.findById(cinetpayTransaction._id)
            .populate('plan')
            .populate('user');
        
        return {
            transaction: updatedTransaction
        };
        
    } catch (error) {
        if (error instanceof CinetpayError) {
            await addLog(`CinetPay API error during status check: ${error.message}`, 'CinetpayService.checkTransactionStatus', 'error');
            throw error;
        }
        
        if (error.response) {
            console.error('CinetPay status check error:', error.response.data);
            throw new CinetpayError(
                error.response.data.message || error.response.data.description || error.message,
                error.response.status,
                error.response.data
            );
        }
        
        await addLog(`Error checking transaction status: ${error.message}`, 'CinetpayService.checkTransactionStatus', 'error');
        throw error;
    }
}

// Traiter le webhook CinetPay
async function processWebhook(webhookData, receivedToken) {
    try {
        console.log('Processing CinetPay webhook:', webhookData);
        
        // 1. Vérifier le token HMAC pour la sécurité (optionnel)
        if (SECRET_KEY && receivedToken && !verifyHmacToken(receivedToken, webhookData)) {
            console.warn('CinetPay - Invalid HMAC token');
            await addLog('CinetPay webhook received with invalid HMAC token', 'CinetpayService.processWebhook', 'warning');
            // Ne pas bloquer, juste logger
        }
        
        const { cpm_trans_id: transactionId, cpm_error_message } = webhookData;
        
        // 2. Chercher la transaction par transactionId
        const cinetpayTransaction = await CinetpayTransaction.findOne({ 
            transactionId: transactionId 
        });
        
        if (!cinetpayTransaction) {
            const errorMsg = `Transaction not found for webhook: ${transactionId}`;
            await addLog(errorMsg, 'CinetpayService.processWebhook', 'error');
            
            throw new CinetpayError(
                errorMsg,
                404,
                {
                    message: errorMsg,
                    description: `La transaction n'a pas été trouvée`,
                    code: '404'
                }
            );
        }
        
        // 3. Mettre à jour la transaction avec les données webhook
        cinetpayTransaction.cpmTransDate = webhookData.cpm_trans_date ? new Date(webhookData.cpm_trans_date) : new Date();
        cinetpayTransaction.cpmErrorMessage = cpm_error_message;
        cinetpayTransaction.paymentMethod = webhookData.payment_method;
        cinetpayTransaction.cpmPhonePrefix = webhookData.cpm_phone_prefixe;
        cinetpayTransaction.cpmLanguage = webhookData.cpm_language;
        cinetpayTransaction.cpmVersion = webhookData.cpm_version;
        cinetpayTransaction.cpmPaymentConfig = webhookData.cpm_payment_config;
        cinetpayTransaction.cpmPageAction = webhookData.cpm_page_action;
        cinetpayTransaction.cpmCustom = webhookData.cpm_custom;
        cinetpayTransaction.cpmDesignation = webhookData.cpm_designation;
        cinetpayTransaction.webhookSignature = webhookData.signature;
        
        // 4. Déterminer le statut selon cpm_error_message
        if (cpm_error_message === 'SUCCES') {
            cinetpayTransaction.status = 'ACCEPTED';
        } else if (cpm_error_message === 'PAYMENT_FAILED') {
            cinetpayTransaction.status = 'REFUSED';
        } else if (cpm_error_message === 'TRANSACTION_CANCEL') {
            cinetpayTransaction.status = 'CANCELED';
        } else {
            cinetpayTransaction.status = 'REFUSED'; // Statut par défaut pour les autres cas
        }
        
        await cinetpayTransaction.save();
        
        // 5. Si succès et pas encore traité, créer la subscription
        if (cpm_error_message === 'SUCCES' && !cinetpayTransaction.processed) {
            console.log(`Creating subscription for transaction ${cinetpayTransaction._id}`);
            
            try {
                // Créer la souscription
                await createSubscription(cinetpayTransaction);
                
                // Envoyer une notification de succès
                await sendPaymentNotification(cinetpayTransaction, 'success');
                
                // Marquer comme traitée
                cinetpayTransaction.processed = true;
                await cinetpayTransaction.save();
                
                console.log(`Transaction ${cinetpayTransaction._id} marked as processed`);
            } catch (subscriptionError) {
                console.error(`Error creating subscription: ${subscriptionError.message}`);
                await addLog(`Error creating subscription: ${subscriptionError.message}`, 'CinetpayService.processWebhook', 'error');
            }
        } else if (cpm_error_message === 'PAYMENT_FAILED' || cpm_error_message === 'TRANSACTION_CANCEL') {
            // Envoyer notification d'échec
            await sendPaymentNotification(cinetpayTransaction, 'failed');
        }
        
        await addLog(
            `Webhook processed for transaction ${transactionId}: ${cpm_error_message}`,
            'CinetpayService.processWebhook',
            'info'
        );
        
        // Récupérer la transaction mise à jour
        const updatedTransaction = await CinetpayTransaction.findById(cinetpayTransaction._id)
            .populate('plan')
            .populate('user');
        
        return { 
            success: true, 
            message: 'Webhook processed successfully',
            transaction: updatedTransaction
        };
        
    } catch (error) {
        if (error instanceof CinetpayError) {
            await addLog(`CinetPay error during webhook processing: ${error.message}`, 'CinetpayService.processWebhook', 'error');
            throw error;
        }
        
        await addLog(`Error processing webhook: ${error.message}`, 'CinetpayService.processWebhook', 'error');
        throw error;
    }
}

// Créer une souscription après un paiement réussi
async function createSubscription(cinetpayTransaction) {
    try {
        console.log(`🔄 Début création subscription pour transaction ${cinetpayTransaction._id}`);
        
        const { user, plan, paymentMethod } = cinetpayTransaction;
        
        // Récupérer le plan AVANT de mettre à jour le wallet
        const planDoc = await Plan.findById(plan);
        if (!planDoc) {
            console.error(`❌ Plan non trouvé avec ID: ${plan}`);
            throw new Error('Plan not found');
        }
        console.log(`✅ Plan trouvé: ${planDoc.name}, Prix: ${planDoc.price}`);
        
        // Vérifier que le prix du plan est valide
        if (!planDoc.price || isNaN(planDoc.price)) {
            throw new Error(`Prix du plan invalide: ${planDoc.price}`);
        }
        
        // Mettre à jour le portefeuille avec le prix du plan
        const walletOperator = paymentMethod ? `${paymentMethod.toUpperCase().replace(/\s/g, '')}` : 'CINETPAY';
        
        let wallet = await Wallet.findOne({ operator: walletOperator });
        if (!wallet) {
            console.log(`📝 Création nouveau wallet pour ${walletOperator}`);
            wallet = new Wallet({ operator: walletOperator, totalRevenue: 0 });
        }
        
        console.log(`💰 Ajout de ${planDoc.price} au wallet ${walletOperator} (actuel: ${wallet.totalRevenue})`);
        wallet.totalRevenue += planDoc.price; // Utiliser planDoc.price au lieu de plan.price
        wallet.lastUpdated = Date.now();
        await wallet.save();
        console.log(`✅ Wallet mis à jour: nouveau total = ${wallet.totalRevenue}`);
        
        // Créer la période de souscription
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + planDoc.duration);
        
        // Créer la souscription avec la référence à la transaction CinetPay
        const subscription = new Subscription({
            user,
            plan,
            transaction: cinetpayTransaction._id,
            startDate,
            endDate
        });
        
        await subscription.save();
        console.log(`✅ Subscription créée avec succès ! ID: ${subscription._id}`);
        
        await addLog(
            `Subscription created for user ${user} with plan ${planDoc.name} via CinetPay`,
            'CinetpayService.createSubscription',
            'info'
        );
        
        return subscription;
    } catch (error) {
        console.error(`❌ Erreur création subscription: ${error.message}`);
        await addLog(`Subscription creation failed: ${error.message}`, 'CinetpayService.createSubscription', 'error');
        throw error;
    }
}
// Envoyer une notification de paiement (succès ou échec)
async function sendPaymentNotification(cinetpayTransaction, type = 'success') {
    try {
        // Charger les données complètes
        const user = await User.findById(cinetpayTransaction.user);
        const plan = await Plan.findById(cinetpayTransaction.plan);
        
        if (user && user.fcmToken && plan) {
            let notificationData;
            
            if (type === 'success') {
                // Notification de succès
                const currentDate = moment().format('dddd D MMMM YYYY');
                const expire = moment().add(plan.duration, 'days').format('dddd D MMMM YYYY');
                
                notificationData = {
                    title: '🌟 Pronos PREMIUM Activés !',
                    body: [
                        `Forfait actif pour ${plan.duration} jours.`,
                        '👉 APPUYEZ pour voir vos pronos premium !'
                    ].join('\n'),
                    data: {
                        type: 'subscription_notification',
                        subscriptionId: cinetpayTransaction.transactionId,
                        packageType: 'VIP',
                        user: JSON.stringify(user),
                        startDate: currentDate,
                        expiryDate: expire,
                        features: ['predictions_vip'].join(','),
                        status: 'active',
                        price: String(plan.price),
                        currency: cinetpayTransaction.currency,
                        paymentMethod: cinetpayTransaction.paymentMethod || 'CinetPay'
                    }
                };
            } else {
                // Notification d'échec
                notificationData = {
                    title: '❌ Paiement Échoué',
                    body: [
                        `Le paiement pour ${plan.name} a échoué.`,
                        '👉 APPUYEZ pour réessayer le paiement.'
                    ].join('\n'),
                    data: {
                        type: 'payment_failed_notification',
                        transactionId: cinetpayTransaction.transactionId,
                        packageType: plan.name,
                        user: JSON.stringify(user),
                        status: 'failed',
                        price: String(plan.price),
                        currency: cinetpayTransaction.currency,
                        reason: cinetpayTransaction.cpmErrorMessage || 'Paiement refusé'
                    }
                };
            }
            
            await sendDeviceNotification(user.fcmToken, notificationData);
            console.log(`Mobile notification (${type}) sent to user ${user._id} for CinetPay payment`);
        }
    } catch (notificationError) {
        console.error(`Error sending notification: ${notificationError.message}`);
        await addLog(`Error sending notification: ${notificationError.message}`, 'CinetpayService.sendPaymentNotification', 'error');
    }
}

// Exporter toutes les fonctions
module.exports = {
    initiatePayment,
    checkTransactionStatus,
    processWebhook,
    createSubscription,
    sendPaymentNotification,
    verifyHmacToken,
    CinetpayError // Exporter la classe d'erreur
};