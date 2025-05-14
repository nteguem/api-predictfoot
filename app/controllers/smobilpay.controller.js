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
        const email = `${req.user.pseudo.replace}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')}@gmail.com`;        
        console.log(`Initiating payment for user: ${JSON.stringify(req.user)}, operator ID: ${operatorId}`);
        
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