const OrderStepDefinition = require('./orderDefinition');
const logService = require('../../../services/log.service');
const { initiatePayment, checkTransactionStatus } = require('../../../services/smobilpay/smobilpay.service');
const { getMainMenu } = require("../../../data"); 
const OrderStateManager = require('./orderState');
const { sendMessageToNumber, replyToMessage, sendMediaToNumber } = require('../../whatsApp/whatsappMessaging');
const { fillPdfFields } = require("../../../services/fillFormPdf.service");
const userService = require("../../../services/user.service");
const moment = require("moment");
const path = require('path');
const pathInvoice = path.join(__dirname, '../../../templates-pdf/invoice.pdf');

const NAVIGATION_SUFFIX = "\n\n_Tapez * pour revenir en arrière, # pour revenir au menu principal._";

class OrderHandler {
    constructor(stateManager = new OrderStateManager()) {
        this.stateManager = stateManager;
        this.definition = OrderStepDefinition;
        this.client = null;
    }
    
    async handleMessage(msg, client, user) {
        try {
            const phoneNumber = user.data.phoneNumber;
            const input = msg.body;
            this.client = client; // Stocker le client pour l'utiliser plus tard
            this.stateManager.updateOrderData(phoneNumber, {user: user.data});

            // Initialize subscription state if needed
            let currentState = this.stateManager.getCurrentState(phoneNumber);
            if (!currentState) {
                this.stateManager.initializeOrder(phoneNumber, { user: user.data });
                currentState = this.stateManager.getCurrentState(phoneNumber);
            }

            // Vérifier si nous avons un paiement en attente
            if (currentState.data.pendingPayment === true) {
                // Si l'utilisateur a répondu "oui" ou "non", vérifier le paiement
                if (["OUI", "NON", "oui", "non"].includes(input.toLowerCase())) {
                    try {
                        const paymentId = currentState.data.paymentId;
                        const plan = currentState.data.selectedPlan;
                        
                        // Informer l'utilisateur que nous vérifions
                        await sendMessageToNumber(client, phoneNumber, "⏳ Vérification en cours...");
                        
                        // Vérifier le statut du paiement
                        const verificationResult = await checkTransactionStatus(paymentId);
                        const transaction = verificationResult.transaction;
                        
                        // Vérifier si le paiement a réussi
                        if (transaction.status === 'SUCCESS') {
                            // Paiement réussi
                            const successMessage = `🎉 Félicitations! Votre paiement a été confirmé.\n\n` +
                                         `✅ Votre forfait *${plan.name}* est maintenant actif.\n` +
                                         `⏱️ Durée: ${plan.duration} jours\n` +
                                         `💰 Montant payé: ${transaction.amount} ${transaction.currency}\n\n` +
                                         `Pour consulter vos pronostics VIP:\n` +
                                         `1️⃣ Tapez *#* pour revenir au menu principal\n` +
                                         `2️⃣ Puis tapez *1* pour accéder aux Prédictions du Jour\n` +
                                         `3️⃣ Enfin tapez *2* pour voir vos Prédictions VIP\n\n` +
                                         `Vous pouvez également ouvrir l'application et aller directement à la section VIP.\n\n` +
                                         `Bonne chance! 🍀`;
                            
                            // Générer et envoyer la facture
                            await this.generateAndSendInvoice(
                                client, 
                                user.data, 
                                plan, 
                                transaction, 
                                successMessage
                            );
                            
                            // Réinitialiser l'état
                            this.stateManager.resetOrder(phoneNumber);
                            
                            // Ne pas retourner de message car nous avons déjà envoyé la facture
                            return null;
                        } else if (transaction.status === 'PENDING') {
                            // Paiement toujours en attente
                            const message = `⏳ Votre paiement est toujours en attente de confirmation.\n\n` +
                                         `Cela peut prendre quelques instants pour être traité par l'opérateur.\n\n` +
                                         `Vous pouvez continuer à vérifier l'état de votre paiement en répondant *Oui* quand vous avez confirmé le paiement sur votre téléphone, ou *Non* si vous rencontrez des difficultés.\n\n` +
                                         `Vous pouvez également taper *#* à tout moment pour revenir au menu principal.`;
                            
                            // Garder l'état de paiement en attente
                            this.stateManager.updateOrderData(phoneNumber, { 
                                pendingPayment: true,
                                paymentId: paymentId,
                                lastChecked: new Date()
                            });
                            
                            return {
                                type: 'PROMPT',
                                message: message
                            };
                        } else {
                            // Paiement échoué ou annulé
                            let statusMessage;
                            switch(transaction.status) {
                                case 'FAILED':
                                    statusMessage = "Votre paiement a échoué. Cela peut être dû à des fonds insuffisants ou à un problème de réseau.";
                                    break;
                                case 'CANCELLED':
                                    statusMessage = "Votre paiement a été annulé.";
                                    break;
                                default:
                                    statusMessage = `Statut du paiement: ${transaction.status}`;
                            }
                            
                            const message = `❌ Le paiement n'a pas été validé.\n\n` +
                            `${statusMessage}\n\n` +
                            `Tapez * pour revenir en arrière, # pour revenir au menu principal.`;
              
                            // Réinitialiser l'état
                            this.stateManager.resetOrder(phoneNumber);
                            
                            return {
                                type: 'ERROR',
                                message: message
                            };
                        }
                    } catch (error) {
                        await logService.addLog(
                            `Error verifying payment: ${error.message}`,
                            'OrderHandler.handleMessage.verification',
                            'error'
                        );
                        
                        const message = `❌ Une erreur est survenue lors de la vérification du paiement.\n\n` +
                                     `Vous pouvez réessayer ultérieurement ou contacter le support.`;
                        
                        // Ne pas réinitialiser l'état, permettre à l'utilisateur de réessayer
                        return {
                            type: 'ERROR',
                            message: message + `\n\nVous pouvez répondre *Oui* pour vérifier à nouveau, ou taper *#* pour revenir au menu principal.`
                        };
                    }
                }
            }

            // Handle reset command
            if (input === '#') {
                this.stateManager.resetOrder(phoneNumber);
                return {
                    type: 'RESET',
                    message: await getMainMenu(false, phoneNumber)
                };
            }

            // Handle back navigation
            if (input === '*') {
                if (currentState.step > 0) {
                    this.stateManager.setStep(phoneNumber, Math.max(0, currentState.step - 1));
                    return this.getStepMessage(phoneNumber);
                }
                return null;
            }

            // Get current step
            const currentStep = this.definition.steps[currentState.step];

            // Validate input
            const validationResult = await this.validateInput(currentStep, input, currentState.data);
            if (!validationResult.isValid) {
                return {
                    type: 'ERROR',
                    message: validationResult.message
                };
            }

            // Handle confirmation step specifically
            if (currentStep.id === 'confirmation' && input.toLowerCase() === 'non') {
                this.stateManager.resetOrder(phoneNumber);
                return {
                    type: 'RESET',
                    message: await getMainMenu(false, phoneNumber)
                }; 
            }

            // Update data based on step
            if (currentStep.id === 'planSelection') {
                const messageData = await currentStep.message();
                const selectedPlan = messageData.plans[parseInt(input) - 1];
                this.stateManager.updateOrderData(phoneNumber, { selectedPlan });
            } 
            else if (currentStep.id === 'operatorSelection') {
                const messageData = await currentStep.message(currentState.data);
                const selectedOperator = messageData.services[parseInt(input) - 1];
                this.stateManager.updateOrderData(phoneNumber, { selectedOperator });
            } 
            else {
                this.stateManager.updateOrderData(phoneNumber, { [currentStep.id]: input });
            }

            // Move to next step or complete subscription
            if (currentState.step < this.definition.steps.length - 1) {
                this.stateManager.setStep(phoneNumber, currentState.step + 1);
                return this.getStepMessage(phoneNumber);
            }

            // Process completed subscription
            return this.processCompletedOrder(phoneNumber);

        } catch (error) {
            await logService.addLog(
                `${error.message}`,
                'OrderHandler.handleMessage',
                'error'
            );
            return {
                type: 'ERROR',
                message: 'Une erreur est survenue lors du traitement de votre souscription'
            };
        }
    }

    async validateInput(step, input, currentData) {
        if (step.validator) {
            if (step.type === 'planList') {
                const messageData = await step.message();
                return step.validator(input, messageData.options);
            }
            else if (step.type === 'operatorList') {
                const messageData = await step.message(currentData);
                return step.validator(input, messageData.options);
            }
            return step.validator(input, currentData);
        }
        return { isValid: true };
    }

    async getStepMessage(phoneNumber) {
        const state = this.stateManager.getCurrentState(phoneNumber);
        const step = this.definition.steps[state.step];

        let message;
        if (typeof step.message === 'function') {
            const messageData = await step.message(state.data);
            message = messageData.text || messageData;
        } else {
            message = step.message;
        }

        return {
            type: 'PROMPT',
            message: this.formatStepMessage(message, state.step)
        };
    }

    formatStepMessage(message, step) {
        const navigationHelp = (step === 0) 
            ? "\n\n_Tapez # pour revenir au menu principal._"
            : "\n\n_Tapez * pour revenir en arrière, # pour revenir au menu principal._";

        return `Étape ${step + 1}/${this.definition.steps.length}\n\n${message}${navigationHelp}`;
    }

    async generateAndSendInvoice(client, user, plan, transaction, successMessage) {
        try {
            // Préparation des données pour la facture
            const currentDate = moment().format('dddd D MMMM YYYY');
            const currentTime = moment().format('HH:mm:ss');
            const expire = moment().add(plan?.duration, 'days').format('dddd D MMMM YYYY');
            
            const invoiceData = {
                date: currentDate,
                pseudo: user?.pseudo,
                forfait: plan?.name,
                phonenumber: transaction.phoneNumber || user.phoneNumber,
                heure: currentTime,
                expire,
                transaction_id: transaction.paymentId,
                prix: plan?.price.toString(),
                whatsapp: user.phoneNumber.toString()
            };
            
            // Génération de la facture PDF
            const pdfBufferInvoice = await fillPdfFields(pathInvoice, invoiceData);
            const pdfBase64Invoice = pdfBufferInvoice.toString('base64');
            const pdfNameInvoice = `Invoice_${user.phoneNumber}`;
            const documentType = 'application/pdf';
            
            // Envoi de la facture au client
            await sendMediaToNumber(
                client, 
                user.phoneNumber, 
                documentType, 
                pdfBase64Invoice, 
                pdfNameInvoice, 
                successMessage
            );
            
            // Notification aux administrateurs
            const { users: admins } = await userService.list("admin");
            const adminMessage = 
                `Un client (${user.pseudo || user.phoneNumber}) a effectué un achat de ${plan.price} XAF pour le forfait ${plan.name}. ` +
                `Veuillez trouver la facture en pièce jointe.${NAVIGATION_SUFFIX}`;
            
            for (const admin of admins) {
                await sendMediaToNumber(client, admin.phoneNumber, documentType, pdfBase64Invoice, pdfNameInvoice);
                await sendMessageToNumber(client, admin.phoneNumber, adminMessage);
            }
            
            await logService.addLog(
                `Invoice generated and sent successfully for user ${user._id || user.phoneNumber}`,
                'OrderHandler.generateAndSendInvoice',
                'info'
            );
            
        } catch (error) {
            await logService.addLog(
                `Error generating and sending invoice: ${error.message}`,
                'OrderHandler.generateAndSendInvoice',
                'error'
            );
            
            // En cas d'erreur, envoyer quand même le message de succès au client
            await sendMessageToNumber(client, user.phoneNumber, successMessage);
        }
    }

    async verifyPaymentManually(client, phoneNumber, paymentId) {
        try {
            // Attendre 16 secondes avant d'envoyer le message
            await new Promise(resolve => setTimeout(resolve, 16000));
            
            // Envoyer un message pour demander la confirmation
            await sendMessageToNumber(client, phoneNumber, 
                "Avez-vous payé le forfait? Répondez par *Oui* ou *Non*");
            
            // Mettre à jour l'état pour indiquer que nous avons un paiement en attente
            this.stateManager.updateOrderData(phoneNumber, { 
                pendingPayment: true,
                paymentId: paymentId,
                lastChecked: new Date()
            });
        } catch (error) {
            await logService.addLog(
                `Error sending manual verification message: ${error.message}`,
                'OrderHandler.verifyPaymentManually',
                'error'
            );
        }
    }

    async processCompletedOrder(phoneNumber) {
        const state = this.stateManager.getCurrentState(phoneNumber);
        const orderData = state.data;
        
        try {
            // Préparer les données pour Smobilpay
            const paymentData = {
                userId: orderData.user._id,
                planId: orderData.selectedPlan._id,
                operatorId: orderData.selectedOperator.serviceid,
                phoneNumber: orderData.phoneNumber,
                customerName: orderData.user.name || "Client", // Utiliser le nom de l'utilisateur ou "Client" par défaut
                email: orderData.user.email || "client@example.com" // Valeur par défaut pour l'email
            };
            
            // Initier le paiement via Smobilpay
            const paymentResult = await initiatePayment(paymentData);
            
            // Enregistrer l'ID de paiement pour la vérification ultérieure
            const paymentId = paymentResult.transaction.paymentId;
            this.stateManager.updateOrderData(phoneNumber, { 
                paymentId: paymentId,
                ptn: paymentResult.transaction.ptn
            });
            
            // Message de succès avec instructions
            let message = `✅ Votre paiement a été initié avec succès!\n\n` +
                        `🔢 Référence: ${paymentResult.transaction.ptn || paymentId}\n` +
                        `💰 Montant: ${paymentResult.transaction.amount} ${paymentResult.transaction.currency}\n\n` +
                        `📱 Veuillez suivre les instructions sur votre téléphone pour confirmer le paiement.\n` +
                        `Une fois confirmé, votre abonnement sera activé automatiquement.`;
            
            await logService.addLog(
                `Payment initiated successfully for user ${orderData.user._id}, amount: ${paymentResult.transaction.amount}`,
                'OrderHandler.processCompletedOrder',
                'info'
            );
            
            // Planifier la vérification manuelle
            setTimeout(() => {
                this.verifyPaymentManually(this.client, phoneNumber, paymentId);
            }, 16000);
            
            // Nous ne réinitialisons PAS la commande tout de suite
            // this.stateManager.resetOrder(phoneNumber);
            
            return {
                type: 'COMPLETE',
                message: message
            };
        } catch (error) {
            // En cas d'erreur, afficher un message approprié
            await logService.addLog(
                `Payment failed: ${error.message}`,
                'OrderHandler.processCompletedOrder',
                'error'
            );
            
            let errorMessage = "❌ Le paiement n'a pas pu être effectué.\n\n";
            
            // Si c'est une erreur Smobilpay, utiliser le message d'erreur convivial
            if (error.name === 'SmobilpayError' && error.responseData && error.responseData.usrMsg) {
                errorMessage += `Message: ${error.responseData.usrMsg}\n`;
            } else {
                errorMessage += "Une erreur technique s'est produite. Veuillez réessayer plus tard.";
            }
            
            // Réinitialiser la commande
            this.stateManager.resetOrder(phoneNumber);
            
            return {
                type: 'ERROR',
                message: errorMessage
            };
        }
    }
}

module.exports = OrderHandler;