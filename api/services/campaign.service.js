const Campaign = require('../models/campaign.model');
const cron = require('node-cron');
const {sendMessageToNumber,sendMediaToNumber} = require('../helpers/whatsApp/whatsappMessaging')
const {list} = require('./user.service')
const { getRandomDelay } = require("../helpers/utils")
const {getUsersInGroup} = require("./group.service")
const logger = require("../helpers/logger")
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

let tasks = {};
async function createCampaign(campaignData, client) {
  try {
    const hasDuplicates = new Set(campaignData.groups).size !== campaignData.groups.length;
    const newCampaign = new Campaign(campaignData);
    if(hasDuplicates)    
    {
        return { success: false, error: "La création d'une campagne avec des groupes identiques n'est pas autorisée." };
    }
    const resultSave =  await newCampaign.save();
    if(resultSave.type === "Instantly")
    {
     sendCampaignWhatapp(client,resultSave)
    }
    await updateCampaignTasks(client);
    return { success: true, message: 'Campagne créée avec succès' };
  } catch (error) {
    logger(client).error('Error create campaign:', error);
    return { success: false, error: error.message };
  }
}

async function updateCampaign(campaignId, updatedData, client) {
  try {
    const hasDuplicates = new Set(updatedData.groups).size !== updatedData.groups.length;
    if(hasDuplicates)    
    {
      return { success: false, error: "La mise a jour d'une campagne avec des groupes identiques n'est pas autorisée." };
    }
    const campaign = await Campaign.findByIdAndUpdate(campaignId, updatedData, { new: true });
    if (!campaign) {
      return { success: false, error: 'Campagne non trouvée' };
    }
    await updateCampaignTasks(client);
    return { success: true, message: 'Campagne mise à jour avec succès', campaign };
  } catch (error) {
    logger(client).error('Error update campaign:', error);

    return { success: false, error: error.message };
  }
}

async function deleteCampaign(campaignId, client) {
  try {
    const campaign = await Campaign.findByIdAndDelete(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campagne non trouvée' };
    }
    await updateCampaignTasks(client);
    return { success: true, message: 'Campagne supprimée avec succès' };
  } catch (error) {
    logger(client).error('Error delete campaign:', error);
    return { success: false, error: error.message };
  }
}

async function listCampaigns(data,client) {
  try {
    const { type } = data;
    let query = {};
    if (type) {
      query = { type };
    }
    const campaigns = await Campaign.find(query, {__v:0 }).populate({ path: 'groups', select: '-members -__v' });
    return { success: true, campaigns };
  } catch (error) {
    logger(client).error('Error list campaigns:', error);
    return { success: false, error: error.message };
  }
}

async function updateCampaignTasks(client) {
    await scheduleCampaignTasks("stop");
    await scheduleCampaignTasks("start",client);
}

async function sendCampaignWhatapp(client, campaign) {
  // let successfulTargets = [];
  try {
    
      for (const group of campaign.groups) {
        const usersInGroup = await getUsersInGroup(group._id);
        for (const targetUser of usersInGroup.users) {
            try {
              if(campaign.description?.hasMedia)
                {
                  fetch(campaign.description?.content)
                  .then(res => {
                      const dest = fs.createWriteStream('tempfile');
                      res.body.pipe(dest);
                      dest.on('finish', () => {
                          fs.readFile('tempfile', 'base64', (err, data) => {
                              if (err) {
                                  console.log('Erreur lors de la lecture du fichier:', err);
                                  return;
                              }
                              sendMediaToNumber(client,targetUser.phoneNumber,res.headers.get('content-type'), data,`${campaign?.name}`, `${campaign?.name}`)
                              fs.unlinkSync('tempfile');
                          });
                      });
                  })
                  .catch(err => {
                      console.log('Erreur lors du téléchargement du fichier:', err);
                  });
                }
                else
                {
                  const content = `Salut ${targetUser.pseudo},\n\n${campaign.name} \n\n ${campaign.description?.content}`;
                  await sendMessageToNumber(client,targetUser.phoneNumber, content);
                }
                const delay = getRandomDelay(5000, 15000);
                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (error) {
              logger(client).error(`Erreur lors de l'envoi de la campagne sur WhatsApp pour ${targetUser.pseudo}`, error);
            }
        }
    }
      
  } catch (error) {
    logger(client).error(`Erreur lors de l'envoi de la campagne sur WhatsApp`, error);
  }
  //  finally {
  //     console.log("Liste des utilisateurs ayant reçu la campagne avec succès :\n ", successfulTargets);
  // }
}



// Fonction pour planifier les tâches de campagne
async function scheduleCampaignTasks(launch,client) {
    if(launch === "stop")
    {
        Object.keys(tasks).forEach(task => {
            tasks[task].stop();
          });
    }
    const result = await listCampaigns({ type: 'Automatically' });
    result?.campaigns?.forEach((campaign, index) => {
        let cronExpression;
        switch (campaign.periodicity.toLowerCase()) {
            case "daily":
                cronExpression = '0 10 * * *';
                break;
            case "weekly":
                cronExpression = '0 10 * * 1';
                break;
            case "monthly":
                cronExpression = '0 10 1 * *';
                break;
            default:
                console.error(`Périodicité non prise en charge pour la campagne "${campaign.name}"`);
                return;
        }

        // Planifier la tâche pour la campagne
       tasks[`campaignTask${index}`] =  cron.schedule(cronExpression, () => {
            sendCampaignWhatapp(client,campaign)
        }, { scheduled: false,  name: `campaignTask${index}`
    });

        if(launch === "start")
        {
            tasks[`campaignTask${index}`].start();
        }
    });
}

module.exports = {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  listCampaigns,
  scheduleCampaignTasks
};
