require('dotenv').config(); // Load environment variables from the .env file
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET; // Utilisez la même clé secrète que dans le service

function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];

  if (token == null) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
}

module.exports = {
  authenticateToken,
};
