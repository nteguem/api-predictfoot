require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const createError = require('http-errors');
const admin = require('firebase-admin');
const path = require('path');

const dbConnect = require('./app/config/dbConnect');
const appRoutes = require('./app/routes');
const { initializeWhatsAppClient, handleIncomingMessages } = require('./app/views/whatsApp/whatappsHandler');
const setupSocketHandlers = require('./app/config/socket.handlers');
const { ensureDefaultGroupsExist } = require('./app/services/group.service');
const { ensureDefaultPlansExist } = require('./app/services/plan.service');
const { scheduleAllTasks } = require('./app/services/schedule.service');
const { scheduleCampaignTasks } = require('./app/services/campaign.service');
const { corsOptions, socketConfig } = require('./app/config/server.config');

class Application {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server);
    this.whatsAppClient = null;
  }

  async initialize() {
    try {
      // Initialize database connection
      await dbConnect();
      console.log('Database connected successfully');

      // Initialize Firebase Admin
      await this.initializeFirebase();

      // Configure middleware
      this.setupMiddleware();

      // Initialize WhatsApp client
      this.initializeWhatsApp();

      // Setup socket connections
      this.setupSocketConnections();

      // Initialize services
      await this.initializeServices();

      // Setup routes and error handling
      this.setupRoutes();
      this.setupErrorHandling();

      return this;
    } catch (error) {
      console.error('Application initialization failed:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(cors(corsOptions));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(cookieParser());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      console.log(`${req.method} ${req.url}`);
      next();
    });
  }

  async initializeFirebase() {
    try {
      const firebaseCredentials = path.join(__dirname, 'firebase-credentials.json');
      admin.initializeApp({
        credential: admin.credential.cert(firebaseCredentials)
      });
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      throw error;
    }
  }

  initializeWhatsApp() {
    this.whatsAppClient = initializeWhatsAppClient(this.io);
    handleIncomingMessages(this.whatsAppClient);
    this.whatsAppClient.initialize();
  }

  setupSocketConnections() {
    // Utiliser le gestionnaire de socket amélioré
    setupSocketHandlers(this.io, this.whatsAppClient);
  }

  async initializeServices() {
    try {
      await Promise.all([
        ensureDefaultGroupsExist(),
        ensureDefaultPlansExist(),
        scheduleAllTasks(this.whatsAppClient),
        scheduleCampaignTasks('start', this.whatsAppClient)
      ]);
      console.log('Services initialized successfully');
    } catch (error) {
      console.error('Service initialization failed:', error);
      throw error;
    }
  }

  setupRoutes() {
    this.app.use('/api/v1', appRoutes(this.whatsAppClient));
    
    // Handle 404 errors
    this.app.use((req, res, next) => {
      next(createError(404, 'Route not found'));
    });
  }

  setupErrorHandling() {
    this.app.use((err, req, res, next) => {
      const status = err.status || 500;
      const message = err.message || 'Internal Server Error';

      console.error(`Error ${status}: ${message}`);

      res.status(status).json({
        error: {
          status,
          message,
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
      });
    });
  }

  async start() {
    const port = process.env.PORT || 3001;
    
    return new Promise((resolve) => {
      this.server.listen(port, () => {
        console.log(`Server started on port ${port}`);
        resolve();
      });
    });
  }
}

// Application bootstrap
const startApplication = async () => {
  try {
    const app = await new Application().initialize();
    await app.start();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

startApplication();