const {getAllPlans } = require('../../../services/plan.service');

const OrderStepDefinition = {
    steps: [
        {
            id: 'planSelection',
            title: 'Sélection du Forfait',
            type: 'planList',
            message: async () => {
                const plans = await getAllPlans();
                let text = "📜 Sélectionnez un abonnement :\n\n";
                plans.forEach((plan, index) => {
                    text += `${index + 1} - *${plan.name}  • ${plan.price} XAF* , tapez ${index + 1}\n`;
                });
                return {
                    text,
                    options: plans.length,
                    plans // Store plans for reference
                };
            },
            validator: (input, options) => {
                const choice = parseInt(input);
                return {
                    isValid: choice > 0 && choice <= options,
                    message: 'Veuillez choisir une option valide'
                };
            }
        },
        {
            id: 'confirmation',
            title: 'Confirmation',
            type: 'summary',
            message: async (data) => {
                const plan = data.selectedPlan;
                return `📝 Récapitulatif de votre abonnement:\n\n` +
                       `Forfait: ${plan.name}\n` +
                       `Description: ${plan.description}\n` +
                       `Prix: ${plan.price} XAF\n\n` +
                       `Confirmez-vous la souscription ?\n` +
                       `Répondez par *Oui* ou *Non*`;
            },
            validator: (input) => ({
                isValid: ['oui', 'non'].includes(input.toLowerCase()),
                message: 'Veuillez répondre par Oui ou Non'
            })
        },
        { 
            id: 'payment',
            title: 'Paiement',
            type: 'phoneNumber',
            message: 'Veuillez fournir votre numéro Mobile Money pour le paiement:',
            validator: (input) => ({
                isValid: /^6[0-9]{8}$/.test(input),
                message: 'Numéro Mobile Money invalide. Le numéro doit commencer par 6 et contenir 9 chiffres.'
            }) 
        }
    ]
};

module.exports = OrderStepDefinition;