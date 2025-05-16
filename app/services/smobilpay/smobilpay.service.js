// services/smobilpay/smobilpay.service.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const SmobilpayTransaction = require('../../models/smobilpay-transaction.model');
const Plan = require('../../models/plan.model');
const Subscription = require('../../models/subscription.model');
const Wallet = require('../../models/wallet.model');
const { addLog } = require('../../services/log.service');

// Configuration
const API_URL = process.env.SMOBILPAY_API_URL;
const API_KEY = process.env.SMOBILPAY_API_KEY;
const API_SECRET = process.env.SMOBILPAY_API_SECRET;

// Classe d'erreur personnalisée pour Smobilpay
class SmobilpayError extends Error {
    constructor(message, statusCode, responseData) {
        super(message);
        this.name = 'SmobilpayError';
        this.statusCode = statusCode;
        this.responseData = responseData;
    }
}

// Fonction pour générer l'en-tête d'authentification
function generateAuthHeader(method, url, params = {}, data = null) {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = Date.now().toString();
    const signatureMethod = "HMAC-SHA1";
    
    // Paramètres d'authentification
    const s3pParams = {
        s3pAuth_nonce: nonce,
        s3pAuth_timestamp: timestamp,
        s3pAuth_signature_method: signatureMethod,
        s3pAuth_token: API_KEY
    };
    
    // Fusionner avec les données et paramètres d'URL
    const allParams = {...params, ...(data || {}), ...s3pParams};
    
    // Trier et formater les paramètres
    const sortedParams = Object.keys(allParams).sort().reduce((r, k) => {
        r[k] = typeof allParams[k] === 'string' ? allParams[k].trim() : allParams[k];
        return r;
    }, {});
    
    const parameterString = Object.keys(sortedParams)
        .map(key => key + '=' + sortedParams[key])
        .join('&');
    
    // Générer la chaîne de base
    const baseString = method + "&" + encodeURIComponent(url) + "&" + encodeURIComponent(parameterString);
    
    // Calculer la signature
    const signature = crypto.createHmac('sha1', API_SECRET)
        .update(baseString)
        .digest('base64');
    
    // Format final de l'en-tête
    const authHeader = "s3pAuth " +
        "s3pAuth_timestamp=\"" + timestamp + "\", " +
        "s3pAuth_signature=\"" + signature + "\", " +
        "s3pAuth_nonce=\"" + nonce + "\", " +
        "s3pAuth_signature_method=\"" + signatureMethod + "\", " +
        "s3pAuth_token=\"" + API_KEY + "\"";
    
    return authHeader;
}

// Fonction pour organiser les services par pays
function organizeServicesByCountry(services) {
    const countryCodes = {
      'CM': 'Cameroun',
      'GAB': 'Gabon',
      'TCD': 'Tchad',
      'RCA': 'République Centrafricaine',
      'CG': 'Congo',
      // Ajouter d'autres correspondances si nécessaire
    };
  
    // Structure pour stocker les services par pays
    const servicesByCountry = {
      'CM': [],
      'GAB': [],
      'TCD': [],
      'RCA': [],
      'CG': [],
      'OTHER': [], // Pour les services sans code pays identifiable
    };
  
    // Parcourir chaque service et le classer par pays
    services.forEach(service => {
      let countryCode = 'OTHER';
      const merchantCode = service.merchant || '';
  
      // Extraire le code pays du merchant
      if (merchantCode.startsWith('CM')) {
        countryCode = 'CM';
      } else if (merchantCode.startsWith('GAB')) {
        countryCode = 'GAB';
      } else if (merchantCode.startsWith('TCD')) {
        countryCode = 'TCD';
      } else if (merchantCode.startsWith('RCA')) {
        countryCode = 'RCA';
      } else if (merchantCode.startsWith('CG')) {
        countryCode = 'CG';
      } else {
        // Essayer de détecter d'autres formats possibles
        Object.keys(countryCodes).forEach(code => {
          if (merchantCode.includes(code)) {
            countryCode = code;
          }
        });
      }
  
      // Ajouter le service au pays correspondant
      if (servicesByCountry[countryCode]) {
        servicesByCountry[countryCode].push(service);
      } else {
        servicesByCountry['OTHER'].push(service);
      }
    });
  
    return {
      countryCodes, // Renvoyer aussi les noms des pays
      servicesByCountry
    };
  }
  
  // Fonction complète pour récupérer les services avec filtrage par pays
  async function getServices(serviceId = null, countryCode = null) {
    try {
      const endpoint = '/cashout';
      const fullUrl = `${API_URL}${endpoint}`;
      
      // Paramètres de requête - filtrer par serviceId si fourni
      const queryParams = serviceId ? { serviceid: serviceId } : {};
      
      const authHeader = generateAuthHeader(
        'GET', 
        fullUrl,
        queryParams ? queryParams : null
      );
      
      const response = await axios.get(fullUrl, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        params: queryParams ? queryParams : null
      });
      
      // EXTRACTION DES DONNÉES SELON LA STRUCTURE CORRECTE
      let services = [];
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Structure: { status: 200, message: "Success", data: [...] }
        services = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        // Structure: [...] (directement un tableau)
        services = response.data;
      } else {
        return []; // Retourner un tableau vide en cas de structure inattendue
      }
      
      // Si aucun service n'est trouvé
      if (services.length === 0) {
        return [];
      }
      
      // Si un serviceId spécifique est demandé, retourner directement les services
      if (serviceId) {
        return services;
      }
  
      // Organiser les services par pays
      const organizedServices = organizeServicesByCountry(services);
      
      // Si un code pays est spécifié, retourner seulement les services de ce pays
      if (countryCode) {
        const upperCountryCode = countryCode.toUpperCase();
        
        if (organizedServices.servicesByCountry[upperCountryCode]) {
          // Retourner directement le tableau des services pour ce pays
          return organizedServices.servicesByCountry[upperCountryCode];
        } else {
          // Retourner un tableau vide si le pays n'existe pas
          return [];
        }
      }
  
      // Sinon, retourner tous les services (non triés par pays)
      return services;
    } catch (error) {
      if (error.response) {
        throw new SmobilpayError(
          error.response.data.usrMsg || error.response.data.devMsg || error.message,
          error.response.status,
          error.response.data
        );
      }
      
      await addLog(`Error fetching services: ${error.message}`, 'SmobilpayService.getServices', 'error');
      throw error;
    }
  }
  

// Demander un devis (Quote)
async function requestQuote(payItemId, amount) {
    try {
        const endpoint = '/quotestd';
        const fullUrl = `${API_URL}${endpoint}`;
        
        const data = {
            payItemId,
            amount
        };
        
        const authHeader = generateAuthHeader(
            'POST', 
            fullUrl,
            {}, // pas de paramètres d'URL
            data
        );
        
        const response = await axios.post(fullUrl, data, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        // Traitement spécifique pour les erreurs de l'API
        if (error.response) {
            console.error('Quote error status:', error.response.status);
            console.error('Quote error data:', error.response.data);
            
            // Créer une erreur SmobilpayError avec les détails de l'API
            throw new SmobilpayError(
                error.response.data.usrMsg || error.response.data.devMsg || error.message,
                error.response.status,
                error.response.data
            );
        }
        
        await addLog(`Error requesting quote: ${error.message}`, 'SmobilpayService.requestQuote', 'error');
        throw error; // Relancer l'erreur si ce n'est pas une erreur d'API
    }
}

// Exécuter un paiement
async function collectPayment(quoteId, customerData, paymentId) {
    try {
        const endpoint = '/collectstd';
        const fullUrl = `${API_URL}${endpoint}`;
        
        const data = {
            quoteId,
            customerPhonenumber: customerData.phoneNumber,
            customerEmailaddress: customerData.email,
            customerName: customerData.customerName,
            serviceNumber: customerData.phoneNumber, // Pour le cash-in c'est généralement le même
            trid: paymentId
        };
        
        const authHeader = generateAuthHeader(
            'POST', 
            fullUrl,
            {}, // pas de paramètres d'URL
            data
        );
        
        const response = await axios.post(fullUrl, data, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        // Traitement spécifique pour les erreurs de l'API
        if (error.response) {
            console.error('Collect payment error status:', error.response.status);
            console.error('Collect payment error data:', error.response.data);
            
            // Créer une erreur SmobilpayError avec les détails de l'API
            throw new SmobilpayError(
                error.response.data.usrMsg || error.response.data.devMsg || error.message,
                error.response.status,
                error.response.data
            );
        }
        
        await addLog(`Error collecting payment: ${error.message}`, 'SmobilpayService.collectPayment', 'error');
        throw error; // Relancer l'erreur si ce n'est pas une erreur d'API
    }
}

// Vérifier le statut d'une transaction
async function verifyTransaction(identifier, isPaymentId = false) {
    try {
        const endpoint = '/verifytx';
        const fullUrl = `${API_URL}${endpoint}`;
        
        // On peut vérifier soit par PTN, soit par TRID (paymentId)
        const queryParams = isPaymentId ? { trid: identifier } : { ptn: identifier };
        
        const authHeader = generateAuthHeader(
            'GET', 
            fullUrl,
            queryParams
        );
        
        const response = await axios.get(fullUrl, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            params: queryParams
        });
        
        return response.data;
    } catch (error) {
        // Traitement spécifique pour les erreurs de l'API
        if (error.response) {
            console.error('Verify transaction error status:', error.response.status);
            console.error('Verify transaction error data:', error.response.data);
            
            // Créer une erreur SmobilpayError avec les détails de l'API
            throw new SmobilpayError(
                error.response.data.usrMsg || error.response.data.devMsg || error.message,
                error.response.status,
                error.response.data
            );
        }
        
        await addLog(`Error verifying transaction: ${error.message}`, 'SmobilpayService.verifyTransaction', 'error');
        throw error; // Relancer l'erreur si ce n'est pas une erreur d'API
    }
}

// Créer une souscription après un paiement réussi
async function createSubscription(smobilpayTransaction) {
    try {
        const { user, plan, amount, operatorName } = smobilpayTransaction;
        
        // Mettre à jour le portefeuille (si nécessaire)
        const walletOperator = `${operatorName.toUpperCase().replace(/\s/g, '')}`;
        let wallet = await Wallet.findOne({ operator: walletOperator });
        if (!wallet) {
            wallet = new Wallet({ operator: walletOperator, totalRevenue: 0 });
        }
        wallet.totalRevenue += amount;
        wallet.lastUpdated = Date.now();
        await wallet.save();
        
        // Récupérer le plan
        const planDoc = await Plan.findById(plan);
        if (!planDoc) {
            throw new Error('Plan not found');
        }
        
        // Créer la période de souscription
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + planDoc.duration);
        
        // Créer la souscription avec la référence à la transaction Smobilpay
        const subscription = new Subscription({
            user,
            plan,
            transaction: smobilpayTransaction._id, // Référence directe à la transaction Smobilpay
            startDate,
            endDate
        });
        
        await subscription.save();
        await addLog(
            `Subscription created for user ${user} with plan ${planDoc.name}`,
            'SmobilpayService.createSubscription',
            'info'
        );
        
        return subscription;
    } catch (error) {
        await addLog(`Subscription creation failed: ${error.message}`, 'SmobilpayService.createSubscription', 'error');
        throw error;
    }
}

// Initialiser un paiement (flux complet)
async function initiatePayment(transactionData) {
    const { userId, planId, operatorId, phoneNumber, customerName, email } = transactionData;
    
    try {
        // 1. Récupérer les détails du service
        const service = (await getServices(operatorId))[0];
        
        if (!service) {
            throw new SmobilpayError(
                `Service ID ${operatorId} not found`,
                404,
                {
                    devMsg: `Service ID ${operatorId} not found`,
                    usrMsg: `Le service demandé n'existe pas`,
                    respCode: 4004,
                    link: 'http://support.maviance.com/'
                }
            );
        }
        
        // Extraire operatorName du service
        const operatorName = service.name || service.serviceName;
    
        // 2. Récupérer le plan
        const plan = await Plan.findById(planId);
        if (!plan) {
            throw new Error('Plan not found');
        }
        
        // 3. Créer la transaction Smobilpay
        const paymentId = uuidv4();
        
        const smobilpayTransaction = new SmobilpayTransaction({
            paymentId,
            payItemId: service.payItemId,
            operatorName,
            operatorId,
            status: 'PENDING',
            amount: plan.price,
            currency: 'XAF',
            phoneNumber,
            email,
            customerName,
            user: userId,
            plan: planId
        });
        await smobilpayTransaction.save();
        
        // 4. Demander un devis (Quote)
        const quote = await requestQuote(service.payItemId, plan.price);
        
        // Mettre à jour la transaction avec le quoteId
        smobilpayTransaction.quoteId = quote.quoteId;
        await smobilpayTransaction.save();
        
        // 5. Exécuter le paiement
        const collectResult = await collectPayment(
            quote.quoteId, 
            { phoneNumber, email, customerName }, 
            paymentId
        );
        
        // Mettre à jour avec le PTN
        smobilpayTransaction.ptn = collectResult.ptn;
        await smobilpayTransaction.save();
        
        // Récupérer la transaction mise à jour pour être sûr d'avoir les dernières données
        const updatedTransaction = await SmobilpayTransaction.findById(smobilpayTransaction._id).populate('plan')
        .populate('user');
        
        // Retourner la transaction complète avec les informations de succès
        return {
            transaction: updatedTransaction
        };
    } catch (error) {
        // Si l'erreur est déjà une SmobilpayError, la transmettre directement
        if (error instanceof SmobilpayError) {
            await addLog(`Smobilpay API error during payment initiation: ${error.message}`, 'SmobilpayService.initiatePayment', 'error');
            throw error;
        }
        
        await addLog(`Payment initiation failed: ${error.message}`, 'SmobilpayService.initiatePayment', 'error');
        throw error;
    }
}
/**
 * Vérifie le statut d'une transaction par paymentId
 * 
 * @param {string} paymentId - L'identifiant unique du paiement
 * @returns {Promise<Object>} - Retourne la transaction mise à jour
 */
async function checkTransactionStatus(paymentId) {
    try {
        // Trouver la transaction
        const smobilpayTransaction = await SmobilpayTransaction.findOne({ paymentId });
        if (!smobilpayTransaction) {
            throw new SmobilpayError(
                `Transaction not found for paymentId: ${paymentId}`,
                404,
                {
                    devMsg: `Transaction not found for paymentId: ${paymentId}`,
                    usrMsg: `La transaction demandée n'existe pas`,
                    respCode: 4004
                }
            );
        }
        
        let apiResponse;
        
        // Si on a un PTN, vérifier par PTN (méthode préférée)
        if (smobilpayTransaction.ptn) {
            console.log(`Verifying transaction by PTN: ${smobilpayTransaction.ptn}`);
            apiResponse = await verifyTransaction(smobilpayTransaction.ptn);
        } else {
            // Pas de PTN, on vérifie par paymentId
            console.log(`Verifying transaction by paymentId: ${paymentId}`);
            apiResponse = await verifyTransaction(paymentId, true);
        }
        
        console.log('Smobilpay verification response:', apiResponse);
        
        // L'API retourne un tableau, on prend le premier élément
        const transactionData = Array.isArray(apiResponse) ? apiResponse[0] : apiResponse;
        
        if (transactionData) {
            console.log(`Transaction status from API: ${transactionData.status}, Current status: ${smobilpayTransaction.status}`);
            
            // Mettre à jour tous les champs disponibles dans la réponse API
            if (transactionData.ptn) smobilpayTransaction.ptn = transactionData.ptn;
            if (transactionData.status) smobilpayTransaction.status = transactionData.status;
            if (transactionData.timestamp) smobilpayTransaction.timestamp = new Date(transactionData.timestamp);
            if (transactionData.receiptNumber) smobilpayTransaction.receiptNumber = transactionData.receiptNumber;
            if (transactionData.veriCode) smobilpayTransaction.veriCode = transactionData.veriCode;
            if (transactionData.clearingDate) smobilpayTransaction.clearingDate = new Date(transactionData.clearingDate);
            if (transactionData.priceLocalCur) smobilpayTransaction.priceLocalCur = transactionData.priceLocalCur;
            if (transactionData.localCur) smobilpayTransaction.currency = transactionData.localCur;
            if (transactionData.pin) smobilpayTransaction.pin = transactionData.pin;
            if (transactionData.tag) smobilpayTransaction.tag = transactionData.tag;
            if (transactionData.errorCode) smobilpayTransaction.errorCode = transactionData.errorCode;
            
            // Sauvegarder les modifications de base
            await smobilpayTransaction.save();
            
            // Si la transaction est maintenant réussie et qu'elle n'a pas encore été traitée
            if (transactionData.status === 'SUCCESS' && !smobilpayTransaction.processed) {
                console.log(`Creating subscription for transaction ${smobilpayTransaction._id}`);
                
                try {
                    // Créer la souscription
                    await createSubscription(smobilpayTransaction);
                    
                    // Marquer comme traitée
                    smobilpayTransaction.processed = true;
                    await smobilpayTransaction.save();
                    
                    console.log(`Transaction ${smobilpayTransaction._id} marked as processed`);
                } catch (subscriptionError) {
                    console.error(`Error creating subscription: ${subscriptionError.message}`);
                    await addLog(`Error creating subscription: ${subscriptionError.message}`, 'SmobilpayService.checkTransactionStatus', 'error');
                    
                    // Ne pas marquer comme traitée en cas d'erreur dans la création de la souscription
                    // Cela permettra de réessayer ultérieurement
                }
            }
        }
        
        // Récupérer la transaction mise à jour pour être sûr d'avoir les dernières données
        const updatedTransaction = await SmobilpayTransaction.findById(smobilpayTransaction._id)
            .populate('plan')
            .populate('user');
        
        // Retourner la transaction complète avec les informations de succès
        return {
            transaction: updatedTransaction
        };
    } catch (error) {
        // Si l'erreur est déjà une SmobilpayError, la transmettre directement
        if (error instanceof SmobilpayError) {
            await addLog(`Smobilpay API error during status check: ${error.message}`, 'SmobilpayService.checkTransactionStatus', 'error');
            throw error;
        }
        
        await addLog(`Error checking transaction status: ${error.message}`, 'SmobilpayService.checkTransactionStatus', 'error');
        throw error;
    }
}
// Traitement du webhook (callback)
async function processWebhook(webhookData) {
    try {
        const { ptn, status, trid: paymentId } = webhookData;
        
        // Chercher par PTN ou par paymentId 
        const query = ptn ? { ptn } : { paymentId };
        const smobilpayTransaction = await SmobilpayTransaction.findOne(query);
        
        if (!smobilpayTransaction) {
            const errorMsg = `Transaction not found for webhook: ${JSON.stringify(query)}`;
            await addLog(errorMsg, 'SmobilpayService.processWebhook', 'error');
            
            // Créer une erreur SmobilpayError au format attendu par l'API
            throw new SmobilpayError(
                errorMsg,
                404,
                {
                    devMsg: errorMsg,
                    usrMsg: `La transaction n'a pas été trouvée`,
                    respCode: 4004
                }
            );
        }
        
        // Si le statut est le même, ne rien faire
        if (smobilpayTransaction.status === status) {
            return { success: true, message: 'Transaction status already up to date' };
        }
        
        // Mettre à jour le statut de la transaction
        smobilpayTransaction.status = status;
        await smobilpayTransaction.save();
        
        // Créer la souscription si la transaction est réussie
        if (status === 'SUCCESS') {
            await createSubscription(smobilpayTransaction);
        }
        
        return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
        // Si l'erreur est déjà une SmobilpayError, la transmettre directement
        if (error instanceof SmobilpayError) {
            await addLog(`Smobilpay error during webhook processing: ${error.message}`, 'SmobilpayService.processWebhook', 'error');
            throw error;
        }
        
        await addLog(`Error processing webhook: ${error.message}`, 'SmobilpayService.processWebhook', 'error');
        throw error;
    }
}

// Exporter toutes les fonctions
module.exports = {
    getServices,
    requestQuote,
    collectPayment,
    verifyTransaction,
    initiatePayment,
    checkTransactionStatus,
    processWebhook, 
    createSubscription,
    SmobilpayError // Exporter la classe d'erreur pour la vérification dans le contrôleur
};