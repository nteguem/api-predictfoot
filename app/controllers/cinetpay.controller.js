const cinetpayService = require('../services/cinetPay.service');
const { addLog } = require('../services/log.service');
const ResponseService = require('../services/response.service');

// Fonction utilitaire pour gérer les erreurs
const handleApiError = (error, res, logContext) => {
    console.error(`${logContext} error:`, error.message);
    
    // Journaliser l'erreur
    addLog(`Error: ${error.message}`, logContext, 'error');
    
    // Si c'est une erreur CinetPay spécifique
    if (error instanceof cinetpayService.CinetpayError) {
        const statusCode = error.statusCode || 500;
        const responseData = error.responseData || { 
            message: error.message, 
            description: error.message 
        };
        
        return res.status(statusCode).json({
            status: statusCode,
            message: responseData.message || responseData.description || error.message,
            error: responseData
        });
    }
    
    // Si l'erreur vient d'Axios
    if (error.response && error.response.status) {
        const statusCode = error.response.status;
        const errorMessage = error.response.data || error.message;
        
        return res.status(statusCode).json({
            status: statusCode,
            message: typeof errorMessage === 'object' ? 
                (errorMessage.message || errorMessage.description || error.message) : 
                errorMessage,
            error: error.response.data
        });
    }
    
    // Autres erreurs
    return ResponseService.internalServerError(res, { message: error.message });
};

// Initialiser un paiement CinetPay
exports.initiatePayment = async (req, res) => {
    try {
        const { 
            planId, 
            phoneNumber, 
        } = req.body;
        
        const userId = req.user.userId;
        
        // Validation des champs requis
        if (!planId || !phoneNumber) {
            return ResponseService.badRequest(res, { 
                message: 'planId et phoneNumber sont requis' 
            });
        }
        
        // Appel du service CinetPay
        const paymentResult = await cinetpayService.initiatePayment({
            userId, 
            planId, 
            phoneNumber
        });
        
        return ResponseService.success(res, paymentResult);
        
    } catch (error) {
        return handleApiError(error, res, 'cinetpayController.initiatePayment');
    }
};

// Vérifier le statut d'un paiement
exports.checkStatus = async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        if (!transactionId) {
            return ResponseService.badRequest(res, { 
                message: 'transactionId est requis' 
            });
        }
        
        console.log(`CinetPay - Vérification statut transaction: ${transactionId}`);
        
        const result = await cinetpayService.checkTransactionStatus(transactionId);
        return ResponseService.success(res, result);
    } catch (error) {
        return handleApiError(error, res, 'cinetpayController.checkStatus');
    }
};

// Traiter le webhook CinetPay
exports.webhook = async (req, res) => {
    try {
        console.log('CinetPay - Webhook reçu:', JSON.stringify(req.body, null, 2));
        
        // Récupérer le token HMAC depuis les headers
        const receivedToken = req.headers['x-token'];
        
        if (!receivedToken) {
            console.warn('CinetPay - Webhook reçu sans token x-token');
            await addLog('CinetPay webhook reçu sans x-token header', 'cinetpayController.webhook', 'warning');
        }
        
        const result = await cinetpayService.processWebhook(req.body, receivedToken);
        
        // CinetPay attend une réponse simple
        return res.status(200).json({
            status: 'success',
            message: 'Webhook traité avec succès'
        });
        
    } catch (error) {
        console.error('CinetPay - Erreur webhook:', error);
        return handleApiError(error, res, 'cinetpayController.webhook');
    }
};