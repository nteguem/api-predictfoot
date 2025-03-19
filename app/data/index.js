const getMainMenu = (isFirstContact, pseudo) => {
  if (isFirstContact) {
    return `👋 Salut ${pseudo} ,\n\n` +
           `✨ *Bienvenue sur BIGWIN* votre solution russe d'aide à la réussite de vos paris football !\n\n`+
           `🤖 *Nos experts et notre intelligence artificielle analysent les meilleurs événements sportifs pour vous faire gagner !* 💰🔥\n\n` +
           `📊 *80% de réussite* sur nos pronostics !\n\n` +
           `🔢 Que voulez-vous faire ?\n\n` +
           `1️⃣ *Prédictions du Jour*, tapez 1\n` +
           `2️⃣ *Anciennes Prédictions*, tapez 2\n` +
           `3️⃣ *Mon Compte*, tapez 3\n` +
           `4️⃣ *Nous retrouver sur Play Store*, tapez 4\n`+
           `5️⃣ *Nous contacter*, tapez 5`;
  }

  return `✨ *BIGWIN - Prédictions*\n\n` +
  `🔢 Que voulez-vous faire ?\n\n` +
  `1️⃣ *Prédictions du Jour*, tapez 1\n` +
  `2️⃣ *Anciennes Prédictions*, tapez 2\n` +
  `3️⃣ *Mon Compte*, tapez 3\n` +
  `4️⃣ *Nous retrouver sur Play Store*, tapez 4\n`+
  `5️⃣ *Nous contacter*, tapez 5`;
};



const getDailyPredictionsMenu = () => {
  return `🔢 *Prédictions du Jour*\n\n` +
         `1️⃣ *Prédiction Gratuite*, tapez 1\n` +
         `2️⃣ *Prédiction VIP*, tapez 2\n\n` +
         `_*Tapez # pour revenir au menu principal*_`;
};


const getOldPredictionsMenu = () => {
  return `📜 *Anciennes Prédictions*\n\n` +
         `[Affichage des anciennes prédictions]\n\n` +
         `_*Tapez # pour revenir au menu principal*_`;
};

const getAccountMenu = (user, isVip, subscription) => {  
  const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };

  let accountInfo = `👤 *Mon Compte*\n\n` +
    `*Pseudo :* ${user.pseudo}\n` +
    `*Statut :* ${isVip ? "Utilisateur VIP 💎" : "Utilisateur Standard 🆓"}\n` +
    `📅 *Inscrit le :* ${new Date(user.createdAt).toLocaleDateString('fr-FR', dateOptions)}\n`;
 
  if (subscription) {
    accountInfo += `\n*Plan actif :* ${subscription.plan.name} (${subscription.plan.price} XAF)\n` +
      `*Début :* ${new Date(subscription.startDate).toLocaleDateString('fr-FR', dateOptions)}\n` +
      `*Expiration :* ${new Date(subscription.endDate).toLocaleDateString('fr-FR', dateOptions)}\n`;
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