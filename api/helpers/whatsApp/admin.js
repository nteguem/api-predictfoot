const { adminMenuData } = require("../../data");
const logger = require('../logger');
const { sendMessageToNumber } = require('./whatsappMessaging');
const { listGroups } = require("../../services/group.service");

let Steps = {};
let name = "";
let description = "";
let totalMembers = 0;

const resetVariables = () => {
  name = "";
  description = "";
  totalMembers = 0;
};

const AdminCommander = async (user, msg, client) => {
  try {
    const Menu = adminMenuData(user.data.pseudo, user.exist);
    const listGroup = (await listGroups()).groups;

    if (!('participant' in msg.id)) {
      if (!Steps[msg.from]) {
        Steps[msg.from] = {};
        Steps[msg.from]["currentMenu"] = "mainMenu";
      }
      const currentMenu = Steps[msg.from]["currentMenu"];
      if (msg.body === "#") {
        Steps[msg.from]["currentMenu"] = "mainMenu";
        resetVariables();
        msg.reply(Menu);
        return;
      }

      switch (currentMenu) {
        case "mainMenu":
          switch (msg.body) {
            case "1":
              let groupListMessage = "📋 Sélectionnez un ou plusieurs groupes auxquels vous souhaitez envoyer la campagne (par exemple, tapez 1 ou 1,2,5) :\n\n";
              listGroup.forEach((group, index) => {
                groupListMessage += `${index + 1}. ${group.name} (Nombre d'utilisateurs : ${group.memberCount}), tapez ${index + 1}.\n`;
              });
              groupListMessage += "\n\n _Tapez # pour revenir au menu principal_";
              msg.reply(groupListMessage);
              Steps[msg.from]["currentMenu"] = "selectGroup";
              break;
            default:
              Steps[msg.from]["currentMenu"] = "mainMenu";
              msg.reply(`Veuillez choisir un menu valide ci-dessus\n\n _Tapez # pour revenir au menu principal_`);
              await sendMessageToNumber(client, user.data.phoneNumber, Menu);
          }
          break;
        default:
          Steps[msg.from]["currentMenu"] = "mainMenu";
          msg.reply("Commande saisie incorrecte. 🤖\n\n _Tapez # pour revenir au menu principal_");
      }
    }
  } catch (error) {
    logger(client).error('Erreur rencontrée Admin', error);
    msg.reply(`An internal server error occurred due to an action by administrator : ${user.data.pseudo}. Our team is working on it. \n\n Please type # to return to the main menu.`);
  }
};

module.exports = {
  AdminCommander,
};
