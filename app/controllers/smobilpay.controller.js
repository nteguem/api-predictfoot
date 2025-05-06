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
        const { serviceid } = req.query;
        console.log(`Controller: Getting services${serviceid ? ` for serviceid: ${serviceid}` : ''}`);
        
        // Vérifier que la fonction existe avant de l'appeler
        if (typeof smobilpayService.getServices !== 'function') {
            console.error('getServices is not a function!');
            console.error('smobilpayService type:', typeof smobilpayService);
            console.error('Available functions:', Object.keys(smobilpayService));
            return ResponseService.internalServerError(res, { message: 'Service not properly configured' });
        }
        
        const services = await smobilpayService.getServices(serviceid);
        return ResponseService.success(res, services);
    } catch (error) {
        return handleApiError(error, res, 'smobilpayController.getServices');
    }
};

// Initialiser un paiement
exports.initiatePayment = async (req, res) => {
    try {
        const { planId, operatorId, operatorName, phoneNumber, email, customerName, country } = req.body;
        const userId = req.user.userId;
        
        console.log(`Initiating payment for user: ${JSON.stringify(req.user)}, operator: ${operatorName}`);
        
        if (!planId || !operatorId || !operatorName || !phoneNumber || !email || !customerName || !country) {
            return ResponseService.badRequest(res, { message: 'Missing required fields' });
        }
        
        const paymentResult = await smobilpayService.initiatePayment({
            userId, planId, operatorId, operatorName, phoneNumber, email, customerName, country
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