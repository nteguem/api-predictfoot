const menuContent = `
1-Pronostics du jour, tapez 1
2-Historique des prédictions, tapez 2
3-Abonnements et Offres tapez 3
4-Informations et Aide tapez 4
5-Suivre nos applications sur Playstore et Appstore, tapez 5
6-Désabonnement aux Prédictions, tapez 6

Pour commencer, répondez simplement avec le numéro de l'option qui vous intéresse`;

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
    ? `🏠 Votre menu principal :\n${menuContent}`
    : `👋 ${name}, Bienvenue sur *Predictfoot* ! ⚽,\n\n  Faites partie de notre communauté de passionnés et recevez chaque jour des pronostics ultra-précis pour gagner gros ! 🎉. \n\nVoici ce que vous pouvez faire :

${menuContent}`; 
};

module.exports = { menuData,adminMenuData };
