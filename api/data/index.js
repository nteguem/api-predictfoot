const menuContent = `1. *Pronostics du jour* - tapez 1\n2. *Historique des prédictions* - tapez 2\n3. *Abonnements et Offres* - tapez 3\n4. *Informations et Aide* - tapez 4\n5. *Suivre nos apps* - tapez 5\n6. *Désabonnement* - tapez 6\n\nPour commencer, répondez simplement avec le numéro de l'option qui vous intéresse`;

const adminMenuContent = `
1️⃣ Faire une campagne, tapez 1.

Administration - Optimisez vos opérations avec efficacité et précision 🚀`;

const adminMenuData = (name, isWelcome) => {
  return isWelcome
    ? `🏠 Votre menu d'administration :
  
${adminMenuContent}`
    : `Salut ${name},\n\n Bienvenue dans l'espace d'administration de Predictfoot. Nous sommes ici pour vous aider à gérer efficacement toutes les opérations.

${adminMenuContent}`;
};


const menuData = (name, isWelcome) => {
  return isWelcome
    ? `🏠 Votre menu principal :\n\n${menuContent}`
    : `👋 ${name}, Bienvenue sur *Predictfoot* ! ⚽,\n\n  Faites partie de notre communauté de passionnés et recevez chaque jour des pronostics ultra-précis pour gagner gros ! 🎉. \n\nVoici ce que vous pouvez faire :

${menuContent}`; 
};

module.exports = { menuData,adminMenuData };
