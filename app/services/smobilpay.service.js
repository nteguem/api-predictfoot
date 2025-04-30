// services/smobilpay.service.js

const axios = require('axios');
const crypto = require('crypto');
const NodeCache = require('node-cache');

// Cache pour stocker les services par pays (durée: 1 heure)
const serviceCache = new NodeCache({ stdTTL: 3600 });

// Mapping des préfixes de merchant vers les codes pays
const COUNTRY_PREFIX_MAPPING = {
  // Cameroun
  'CM': 'CM',
  'MTNMOMO': 'CM', // MTN Mobile Money Cameroun
  'CMORANGEOM': 'CM', // Orange Money Cameroun
  'CMEXPRESSUNION': 'CM', // Express Union Cameroun
  'CMYOOMEEMONEY': 'CM',
  'CMUBAAB': 'CM',
  'CMGIMAC': 'CM',
  'CMGIMACMTN': 'CM',
  'CMECOBANK': 'CM',
  'CMORANGEMOMO': 'CM',
  
  // Congo
  'CG': 'CG',
  'CGMTNMOMO': 'CG', // MTN Mobile Money Congo
  'CGAIRTELMONEY': 'CG', // Airtel Money Congo
  
  // République Centrafricaine
  'RCA': 'RCA',
  'RCAOM': 'RCA', // Orange Money RCA
  
  // Tchad
  'TCD': 'TCD',
  'TCDMOOVMONEY': 'TCD', // Moov Money Tchad
  
  // Gabon
  'GAB': 'GAB',
  'GABMOOVMONEY': 'GAB', // Moov Money Gabon
  'GABAIRTELMONEY': 'GAB' // Airtel Money Gabon
};

class SmobilpayService {
  constructor() {
    this.baseUrl = process.env.S3P_URL;
    this.apiKey = process.env.S3P_KEY;
    this.apiSecret = process.env.S3P_SECRET;
    
    // Préchargement des services lors de l'initialisation du service
    this.initializeServices();
  }
  
  /**
   * Précharge tous les services disponibles dans le cache
   */
  async initializeServices() {
    try {
      await this.fetchAllServices();
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des services:', error);
    }
  }

  /**
   * Génère l'entête d'authentification pour les requêtes S3P
   */
  // services/smobilpay.service.js - Fonction generateAuthHeader() modifiée

  generateAuthHeader(method, path, queryParams = {}, bodyParams = {}) {
    // Vérifier que method et path sont bien définis
    if (!method) {
      console.error('Méthode HTTP non définie');
      method = 'POST'; // Valeur par défaut
    }
    
    if (!path) {
      console.error('Chemin non défini');
      path = '/collect'; // Valeur par défaut ou le chemin que vous essayez d'accéder
    }
    
    // Assurez-vous que path commence par un slash
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    const timestamp = Date.now();
    const nonce = Date.now();
    const signatureMethod = "HMAC-SHA1";
    
    const allParams = {
      ...queryParams,
      ...bodyParams,
      s3pAuth_nonce: nonce,
      s3pAuth_timestamp: timestamp,
      s3pAuth_signature_method: signatureMethod,
      s3pAuth_token: this.apiKey
    };
    
    // Nettoyer les paramètres
    Object.keys(allParams).forEach(key => {
      if (typeof allParams[key] === 'string') {
        allParams[key] = allParams[key].trim();
      }
    });
    
    // Trier les paramètres
    const sortedParams = {};
    Object.keys(allParams).sort().forEach(key => {
      sortedParams[key] = allParams[key];
    });
    
    // Construire la chaîne de paramètres
    const parameterString = Object.keys(sortedParams)
      .map(key => `${key}=${sortedParams[key]}`)
      .join('&');
    
    // Construire la chaîne de base complète
    const url = `${this.baseUrl}${path}`;
    const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(parameterString)}`;
    
    // Générer la signature
    const signature = crypto
      .createHmac('sha1', this.apiSecret)
      .update(baseString)
      .digest('base64');
    
    // Construire l'en-tête d'authentification
    const authHeader = 
      `s3pAuth s3pAuth_timestamp="${timestamp}", ` +
      `s3pAuth_signature="${signature}", ` +
      `s3pAuth_nonce="${nonce}", ` +
      `s3pAuth_signature_method="${signatureMethod}", ` +
      `s3pAuth_token="${this.apiKey}"`;
    
    console.log('Base String:', baseString);
    console.log('Auth Header:', authHeader);
    
    return {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    };
  }
  /**
   * Récupère tous les services disponibles et les classe par pays
   */
/**
 * Récupère tous les services disponibles et les classe par pays
 */
async fetchAllServices() {
    try {
      const path = '/cashin';
      const headers = this.generateAuthHeader('GET', path);
      const response = await axios.get(`${this.baseUrl}${path}`, { headers });
      
      if (!Array.isArray(response.data)) {
        throw new Error('Format de réponse inattendu');
      }
      
      // Grouper les services par pays
      const servicesByCountry = {};
      const allServices = response.data;
      
      // Initialiser les tableaux de services pour chaque pays
      Object.values(COUNTRY_PREFIX_MAPPING).forEach(country => {
        if (!servicesByCountry[country]) {
          servicesByCountry[country] = [];
        }
      });
      
      // Classer les services par pays
      allServices.forEach(service => {
        const merchant = service.merchant;
        let country = null;
        
        // Déterminer le pays à partir du merchant
        for (const [prefix, countryCode] of Object.entries(COUNTRY_PREFIX_MAPPING)) {
          if (merchant.startsWith(prefix)) {
            country = countryCode;
            break;
          }
        }
        
        // Si le pays est identifié, ajouter le service à ce pays
        if (country && servicesByCountry[country]) {
          servicesByCountry[country].push(service);
        }
      });
      
      // Stocker dans le cache avec une clé pour tous les services
      serviceCache.set('all_services', allServices);
      
      // Stocker chaque pays séparément
      Object.entries(servicesByCountry).forEach(([country, services]) => {
        serviceCache.set(`services_${country}`, services);
      });
      
      return allServices;
    } catch (error) {
      console.error('Erreur lors de la récupération des services:', error);
      throw error;
    }
  }
  

  /**
   * Récupère les services disponibles pour un pays spécifique
   * @param {string} countryCode - Code du pays (CM, CG, RCA, TCD, GAB)
   */
  async getServicesByCountry(countryCode) {
    // Normaliser le code pays
    const normalizedCountryCode = countryCode.toUpperCase();
    
    // Vérifier si les services pour ce pays sont dans le cache
    const cacheKey = `services_${normalizedCountryCode}`;
    let services = serviceCache.get(cacheKey);
    
    // Si pas dans le cache, rafraîchir tous les services
    if (!services) {
      await this.fetchAllServices();
      services = serviceCache.get(cacheKey);
    }
    
    return services || [];
  }
  
  /**
   * Récupère tous les services disponibles
   */
  async getAllServices() {
    // Vérifier si les services sont dans le cache
    let services = serviceCache.get('all_services');
    
    // Si pas dans le cache, récupérer tous les services
    if (!services) {
      services = await this.fetchAllServices();
    }
    
    return services || [];
  }

  /**
   * Récupère l'identifiant du service de paiement en fonction du pays et de l'opérateur
   * @param {string} countryCode - Code du pays (CM, CG, RCA, TCD, GAB)
   * @param {string} operator - Opérateur (MTN, ORANGE, etc.)
   */
  async getPaymentItemByCountryAndOperator(countryCode, operator) {
    try {
      // Récupérer les services pour ce pays
      const services = await this.getServicesByCountry(countryCode);
      
      // Trouver le service correspondant à l'opérateur
      let matchingService = null;
      
      if (operator === 'CM_MTNMOBILEMONEY') {
        // Rechercher MTN Money pour ce pays
        matchingService = services.find(s => 
          s.merchant.includes('MTNMOMO') || 
          s.name.toLowerCase().includes('mtn')
        );
      } else if (operator === 'CM_ORANGEMONEY') {
        // Rechercher Orange Money pour ce pays
        matchingService = services.find(s => 
          s.merchant.includes('ORANGEOM') ||
          s.merchant.includes('ORANGEMOMO') ||
          s.name.toLowerCase().includes('orange')
        );
      } else if (operator === 'CM_EUMM') {
        // Rechercher Express Union pour ce pays
        matchingService = services.find(s => 
          s.merchant.includes('EXPRESSUNION') ||
          s.name.toLowerCase().includes('express union')
        );
      }
      
      if (!matchingService) {
        throw new Error(`Aucun service correspondant à l'opérateur ${operator} trouvé pour le pays ${countryCode}`);
      }
      
      return matchingService.payItemId;
    } catch (error) {
      console.error('Erreur lors de la récupération du payment item:', error);
      throw error;
    }
  }
  
    /**
   * Étape 2: Demander un devis pour la transaction
   * @param {string} payItemId - Identifiant de l'élément de paiement
   * @param {number} amount - Montant de la transaction
   */
    async requestQuote(payItemId, amount) {
        try {
          const path = '/quotestd';
          const bodyParams = {
            payItemId: payItemId,
            amount: amount
          };
          const headers = this.generateAuthHeader('POST', path, {}, bodyParams);
          
          const response = await axios.post(
            `${this.baseUrl}${path}`,
            bodyParams,
            { headers }
          );
          
          if (response.data && response.data.quoteId) {
            return response.data.quoteId;
          }
          
          throw new Error('Impossible de générer un devis');
        } catch (error) {
          console.error('Erreur lors de la demande de devis:', error);
          throw error;
        }
      }
  
  /**
   * Étape 3: Exécuter le paiement
   * @param {string} quoteId - Identifiant du devis
   * @param {object} customerInfo - Informations du client
   */
/**
 * Étape 3: Exécuter la collecte de paiement avec les informations client
 * @param {string} quoteId - ID du devis généré précédemment
 * @param {object} customerData - Données du client (nom, email, adresse, téléphone)
 * @param {string} transactionId - Identifiant unique de la transaction côté client
 */
async executePayment(quoteId, customerData, transactionId) {
    try {
      // Définir explicitement la méthode et le chemin
      const method = 'POST';
      const path = '/collectstd';
      
      // Préparer les données du corps de la requête selon la spécification de l'API Smobilpay
      const bodyParams = {
        quoteId: quoteId,
        customerPhonenumber: customerData.phoneNumber, // Attention au nom du champ (Phonenumber et pas PhoneNumber)
        customerEmailaddress: customerData.email, // Attention au nom du champ (Emailaddress et pas EmailAddress)
        customerName: customerData.name,
        customerAddress: customerData.address,
        serviceNumber: customerData.serviceNumber || customerData.phoneNumber, // Utiliser le téléphone comme serviceNumber par défaut
        trid: transactionId || `tr-${Date.now()}` // Identifiant de transaction unique
      };
      
      // Générer les en-têtes d'authentification avec la méthode et le chemin explicites
      const headers = this.generateAuthHeader(method, path, {}, bodyParams);
      
      // Effectuer la requête POST vers l'API Smobilpay
      const response = await axios.post(
        `${this.baseUrl}${path}`,
        bodyParams,
        { headers }
      );
      
      // Vérifier et traiter la réponse
      if (response.data && response.data.ptn) {
        // Succès: retourner les informations importantes
        return {
          ptn: response.data.ptn, // Identifiant de transaction du processeur de paiement
          status: response.data.status || 'PENDING',
          message: response.data.message || 'Transaction initiée avec succès'
        };
      } else {
        // Réponse inattendue mais pas d'erreur HTTP
        throw new Error('Format de réponse inattendu de l\'API de paiement');
      }
    } catch (error) {
      // Gérer les erreurs de manière détaillée
      console.error('Erreur lors de l\'exécution du paiement:', error);
      
      // Si la réponse de l'API contient des détails d'erreur, les extraire
      if (error.response && error.response.data) {
        console.error('Détails de l\'erreur:', error.response.data);
        
        // Remonter le message d'erreur spécifique s'il existe
        if (error.response.data.usrMsg || error.response.data.devMsg) {
          throw new Error(error.response.data.usrMsg || error.response.data.devMsg);
        }
      }
      
      // Propager l'erreur originale
      throw error;
    }
  }
/**
 * Étape 4: Vérifier le statut de la transaction
 * @param {string} ptn - Numéro de transaction de paiement
 * @returns {object} - Statut de la transaction
 */
async verifyPayment(ptn) {
  try {
    // S'assurer que ptn est une chaîne de caractères
    if (!ptn) {
      throw new Error('PTN est requis pour vérifier le statut de la transaction');
    }
    
    // Convertir en chaîne si ce n'est pas déjà le cas
    const ptnStr = String(ptn);
    
    // Définir explicitement la méthode et le chemin
    const method = 'GET';
    const path = '/verifytx';
    const queryParams = { ptn: ptnStr };
    
    // Générer les en-têtes d'authentification avec tous les paramètres nécessaires
    const headers = this.generateAuthHeader(method, path, queryParams, {});
    
    // Construire l'URL avec le paramètre ptn correctement encodé
    const url = `${this.baseUrl}${path}?ptn=${encodeURIComponent(ptnStr)}`;
    
    console.log(`Vérification de la transaction avec PTN: ${ptnStr}`);
    console.log(`URL complète: ${url}`);
    
    // Effectuer la requête GET
    const response = await axios.get(url, { headers });
    
    // Traiter la réponse
    if (response.data) {
      console.log('Réponse de vérification de transaction:', response.data);
      
      // Retourner les données pertinentes
      return {
        status: this.mapStatusFromSmobilpay(response.data.status),
        transactionId: response.data.trid || null,
        message: response.data.message || 'Vérification réussie',
        rawData: response.data
      };
    }
    
    // Réponse vide ou inattendue
    return {
      status: 'UNKNOWN',
      message: 'Format de réponse inattendu'
    };
  } catch (error) {
    console.error('Erreur lors de la vérification du paiement:', error);
    
    // Afficher des détails supplémentaires sur l'erreur
    if (error.response && error.response.data) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
    
    throw error;
  }
}

/**
 * Convertit le statut Smobilpay en statut interne
 * @param {string} smobilpayStatus - Statut retourné par Smobilpay
 * @returns {string} - Statut interne standardisé
 */
mapStatusFromSmobilpay(smobilpayStatus) {
  // Mappage des codes de statut Smobilpay vers des statuts internes
  const statusMap = {
    '0': 'PENDING',  // En attente
    '1': 'SUCCESS',  // Succès
    '2': 'FAILED',   // Échec
    '3': 'CANCELED', // Annulé
    // Ajouter d'autres mappages selon la documentation Smobilpay
  };
  
  // Retourner le statut correspondant ou PENDING par défaut
  return statusMap[smobilpayStatus] || 'PENDING';
}
}

module.exports = new SmobilpayService();