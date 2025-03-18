const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const logService = require('../services/log.service');

class GooglePlayService {
  constructor() {
    this.androidPublisher = null;
    this.packageName = process.env.PACKAGE_NAME || 'com.bigwin.application';
    this.initialize();
  }

  async initialize() {
    try {
      // Chemin vers le fichier de clé du compte de service
      const keyFilePath = path.join(__dirname, '../google-service-account.json');

      if (!fs.existsSync(keyFilePath)) {
        throw new Error('Fichier de clé de compte de service Google introuvable');
      }

      // Créer un client d'authentification JWT avec la clé
      const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
      });

      const authClient = await auth.getClient();
      
      // Initialiser l'API Android Publisher
      this.androidPublisher = google.androidpublisher({
        version: 'v3',
        auth: authClient
      });

      console.log('Service Google Play initialisé avec succès');
    } catch (error) {
      console.error('Erreur d\'initialisation du service Google Play:', error);
      await logService.addLog(
        `Erreur d'initialisation du service Google Play: ${error.message}`,
        'GooglePlayService.initialize',
        'error'
      );
    }
  }

  /**
   * Vérifier un abonnement in-app
   * @param {string} productId - ID du produit (ex: com.bigwin.application.monthly)
   * @param {string} purchaseToken - Token de l'achat fourni par Google Play
   * @returns {Promise<Object>} Résultat de la vérification
   */
  async verifySubscription(productId, purchaseToken) {
    try {
      if (!this.androidPublisher) {
        await this.initialize();
      }

      const response = await this.androidPublisher.purchases.subscriptions.get({
        packageName: this.packageName,
        subscriptionId: productId,
        token: purchaseToken
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      await logService.addLog(
        `Erreur de vérification d'abonnement Google Play: ${error.message}`,
        'GooglePlayService.verifySubscription',
        'error'
      );
      return {
        success: false,
        error: error.message || 'Erreur de vérification'
      };
    }
  }

  /**
   * Analyser les données d'abonnement pour déterminer le statut et les détails
   * @param {Object} subscriptionData - Données d'abonnement de Google Play
   * @returns {Object} - Informations d'abonnement analysées
   */
  parseSubscriptionData(subscriptionData) {
    try {
      if (!subscriptionData) {
        return { 
          isActive: false, 
          reason: 'données_manquantes' 
        };
      }

      const now = Date.now();
      
      // Convertir les timestamps de microsecondes en millisecondes
      const startTimeMillis = parseInt(subscriptionData.startTimeMillis);
      const expiryTimeMillis = parseInt(subscriptionData.expiryTimeMillis);
      
      // Déterminer si l'abonnement est actif
      const isActive = expiryTimeMillis > now && 
                    (subscriptionData.paymentState === 1 || 
                     subscriptionData.paymentState === 2);
      
      const startDate = new Date(startTimeMillis);
      const endDate = new Date(expiryTimeMillis);
      
      // Calculer la durée en jours
      const durationMillis = expiryTimeMillis - startTimeMillis;
      const durationDays = Math.ceil(durationMillis / (1000 * 60 * 60 * 24));
      
      return {
        isActive,
        startDate,
        endDate,
        durationDays,
        startTimeMillis,
        expiryTimeMillis,
        autoRenewing: subscriptionData.autoRenewing || false,
        paymentState: this._getPaymentStateLabel(subscriptionData.paymentState),
        remainingDays: Math.ceil((expiryTimeMillis - now) / (1000 * 60 * 60 * 24)),
        purchaseToken: subscriptionData.purchaseToken,
        orderId: subscriptionData.orderId
      };
    } catch (error) {
      logService.addLog(
        `Erreur d'analyse des données d'abonnement: ${error.message}`,
        'GooglePlayService.parseSubscriptionData',
        'error'
      );
      return { isActive: false, reason: 'erreur_analyse' };
    }
  }

  /**
   * Obtenir le libellé de l'état de paiement
   * @param {number} state - Code d'état de paiement
   * @returns {string} - Libellé descriptif
   */
  _getPaymentStateLabel(state) {
    switch(state) {
      case 0: return 'en_attente';
      case 1: return 'actif';
      case 2: return 'essai';
      case 3: return 'différé';
      default: return 'inconnu';
    }
  }

  /**
   * Mapper l'ID produit Google Play à un plan dans la base de données
   * @param {string} productId - ID du produit Google Play
   * @returns {Object} - Informations sur le type de plan
   */
  async mapProductToPackageType(productId) {
    // Schéma de mapping des produits Google Play aux types de package
    const productMapping = {
      'com.bigwin.application.weekly': {
        name: 'Forfait VIP Hebdomadaire',
        duration: 7,
        type: 'vip'
      },
      'com.bigwin.application.monthly': {
        name: 'Forfait VIP Mensuel',
        duration: 30, 
        type: 'vip'
      },
      'com.bigwin.application.quarterly': {
        name: 'Forfait VIP Trimestriel',
        duration: 90,
        type: 'vip'
      },
      'com.bigwin.application.biannual': {
        name: 'Forfait VIP Semestriel',
        duration: 180,
        type: 'vip'
      },
      'com.bigwin.application.annual': {
        name: 'Forfait VIP Annuel',
        duration: 365,
        type: 'vip'
      },
      'com.bigwin.application.platinum': {
        name: 'Forfait Platinum',
        duration: 30,
        type: 'platinum'
      }
    };

    return productMapping[productId] || {
      name: 'Forfait Inconnu',
      duration: 30,
      type: 'vip'
    };
  }
}

module.exports = new GooglePlayService();