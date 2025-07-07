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
            phoneNumber 
        } = req.body;
        
        const userId = req.user.userId;
        
        // Validation des champs requis
        if (!planId || !phoneNumber) {
            return ResponseService.badRequest(res, { 
                message: 'planId et phoneNumber sont requis' 
            });
        }
        
        console.log(`CinetPay - Initiation paiement pour user ${userId}, plan ${planId}`);
        console.log(`CinetPay - Téléphone: ${phoneNumber}`);
        
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
        console.log('CinetPay - Headers webhook:', JSON.stringify(req.headers, null, 2));
        
        // Récupérer le token HMAC depuis les headers
        const receivedToken = req.headers['x-token'];
        
        if (!receivedToken) {
            console.warn('CinetPay - Webhook reçu sans token x-token');
            await addLog('CinetPay webhook reçu sans x-token header', 'cinetpayController.webhook', 'warning');
        }
        
        const result = await cinetpayService.processWebhook(req.body, receivedToken);
        
        // CinetPay attend une réponse simple (toujours 200)
        return res.status(200).json({
            status: 'success',
            message: 'Webhook traité avec succès'
        });
        
    } catch (error) {
        console.error('CinetPay - Erreur webhook:', error);
        
        // Log l'erreur mais retourner 200 pour éviter les retry CinetPay
        await addLog(`CinetPay webhook error: ${error.message}`, 'cinetpayController.webhook', 'error');
        
        return res.status(200).json({
            status: 'error',
            message: 'Erreur lors du traitement du webhook'
        });
    }
};

// Page de retour après paiement (return_url)
exports.paymentSuccess = async (req, res) => {
    try {
        // CinetPay envoie token et transaction_id en paramètres (GET ou POST)
        const { token, transaction_id } = req.method === 'GET' ? req.query : req.body;
        
        console.log(`CinetPay - Return URL appelée avec token: ${token}, transaction_id: ${transaction_id}`);
        
        if (!transaction_id) {
            return res.status(400).send(`
                <html>
                    <head>
                        <title>CinetPay - Erreur</title>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                            .error { color: #e74c3c; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1 class="error">❌ Erreur</h1>
                            <p>Paramètres de transaction manquants.</p>
                            <p><a href="#" onclick="window.close()">Fermer cette page</a></p>
                        </div>
                    </body>
                </html>
            `);
        }
        
        // Vérifier le statut de la transaction via l'API CinetPay
        // (Pas de traitement en BDD selon la documentation)
        let transactionStatus;
        let errorOccurred = false;
        
        try {
            const result = await cinetpayService.checkTransactionStatus(transaction_id);
            transactionStatus = result.transaction;
        } catch (error) {
            console.error('CinetPay - Erreur lors de la vérification:', error.message);
            errorOccurred = true;
            await addLog(`CinetPay return URL error: ${error.message}`, 'cinetpayController.paymentSuccess', 'error');
        }
        
        // Générer la page de résultat
        let pageContent;
        
        if (errorOccurred) {
            // Erreur de vérification
            pageContent = `
                <html>
                    <head>
                        <title>CinetPay - Vérification</title>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                            .warning { color: #f39c12; }
                            .btn { display: inline-block; padding: 12px 24px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1 class="warning">⏳ Vérification en cours</h1>
                            <p>Nous vérifions le statut de votre paiement...</p>
                            <p>Vous recevrez une notification dès que le traitement sera terminé.</p>
                            <p><strong>Transaction:</strong> ${transaction_id}</p>
                            <a href="#" class="btn" onclick="window.close()">Fermer</a>
                        </div>
                    </body>
                </html>
            `;
        } else if (transactionStatus.status === 'ACCEPTED') {
            // Paiement réussi
            pageContent = `
                <html>
                    <head>
                        <title>CinetPay - Paiement Réussi</title>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                            .success { color: #27ae60; }
                            .details { background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: left; }
                            .btn { display: inline-block; padding: 12px 24px; background: #27ae60; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1 class="success">🎉 Paiement Réussi !</h1>
                            <p>Votre abonnement <strong>${transactionStatus.plan.name}</strong> a été activé avec succès.</p>
                            
                            <div class="details">
                                <p><strong>Transaction:</strong> ${transaction_id}</p>
                                <p><strong>Montant:</strong> ${transactionStatus.amount} ${transactionStatus.currency}</p>
                                <p><strong>Méthode:</strong> ${transactionStatus.paymentMethod || 'CinetPay'}</p>
                                <p><strong>Durée:</strong> ${transactionStatus.plan.duration} jours</p>
                            </div>
                            
                            <p>✅ Vous allez recevoir une notification de confirmation.</p>
                            <p>✅ Votre accès premium est maintenant actif !</p>
                            
                            <a href="#" class="btn" onclick="window.close()">Continuer</a>
                        </div>
                    </body>
                </html>
            `;
        } else if (transactionStatus.status === 'REFUSED' || transactionStatus.status === 'CANCELED') {
            // Paiement échoué
            let failureReason = 'Paiement refusé';
            let failureDetails = '';
            
            if (transactionStatus.errorCode === '600') {
                failureReason = 'Fonds insuffisants';
                failureDetails = 'Votre compte ne dispose pas de fonds suffisants pour effectuer ce paiement.';
            } else if (transactionStatus.errorCode === '627') {
                failureReason = 'Transaction annulée';
                failureDetails = 'La transaction a été annulée.';
            } else if (transactionStatus.cpmErrorMessage === 'PAYMENT_FAILED') {
                failureReason = 'Paiement échoué';
                failureDetails = 'Le paiement n\'a pas pu être traité par l\'opérateur.';
            }
            
            pageContent = `
                <html>
                    <head>
                        <title>CinetPay - Paiement Échoué</title>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                            .error { color: #e74c3c; }
                            .details { background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: left; }
                            .btn { display: inline-block; padding: 12px 24px; background: #e74c3c; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1 class="error">❌ Paiement Échoué</h1>
                            <p><strong>${failureReason}</strong></p>
                            <p>${failureDetails}</p>
                            
                            <div class="details">
                                <p><strong>Transaction:</strong> ${transaction_id}</p>
                                <p><strong>Plan:</strong> ${transactionStatus.plan?.name || 'N/A'}</p>
                                <p><strong>Montant:</strong> ${transactionStatus.amount || 'N/A'} ${transactionStatus.currency}</p>
                                <p><strong>Code erreur:</strong> ${transactionStatus.errorCode || 'N/A'}</p>
                            </div>
                            
                            <p>Vous pouvez réessayer le paiement avec une autre méthode ou vérifier votre solde.</p>
                            
                            <a href="#" class="btn" onclick="window.close()">Réessayer</a>
                        </div>
                    </body>
                </html>
            `;
        } else if (transactionStatus.status === 'WAITING_FOR_CUSTOMER') {
            // En attente de confirmation client
            pageContent = `
                <html>
                    <head>
                        <title>CinetPay - Confirmation Requise</title>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                            .waiting { color: #f39c12; }
                            .btn { display: inline-block; padding: 12px 24px; background: #f39c12; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                            .highlight { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f39c12; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1 class="waiting">📱 Confirmation Requise</h1>
                            <p>Votre demande de paiement a été envoyée.</p>
                            
                            <div class="highlight">
                                <p><strong>📲 Vérifiez votre téléphone</strong></p>
                                <p>Une notification de paiement a été envoyée à votre numéro <strong>${transactionStatus.phoneNumber}</strong></p>
                                <p>Composez votre code PIN pour confirmer le paiement.</p>
                            </div>
                            
                            <p><strong>Transaction:</strong> ${transaction_id}</p>
                            <p>Vous recevrez une notification dès que le paiement sera confirmé.</p>
                            <a href="#" class="btn" onclick="window.close()">Fermer</a>
                        </div>
                    </body>
                </html>
            `;
        } else {
            // Statut en attente
            pageContent = `
                <html>
                    <head>
                        <title>CinetPay - Paiement En Attente</title>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                            .pending { color: #f39c12; }
                            .btn { display: inline-block; padding: 12px 24px; background: #f39c12; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1 class="pending">⏳ Paiement En Attente</h1>
                            <p>Votre paiement est en cours de traitement.</p>
                            <p><strong>Transaction:</strong> ${transaction_id}</p>
                            <p>Vous recevrez une notification dès que le paiement sera confirmé.</p>
                            <a href="#" class="btn" onclick="window.close()">Fermer</a>
                        </div>
                    </body>
                </html>
            `;
        }
        
        return res.send(pageContent);
        
    } catch (error) {
        console.error('CinetPay - Erreur return URL:', error);
        await addLog(`CinetPay return URL error: ${error.message}`, 'cinetpayController.paymentSuccess', 'error');
        
        return res.status(500).send(`
            <html>
                <head>
                    <title>CinetPay - Erreur</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                        .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                        .error { color: #e74c3c; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1 class="error">❌ Erreur Système</h1>
                        <p>Une erreur est survenue lors de la vérification de votre paiement.</p>
                        <p>Veuillez contacter le support si le problème persiste.</p>
                        <p><a href="#" onclick="window.close()">Fermer</a></p>
                    </div>
                </body>
            </html>
        `);
    }
};