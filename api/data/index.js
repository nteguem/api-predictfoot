const menuContent = `
1-Pronostics du jour, tapez 1
2-Astuce et conseil exclusif du jour, tapez 2
3-Historique des prédictions, tapez 3
4-Abonnements et Offres tapez 4
5-Informations et Aide tapez 5
6-Suivre nos applications sur Playstore et Appstore, tapez 6
7-Désabonnement aux Prédictions, tapez 7    

Pour commencer, répondez simplement avec le numéro de l'option qui vous intéresse`;

const adminMenuContent = `
1️⃣ Faire une campagne, tapez 1.

Administration - Optimisez vos opérations avec efficacité et précision 🚀`;

const adminMenuData = (name, isWelcome) => {
  return isWelcome
    ? `🏠 Votre menu d'administration :
  
${adminMenuContent}`
    : `Salut ${name},\n\n Bienvenue dans l'espace d'administration de Makeda. Nous sommes ici pour vous aider à gérer efficacement toutes les opérations.

${adminMenuContent}`;
};


const menuData = (name, isWelcome) => {
  return isWelcome
    ? `🏠 Votre menu principal :\n${menuContent}`
    : `👋 ${name}, Bienvenue sur *Predictfoot* ! ⚽,\n\n  Faites partie de notre communauté de passionnés et recevez chaque jour des pronostics ultra-précis pour gagner gros ! 🎉. \n\nVoici ce que vous pouvez faire :

${menuContent}`; 
};

module.exports = { menuData,adminMenuData };
