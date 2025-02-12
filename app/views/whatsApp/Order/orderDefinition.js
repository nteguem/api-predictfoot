const {getAllPlans } = require('../../../services/plan.service');

const countryConfigs = {
    '237': {  // Cameroun
        name: 'Cameroun',
        regex: /^6[0-9]{8}$/,
        operators: 'MTN, Orange, Express Union Finance',
        message: 'Veuillez fournir votre numéro MTN, Orange ou Express Union Finance:'
    },
    '243': {  // RD Congo
        name: 'RD Congo',
        regex: /^0[89][0-9]{7}$/,
        operators: 'Orange, Airtel, Africell',
        message: 'Veuillez fournir votre numéro Orange, Airtel ou Africell:'
    },
    '221': {  // Sénégal
        name: 'Sénégal',
        regex: /^7[67,8][0-9]{7}$/,
        operators: 'Orange',
        message: 'Veuillez fournir votre numéro Orange:'
    },
    '231': {  // Libéria
        name: 'Libéria',
        regex: /^(88[68])[0-9]{6}$/,
        operators: 'Lonestar Cell MTN',
        message: 'Veuillez fournir votre numéro Lonestar Cell MTN:'
    },
    '229': {  // Bénin
        name: 'Bénin',
        regex: /^[59][1-9][0-9]{6}$/,
        operators: 'MTN, Moov',
        message: 'Veuillez fournir votre numéro MTN ou Moov:'
    },
    '242': {  // Congo Brazzaville
        name: 'Congo Brazzaville',
        regex: /^0[456][0-9]{7}$/,
        operators: 'MTN, Airtel',
        message: 'Veuillez fournir votre numéro MTN ou Airtel:'
    },
    '256': {  // Ouganda
        name: 'Ouganda',
        regex: /^7[578][0-9]{7}$/,
        operators: 'Airtel, MTN',
        message: 'Veuillez fournir votre numéro Airtel ou MTN:'
    }
};

const generatePaymentMessage = (userPhoneNumber) => {
    // Extraire l'indicatif (les 3 premiers chiffres après le +)
    const countryCode = userPhoneNumber.substring(0, 3);
    if (countryConfigs[countryCode]) {
        return countryConfigs[countryCode].message;
    }

    // Si l'indicatif n'est pas reconnu, lister tous les pays disponibles
    let message = "Veuillez fournir votre numéro Mobile Money pour le paiement.\n\n";
    message += "Pays et opérateurs disponibles:\n";
    Object.values(countryConfigs).forEach(country => {
        message += `- ${country.name} (${country.operators})\n`;
    });
    message += "\nSi vous avez un moyen de paiement dans l'un de ces pays, entrez simplement votre numéro.";
    
    return message;
};

const validatePhoneNumber = (input, data) => {
    // Vérifier si le numéro correspond à l'un des formats acceptés
    const isValidForAnyCountry = Object.values(countryConfigs).some(
        country => country.regex.test(input)
    );

    return {
        isValid: isValidForAnyCountry,
        message: isValidForAnyCountry ? 
            'Numéro valide' : 
            'Numéro Mobile Money invalide. Veuillez vérifier le format selon votre pays.'
    };
};

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
            message: (data) => generatePaymentMessage(data.user.phoneNumber),
            validator: validatePhoneNumber
        }
    ]
};

module.exports = OrderStepDefinition;