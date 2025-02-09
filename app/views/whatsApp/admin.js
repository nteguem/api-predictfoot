const { getAdminMenu } = require('../../data');
const { replyToMessage } = require('./whatsappMessaging');
const logService = require('../../services/log.service');
const userService = require('../../services/user.service');

const AdminSteps = {};

const resetAdmin = (admin) => {
  AdminSteps[admin.data.phoneNumber] = { currentMenu: 'adminMenu' };
};

const AdminCommander = async (admin, msg, client) => {
  try {
    if (!msg.isGroup && !msg.isStatus) {
      if (!AdminSteps[admin.data.phoneNumber]) {
        resetAdmin(admin);
      }

      if (msg.body === "#") {
        resetAdmin(admin);
        await replyToMessage(client, msg, getAdminMenu());
        return;
      }

      const { currentMenu } = AdminSteps[admin.data.phoneNumber];
      switch (currentMenu) {
        case "adminMenu":
          switch (msg.body) {
            case "1":
              AdminSteps[admin.data.phoneNumber].currentMenu = "sendPrediction";
              await replyToMessage(client, msg, 
                "📝 Envoyer une Prédiction\n\n" +
                "1. Prédiction Gratuite\n" +
                "2. Prédiction VIP"
              );
              break;
            case "2":
              AdminSteps[admin.data.phoneNumber].currentMenu = "userManagement";
              await replyToMessage(client, msg, 
                "👥 Gestion Utilisateurs\n\n" +
                "1. Liste des Utilisateurs\n" +
                "2. Ajouter VIP\n" +
                "3. Retirer VIP"
              );
              break;
            case "3":
              AdminSteps[admin.data.phoneNumber].currentMenu = "stats";
              await replyToMessage(client, msg, "📊 Statistiques & Rapports\n\n[Afficher les stats]");
              break;
            case "4":
              AdminSteps[admin.data.phoneNumber].currentMenu = "updateResults";
              await replyToMessage(client, msg, "🎯 Mise à jour des Résultats\n\n[Interface de mise à jour]");
              break;
            default:
              await replyToMessage(client, msg, `⚠️ Option non valide\n\n${getAdminMenu()}`);
          }
          break;

        // Add other admin menu states here
        case "sendPrediction":
        case "userManagement":
        case "stats":
        case "updateResults":
          resetAdmin(admin);
          await replyToMessage(client, msg, getAdminMenu());
          break;

        default:
          await replyToMessage(client, msg, `⚠️ Option non valide\n\n${getAdminMenu()}`);
      }
    }
  } catch (error) {
    await logService.addLog(`${error.message}`, 'AdminCommander', 'error');
    await replyToMessage(client, msg, "Une erreur est survenue. Tapez # pour revenir au menu admin.");
  }
};

module.exports = {
  AdminCommander
};