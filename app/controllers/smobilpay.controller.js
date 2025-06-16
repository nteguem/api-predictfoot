const smobilpayService = require('../services/smobilpay/smobilpay.service');
const { addLog } = require('../services/log.service');
const ResponseService = require('../services/response.service');

// Mapping des operatorId vers les codes pays
const OPERATOR_COUNTRY_MAPPING = {
    // Cameroun
    '20056': { country: 'CM', code: '237', name: 'MTN Mobile Money' },
    '30056': { country: 'CM', code: '237', name: 'Orange Money' },
    '90011': { country: 'CM', code: '237', name: 'Express Union' },
    '100236': { country: 'CM', code: '237', name: 'YooMee Money' },
    
    // Gabon
    '202411': { country: 'GA', code: '241', name: 'Moov Money' },
    '202413': { country: 'GA', code: '241', name: 'Airtel Money' },
    
    // Tchad
    '600006': { country: 'TD', code: '235', name: 'Moov Money' },
    
    // République Centrafricaine (RCA)
    '60009': { country: 'CF', code: '236', name: 'Orange Money' },
    
    // Congo Brazzaville
    '70011': { country: 'CG', code: '242', name: 'MTN Congo' }
};

/**
 * Formate le numéro de téléphone selon l'opérateur
 * @param {string} phoneNumber - Le numéro de téléphone
 * @param {string} operatorId - L'ID de l'opérateur
 * @returns {string} - Le numéro formaté avec le code pays
 */
function formatPhoneNumber(phoneNumber, operatorId) {
    if (!phoneNumber || !operatorId) {
        throw new Error('Numéro de téléphone et operatorId requis');
    }
    
    // Supprimer tous les espaces, le signe + et autres caractères non numériques
    let cleanNumber = phoneNumber.replace(/\s+/g, '').replace(/\+/g, '').replace(/[^\d]/g, '');
    
    // Récupérer les informations du pays selon l'opérateur
    const countryInfo = OPERATOR_COUNTRY_MAPPING[operatorId];
    if (!countryInfo) {
        throw new Error(`Opérateur non supporté: ${operatorId}`);
    }
    
    const { code: countryCode } = countryInfo;
    
    // Vérifier si le numéro commence déjà par le code pays
    if (cleanNumber.startsWith(countryCode)) {
        return cleanNumber; // Le numéro a déjà le code pays
    }
    
    // Ajouter le code pays au début
    return countryCode + cleanNumber;
}

/**
 * Valide le numéro de téléphone formaté
 * @param {string} formattedNumber - Le numéro formaté
 * @param {string} operatorId - L'ID de l'opérateur
 * @returns {boolean} - True si valide
 */
function validateFormattedNumber(formattedNumber, operatorId) {
    const countryInfo = OPERATOR_COUNTRY_MAPPING[operatorId];
    if (!countryInfo) return false;
    
    const { code: countryCode } = countryInfo;
    
    // Vérifications de base
    if (!formattedNumber.startsWith(countryCode)) return false;
    
    // Longueurs attendues par pays (avec code pays)
    const expectedLengths = {
        '237': 12, // Cameroun: 237 + 9 chiffres (ex: 237697874621)
        '241': 12, // Gabon: 241 + 9 chiffres (ex: 241071234567)
        '235': 11, // Tchad: 235 + 8 chiffres (ex: 23512345678)
        '236': 11, // RCA: 236 + 8 chiffres (ex: 23612345678)
        '242': 12  // Congo: 242 + 9 chiffres (ex: 242061234567)
    };
    
    const expectedLength = expectedLengths[countryCode];
    if (expectedLength && formattedNumber.length !== expectedLength) {
        return false;
    }
    
    return true;
}

// Fonction utilitaire pour gérer les erreurs
const handleApiError = (error, res, logContext) => {
    console.error(`${logContext} error:`, error.message);
    
    // Journaliser l'erreur
    addLog(`Error: ${error.message}`, logContext, 'error');
    
    // Si c'est une erreur Smobilpay spécifique avec le format d'API
    if (error instanceof smobilpayService.SmobilpayError) {
        // On utilise le même code de statut que celui retourné par l'API
        const statusCode = error.statusCode || 500;
        const responseData = error.responseData || { 
            usrMsg: error.message, 
            devMsg: error.message 
        };
        
        return res.status(statusCode).json({
            status: statusCode,
            message: responseData.usrMsg || responseData.devMsg || error.message,
            error: responseData
        });
    }
    
    // Si l'erreur vient d'Axios avec un code de statut spécifique
    if (error.response && error.response.status) {
        const statusCode = error.response.status;
        const errorMessage = error.response.data || error.message;
        
        return res.status(statusCode).json({
            status: statusCode,
            message: typeof errorMessage === 'object' ? 
                (errorMessage.usrMsg || errorMessage.devMsg || error.message) : 
                errorMessage,
            error: error.response.data
        });
    }
    
    // Pour les autres erreurs, on renvoie une erreur 500
    return ResponseService.internalServerError(res, { message: error.message });
};

// Récupérer les services disponibles
exports.getServices = async (req, res) => {
    try {
      const { serviceid, country } = req.query;
          
      // Vérifier que la fonction existe avant de l'appeler
      if (typeof smobilpayService.getServices !== 'function') {
        return ResponseService.internalServerError(res, { message: 'Service not properly configured' });
      } 
           
      const services = await smobilpayService.getServices(serviceid, country);
      return ResponseService.success(res, services);
    } catch (error) {
      return handleApiError(error, res, 'smobilpayController.getServices');
    }
};

// Initialiser un paiement
exports.initiatePayment = async (req, res) => {
    try {
        const { planId, operatorId, phoneNumber } = req.body;
        const userId = req.user.userId;
        const customerName = req.user.pseudo;
        
        // Validation des champs requis
        if (!planId || !operatorId || !phoneNumber) {
            return ResponseService.badRequest(res, { 
                message: 'Champs requis manquants: planId, operatorId, phoneNumber' 
            });
        }
        
        // Formatage automatique du numéro de téléphone
        let formattedPhoneNumber;
        try {
            formattedPhoneNumber = formatPhoneNumber(phoneNumber, operatorId);
        } catch (formatError) {
            return ResponseService.badRequest(res, { 
                message: `Erreur de formatage du numéro: ${formatError.message}` 
            });
        }
        
        // Validation du numéro formaté
        if (!validateFormattedNumber(formattedPhoneNumber, operatorId)) {
            return ResponseService.badRequest(res, { 
                message: 'Numéro de téléphone invalide pour cet opérateur' 
            });
        }
        
        // Générer une adresse email valide à partir du pseudo
        let emailUsername = req.user.pseudo
            .toLowerCase()
            .replace(/\s+/g, '.') // Remplacer les espaces par des points
            .replace(/[^\w.-]/g, ''); // Supprimer tous les caractères spéciaux
        
        // S'assurer qu'il y a au moins un caractère dans le nom d'utilisateur
        if (!emailUsername || emailUsername.length === 0) {
            emailUsername = `user${Date.now()}`;
        }
        
        // Créer l'adresse email complète
        const email = `${emailUsername}@gmail.com`;
        
        // Log pour debug
        console.log(`Numéro original: ${phoneNumber}`);
        console.log(`Numéro formaté: ${formattedPhoneNumber}`);
        console.log(`Opérateur: ${operatorId} (${OPERATOR_COUNTRY_MAPPING[operatorId]?.name})`);
        
        // Appel du service avec le numéro formaté
        const paymentResult = await smobilpayService.initiatePayment({
            userId, 
            planId, 
            operatorId, 
            phoneNumber: formattedPhoneNumber, // Utiliser le numéro formaté
            customerName, 
            email
        });
        
        return ResponseService.success(res, {
            ...paymentResult,
            formattedPhoneNumber // Retourner aussi le numéro formaté pour confirmation
        });
        
    } catch (error) {
        return handleApiError(error, res, 'smobilpayController.initiatePayment');
    }
};

// Vérifier le statut d'un paiement
exports.checkStatus = async (req, res) => {
    try {
        const { paymentId } = req.params;
        console.log(`Checking status for payment: ${paymentId}`);
        
        const result = await smobilpayService.checkTransactionStatus(paymentId);
        return ResponseService.success(res, result);
    } catch (error) {
        return handleApiError(error, res, 'smobilpayController.checkStatus');
    }
};

// Traiter le webhook (callback)
exports.webhook = async (req, res) => {
    try {
        console.log('Received webhook data:', JSON.stringify(req.body));
        
        const result = await smobilpayService.processWebhook(req.body);
        return ResponseService.success(res, result);
    } catch (error) {
        return handleApiError(error, res, 'smobilpayController.webhook');
    }
};

// Fonction utilitaire pour obtenir les infos pays
exports.getCountryInfoByOperator = (operatorId) => {
    return OPERATOR_COUNTRY_MAPPING[operatorId] || null;
};

// Fonction utilitaire pour lister tous les opérateurs supportés
exports.getSupportedOperators = () => {
    return Object.entries(OPERATOR_COUNTRY_MAPPING).map(([id, info]) => ({
        operatorId: id,
        operatorName: info.name,
        country: info.country,
        countryCode: info.code
    }));
};