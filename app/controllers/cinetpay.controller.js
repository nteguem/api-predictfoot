const cinetpayService = require('../services/cinetPay.service');
const { addLog } = require('../services/log.service');
const ResponseService = require('../services/response.service');

const handleApiError = (error, res, logContext) => {
    addLog(`Error: ${error.message}`, logContext, 'error');
    
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
    
    return ResponseService.internalServerError(res, { message: error.message });
};

// CSS optimisé pour mobile
const getMobileOptimizedCSS = () => `
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            line-height: 1.6;
        }
        
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            width: 100%;
            max-width: 400px;
            padding: 24px;
            text-align: center;
            animation: slideUp 0.3s ease-out;
        }
        
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        h1 {
            font-size: 1.5rem;
            margin-bottom: 16px;
            font-weight: 600;
        }
        
        p {
            font-size: 0.95rem;
            color: #666;
            margin-bottom: 12px;
        }
        
        .success { color: #10b981; }
        .error { color: #ef4444; }
        .warning { color: #f59e0b; }
        .pending { color: #6366f1; }
        
        .details {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            margin: 20px 0;
            text-align: left;
        }
        
        .details p {
            margin-bottom: 8px;
            font-size: 0.9rem;
            color: #374151;
        }
        
        .details p:last-child {
            margin-bottom: 0;
        }
        
        .highlight {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 12px;
            padding: 16px;
            margin: 20px 0;
            border-left: 4px solid #f59e0b;
        }
        
        .highlight p {
            color: #92400e;
            font-size: 0.9rem;
        }
        

        
        .icon {
            font-size: 2rem;
            margin-bottom: 12px;
        }
        
        .transaction-id {
            font-family: 'Courier New', monospace;
            background: #f1f5f9;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 0.85rem;
            color: #475569;
            display: inline-block;
            margin: 8px 0;
        }
        
        .amount {
            font-size: 1.1rem;
            font-weight: 600;
            color: #1f2937;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            margin: 8px 0;
        }
        
        .status-success { background: #d1fae5; color: #065f46; }
        .status-error { background: #fee2e2; color: #991b1b; }
        .status-warning { background: #fef3c7; color: #92400e; }
        .status-pending { background: #e0e7ff; color: #3730a3; }
        
        /* Responsive optimizations */
        @media (max-width: 480px) {
            .container {
                padding: 20px;
                margin: 12px;
                border-radius: 12px;
            }
            
            h1 {
                font-size: 1.3rem;
            }
            
            p {
                font-size: 0.9rem;
            }
            
            .details {
                padding: 14px;
            }
            
            .highlight {
                padding: 14px;
            }
        }
        
        @media (max-width: 320px) {
            .container {
                padding: 16px;
                margin: 8px;
            }
            
            h1 {
                font-size: 1.2rem;
            }
            
            .icon {
                font-size: 1.5rem;
            }
        }
    </style>
`;

// Template HTML optimisé
const getHtmlTemplate = (title, content) => `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <meta name="theme-color" content="#667eea">
        <title>${title}</title>
        ${getMobileOptimizedCSS()}
    </head>
    <body>
        <div class="container">
            ${content}
        </div>
    </body>
    </html>
`;

exports.initiatePayment = async (req, res) => {
    try {
        const { planId, phoneNumber } = req.body;
        const userId = req.user.userId;
        
        if (!planId || !phoneNumber) {
            return ResponseService.badRequest(res, { 
                message: 'planId et phoneNumber sont requis' 
            });
        }
        
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

exports.checkStatus = async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        if (!transactionId) {
            return ResponseService.badRequest(res, { 
                message: 'transactionId est requis' 
            });
        }
        
        const result = await cinetpayService.checkTransactionStatus(transactionId);
        return ResponseService.success(res, result);
    } catch (error) {
        return handleApiError(error, res, 'cinetpayController.checkStatus');
    }
};

exports.webhook = async (req, res) => {
    try {
        const receivedToken = req.headers['x-token'];
        
        if (!receivedToken) {
            await addLog('CinetPay webhook reçu sans x-token header', 'cinetpayController.webhook', 'warning');
        }
        
        const result = await cinetpayService.processWebhook(req.body, receivedToken);
        
        return res.status(200).json({
            status: 'success',
            message: 'Webhook traité avec succès'
        });
        
    } catch (error) {
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
                
        if (!transaction_id) {
            const errorContent = `
                <div class="icon">❌</div>
                <h1 class="error">Erreur</h1>
                <p>Paramètres de transaction manquants.</p>
                <p>Veuillez réessayer ou contacter le support.</p>
            `;
            return res.status(400).send(getHtmlTemplate('CinetPay - Erreur', errorContent, 'btn-error', 'Fermer'));
        }
        
        // Vérifier le statut de la transaction via l'API CinetPay
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
        
        // Générer le contenu selon le statut
        let content, btnClass = 'btn-success', btnText = 'Continuer';
        
        if (errorOccurred) {
            // Erreur de vérification
            content = `
                <div class="icon">⏳</div>
                <h1 class="warning">Vérification en cours</h1>
                <p>Nous vérifions le statut de votre paiement...</p>
                <p>Vous recevrez une notification dès que le traitement sera terminé.</p>
                <div class="transaction-id">${transaction_id}</div>
            `;
            btnClass = 'btn-warning';
            btnText = 'Fermer';
        } else if (transactionStatus.status === 'ACCEPTED') {
            // Paiement réussi
            content = `
                <div class="icon">🎉</div>
                <h1 class="success">Paiement Réussi !</h1>
                <div class="status-badge status-success">✅ Confirmé</div>
                <p>Votre abonnement <strong>${transactionStatus.plan.name}</strong> a été activé avec succès.</p>
                
                <div class="details">
                    <p><strong>Transaction:</strong> <span class="transaction-id">${transaction_id}</span></p>
                    <p><strong>Montant:</strong> <span class="amount">${transactionStatus.amount} ${transactionStatus.currency}</span></p>
                    <p><strong>Méthode:</strong> ${transactionStatus.paymentMethod || 'CinetPay'}</p>
                    <p><strong>Durée:</strong> ${transactionStatus.plan.duration} jours</p>
                </div>
                
                <p>✅ Notification de confirmation envoyée</p>
                <p>✅ Accès premium maintenant actif</p>
            `;
            btnClass = 'btn-success';
        } else if (transactionStatus.status === 'REFUSED' || transactionStatus.status === 'CANCELED') {
            // Paiement échoué
            let failureReason = 'Paiement refusé';
            let failureDetails = 'Le paiement n\'a pas pu être traité.';
            
            if (transactionStatus.errorCode === '600') {
                failureReason = 'Fonds insuffisants';
                failureDetails = 'Votre compte ne dispose pas de fonds suffisants.';
            } else if (transactionStatus.errorCode === '627') {
                failureReason = 'Transaction annulée';
                failureDetails = 'La transaction a été annulée par l\'utilisateur.';
            } else if (transactionStatus.cpmErrorMessage === 'PAYMENT_FAILED') {
                failureReason = 'Paiement échoué';
                failureDetails = 'Le paiement n\'a pas pu être traité par l\'opérateur.';
            }
            
            content = `
                <div class="icon">❌</div>
                <h1 class="error">Paiement Échoué</h1>
                <div class="status-badge status-error">❌ Refusé</div>
                <p><strong>${failureReason}</strong></p>
                <p>${failureDetails}</p>
                <div class="transaction-id">${transaction_id}</div>
                <p>Veuillez réessayer ou contacter le support.</p>
            `;
            btnClass = 'btn-error';
            btnText = 'Réessayer';
        } else if (transactionStatus.status === 'WAITING_FOR_CUSTOMER') {
            // En attente de confirmation client
            content = `
                <div class="icon">📱</div>
                <h1 class="warning">Confirmation Requise</h1>
                <div class="status-badge status-warning">⏳ En attente</div>
                <p>Votre demande de paiement a été envoyée.</p>
                
                <div class="highlight">
                    <p><strong>📲 Vérifiez votre téléphone</strong></p>
                    <p>Notification envoyée au <strong>${transactionStatus.phoneNumber}</strong></p>
                    <p>Composez votre code PIN pour confirmer.</p>
                </div>
                
                <p>Vous recevrez une notification de confirmation.</p>
            `;
            btnClass = 'btn-warning';
            btnText = 'Compris';
        } else {
            // Statut en attente
            content = `
                <div class="icon">⏳</div>
                <h1 class="pending">Paiement En Attente</h1>
                <div class="status-badge status-pending">⏳ En cours</div>
                <p>Votre paiement est en cours de traitement.</p>
                <div class="transaction-id">${transaction_id}</div>
                <p>Veuillez patienter quelques instants.</p>
            `;
            btnClass = 'btn-pending';
            btnText = 'Actualiser';
        }
        
        return res.send(getHtmlTemplate(`CinetPay - ${transactionStatus?.status || 'Statut'}`, content, btnClass, btnText));
        
    } catch (error) {
        console.error('CinetPay - Erreur return URL:', error);
        await addLog(`CinetPay return URL error: ${error.message}`, 'cinetpayController.paymentSuccess', 'error');
        
        const errorContent = `
            <div class="icon">❌</div>
            <h1 class="error">Erreur Système</h1>
            <p>Une erreur est survenue lors de la vérification.</p>
            <p>Veuillez contacter le support si le problème persiste.</p>
        `;
        
        return res.status(500).send(getHtmlTemplate('CinetPay - Erreur', errorContent, 'btn-error', 'Fermer'));
    }
};