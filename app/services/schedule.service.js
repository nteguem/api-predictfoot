const cron = require('node-cron');
const { fetchAndSaveMatches } = require('./fixture.service');
const { correctPrediction, publishPrediction } = require("./predict.service");
const tasks = {};

// Fonction pour obtenir la date d'aujourd'hui au format YYYY-MM-DD
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Fonction pour obtenir la date d'hier au format YYYY-MM-DD
function getYesterdayDate() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// Fonction pour planifier une tâche
function scheduleTask(name, cronTime, taskFunction) {
  // Si une tâche existe déjà sous ce nom, la stopper avant d'en créer une nouvelle
  if (tasks[name]) {
    tasks[name].stop();
    console.log(`Existing task "${name}" stopped.`);
  }

  // Créer et planifier une nouvelle tâche
  tasks[name] = cron.schedule(cronTime, async () => {
    try {
      await taskFunction();
      console.log(`Task "${name}" executed successfully at ${new Date().toISOString()}`);
    } catch (error) {
      console.log(`Error executing task "${name}":`, error);
    }
  }, { scheduled: false });
}

// Fonction pour démarrer une tâche spécifique
function startTask(name) {
  if (tasks[name]) {
    tasks[name].start();
    console.log(`Task "${name}" started.`);
  } else {
    console.log(`Task "${name}" not found.`);
  }
}

// Fonction pour arrêter une tâche spécifique
function stopTask(name) {
  if (tasks[name]) {
    tasks[name].stop();
    console.log(`Task "${name}" stopped.`);
  } else {
    console.log(`Task "${name}" not found.`);
  }
}

// Fonction pour arrêter toutes les tâches
function stopAllTasks() {
  Object.keys(tasks).forEach(task => {
    tasks[task].stop();
    console.log(`Task "${task}" stopped.`);
  });
}

// Planifier les tâches
async function scheduleAllTasks(client) {
  await scheduleTask('fetchAndSaveMatches', '32 02 * * *', fetchAndSaveMatches);
  await scheduleTask('correctPrediction', '33 02 * * *', correctPrediction);
  await scheduleTask('publishAllPredictions', '30 10 * * *', async () => {
    await publishPrediction(client, getYesterdayDate());  // Envoi des résultats de la veille
    await publishPrediction(client, getTodayDate());      // Envoi des prédictions du jour
  });
 Object.keys(tasks).forEach(task => startTask(task));
}

module.exports = {
  scheduleTask,
  startTask,
  stopTask,
  stopAllTasks,
  scheduleAllTasks
};
