const express = require('express');
const router = express.Router();
const uploadHandler = require('../controllers/upload.controller');
const multer = require('multer');
const upload = multer(); // Configure multer pour gérer les fichiers

/**
 * Set up the upload routes and link them to the corresponding controller functions.
 * @param {express.Application} app - The Express application.
 */
const setupUpload = (app) => {
  // Mount the 'router' to handle routes with the base path '/upload'.
  app.use("/upload", router);

  router.post('/file', upload.single('file'), (req, res) => {
    uploadHandler.uploadFile(req, res);
  });
};

module.exports = { setupUpload };
