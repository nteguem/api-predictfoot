const Predict = require('../models/predict.model');
const {loadFixtureData,findFixtureByTeamId} = require("./fixture.service");
const moment = require('moment');
const { getRandomDelay } = require("../helpers/utils")
const {sendMediaToNumber,sendMessageToNumber} = require('../views/whatsApp/whatsappMessaging');
const {generateImage} = require('./generateImagePredict.service');
const User = require('../models/user.model');
const { verifyUserVip } = require('./subscription.service');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function createPrediction(predictionData, client) {
  try {
    // 1. Créer la prédiction sans le client WhatsApp
    const newPrediction = new Predict(predictionData);
    
    // 2. Sauvegarder la prédiction
    const savedPrediction = await newPrediction.save();
    
    // 3. Si c'est un live et que WhatsApp est activé, envoyer le message
    if (savedPrediction.isLive ) {
      try {
        const messageText = [
          `🔴 PRÉDICTION EN DIRECT (_match en cours_)\n\n`,
          `*${savedPrediction.fixture.homeTeam.team_name} 🆚 ${savedPrediction.fixture.awayTeam.team_name}*`,
          `\n Prédiction : *${savedPrediction.prediction}*`,
          '\n⚡️ Placez votre pari maintenant!'
        ].join('\n');

        const users = await User.find({});
        for (const user of users) {
          const {isVip} = await verifyUserVip(user.phoneNumber);
          if (isVip) {
            await sendMessageToNumber(client, user.phoneNumber, messageText);
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
          }
        }
      } catch (whatsappError) {
        console.error('Error sending WhatsApp messages:', whatsappError);
        // On continue même si l'envoi WhatsApp échoue
      }
    }

    return { 
      success: true, 
      message: 'Prediction created successfully', 
      prediction: savedPrediction 
    };
  } catch (error) {
    console.log('Error creating prediction:', error);
    return { success: false, error: error.message };
  }
}
 
async function updatePrediction(predictionId, updatedData) {
  try {
    const prediction = await Predict.findByIdAndUpdate(predictionId, updatedData, { new: true });
    if (!prediction) {
      return { success: false, error: 'Prediction not found' };
    }
    return { success: true, message: 'Prediction updated successfully', prediction };
  } catch (error) {
    console.log('Error updating prediction:', error);
    return { success: false, error: error.message };
  }
}

async function deletePrediction(predictionId) {
  try {
    const prediction = await Predict.findByIdAndDelete(predictionId);
    if (!prediction) {
      return { success: false, error: 'Prediction not found' };
    }
    return { success: true, message: 'Prediction deleted successfully' };
  } catch (error) {
    console.log('Error deleting prediction:', error);
    return { success: false, error: error.message };
  }
}



async function listPredictions(
  page = 1, 
  limit = 5, 
  date = null, 
  isVisible = null, 
  isVip = null,  
  isPlatinum = null,
  isLive = null
) {
  try {
    let query = {};

    // Filtres conditionnels
    if (isVisible !== null) {
      query.isVisible = isVisible;
    }

    if (isVip !== null) {
      query.isVip = isVip;
      query.isPlatinum = false;
    }

    if (isPlatinum !== null) {
      query.isPlatinum = isPlatinum;
    }

    if (isLive !== null) {
      query.isLive = isLive;
    }

    // Logique de date identique à précédemment
    if (date) {
      if (!moment(date).isValid()) {
        throw new Error("Date invalide : " + date);
      }

      const startOfDay = moment(date).startOf('day').toISOString();
      const endOfDay = moment(date).endOf('day').toISOString();

      query["fixture.event_date"] = {
        $gte: startOfDay,
        $lt: endOfDay
      };

      const predictions = await Predict.find(query).sort({ "fixture.event_date": -1 });
      return { success: true, predictions };
    }

    // Reste de la fonction identique
    const distinctDates = await Predict.distinct("fixture.event_date", query);
    const distinctDatesWithoutTime = distinctDates.map(date => moment(date).format('YYYY-MM-DD'));
    const uniqueDates = [...new Set(distinctDatesWithoutTime)];
    const sortedDates = uniqueDates.sort((a, b) => moment(b).diff(moment(a)));

    const skipCount = (page - 1) * limit;
    const currentDates = sortedDates.slice(skipCount, skipCount + limit);

    const groupedPredictions = await Promise.all(
      currentDates.map(async (date) => {
        const startOfDay = moment(date).startOf('day').toISOString();
        const endOfDay = moment(date).endOf('day').toISOString();
        
        const dateQuery = {
          ...query,
          "fixture.event_date": {
            $gte: startOfDay,
            $lt: endOfDay
          }
        };

        const predictionsForDate = await Predict.find(dateQuery);
        return { date, predictions: predictionsForDate };
      })
    );

    return {
      success: true,
      total: uniqueDates.length,
      groupedPredictions
    };

  } catch (error) {
    console.log('Erreur lors de la liste des prédictions:', error);
    return { success: false, error: error.message };
  }
}





async function correctPrediction() {
  try {
    const today = new Date();
    today.setDate(today.getDate()-1);
    const yesterdayDate = today.toISOString().split('T')[0];
    const fixtureData = await loadFixtureData(yesterdayDate);
    const { predictions } = await listPredictions(1, 15, yesterdayDate,true,null); 
    const updatedPredictions = await Promise.all(predictions.map(async (prediction) => {
      const homeTeamId = prediction.fixture.homeTeam.team_id;
      const fixture = await findFixtureByTeamId(fixtureData, homeTeamId);
      if (fixture) {
        const updatedPrediction = { ...prediction, fixture };
        const result =  await updatePrediction(prediction._id, { fixture: updatedPrediction.fixture });
        return result;
      } else {
        console.log(`Fixture not found for home team ID ${homeTeamId}`);
        return prediction; 
      }
    }));

    return updatedPredictions;
  } catch (error) {
    console.log('Error updating predictions with fixture data:', error);
    return [];
  }
}



async function publishPrediction(client, date) {
  try {
    const predictionDate = new Date(date).toISOString().split('T')[0];

    // Récupérer toutes les prédictions (VIP et non-VIP)
    const { predictions } = await listPredictions(1, 15, predictionDate, true, null);

    // Filtrer les prédictions VIP et non-VIP
    const vipPredictions = predictions.filter(p => p.isVip);
    const nonVipPredictions = predictions.filter(p => !p.isVip);

    // Générer les images uniquement si des prédictions existent
    const images = {
      vip: vipPredictions.length > 0 ? await generateImage(vipPredictions) : null,
      nonVip: nonVipPredictions.length > 0 ? await generateImage(nonVipPredictions) : null,
    };

    // Récupérer les utilisateurs et leur statut VIP
    const users = await User.find({});
    const userGroups = {
      vip: [],
      nonVip: [],
    };

    for (const user of users) {
      const {isVip} = await verifyUserVip(user.phoneNumber);
      userGroups[isVip ? 'vip' : 'nonVip'].push(user);
    }

    // Envoyer les prédictions aux utilisateurs VIP et non-VIP uniquement si des images ont été générées
    for (const group in userGroups) {
      if (userGroups[group].length > 0 && images[group]) {
        await sendPredictions(client, userGroups[group], images[group]);
      }
    }

  } catch (error) {
    console.log('Error daily predictions:', error);
  }
}




const sendPredictions = async (client, users, imageData) => {
  if (!imageData) return;
  for (const user of users) {
    await sendMediaToNumber(client, user.phoneNumber, "image/png", imageData.toString("base64"), "nameMedia");
    await delay(getRandomDelay(5000, 15000));
  }
};

async function listLastTenDaysPredictions(isVisible = true, isVip = false) {
  try {
    // Obtenir la date d'hier en tant que chaîne au format AAAA-MM-JJ
    const today = new Date();
    today.setDate(today.getDate() - 1);
    const yesterdayDate = today.toISOString().split('T')[0];
    
    // Obtenir toutes les dates distinctes pour les prédictions correspondant à isVisible et isVip
    const distinctDates = await Predict.distinct("fixture.event_date", { isVisible, isVip });
    
    // Filtrer les dates qui sont <= à hier (comparaison au niveau du jour)
    const filteredDates = distinctDates.filter(date => {
      const dateOnly = new Date(date).toISOString().split('T')[0];
      return dateOnly <= yesterdayDate;
    });
    
    // Convertir les dates en chaînes sans l'heure pour éviter les comparaisons incorrectes
    const filteredDateStrings = filteredDates.map(date => new Date(date).toISOString().split('T')[0]);
    
    // Rendre les dates uniques en créant un ensemble
    const uniqueDates = [...new Set(filteredDateStrings)];
    
    // Trier les dates par ordre décroissant et prendre les 10 dernières
    const lastTenDates = uniqueDates.sort((a, b) => new Date(b) - new Date(a)).slice(0, 10);
    
    // Calculer le taux de réussite pour chaque date
    const dateRates = await Promise.all(lastTenDates.map(async (date) => {
      const { predictions } = await listPredictions(1, 15, date, isVisible, isVip);
      const totalPredictions = predictions.length;
      const successfulPredictions = predictions.filter(prediction => prediction.iswin).length;
      const successRate = totalPredictions > 0 ? ((successfulPredictions / totalPredictions) * 100).toFixed(2) : 0;
      
      // Formatage du taux de réussite comme "4/6 (80%)"
      const successRateString = `${successfulPredictions}/${totalPredictions} (${successRate}%)`;
      
      return {
        date,
        rate: successRateString
      };
    }));

    return {
      success: true,
      data: dateRates,
      pagination: {
        totalPages: 1,
        totalDates: dateRates.length,
        currentPage: 1
      }
    };
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return { success: false, error: error.message };
  }
}

async function oldTips(isVisible = true, isVip = false) {
  try {
          // Récupérer toutes les prédictions
          const allPredictions = await Predict.find({
            isVisible: isVisible,
            isVip: isVip
        }).sort({ "fixture.event_date": -1 }).lean();
  
        // Créer une structure pour stocker les dates et leurs prédictions
        const predictionsByDate = {};
  
        allPredictions.forEach(prediction => {
            const predictionDate = new Date(prediction.fixture.event_date).toISOString().split('T')[0];
            if (!predictionsByDate[predictionDate]) {
                predictionsByDate[predictionDate] = [];
            }
            predictionsByDate[predictionDate].push(prediction);
        });
  
        // Récupérer les 5 dernières dates distinctes
        const lastFiveDates = Object.keys(predictionsByDate).sort((a, b) => new Date(b) - new Date(a)).slice(0, 5);
  
        // Retourner les prédictions liées aux 5 dernières dates
        const result = lastFiveDates.map(date => ({
            date,
            predictions: predictionsByDate[date]
        }));
      return {
      success: true,
      data: result
    };
  } catch (error) {
    console.log('Error fetching last seven days predictions:', error);
    return { success: false, error: error.message }; 
   }
}

async function formatPredictionText(prediction) {
  
  let message = [
    `🎯 *NOUVELLE PRÉDICTION* ${prediction.isLive ? '🔴 LIVE' : ''}\n`,
    `🏆 ${prediction.championship.name}`,
    `⏰ En cours`,
    `\n${prediction.fixture.homeTeam.team_name} 🆚 ${prediction.fixture.awayTeam.team_name}`,
    `📍 ${prediction.fixture.venue || 'Stade à confirmer'}`,
    `\n💫 Notre Prédiction: ${prediction.prediction}`,
    '\n⚡️ Ne tardez pas! Les cotes peuvent baisser rapidement!',
    prediction.isLive ? '\n⚠️ PRÉDICTION LIVE: Placez votre pari maintenant!' : '',
    '\nBonne chance à tous! 🍀'
  ].filter(Boolean).join('\n');

  return message;
}


module.exports = {
  createPrediction,
  updatePrediction,
  deletePrediction,
  listPredictions,
  correctPrediction,
  publishPrediction,
  listLastTenDaysPredictions,
  oldTips,
};
