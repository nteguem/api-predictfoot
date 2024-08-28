require('dotenv').config();
const express = require('express');
const appRoutes = require("./api/routes/index");
const bodyParser = require("body-parser");
const cors = require('cors');
const createError = require("http-errors");
const cookieParser = require("cookie-parser");
const dbConnect = require('./api/config/dbConnect');
const http = require('http');
const socketIo = require('socket.io');
const { initializeWhatsAppClient, handleIncomingMessages } = require('./api/helpers/whatsApp/whatappsHandler');
const {ensureDefaultGroupsExist} = require("./api/services/group.service")
const {ensureDefaultPlansExist} = require("./api/services/plan.service")
const {scheduleAllTasks} = require("./api/services/schedule.service")
const {scheduleCampaignTasks} = require("./api/services/campaign.service")

// // Connection to MongoDB
dbConnect(); 
// App initialization
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
 
// Middleware pour gérer les requêtes CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}); 

// Create instance whatapp
const client = initializeWhatsAppClient(io);

//Handle incoming messages from the chatbot using the modular function.
handleIncomingMessages(client);

// Launch WhatsApp client
client.initialize();
 
//socket io for qrCode
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('message', (data) => { 
    console.log('Message from client:', data);
  });

  socket.on('disconnectClient', () => {
    console.log('Received disconnect request from client');
    if (client) {
      io.emit('qrCode', "disconnected");
      io.emit('numberBot', "");
      client.logout(); // Déconnecter le client WhatsApp
      client.initialize();

    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  if (client.hasOwnProperty('info')) {
    socket.emit('numberBot', `${client.info?.wid?.user} (${client.info?.pushname})`);
    socket.emit('qrCode', "connected"); 
  }
});

//Launch all task 
scheduleAllTasks(client);
scheduleCampaignTasks("start",client);
// Ensure default groups Exist
ensureDefaultGroupsExist();
//Ensure defaut plan exist
ensureDefaultPlansExist(); 
// App Routes
app.use('/api/v1', appRoutes(client));   

// Custom 404 error handler 
app.use((req, res, next) => {
  next(createError(404, 'Route not found'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: {
      status: err.status || 500,
      message: err.message || 'Internal Server Error',
    },
  });
});

// Start the app
server.listen(8080, () => {
  console.log("Server started");
});
