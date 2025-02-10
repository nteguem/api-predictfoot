const getMainMenu = (isFirstContact, pseudo) => {
  if (isFirstContact) {
    return `👋 Bonjour ${pseudo} !\n\n` +
           `✨ *Bienvenue sur BIGWIN* – Votre assistant de prédictions football !\n\n` +
           `🤖 *Nos experts et IA analysent les meilleurs événements sportifs pour vous faire gagner !* 💰🔥\n\n` +
           `📊 *80% de réussite* sur nos pronostics !\n\n` +
           `📜 Que voulez-vous faire ?\n\n` +
           `1- *Prédictions du Jour*, tapez 1\n` +
           `2- *Anciennes Prédictions*, tapez 2\n` +
           `3- *Mon Compte*, tapez 3\n` +
           `4- *Suivre sur Play Store*, tapez 4`;
  }

  return `✨ *BIGWIN - Prédictions*\n\n` +
         `📜 Que voulez-vous faire ?\n\n` +
         `1- *Prédictions du Jour*, tapez 1\n` +
         `2- *Anciennes Prédictions*, tapez 2\n` +
         `3- *Mon Compte*, tapez 3\n` +
         `4- *Suivre sur Play Store*, tapez 4`;
};



const getDailyPredictionsMenu = () => {
  return `📜 *Prédictions du Jour*\n\n` +
         `1 - *Prédiction Gratuite*, tapez 1\n` +
         `2 - *Prédiction VIP*, tapez 2\n\n` +
         `_*Tapez # pour revenir au menu principal*_`;
};


const getOldPredictionsMenu = () => {
  return `📜 *Anciennes Prédictions*\n\n` +
         `[Affichage des anciennes prédictions]\n\n` +
         `_*Tapez # pour revenir au menu principal*_`;
};

const getAccountMenu = (user, isVip, subscription) => {  
  let accountInfo = `👤 *Mon Compte*\n\n` +
    `*Pseudo :* ${user.pseudo}\n` +
    `*Statut :* ${isVip ? "Utilisateur VIP 💎" : "Utilisateur Standard 🆓"}\n` +
    `📅 *Inscrit le :* ${new Date(user.createdAt).toLocaleDateString()}\n`;
 
  if (subscription) {
    accountInfo += `\n*Plan actif :* ${subscription.plan.name} (${subscription.plan.price}€)\n` +
      `*Début :* ${new Date(subscription.startDate).toLocaleDateString()}\n` +
      `*Expiration :* ${new Date(subscription.endDate).toLocaleDateString()}\n`;
  }
 
  accountInfo += `\n_*Tapez # pour revenir au menu principal*_`;
 
  return accountInfo;
 };

const getInvalidInputMessage = (invalidInput,message) => {
  return `❌ *Option non valide :* "${invalidInput}"\n` +
         `${message}`;
};

module.exports = {
  getMainMenu,
  getDailyPredictionsMenu,
  getOldPredictionsMenu,
  getAccountMenu,
  getInvalidInputMessage
};