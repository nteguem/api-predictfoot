const { getAllPlans } = require('../../../services/plan.service');
const { getServices } = require('../../../services/smobilpay/smobilpay.service');
const { parsePhoneNumber } = require('libphonenumber-js');
const { JSDOM } = require("jsdom");

// Mapping des codes pays aux codes pays Smobilpay
const countryMapping = {
    '237': 'CM',  // Cameroun
    '241': 'GAB', // Gabon
    '235': 'TCD', // Tchad
    '236': 'RCA', // République Centrafricaine
    '242': 'CG',  // Congo Brazzaville
    // Vous pouvez ajouter d'autres pays si nécessaire
};

// Mapping des codes merchant vers des noms plus présentables
const operatorNames = {
    // Cameroun
    'CMMTNMOMOCC': 'MTN Mobile Money',
    'CMORANGEOMCC': 'Orange Money',
    'CMEXPRESSUNIONCC': 'Express Union',
    'CMYOOMEEMONEYCC': 'Yoomee Money',
    
    // Gabon
    'GABMOOVMONEY': 'Moov Money (Gabon)',
    'GABAIRTELMONEY': 'Airtel Money (Gabon)',
    
    // Tchad
    'TCDMOOVMONEY': 'Moov Money (Tchad)',
    
    // République Centrafricaine
    'RCAOM': 'Orange Money (RCA)',
    
    // Congo
    'CGMTNCONGO': 'MTN Money (Congo)',
    
    // Valeur par défaut
    'default': 'Mobile Money'
};

function stripHtml(html) {
    const dom = new JSDOM(html);
    return dom.window.document.body.textContent || "";
}

// Fonction pour obtenir un nom d'opérateur plus présentable
function getOperatorDisplayName(service) {
    if (!service || !service.merchant) return 'Mobile Money';
    
    // Essayer de trouver le nom dans le mapping
    if (operatorNames[service.merchant]) {
        return operatorNames[service.merchant];
    }
    
    // Si non trouvé dans le mapping, utiliser le nom du service si disponible
    if (service.name && service.name !== 'Custom Amount') {
        return service.name;
    }
    
    // Dernier recours: extraire un nom de l'identifiant merchant
    // Par exemple, transformer "CMMTNMOMOCC" en "MTN MOMO"
    const merchantCode = service.merchant;
    let extractedName = merchantCode.substring(2); // Enlever le code pays
    
    // Supprimer "CC" à la fin si présent
    if (extractedName.endsWith('CC')) {
        extractedName = extractedName.substring(0, extractedName.length - 2);
    }
    
    // Insérer des espaces entre les mots (basé sur les majuscules)
    extractedName = extractedName.replace(/([A-Z])/g, ' $1').trim();
    
    return extractedName;
}

// Fonction pour déterminer le code pays à partir du numéro de téléphone
function getCountryCodeFromPhoneNumber(phoneNumber) {
    // Si le numéro commence par +, l'enlever
    let cleanNumber = phoneNumber;
    if (cleanNumber.startsWith('+')) {
        cleanNumber = cleanNumber.substring(1);
    }
    
    // Vérifier les 3 premiers chiffres pour déterminer le pays
    const prefix = cleanNumber.substring(0, 3);
    return countryMapping[prefix] || null;
}

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
            id: 'operatorSelection',
            title: 'Sélection de l\'Opérateur',
            type: 'operatorList',
            message: async (data) => {
                // Déterminer le pays basé sur le numéro WhatsApp de l'utilisateur
                let countryCode = null;
                
                // Utiliser directement les 3 premiers chiffres du numéro pour déterminer le pays
                if (data.user && data.user.phoneNumber) {
                    countryCode = getCountryCodeFromPhoneNumber(data.user.phoneNumber);
                }

                console.log(`Détection pays: Numéro ${data.user.phoneNumber}, Code pays détecté: ${countryCode}`);
                
                // Récupérer les services pour ce pays spécifique
                const services = await getServices(null, countryCode);
                
                if (services.length === 0) {
                    return {
                        text: "Aucun opérateur disponible pour votre pays. Veuillez contacter le support.",
                        options: 0,
                        services: []
                    };
                }

                let text = "🔄 Sélectionnez votre opérateur de paiement :\n\n";
                services.forEach((service, index) => {
                    const displayName = getOperatorDisplayName(service);
                    text += `${index + 1} - *${displayName}* , tapez ${index + 1}\n`;
                });

                return {
                    text,
                    options: services.length,
                    services // Store services for reference
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
            id: 'phoneNumber',
            title: 'Numéro de téléphone',
            type: 'phoneNumber',
            message: (data) => {
                const service = data.selectedOperator;
                const displayName = getOperatorDisplayName(service);
                return `📱 Veuillez entrer votre numéro ${displayName} pour effectuer le paiement:`;
            },
            validator: (input, data) => {
                // Validation simple pour s'assurer que c'est un numéro
                const isNumber = /^[0-9]{8,9}$/.test(input);
                return {
                    isValid: isNumber,
                    message: isNumber ? 'Numéro valide' : 'Veuillez entrer un numéro valide (8 ou 9 chiffres)'
                };
            }
        },
        {
            id: 'confirmation',
            title: 'Confirmation',
            type: 'summary',
            message: async (data) => {
                const plan = data.selectedPlan;
                const service = data.selectedOperator;
                const phoneNumber = data.phoneNumber;
                const cleanDescription = stripHtml(plan.description);
                const displayName = getOperatorDisplayName(service);
                
                return `📝 Récapitulatif de votre commande:\n\n` +
                       `Forfait: ${plan.name}\n` +
                       `Description: ${cleanDescription}\n` +
                       `Prix: ${plan.price} XAF\n` +
                       `Opérateur: ${displayName}\n` +
                       `Numéro: ${phoneNumber}\n\n` +
                       `Confirmez-vous la souscription ?\n` +
                       `Répondez par *Oui* ou *Non*`;
            },
            validator: (input) => ({
                isValid: ['oui', 'non'].includes(input.toLowerCase()),
                message: 'Veuillez répondre par Oui ou Non'
            })
        }
    ]
};

module.exports = OrderStepDefinition;