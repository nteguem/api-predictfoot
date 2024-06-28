const Predict = require('../models/predict.model');
const {loadFixtureData,findFixtureByTeamId} = require("./fixture.service");
const moment = require('moment');
const { getRandomDelay } = require("../helpers/utils")
const {sendMediaToNumber} = require('../helpers/whatsApp/whatsappMessaging');
const {generateImage} = require('./generateImagePredict.service');
const User = require('../models/user.model');
const { verifyUserVip } = require('../services/subscription.service');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function createPrediction(predictionData) {
  try {
    const newPrediction = new Predict(predictionData);
    await newPrediction.save();
    return { success: true, message: 'Prediction created successfully', prediction: newPrediction };
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


async function listPredictions(page = 1, limit = 5, date = null,isVisible = null,isVip=false) {
  try {
    if (date) {
         let query = {};
         // Créer une plage de dates pour couvrir toute la journée
         const startOfDay = moment(date).startOf('day').toISOString();
         const endOfDay = moment(date).endOf('day').toISOString();
   
         query["fixture.event_date"] = {
           $gte: startOfDay,
           $lt: endOfDay
         };
   
       // Ajouter la condition pour isVisible si elle est passée en paramètre
       if (isVisible !== null) {
         query.isVisible = isVisible;
       }
        // Ajouter la condition pour isVip si elle est passée en paramètre
        if (isVip !== null) {
          query.isVip = isVip;
        }
      const predictions = await Predict.find(query);
      return { success: true, predictions, isFiltered: true };
    } 
    // Obtenir le nombre total de dates de prédiction
    const distinctDates = await Predict.distinct("fixture.event_date");
    
    // Calculer le nombre total de pages
    const totalPages = Math.ceil(distinctDates.length / limit);

    // Pagination
    const skipCount = (page - 1) * limit;

    // Obtenir les dates de prédiction pour la page actuelle
    const currentDates = distinctDates.slice(skipCount, skipCount + limit);

    // Obtenir les prédictions pour chaque date
    const predictions = await Promise.all(currentDates.map(async (date) => {
      const predictionsForDate = await Predict.find({ "fixture.event_date": date });
      return { date, predictions: predictionsForDate };
    }));

    return {
      success: true,
      totalPages,
      totalDates: distinctDates.length,
      currentPage: page,
      groupedPredictions: predictions
    };
  } catch (error) {
    console.log('Error listing predictions:', error);
    return { success: false, error: error.message };
  }
}





async function correctPrediction() {
  try {
    const today = new Date();
    today.setDate(today.getDate()-1);
    const yesterdayDate = today.toISOString().split('T')[0];
    const fixtureData = await loadFixtureData(yesterdayDate);
    const { predictions } = await listPredictions(1, 15, yesterdayDate,true,true); 
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



async function publishPrediction(client, date, isVip) {
  try {
    const predictionDate = new Date(date).toISOString().split('T')[0];

    // Récupérer les prédictions du jour
    const { predictions } = await listPredictions(1, 15, predictionDate, true, isVip); 
    if (predictions.length === 0) return;
    const imageData = predictions.length > 0 ? await generateImage(predictions) : null;
    // Récupérer les utilisateurs et leur statut VIP
    const users = await User.find({});
    const userGroups = await Promise.all(users.map(async user => ({
      user,
      isVip: await verifyUserVip(user.phoneNumber)
    })));

    const targetUsers = userGroups.filter(group => group.isVip === isVip).map(group => group.user);

    await sendPredictions(client, targetUsers, imageData);

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










module.exports = {
  createPrediction,
  updatePrediction,
  deletePrediction,
  listPredictions,
  correctPrediction,
  publishPrediction,
  listLastTenDaysPredictions
};
