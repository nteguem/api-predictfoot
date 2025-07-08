const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const AfribaPayTransaction = require('../models/afribapayTransaction.model');
const Plan = require('../models/plan.model');
const User = require('../models/user.model');
const { sendDeviceNotification } = require('./notification.service');
const moment = require('moment');
const Subscription = require('../models/subscription.model');
const Wallet = require('../models/wallet.model');
const { addLog } = require('./log.service');

// Configuration
const API_URL = process.env.AFRIBAPAY_API_URL || 'https://api-sandbox.afribapay.com';
const API_USER = process.env.AFRIBAPAY_API_USER;
const API_KEY = process.env.AFRIBAPAY_API_KEY;
const MERCHANT_KEY = process.env.AFRIBAPAY_MERCHANT_KEY;

// Cache pour le token (éviter de régénérer à chaque requête)
let cachedToken = null;
let tokenExpiry = null;

// Classe d'erreur personnalisée pour AfribaPay
class AfribaPayError extends Error {
    constructor(message, statusCode, responseData) {
        super(message);
        this.name = 'AfribaPayError';
        this.statusCode = statusCode;
        this.responseData = responseData;
    }
}

// Fonction pour générer l'URL de notification et de retour
function generateUrls() {
    const baseUrl = process.env.APP_BASE_URL;
    return {
        notify_url: `${baseUrl}/payments/afribapay/webhook`,
        return_url: `${baseUrl}/payments/afribapay/success`,
        cancel_url: `${baseUrl}/payments/afribapay/cancel`
    };
}

// Fonction pour obtenir un token d'accès AfribaPay
async function getAccessToken() {
    try {
        // Vérifier si on a un token valide en cache
        if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
            return cachedToken;
        }

        // Générer l'authentification Basic
        const credentials = Buffer.from(`${API_USER}:${API_KEY}`).toString('base64');
        
        const response = await axios.post(`${API_URL}/v1/token`, {}, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.data && response.data.data.access_token) {
            cachedToken = response.data.data.access_token;
            
            // Calculer l'expiration (expires_in en secondes, on retire 5 min de sécurité)
            const expiresIn = response.data.data.expires_in || 86400; // 24h par défaut
            tokenExpiry = Date.now() + ((expiresIn - 300) * 1000); // -5min de sécurité
            
            await addLog(`AfribaPay token generated successfully`, 'AfribaPayService.getAccessToken', 'info');
            return cachedToken;
        } else {
            throw new AfribaPayError('Failed to get access token', 401, response.data);
        }
    } catch (error) {
        if (error.response) {
            throw new AfribaPayError(
                `Token generation failed: ${error.response.data?.message || error.message}`,
                error.response.status,
                error.response.data
            );
        }
        throw error;
    }
}

// Fonction pour vérifier le token HMAC du webhook
function verifyHmacToken(receivedSignature, payload) {
    try {
        if (!API_KEY || !receivedSignature) {
            return false;
        }

        // Calculer la signature HMAC SHA-256 avec le payload brut
        const calculatedSignature = crypto
            .createHmac('sha256', API_KEY)
            .update(payload)
            .digest('hex');

        return calculatedSignature === receivedSignature;
    } catch (error) {
        console.error('Error verifying HMAC signature:', error);
        return false;
    }
}

// Déterminer si un OTP est requis pour un opérateur/pays
function isOtpRequired(operator, country) {
    const otpRequiredMapping = {
        'orange': ['SN', 'CI', 'BF', 'GN'], // Orange nécessite OTP dans ces pays
        'wligdicash': ['BF'] // LigdiCash nécessite OTP
    };
    
    return otpRequiredMapping[operator]?.includes(country) || false;
}

// Initialiser un paiement AfribaPay
async function initiatePayment(transactionData) {
    const { userId, planId, phoneNumber, operator, country, otpCode } = transactionData;
    
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

        // 2. Valider les paramètres AfribaPay
        if (!operator || !country) {
            throw new Error('Operator and country are required for AfribaPay');
        }

        // 3. Vérifier si OTP est requis mais non fourni
        if (isOtpRequired(operator, country) && !otpCode) {
            throw new AfribaPayError(
                `OTP code is required for ${operator} in ${country}`,
                400,
                { code: 'OTP_REQUIRED', operator, country }
            );
        }

        // 4. Déterminer la devise selon le pays
        const currencyMapping = {
            'CI': 'XOF', 'SN': 'XOF', 'BF': 'XOF', 'ML': 'XOF', 'TG': 'XOF', 'BJ': 'XOF', 'NE': 'XOF',
            'CM': 'XAF', 'TD': 'XAF', 'CG': 'XAF', 'CF': 'XAF', 'GA': 'XAF',
            'GN': 'GNF',
            'CD': 'CDF'
        };
        const currency = currencyMapping[country] || 'XOF';
        
        // 5. Générer les identifiants de transaction
        const transactionId = `TXN_${Date.now()}_${uuidv4().substring(0, 8)}`;
        const orderId = `order-${Date.now()}`;
        
        // 6. Générer les URLs
        const { notify_url, return_url, cancel_url } = generateUrls();
        
        // 7. Obtenir le token d'accès
        const accessToken = await getAccessToken();
        
        // 8. Créer la transaction en base
        const afribaPayTransaction = new AfribaPayTransaction({
            transactionId,
            orderId,
            user: userId,
            plan: planId,
            operator,
            country,
            phoneNumber,
            otpCode,
            amount: plan.price,
            currency,
            merchantKey: MERCHANT_KEY,
            referenceId: `Bigwin ${plan.name}`,
            notifyUrl: notify_url,
            returnUrl: return_url,
            cancelUrl: cancel_url,
            lang: 'fr',
            clientIp: transactionData.clientIp,
            userAgent: transactionData.userAgent
        });
        
        await afribaPayTransaction.save();
        
        // 9. Préparer les données pour l'API AfribaPay
        const paymentData = {
            operator,
            country,
            phone_number: phoneNumber,
            amount: plan.price,
            currency,
            order_id: orderId,
            merchant_key: MERCHANT_KEY,
            reference_id: `Bigwin ${plan.name}`,
            lang: 'fr',
            notify_url,
            return_url,
            cancel_url
        };

        // Ajouter l'OTP si requis
        if (otpCode) {
            paymentData.otp_code = otpCode;
        }
        
        // 10. Appeler l'API AfribaPay pour initialiser le paiement
        const response = await axios.post(`${API_URL}/v1/pay/payin`, paymentData, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('AfribaPay payment initialization response:', response.data);
        
        // 11. Vérifier la réponse
        if (!response.data.data) {
            throw new AfribaPayError(
                'Payment initialization failed - no data in response',
                response.status || 400,
                response.data
            );
        }
        
        // 12. Mettre à jour la transaction avec les données AfribaPay
        const responseData = response.data.data;
        afribaPayTransaction.providerId = responseData.provider_id;
        afribaPayTransaction.providerLink = responseData.provider_link; // Pour Wave
        afribaPayTransaction.amount = responseData.amount;
        afribaPayTransaction.taxes = responseData.taxes;
        afribaPayTransaction.fees = responseData.fees;
        afribaPayTransaction.feesTaxesTtc = responseData.fees_taxes_ttc;
        afribaPayTransaction.amountTotal = responseData.amount_total;
        afribaPayTransaction.dateCreated = responseData.date_created ? new Date(responseData.date_created) : new Date();
        afribaPayTransaction.apiRequestId = response.data.request_id;
        afribaPayTransaction.apiRequestTime = response.data.request_time;
        afribaPayTransaction.apiRequestIp = response.data.request_ip;
        
        await afribaPayTransaction.save();
        
        await addLog(
            `AfribaPay payment initialized for user ${userId}, transaction ${transactionId}`,
            'AfribaPayService.initiatePayment',
            'info'
        );
        
        // 13. Récupérer la transaction mise à jour avec les relations
        const updatedTransaction = await AfribaPayTransaction.findById(afribaPayTransaction._id)
            .populate('plan')
            .populate('user');
        
        return {
            transaction: updatedTransaction,
            paymentUrl: responseData.provider_link, // Pour Wave redirection
            requiresOtp: isOtpRequired(operator, country)
        };
        
    } catch (error) {
        if (error instanceof AfribaPayError) {
            await addLog(`AfribaPay API error during payment initiation: ${error.message}`, 'AfribaPayService.initiatePayment', 'error');
            throw error;
        }
        
        if (error.response) {
            console.error('AfribaPay API error:', error.response.data);
            throw new AfribaPayError(
                error.response.data.message || error.response.data.description || error.message,
                error.response.status,
                error.response.data
            );
        }
        
        await addLog(`Payment initiation failed: ${error.message}`, 'AfribaPayService.initiatePayment', 'error');
        throw error;
    }
}

// Vérifier le statut d'une transaction
async function checkTransactionStatus(orderId) {
    try {
        // 1. Trouver la transaction en base
        const afribaPayTransaction = await AfribaPayTransaction.findOne({ 
            $or: [{ orderId }, { transactionId: orderId }] 
        });
        
        if (!afribaPayTransaction) {
            throw new AfribaPayError(
                `Transaction not found for orderId: ${orderId}`,
                404,
                {
                    message: `Transaction not found for orderId: ${orderId}`,
                    description: `La transaction demandée n'existe pas`,
                    code: '404'
                }
            );
        }
        
        // 2. Obtenir le token et appeler l'API AfribaPay pour vérifier le statut
        const accessToken = await getAccessToken();
        
        const response = await axios.get(`${API_URL}/v1/status?order_id=${afribaPayTransaction.orderId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('AfribaPay status check response:', response.data);
        
        // 3. Traiter la réponse
        if (response.data.data) {
            const paymentData = response.data.data;
            
            // Mettre à jour la transaction
            afribaPayTransaction.status = paymentData.status;
            afribaPayTransaction.operatorId = paymentData.operator_id;
            afribaPayTransaction.statusDate = paymentData.status_date ? new Date(paymentData.status_date) : new Date();
            afribaPayTransaction.apiRequestId = response.data.request_id;
            afribaPayTransaction.apiRequestTime = response.data.request_time;
            
            await afribaPayTransaction.save();
            
            // Si la transaction est réussie et pas encore traitée
            if (paymentData.status === 'SUCCESS' && !afribaPayTransaction.processed) {
                console.log(`Creating subscription for transaction ${afribaPayTransaction._id}`);
                
                try {
                    // Créer la souscription
                    await createSubscription(afribaPayTransaction);
                    
                    // Envoyer une notification de succès
                    await sendPaymentNotification(afribaPayTransaction, 'success');
                    
                    // Marquer comme traitée
                    afribaPayTransaction.processed = true;
                    await afribaPayTransaction.save();
                    
                    console.log(`Transaction ${afribaPayTransaction._id} marked as processed`);
                } catch (subscriptionError) {
                    console.error(`Error creating subscription: ${subscriptionError.message}`);
                    await addLog(`Error creating subscription: ${subscriptionError.message}`, 'AfribaPayService.checkTransactionStatus', 'error');
                }
            } else if (paymentData.status === 'FAILED') {
                // Envoyer notification d'échec
                await sendPaymentNotification(afribaPayTransaction, 'failed');
            }
        }
        
        // 4. Récupérer la transaction mise à jour
        const updatedTransaction = await AfribaPayTransaction.findById(afribaPayTransaction._id)
            .populate('plan')
            .populate('user');
        
        return {
            transaction: updatedTransaction
        };
        
    } catch (error) {
        if (error instanceof AfribaPayError) {
            await addLog(`AfribaPay API error during status check: ${error.message}`, 'AfribaPayService.checkTransactionStatus', 'error');
            throw error;
        }
        
        if (error.response) {
            console.error('AfribaPay status check error:', error.response.data);
            throw new AfribaPayError(
                error.response.data.message || error.response.data.description || error.message,
                error.response.status,
                error.response.data
            );
        }
        
        await addLog(`Error checking transaction status: ${error.message}`, 'AfribaPayService.checkTransactionStatus', 'error');
        throw error;
    }
}

// Traiter le webhook AfribaPay
async function processWebhook(webhookData, receivedSignature, rawPayload) {
    try {
        console.log('Processing AfribaPay webhook:', webhookData);
        
        // 1. Vérifier la signature HMAC pour la sécurité
        if (API_KEY && receivedSignature && !verifyHmacToken(receivedSignature, rawPayload)) {
            console.warn('AfribaPay - Invalid HMAC signature');
            await addLog('AfribaPay webhook received with invalid HMAC signature', 'AfribaPayService.processWebhook', 'warning');
            // Ne pas bloquer, juste logger
        }
        
        const { order_id: orderId, status } = webhookData;
        
        // 2. Chercher la transaction par orderId
        const afribaPayTransaction = await AfribaPayTransaction.findOne({ 
            orderId: orderId 
        });
        
        if (!afribaPayTransaction) {
            const errorMsg = `Transaction not found for webhook: ${orderId}`;
            await addLog(errorMsg, 'AfribaPayService.processWebhook', 'error');
            
            throw new AfribaPayError(
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
        afribaPayTransaction.status = status;
        afribaPayTransaction.webhookReceived = true;
        afribaPayTransaction.webhookData = webhookData;
        afribaPayTransaction.webhookSignature = receivedSignature;
        afribaPayTransaction.webhookVerified = verifyHmacToken(receivedSignature, rawPayload);
        
        // Mettre à jour les données si disponibles dans le webhook
        if (webhookData.operator_id) {
            afribaPayTransaction.operatorId = webhookData.operator_id;
        }
        if (webhookData.status_date) {
            afribaPayTransaction.statusDate = new Date(webhookData.status_date);
        }
        if (webhookData.amount) {
            afribaPayTransaction.amount = webhookData.amount;
        }
        if (webhookData.amount_total) {
            afribaPayTransaction.amountTotal = webhookData.amount_total;
        }
        
        await afribaPayTransaction.save();
        
        // 4. Si succès et pas encore traité, créer la subscription
        if (status === 'SUCCESS' && !afribaPayTransaction.processed) {
            console.log(`Creating subscription for transaction ${afribaPayTransaction._id}`);
            
            try {
                // Créer la souscription
                await createSubscription(afribaPayTransaction);
                
                // Envoyer une notification de succès
                await sendPaymentNotification(afribaPayTransaction, 'success');
                
                // Marquer comme traitée
                afribaPayTransaction.processed = true;
                await afribaPayTransaction.save();
                
                console.log(`Transaction ${afribaPayTransaction._id} marked as processed`);
            } catch (subscriptionError) {
                console.error(`Error creating subscription: ${subscriptionError.message}`);
                await addLog(`Error creating subscription: ${subscriptionError.message}`, 'AfribaPayService.processWebhook', 'error');
            }
        } else if (status === 'FAILED') {
            // Envoyer notification d'échec
            await sendPaymentNotification(afribaPayTransaction, 'failed');
        }
        
        await addLog(
            `Webhook processed for transaction ${orderId}: ${status}`,
            'AfribaPayService.processWebhook',
            'info'
        );
        
        // Récupérer la transaction mise à jour
        const updatedTransaction = await AfribaPayTransaction.findById(afribaPayTransaction._id)
            .populate('plan')
            .populate('user');
        
        return { 
            success: true, 
            message: 'Webhook processed successfully',
            transaction: updatedTransaction
        };
        
    } catch (error) {
        if (error instanceof AfribaPayError) {
            await addLog(`AfribaPay error during webhook processing: ${error.message}`, 'AfribaPayService.processWebhook', 'error');
            throw error;
        }
        
        await addLog(`Error processing webhook: ${error.message}`, 'AfribaPayService.processWebhook', 'error');
        throw error;
    }
}

// Créer une souscription après un paiement réussi (identique à CinetPay)
async function createSubscription(afribaPayTransaction) {
    try {
        console.log(`🔄 Début création subscription pour transaction ${afribaPayTransaction._id}`);
        
        const { user, plan, operator } = afribaPayTransaction;
        
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
        
        // Mettre à jour le portefeuille avec l'opérateur AfribaPay
        const walletOperator = `AFRIBAPAY_${operator.toUpperCase()}`;
        
        let wallet = await Wallet.findOne({ operator: walletOperator });
        if (!wallet) {
            console.log(`📝 Création nouveau wallet pour ${walletOperator}`);
            wallet = new Wallet({ operator: walletOperator, totalRevenue: 0 });
        }
        
        console.log(`💰 Ajout de ${planDoc.price} au wallet ${walletOperator} (actuel: ${wallet.totalRevenue})`);
        wallet.totalRevenue += planDoc.price;
        wallet.lastUpdated = Date.now();
        await wallet.save();
        console.log(`✅ Wallet mis à jour: nouveau total = ${wallet.totalRevenue}`);
        
        // Créer la période de souscription
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + planDoc.duration);
        
        // Créer la souscription avec la référence à la transaction AfribaPay
        const subscription = new Subscription({
            user,
            plan,
            transaction: afribaPayTransaction._id,
            startDate,
            endDate
        });
        
        await subscription.save();
        console.log(`✅ Subscription créée avec succès ! ID: ${subscription._id}`);
        
        await addLog(
            `Subscription created for user ${user} with plan ${planDoc.name} via AfribaPay`,
            'AfribaPayService.createSubscription',
            'info'
        );
        
        return subscription;
    } catch (error) {
        console.error(`❌ Erreur création subscription: ${error.message}`);
        await addLog(`Subscription creation failed: ${error.message}`, 'AfribaPayService.createSubscription', 'error');
        throw error;
    }
}

// Envoyer une notification de paiement (succès ou échec)
async function sendPaymentNotification(afribaPayTransaction, type = 'success') {
    try {
        // Charger les données complètes
        const user = await User.findById(afribaPayTransaction.user);
        const plan = await Plan.findById(afribaPayTransaction.plan);
        
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
                        subscriptionId: afribaPayTransaction.transactionId,
                        packageType: 'VIP',
                        user: JSON.stringify(user),
                        startDate: currentDate,
                        expiryDate: expire,
                        features: ['predictions_vip'].join(','),
                        status: 'active',
                        price: String(plan.price),
                        currency: afribaPayTransaction.currency,
                        paymentMethod: `AfribaPay ${afribaPayTransaction.operator}`
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
                        transactionId: afribaPayTransaction.transactionId,
                        packageType: plan.name,
                        user: JSON.stringify(user),
                        status: 'failed',
                        price: String(plan.price),
                        currency: afribaPayTransaction.currency,
                        reason: afribaPayTransaction.errorMessage || 'Paiement refusé'
                    }
                };
            }
            
            await sendDeviceNotification(user.fcmToken, notificationData);
            console.log(`Mobile notification (${type}) sent to user ${user._id} for AfribaPay payment`);
            
            // Marquer la notification comme envoyée
            afribaPayTransaction.notificationSent = true;
            await afribaPayTransaction.save();
        }
    } catch (notificationError) {
        console.error(`Error sending notification: ${notificationError.message}`);
        await addLog(`Error sending notification: ${notificationError.message}`, 'AfribaPayService.sendPaymentNotification', 'error');
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
    getAccessToken,
    isOtpRequired,
    AfribaPayError // Exporter la classe d'erreur
};