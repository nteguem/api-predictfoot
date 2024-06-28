const mongoose = require('mongoose');
const urlDB = process.env.URL_DB;

const dbConnect = async () => {
  try {
    // Connection to mongodb
mongoose.connect(urlDB);
mongoose.Promise = global.Promise
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'));
db.once('open', function() {
    console.log('Connected to mongodb');
})
  } catch (error) {
    console.error('MongoDB connection error :', error);
    throw error;
  }
};

module.exports = dbConnect;
