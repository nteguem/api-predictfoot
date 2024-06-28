const DefaultGroupNames = {
    GROUPE_PRONOSTICS_GRATUITS: 'Groupe Pronostics gratuits',
    GROUPE_PRONOSTICS_PAYANTS: 'Groupe Pronostics payants',
    GROUPE_SHORT_LIST: 'Groupe Short List',
    GROUPE_LONG_LIST: 'Groupe Long List',
    FORFAIT_GRATUIT: 'Forfait Gratuit',
    FORFAIT_HEBDOMADAIRE: 'Forfait Hebdomadaire',
    FORFAIT_MENSUEL: 'Forfait Mensuel',
    FORFAIT_TRIMESTRIEL: 'Forfait Trimestriel',
    FORFAIT_SEMESTRIEL: 'Forfait Semestriel',
    GROUPE_SUPPORT: 'Groupe Support',
    GROUPE_ADMIN: 'Groupe Admin',
};

const DefaultGroupDescriptions = {
    GROUPE_PRONOSTICS_GRATUITS: 'Groupe des utilisateurs accédant aux pronostics gratuits.',
    GROUPE_PRONOSTICS_PAYANTS: 'Groupe des utilisateurs accédant aux pronostics payants.',
    GROUPE_SHORT_LIST: 'Groupe des utilisateurs accédant aux pronostics gratuits de la short list.',
    GROUPE_LONG_LIST: 'Groupe des utilisateurs accédant aux pronostics gratuits de la long list.',
    FORFAIT_GRATUIT: 'Accès illimité aux pronostics gratuits (Short List et Long List).',
    FORFAIT_HEBDOMADAIRE: 'Accès aux pronostics payants pour une durée de 7 jours.',
    FORFAIT_MENSUEL: 'Accès aux pronostics payants pour une durée de 30 jours.',
    FORFAIT_TRIMESTRIEL: 'Accès aux pronostics payants pour une durée de 90 jours.',
    FORFAIT_SEMESTRIEL: 'Accès aux pronostics payants pour une durée de 180 jours.',
    GROUPE_SUPPORT: 'Groupe des utilisateurs ayant besoin d\'assistance ou de support.',
    GROUPE_ADMIN: 'Groupe des administrateurs ayant accès aux fonctionnalités avancées et à la gestion du bot.',
};

const defaultGroups = Object.keys(DefaultGroupNames).map(key => ({
    name: DefaultGroupNames[key],
    description: DefaultGroupDescriptions[key],
}));

module.exports = { defaultGroups, DefaultGroupNames, DefaultGroupDescriptions };
