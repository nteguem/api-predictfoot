const cron = require('node-cron');
const { fetchAndSaveMatches } = require('./fixture.service');
const {correctPrediction,publishPrediction} = require("./predict.service");
const tasks = {}; 

// Obtenir la date d'aujourd'hui au format YYYY-MM-DD
const today = new Date();
const todayDate = today.toISOString().split('T')[0];

// Obtenir la date d'hier en utilisant todayDate
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1); 
const yesterdayDate = yesterday.toISOString().split('T')[0];

// Function to schedule a task
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

// Function to start a specific task
function startTask(name) {
  if (tasks[name]) {
    tasks[name].start();
    console.log(`Task "${name}" started.`);
  } else {
    console.log(`Task "${name}" not found.`);
  } 
} 

// Function to stop a specific task
function stopTask(name) {
  if (tasks[name]) {
    tasks[name].stop();
    console.log(`Task "${name}" stopped.`);
  } else {
    console.log(`Task "${name}" not found.`);
  }
}

// Function to stop all tasks
function stopAllTasks() {
  Object.keys(tasks).forEach(task => {
    tasks[task].stop();
    console.log(`Task "${task}" stopped.`);
  });
}

// Schedule the tasks 
async function  scheduleAllTasks(client) {
  await scheduleTask('fetchAndSaveMatches', '25 02 * * *', fetchAndSaveMatches);
  await scheduleTask('correctPrediction', '30 08 * * *', correctPrediction);
  await scheduleTask('publishPrediction', '20 08 * * *', () => publishPrediction(client, todayDate));
  await scheduleTask('publishResultPrediction', '10 08 * * *', () => publishPrediction(client, yesterdayDate));
  await Object.keys(tasks).forEach(task => startTask(task));
}

module.exports = {
  scheduleTask,
  startTask,
  stopTask,
  stopAllTasks,
  scheduleAllTasks
};
