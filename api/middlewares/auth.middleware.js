const jwt = require('jsonwebtoken');
const ResponseService = require('../services/response.service'); 

/**
 * Middleware pour vérifier le token JWT.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Vérifie si le token est fourni
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ResponseService.unauthorized(res, { message: "Access denied, token missing." });
  }

  const token = authHeader.split(' ')[1]; 

  try {
    // Vérifie et décode le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next(); // Passe au middleware suivant ou au contrôleur
  } catch (error) {
    return ResponseService.unauthorized(res, { message: "Invalid or expired token." });
  }
};

module.exports = authenticateToken;
