const OrderStepDefinition = require('./orderDefinition');
const logService = require('../../../services/log.service');
const { initiatePayment, checkTransactionStatus } = require('../../../services/smobilpay/smobilpay.service');
const { getMainMenu } = require("../../../data"); 
const OrderStateManager = require('./orderState');

class OrderHandler {
    constructor(stateManager = new OrderStateManager()) {
        this.stateManager = stateManager;
        this.definition = OrderStepDefinition;
    }
    
    async handleMessage(msg, client, user) {
        try {
            const phoneNumber = user.data.phoneNumber;
            const input = msg.body;
            this.stateManager.updateOrderData(phoneNumber, {user: user.data});

            // Handle reset command
            if (input === '#') {
                this.stateManager.resetOrder(phoneNumber);
                return {
                    type: 'RESET',
                    message: await getMainMenu(false, phoneNumber)
                };
            }

            // Initialize subscription state if needed
            let currentState = this.stateManager.getCurrentState(phoneNumber);
            if (!currentState) {
                this.stateManager.initializeOrder(phoneNumber, { user: user.data });
                currentState = this.stateManager.getCurrentState(phoneNumber);
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
            this.stateManager.updateOrderData(phoneNumber, { 
                paymentId: paymentResult.transaction.paymentId,
                ptn: paymentResult.transaction.ptn
            });
            
            // Message de succès avec instructions
            let message = `✅ Votre paiement a été initié avec succès!\n\n` +
                        `🔢 Référence: ${paymentResult.transaction.ptn || paymentResult.transaction.paymentId}\n` +
                        `💰 Montant: ${paymentResult.transaction.amount} ${paymentResult.transaction.currency}\n\n` +
                        `📱 Veuillez suivre les instructions sur votre téléphone pour confirmer le paiement.\n` +
                        `Une fois confirmé, votre abonnement sera activé automatiquement.`;
            
            // Réinitialiser la commande
            this.stateManager.resetOrder(phoneNumber);
            
            await logService.addLog(
                `Payment initiated successfully for user ${orderData.user._id}, amount: ${paymentResult.transaction.amount}`,
                'OrderHandler.processCompletedOrder',
                'info'
            );
            
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