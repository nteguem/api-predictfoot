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
const fs = require('fs');
const path = require('path');

const COUNTRIES_DATA_PATH = path.join(__dirname, '../data/afribapayData.json');

// Configuration
const API_URL = process.env.AFRIBAPAY_API_URL || 'https://api-sandbox.afribapay.com';
const API_USER = process.env.AFRIBAPAY_API_USER;
const API_KEY = process.env.AFRIBAPAY_API_KEY;
const MERCHANT_KEY = process.env.AFRIBAPAY_MERCHANT_KEY;

// Cache pour le token
let cachedToken = null;
let tokenExpiry = null;

// Cache pour les données des pays (pour vérifier OTP)
let cachedCountriesData = null;
let countriesDataExpiry = null;

// Classe d'erreur personnalisée
class AfribaPayError extends Error {
    constructor(message, statusCode, responseData) {
        super(message);
        this.name = 'AfribaPayError';
        this.statusCode = statusCode;
        this.responseData = responseData;
    }
}

// Générer URLs de notification
function generateUrls() {
    const baseUrl = process.env.APP_BASE_URL;
    return {
        notify_url: `${baseUrl}payments/afribapay/webhook`,
        return_url: `${baseUrl}payments/afribapay/success`,
        cancel_url: `${baseUrl}payments/afribapay/cancel`
    };
}

// Obtenir token d'accès
async function getAccessToken() {
    try {
        if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
            return cachedToken;
        }

        const credentials = Buffer.from(`${API_USER}:${API_KEY}`).toString('base64');
        
        const response = await axios.post(`${API_URL}/v1/token`, {}, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.data && response.data.data.access_token) {
            cachedToken = response.data.data.access_token;
            const expiresIn = response.data.data.expires_in || 86400;
            tokenExpiry = Date.now() + ((expiresIn - 300) * 1000);
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

// Vérifier si OTP requis (seule validation dynamique)
async function isOtpRequired(operator, country) {
    try {
        // Vérifier cache
        if (cachedCountriesData && countriesDataExpiry && Date.now() < countriesDataExpiry) {
            return checkOtpInData(cachedCountriesData, operator, country);
        }

        // Récupérer données pays
        const accessToken = await getAccessToken();
        const response = await axios.get(`${API_URL}/v1/countries`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.data) {
            cachedCountriesData = response.data.data;
            countriesDataExpiry = Date.now() + (60 * 60 * 1000); // 1 heure
            return checkOtpInData(cachedCountriesData, operator, country);
        }
        
        return false; // Par défaut si erreur
    } catch (error) {
        console.error('Error checking OTP requirement:', error);
        return false; // Par défaut si erreur
    }
}

// Vérifier OTP dans les données
function checkOtpInData(countriesData, operator, country) {
    try {
        const countryData = countriesData[country];
        if (!countryData) return false;

        for (const currencyData of Object.values(countryData.currencies)) {
            const operatorData = currencyData.operators.find(op => op.operator_code === operator);
            if (operatorData) {
                return Boolean(operatorData.otp_required);
            }
        }
        return false;
    } catch (error) {
        return false;
    }
}

// Vérifier signature HMAC
function verifyHmacToken(receivedSignature, payload) {
    try {
        if (!API_KEY || !receivedSignature) return false;
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

// Initialiser un paiement
async function initiatePayment(transactionData) {
    const { userId, planId, phoneNumber, operator, country, currency, otpCode } = transactionData;
    
    try {
        // Récupérer utilisateur et plan
        const user = await User.findById(userId);
        const plan = await Plan.findById(planId);
        if (!user) throw new Error('User not found');
        if (!plan) throw new Error('Plan not found');

        // Vérifier OTP si requis
        const otpRequiredCheck = await isOtpRequired(operator, country);
        if (otpRequiredCheck && !otpCode) {
            throw new AfribaPayError(
                `OTP code is required for ${operator} in ${country}`,
                400,
                { code: 'OTP_REQUIRED', operator, country }
            );
        }

        // Générer IDs et URLs
        const transactionId = `TXN_${Date.now()}_${uuidv4().substring(0, 8)}`;
        const orderId = `order-${Date.now()}`;
        const { notify_url, return_url, cancel_url } = generateUrls();
        const accessToken = await getAccessToken();
        
        // Créer transaction en base
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
        
        // Préparer données API
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

        if (otpCode) {
            paymentData.otp_code = otpCode;
        }
        
        // Appeler API AfribaPay
        const response = await axios.post(`${API_URL}/v1/pay/payin`, paymentData, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.data.data) {
            throw new AfribaPayError('Payment initialization failed', response.status || 400, response.data);
        }
        // Mettre à jour transaction
        const responseData = response.data.data;

        afribaPayTransaction.providerId = responseData.provider_id;
        afribaPayTransaction.providerLink = responseData.provider_link;
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
        
        await addLog(`AfribaPay payment initialized for user ${userId}, transaction ${transactionId}`, 'AfribaPayService.initiatePayment', 'info');
        
        const updatedTransaction = await AfribaPayTransaction.findById(afribaPayTransaction._id)
            .populate('plan')
            .populate('user');
        
        return {
            transaction: updatedTransaction,
            paymentUrl: responseData.provider_link
        };
        
    } catch (error) {
        if (error instanceof AfribaPayError) {
            await addLog(`AfribaPay API error during payment initiation: ${error.message}`, 'AfribaPayService.initiatePayment', 'error');
            throw error;
        }
        
        if (error.response) {
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

// Vérifier statut transaction
async function checkTransactionStatus(orderId) {
    try {
        const afribaPayTransaction = await AfribaPayTransaction.findOne({ 
            $or: [{ orderId }, { transactionId: orderId }] 
        });
        
        if (!afribaPayTransaction) {
            throw new AfribaPayError(`Transaction not found for orderId: ${orderId}`, 404, { code: '404' });
        }
        
        const accessToken = await getAccessToken();
        const response = await axios.get(`${API_URL}/v1/status?order_id=${afribaPayTransaction.orderId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.data) {
            const paymentData = response.data.data;
            
            afribaPayTransaction.status = paymentData.status;
            afribaPayTransaction.operatorId = paymentData.operator_id;
            afribaPayTransaction.statusDate = paymentData.status_date ? new Date(paymentData.status_date) : new Date();
            afribaPayTransaction.apiRequestId = response.data.request_id;
            afribaPayTransaction.apiRequestTime = response.data.request_time;
            
            await afribaPayTransaction.save();
            
            if (paymentData.status === 'SUCCESS' && !afribaPayTransaction.processed) {
                try {
                    await createSubscription(afribaPayTransaction);
                    await sendPaymentNotification(afribaPayTransaction, 'success');
                    afribaPayTransaction.processed = true;
                    await afribaPayTransaction.save();
                } catch (subscriptionError) {
                    console.error(`Error creating subscription: ${subscriptionError.message}`);
                    await addLog(`Error creating subscription: ${subscriptionError.message}`, 'AfribaPayService.checkTransactionStatus', 'error');
                }
            } else if (paymentData.status === 'FAILED') {
                await sendPaymentNotification(afribaPayTransaction, 'failed');
            }
        }
        
        const updatedTransaction = await AfribaPayTransaction.findById(afribaPayTransaction._id)
            .populate('plan')
            .populate('user');
        
        return { transaction: updatedTransaction };
        
    } catch (error) {
        if (error instanceof AfribaPayError) {
            await addLog(`AfribaPay API error during status check: ${error.message}`, 'AfribaPayService.checkTransactionStatus', 'error');
            throw error;
        }
        
        if (error.response) {
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

// Traiter webhook
async function processWebhook(webhookData, receivedSignature, rawPayload) {
    try {
        if (API_KEY && receivedSignature && !verifyHmacToken(receivedSignature, rawPayload)) {
            console.warn('AfribaPay - Invalid HMAC signature');
            await addLog('AfribaPay webhook received with invalid HMAC signature', 'AfribaPayService.processWebhook', 'warning');
        }
        
        const { order_id: orderId, status } = webhookData;
        
        const afribaPayTransaction = await AfribaPayTransaction.findOne({ orderId });
        
        if (!afribaPayTransaction) {
            const errorMsg = `Transaction not found for webhook: ${orderId}`;
            await addLog(errorMsg, 'AfribaPayService.processWebhook', 'error');
            throw new AfribaPayError(errorMsg, 404, { code: '404' });
        }
        
        afribaPayTransaction.status = status;
        afribaPayTransaction.webhookReceived = true;
        afribaPayTransaction.webhookData = webhookData;
        afribaPayTransaction.webhookSignature = receivedSignature;
        afribaPayTransaction.webhookVerified = verifyHmacToken(receivedSignature, rawPayload);
        
        if (webhookData.operator_id) afribaPayTransaction.operatorId = webhookData.operator_id;
        if (webhookData.status_date) afribaPayTransaction.statusDate = new Date(webhookData.status_date);
        if (webhookData.amount) afribaPayTransaction.amount = webhookData.amount;
        if (webhookData.amount_total) afribaPayTransaction.amountTotal = webhookData.amount_total;
        
        await afribaPayTransaction.save();
        
        if (status === 'SUCCESS' && !afribaPayTransaction.processed) {
            try {
                await createSubscription(afribaPayTransaction);
                await sendPaymentNotification(afribaPayTransaction, 'success');
                afribaPayTransaction.processed = true;
                await afribaPayTransaction.save();
            } catch (subscriptionError) {
                console.error(`Error creating subscription: ${subscriptionError.message}`);
                await addLog(`Error creating subscription: ${subscriptionError.message}`, 'AfribaPayService.processWebhook', 'error');
            }
        } else if (status === 'FAILED') {
            await sendPaymentNotification(afribaPayTransaction, 'failed');
        }
        
        await addLog(`Webhook processed for transaction ${orderId}: ${status}`, 'AfribaPayService.processWebhook', 'info');
        
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

// Créer subscription (identique à CinetPay)
async function createSubscription(afribaPayTransaction) {
    try {
        const { user, plan, operator } = afribaPayTransaction;
        
        const planDoc = await Plan.findById(plan);
        if (!planDoc) throw new Error('Plan not found');
        
        if (!planDoc.price || isNaN(planDoc.price)) {
            throw new Error(`Prix du plan invalide: ${planDoc.price}`);
        }
        
        const walletOperator = `AFRIBAPAY_${operator.toUpperCase()}`;
        
        let wallet = await Wallet.findOne({ operator: walletOperator });
        if (!wallet) {
            wallet = new Wallet({ operator: walletOperator, totalRevenue: 0 });
        }
        
        wallet.totalRevenue += planDoc.price;
        wallet.lastUpdated = Date.now();
        await wallet.save();
        
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + planDoc.duration);
        
        const subscription = new Subscription({
            user,
            plan,
            transaction: afribaPayTransaction._id,
            startDate,
            endDate
        });
        
        await subscription.save();
        
        await addLog(`Subscription created for user ${user} with plan ${planDoc.name} via AfribaPay`, 'AfribaPayService.createSubscription', 'info');
        
        return subscription;
    } catch (error) {
        await addLog(`Subscription creation failed: ${error.message}`, 'AfribaPayService.createSubscription', 'error');
        throw error;
    }
}

// Envoyer notification
async function sendPaymentNotification(afribaPayTransaction, type = 'success') {
    try {
        const user = await User.findById(afribaPayTransaction.user);
        const plan = await Plan.findById(afribaPayTransaction.plan);
        
        if (user && user.fcmToken && plan) {
            let notificationData;
            
            if (type === 'success') {
                const currentDate = moment().format('dddd D MMMM YYYY');
                const expire = moment().add(plan.duration, 'days').format('dddd D MMMM YYYY');
                
                notificationData = {
                    title: '🌟 Pronos PREMIUM Activés !',
                    body: `Forfait actif pour ${plan.duration} jours.\n👉 APPUYEZ pour voir vos pronos premium !`,
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
                notificationData = {
                    title: '❌ Paiement Échoué',
                    body: `Le paiement pour ${plan.name} a échoué.\n👉 APPUYEZ pour réessayer le paiement.`,
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
            afribaPayTransaction.notificationSent = true;
            await afribaPayTransaction.save();
        }
    } catch (notificationError) {
        console.error(`Error sending notification: ${notificationError.message}`);
        await addLog(`Error sending notification: ${notificationError.message}`, 'AfribaPayService.sendPaymentNotification', 'error');
    }
}

// Récupérer les données des pays depuis le fichier JSON
async function getCountriesData(countryCode = null) {
    try {
        // Lire le fichier JSON
        const fileContent = fs.readFileSync(COUNTRIES_DATA_PATH, 'utf8');
        const countriesData = JSON.parse(fileContent);
        
        // Si un code pays spécifique est demandé
        if (countryCode) {
            const upperCountryCode = countryCode.toUpperCase();
            const countryData = countriesData[upperCountryCode];
            
            if (!countryData) {
                throw new AfribaPayError(`Country not found: ${countryCode}`, 404);
            }
            
            return { country: countryData };
        }
        
        // Retourner tous les pays
        return { countries: countriesData };
        
    } catch (error) {
        throw new AfribaPayError(`Error loading countries data: ${error.message}`, 500);
    }
}

module.exports = {
    initiatePayment,
    checkTransactionStatus,
    processWebhook,
    createSubscription,
    sendPaymentNotification,
    verifyHmacToken,
    getAccessToken,
    getCountriesData,
    AfribaPayError
};