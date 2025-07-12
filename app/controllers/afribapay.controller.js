const afribaPayService = require('../services/afribapay.service');
const { addLog } = require('../services/log.service');
const ResponseService = require('../services/response.service');

// Fonction utilitaire pour gérer les erreurs (identique à CinetPay)
const handleApiError = (error, res, logContext) => {
    console.error(`${logContext} error:`, error.message);
    
    // Journaliser l'erreur
    addLog(`Error: ${error.message}`, logContext, 'error');
    
    // Si c'est une erreur AfribaPay spécifique
    if (error instanceof afribaPayService.AfribaPayError) {
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

// Initialiser un paiement AfribaPay
exports.initiatePayment = async (req, res) => {
    try {
        const { 
            planId, 
            phoneNumber,
            operator,
            country,
            currency,
            otpCode
        } = req.body;
        const userId = req.user.userId;
         
        // Validation des champs requis
        if (!planId || !phoneNumber || !operator || !country || !currency) {
            return ResponseService.badRequest(res, { 
                message: 'planId, phoneNumber, operator, country et currency sont requis' 
            });
        }
        // Récupérer l'IP et User-Agent du client
        const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        const userAgent = req.get('User-Agent');
        // Appel du service AfribaPay
        const paymentResult = await afribaPayService.initiatePayment({
            userId, 
            planId, 
            phoneNumber,
            operator,
            country,
            currency,
            otpCode,
            clientIp,
            userAgent
        });
        
        return ResponseService.success(res, paymentResult);
        
    } catch (error) {
        return handleApiError(error, res, 'afribaPayController.initiatePayment');
    }
};

// Vérifier le statut d'un paiement
exports.checkStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        if (!orderId) {
            return ResponseService.badRequest(res, { 
                message: 'orderId est requis' 
            });
        }
        
        console.log(`AfribaPay - Vérification statut transaction: ${orderId}`);
        
        const result = await afribaPayService.checkTransactionStatus(orderId);
        return ResponseService.success(res, result);
    } catch (error) {
        return handleApiError(error, res, 'afribaPayController.checkStatus');
    }
};

// Traiter le webhook AfribaPay
exports.webhook = async (req, res) => {
    try {
        console.log('AfribaPay - Webhook reçu:', JSON.stringify(req.body, null, 2));
        
        // Récupérer la signature HMAC depuis les headers
        const receivedSignature = req.headers['afribapay-sign'] || req.headers['x-afribapay-sign'];
        
        if (!receivedSignature) {
            console.warn('AfribaPay - Webhook reçu sans signature HMAC');
            await addLog('AfribaPay webhook reçu sans signature HMAC', 'afribaPayController.webhook', 'warning');
        }
        
        // Récupérer le payload brut pour la vérification HMAC
        const rawPayload = JSON.stringify(req.body);
        
        const result = await afribaPayService.processWebhook(req.body, receivedSignature, rawPayload);
        
        // AfribaPay attend une réponse simple (toujours 200)
        return res.status(200).json({
            status: 'success',
            message: 'Webhook traité avec succès'
        });
        
    } catch (error) {
        console.error('AfribaPay - Erreur webhook:', error);
        
        // Log l'erreur mais retourner 200 pour éviter les retry AfribaPay
        await addLog(`AfribaPay webhook error: ${error.message}`, 'afribaPayController.webhook', 'error');
        
        return res.status(200).json({
            status: 'error',
            message: 'Erreur lors du traitement du webhook'
        });
    }
};

// Page de retour après paiement réussi (return_url)
exports.paymentSuccess = async (req, res) => {
    try {
        // AfribaPay peut envoyer des paramètres en GET ou POST
        const { order_id, transaction_id, status } = req.method === 'GET' ? req.query : req.body;
        
        console.log(`AfribaPay - Return URL appelée avec order_id: ${order_id}, transaction_id: ${transaction_id}, status: ${status}`);
        
        const orderId = order_id || transaction_id;
        
        if (!orderId) {
            return res.status(400).send(`
                <html>
                    <head>
                        <title>AfribaPay - Erreur</title>
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
        
        // Vérifier le statut de la transaction via l'API AfribaPay
        let transactionStatus;
        let errorOccurred = false;
        
        try {
            const result = await afribaPayService.checkTransactionStatus(orderId);
            transactionStatus = result.transaction;
        } catch (error) {
            console.error('AfribaPay - Erreur lors de la vérification:', error.message);
            errorOccurred = true;
            await addLog(`AfribaPay return URL error: ${error.message}`, 'afribaPayController.paymentSuccess', 'error');
        }
        
        // Générer la page de résultat
        let pageContent;
        
        if (errorOccurred) {
            // Erreur de vérification
            pageContent = `
                <html>
                    <head>
                        <title>AfribaPay - Vérification</title>
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
                            <p><strong>Transaction:</strong> ${orderId}</p>
                            <a href="#" class="btn" onclick="window.close()">Fermer</a>
                        </div>
                    </body>
                </html>
            `;
        } else if (transactionStatus.status === 'SUCCESS') {
            // Paiement réussi
            pageContent = `
                <html>
                    <head>
                        <title>AfribaPay - Paiement Réussi</title>
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
                                <p><strong>Transaction:</strong> ${orderId}</p>
                                <p><strong>Montant:</strong> ${transactionStatus.amountTotal || transactionStatus.amount} ${transactionStatus.currency}</p>
                                <p><strong>Opérateur:</strong> ${transactionStatus.operator.toUpperCase()}</p>
                                <p><strong>Pays:</strong> ${transactionStatus.country}</p>
                                <p><strong>Durée:</strong> ${transactionStatus.plan.duration} jours</p>
                            </div>
                            
                            <p>✅ Vous allez recevoir une notification de confirmation.</p>
                            <p>✅ Votre accès premium est maintenant actif !</p>
                            
                            <a href="#" class="btn" onclick="window.close()">Continuer</a>
                        </div>
                    </body>
                </html>
            `;
        } else if (transactionStatus.status === 'FAILED') {
            // Paiement échoué
            pageContent = `
                <html>
                    <head>
                        <title>AfribaPay - Paiement Échoué</title>
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
                            <p><strong>Le paiement n'a pas pu être traité</strong></p>
                            
                            <div class="details">
                                <p><strong>Transaction:</strong> ${orderId}</p>
                                <p><strong>Plan:</strong> ${transactionStatus.plan?.name || 'N/A'}</p>
                                <p><strong>Montant:</strong> ${transactionStatus.amount || 'N/A'} ${transactionStatus.currency}</p>
                                <p><strong>Opérateur:</strong> ${transactionStatus.operator?.toUpperCase() || 'N/A'}</p>
                                <p><strong>Erreur:</strong> ${transactionStatus.errorMessage || 'Paiement refusé'}</p>
                            </div>
                            
                            <p>Causes possibles :</p>
                            <ul style="text-align: left; display: inline-block;">
                                <li>Fonds insuffisants</li>
                                <li>Numéro non valide</li>
                                <li>Service temporairement indisponible</li>
                            </ul>
                            
                            <p>Vous pouvez réessayer le paiement avec une autre méthode.</p>
                            
                            <a href="#" class="btn" onclick="window.close()">Réessayer</a>
                        </div>
                    </body>
                </html>
            `;
        } else {
            // Statut en attente (PENDING)
            pageContent = `
                <html>
                    <head>
                        <title>AfribaPay - Paiement En Attente</title>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                            .pending { color: #f39c12; }
                            .btn { display: inline-block; padding: 12px 24px; background: #f39c12; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                            .highlight { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f39c12; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1 class="pending">📱 Paiement En Cours</h1>
                            <p>Votre demande de paiement est en cours de traitement.</p>
                            
                            <div class="highlight">
                                <p><strong>📲 Vérifiez votre téléphone</strong></p>
                                <p>Une notification de paiement a été envoyée à votre numéro <strong>${transactionStatus.phoneNumber}</strong></p>
                                <p>Composez votre code PIN pour confirmer le paiement.</p>
                            </div>
                            
                            <p><strong>Transaction:</strong> ${orderId}</p>
                            <p><strong>Opérateur:</strong> ${transactionStatus.operator?.toUpperCase()}</p>
                            <p>Vous recevrez une notification dès que le paiement sera confirmé.</p>
                            <a href="#" class="btn" onclick="window.close()">Fermer</a>
                        </div>
                    </body>
                </html>
            `;
        }
        
        return res.send(pageContent);
        
    } catch (error) {
        console.error('AfribaPay - Erreur return URL:', error);
        await addLog(`AfribaPay return URL error: ${error.message}`, 'afribaPayController.paymentSuccess', 'error');
        
        return res.status(500).send(`
            <html>
                <head>
                    <title>AfribaPay - Erreur</title>
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

// Page de retour après paiement annulé (cancel_url)
exports.paymentCancel = async (req, res) => {
    try {
        const { order_id, transaction_id } = req.method === 'GET' ? req.query : req.body;
        const orderId = order_id || transaction_id;
        
        console.log(`AfribaPay - Cancel URL appelée avec order_id: ${orderId}`);
        
        await addLog(`AfribaPay payment cancelled for order: ${orderId}`, 'afribaPayController.paymentCancel', 'info');
        
        const pageContent = `
            <html>
                <head>
                    <title>AfribaPay - Paiement Annulé</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                        .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                        .warning { color: #f39c12; }
                        .btn { display: inline-block; padding: 12px 24px; background: #f39c12; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1 class="warning">⚠️ Paiement Annulé</h1>
                        <p>Vous avez annulé le processus de paiement.</p>
                        ${orderId ? `<p><strong>Transaction:</strong> ${orderId}</p>` : ''}
                        <p>Aucun montant n'a été débité de votre compte.</p>
                        <p>Vous pouvez réessayer le paiement à tout moment.</p>
                        <a href="#" class="btn" onclick="window.close()">Fermer</a>
                    </div>
                </body>
            </html>
        `;
        
        return res.send(pageContent);
        
    } catch (error) {
        console.error('AfribaPay - Erreur cancel URL:', error);
        await addLog(`AfribaPay cancel URL error: ${error.message}`, 'afribaPayController.paymentCancel', 'error');
        
        return res.status(500).send(`
            <html>
                <head>
                    <title>AfribaPay - Erreur</title>
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
                        <p>Une erreur est survenue.</p>
                        <p><a href="#" onclick="window.close()">Fermer</a></p>
                    </div>
                </body>
            </html>
        `);
    }
};

exports.getCountries = async (req, res) => {
    try {
        const { country } = req.query; 
        const result = await afribaPayService.getCountriesData(country);
        return ResponseService.success(res, result);
    } catch (error) {
        return handleApiError(error, res, 'afribaPayController.getCountries');
    }
};