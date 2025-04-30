// controllers/payment.controller.js

const SmobilpayService = require('../services/smobilpay.service');
const SmobilpayTransaction = require('../models/smobilpayTransaction.model');
const Plan = require('../models/plan.model');
const User = require('../models/user.model');
const { addLog } = require('../services/log.service');
const geoip = require('geoip-lite');
// Mappage des opérateurs internes vers des identifiants pour Smobilpay
const INTERNAL_OPERATOR_MAPPING = {
  'CM_MTNMOBILEMONEY': 'MTNMOMO', 
  'CM_ORANGEMONEY': 'ORANGEOM',
  'CM_EUMM': 'EXPRESSUNION'
};

// Mappage des codes pays vers les codes ISO
const COUNTRY_CODE_MAPPING = {
  'CM': 'CM',    // Cameroun
  'CG': 'CG',    // Congo
  'CF': 'RCA',   // République Centrafricaine (ISO: CF, Smobilpay: RCA)
  'TD': 'TCD',   // Tchad (ISO: TD, Smobilpay: TCD)
  'GA': 'GAB'    // Gabon (ISO: GA, Smobilpay: GAB)
};

/**
 * Récupérer les services de paiement disponibles pour un pays
 */
exports.getPaymentServicesByCountry = async (req, res) => {
  try {
    let { countryCode } = req.params;
    
    // Si le code pays n'est pas fourni, essayer de déterminer à partir de l'IP
    if (!countryCode) {
      const ip = req.headers['x-forwarded-for'] || 
                 req.connection.remoteAddress || 
                 req.socket.remoteAddress;
      
      const geo = geoip.lookup(ip);
      if (geo && geo.country) {
        const mappedCountry = COUNTRY_CODE_MAPPING[geo.country];
        if (mappedCountry) {
          countryCode = mappedCountry;
        } else {
          // Par défaut, utiliser le Cameroun si le pays n'est pas supporté
          countryCode = 'CM';
        }
      } else {
        countryCode = 'CM'; // Par défaut
      }
    }
    
    // Convertir les codes ISO standards en codes internes si nécessaire
    if (COUNTRY_CODE_MAPPING[countryCode]) {
      countryCode = COUNTRY_CODE_MAPPING[countryCode];
    }
    
    // Obtenir les services pour ce pays
    const services = await SmobilpayService.getServicesByCountry(countryCode);
    
    // Transformer les données pour renvoyer un format simplifié
    const formattedServices = services.map(service => ({
      id: service.serviceid,
      name: service.name,
      description: service.description,
      merchant: service.merchant,
      currency: service.localCur,
      payItemId: service.payItemId
    }));
    
    return res.status(200).json({
      success: true,
      data: {
        country: countryCode,
        services: formattedServices
      }
    });
    
  } catch (error) {
    await addLog(
      `Erreur lors de la récupération des services de paiement: ${error.message}`,
      'getPaymentServicesByCountry',
      'error'
    );
    
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la récupération des services de paiement',
      error: error.message
    });
  }
};

/**
 * Initier un paiement via Smobilpay
 */
exports.initiateSmobilpayPayment = async (req, res) => {
  try {
    const { 
      planId, 
      paymentMethod, 
      phoneNumber,
      customerName,
      customerEmail,
      customerAddress,
      countryCode
    } = req.body;
    
    // Vérification des paramètres requis
    if (!planId || !paymentMethod || !phoneNumber || !customerName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Paramètres manquants: planId, paymentMethod, phoneNumber et customerName sont requis' 
      });
    }
    
    // Récupération du plan
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ 
        success: false, 
        message: 'Plan non trouvé' 
      });
    }
    // Récupération de l'utilisateur (à partir du token d'authentification)
    const userId = req.user.userId;
  
    
    // Déterminer le pays à partir de l'IP ou du paramètre
    let userCountryCode = countryCode;
    if (!userCountryCode) {
      const ip = req.headers['x-forwarded-for'] || 
                req.connection.remoteAddress || 
                req.socket.remoteAddress;
      
      const geo = geoip.lookup(ip);
      if (geo && geo.country) {
        const mappedCountry = COUNTRY_CODE_MAPPING[geo.country];
        if (mappedCountry) {
          userCountryCode = mappedCountry;
        } else {
          userCountryCode = 'CM'; // Par défaut Cameroun
        }
      } else {
        userCountryCode = 'CM'; // Par défaut Cameroun
      }
    }
    
    // Convertir les codes ISO standards en codes internes si nécessaire
    if (COUNTRY_CODE_MAPPING[userCountryCode]) {
      userCountryCode = COUNTRY_CODE_MAPPING[userCountryCode];
    }
    
    // Étape 1: Récupérer le payment item ID en fonction du pays et de l'opérateur
    const payItemId = await SmobilpayService.getPaymentItemByCountryAndOperator(
      userCountryCode, 
      paymentMethod
    );
    
    // Étape 2: Demander un devis
    const quoteId = await SmobilpayService.requestQuote(payItemId, plan.price);
    
    // Préparer les informations client pour l'étape 3
    const customerInfo = {
      phoneNumber,
      name: customerName,
      email: customerEmail || user.email,
      address: customerAddress || 'N/A',
      serviceNumber: phoneNumber // Utilisé pour certains services
    };
    
    // Étape 3: Exécuter le paiement
    const ptn = await SmobilpayService.executePayment(quoteId, customerInfo);
    
    // Créer un enregistrement de transaction dans notre base de données
    const smobilpayTransaction = new SmobilpayTransaction({
      ptn,
      quoteId,
      payItemId,
      status: 'PENDING',
      paymentMethod,
      amount: plan.price,
      currency: 'XAF',
      phoneNumber,
      customerName,
      customerEmail: customerEmail || user.email,
      customerAddress: customerAddress || 'N/A',
      description: `Abonnement au plan ${plan.name}`,
      user: userId,
      plan: planId,
      countryCode: userCountryCode
    });
    
    await smobilpayTransaction.save();
    
    // Retourner les informations nécessaires au client
    return res.status(200).json({
      success: true,
      message: 'Paiement initié avec succès',
      data: {
        transactionId: smobilpayTransaction._id,
        ptn,
        status: 'PENDING',
        countryCode: userCountryCode
      }
    });
    
  } catch (error) {
    await addLog(
      `Erreur lors de l'initiation du paiement Smobilpay: ${error.message}`,
      'initiateSmobilpayPayment',
      'error'
    );
    
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de l\'initiation du paiement',
      error: error.message
    });
  }
};

/**
 * Vérifier le statut d'un paiement Smobilpay
 */
exports.checkSmobilpayPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    // Récupérer la transaction de notre base de données
    const transaction = await SmobilpayTransaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée'
      });
    }
    // console.log("req.user",req.user)
    // // Vérifier que l'utilisateur a le droit de consulter cette transaction
    // if (transaction.user.toString() !== req.user.userId) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Vous n\'êtes pas autorisé à accéder à cette transaction'
    //   });
    // }
    
    // Étape 4: Vérifier le statut de la transaction auprès de Smobilpay
    const paymentStatus = await SmobilpayService.verifyPayment(transaction.ptn.ptn);
    
    // Mettre à jour le statut de la transaction dans notre base de données
    let status = 'PENDING';
    if (paymentStatus.status === 'SUCCESS') {
      status = 'SUCCESS';
    } else if (paymentStatus.status === 'FAILED') {
      status = 'FAILED';
    } else if (paymentStatus.status === 'CANCELED') {
      status = 'CANCELED';
    }
    
    // Mettre à jour notre transaction
    if (status !== transaction.status) {
      await transaction.updateStatus(status);
    }
    
    return res.status(200).json({
      success: true,
      data: {
        transactionId: transaction._id,
        ptn: transaction.ptn,
        status,
        amount: transaction.amount,
        currency: transaction.currency,
        planId: transaction.plan,
        countryCode: transaction.countryCode,
        updatedAt: transaction.updatedAt
      }
    });
    
  } catch (error) {
    await addLog(
      `Erreur lors de la vérification du statut de paiement Smobilpay: ${error.message}`,
      'checkSmobilpayPaymentStatus',
      'error'
    );
    
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de la vérification du statut de paiement',
      error: error.message
    });
  }
};

/**
 * Webhook pour les notifications Smobilpay
 */
exports.smobilpayWebhook = async (req, res) => {
  try {
    const { ptn, status, signature } = req.body;
    
    // Vérifier la signature pour s'assurer que la requête vient bien de Smobilpay
    // Cette partie dépendra de la documentation de Smobilpay pour la vérification des webhooks
    // const isValidSignature = verifySmobilpaySignature(req.body, signature);
    // if (!isValidSignature) {
    //   return res.status(403).json({ message: 'Signature invalide' });
    // }
    
    if (!ptn || !status) {
      return res.status(400).json({ message: 'Paramètres manquants' });
    }
    
    // Trouver la transaction correspondante
    const transaction = await SmobilpayTransaction.findOne({ ptn });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction non trouvée' });
    }
    
    // Mettre à jour le statut
    let newStatus = 'PENDING';
    if (status === 'SUCCESS') {
      newStatus = 'SUCCESS';
    } else if (status === 'FAILED') {
      newStatus = 'FAILED';
    } else if (status === 'CANCELED') {
      newStatus = 'CANCELED';
    }
    
    if (newStatus !== transaction.status) {
      await transaction.updateStatus(newStatus);
    }
    
    // Répondre au webhook
    return res.status(200).json({ message: 'Notification traitée avec succès' });
    
  } catch (error) {
    await addLog(
      `Erreur lors du traitement du webhook Smobilpay: ${error.message}`,
      'smobilpayWebhook',
      'error'
    );
    
    // Toujours renvoyer 200 pour les webhooks, même en cas d'erreur
    // pour éviter les retentatives inutiles
    return res.status(200).json({ 
      message: 'Notification reçue mais erreur de traitement' 
    });
  }
};