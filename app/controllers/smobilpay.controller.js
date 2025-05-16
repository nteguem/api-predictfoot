const smobilpayService = require('../services/smobilpay/smobilpay.service');
const { addLog } = require('../services/log.service');
const ResponseService = require('../services/response.service');


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
        const customerName = req.user.pseudo; // Use user's pseudo from auth
        
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
        
        console.log(`Initiating payment for user: ${JSON.stringify(req.user)}, operator ID: ${operatorId}`);
        console.log(`Generated email: ${email}`);
        
        if (!planId || !operatorId || !phoneNumber) {
            return ResponseService.badRequest(res, { message: 'Missing required fields' });
        }
        
        const paymentResult = await smobilpayService.initiatePayment({
            userId, planId, operatorId, phoneNumber, customerName, email
        });
        
        return ResponseService.success(res, paymentResult);
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