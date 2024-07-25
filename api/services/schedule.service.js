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
  await scheduleTask('fetchAndSaveMatches', '49 01 * * *', fetchAndSaveMatches);
  await scheduleTask('correctPrediction', '11 13 * * *', correctPrediction);
  await scheduleTask('publishPrediction', '12 13 * * *', () => publishPrediction(client, getTodayDate()));
  await scheduleTask('publishResultPrediction', '32 15 * * *', () => publishPrediction(client, getYesterdayDate()));
  await scheduleTask('publishResultPredictionVip', '45 15 * * *', () => publishPrediction(client, getYesterdayDate(), true));
  Object.keys(tasks).forEach(task => startTask(task));
}

module.exports = {
  scheduleTask,
  startTask,
  stopTask,
  stopAllTasks,
  scheduleAllTasks
};
