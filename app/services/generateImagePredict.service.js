const { createCanvas, loadImage } = require('canvas');
const moment = require('moment');
moment.locale('fr');

// Fonction qui encapsule l'image de pronostic dans un cadre mobile
async function generateImage(data) {
  // D'abord, générer l'image de pronostic standard
  const pronosticImageBuffer = await generateImage(data);
  const pronosticImage = await loadImage(pronosticImageBuffer);
  
  // Créer un canvas pour le téléphone mobile
  const mobileWidth = 420;  // Largeur du mockup de téléphone
  const mobileHeight = 900; // Hauteur du mockup de téléphone
  const mobileCanvas = createCanvas(mobileWidth, mobileHeight);
  const ctx = mobileCanvas.getContext('2d');
  
  // Fond blanc
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, mobileWidth, mobileHeight);
  
  // Dessiner le cadre du téléphone
  drawPhoneFrame(ctx, mobileWidth, mobileHeight);
  
  // Dessiner l'interface BIGWIN
  drawBigwinInterface(ctx, mobileWidth, mobileHeight);
  
  // Calculer la taille pour l'image de pronostic
  const maxPronoWidth = mobileWidth - 40;  // Marges de 20px de chaque côté
  const ratio = maxPronoWidth / pronosticImage.width;
  const pronoWidth = maxPronoWidth;
  const pronoHeight = pronosticImage.height * ratio;
  
  // Déterminer la position Y pour commencer à dessiner l'image de pronostic
  // Cela dépendra de la taille de votre interface BIGWIN
  const pronoY = 200;  // Après l'en-tête et les sélecteurs
  
  // Dessiner l'image de pronostic dans le "téléphone"
  ctx.drawImage(pronosticImage, 20, pronoY, pronoWidth, pronoHeight);
  
  // Retourner l'image finale
  return mobileCanvas.toBuffer('image/png');
}

// Fonction pour dessiner le cadre du téléphone
function drawPhoneFrame(ctx, width, height) {
  // Cadre externe du téléphone (gris foncé)
  ctx.fillStyle = '#333333';
  const frameThickness = 10;
  const cornerRadius = 40;
  
  // Dessiner le cadre externe avec des coins arrondis
  roundedRect(ctx, 0, 0, width, height, cornerRadius);
  ctx.fill();
  
  // Dessiner l'écran intérieur (blanc)
  ctx.fillStyle = '#FFFFFF';
  roundedRect(
    ctx, 
    frameThickness, 
    frameThickness, 
    width - (frameThickness * 2), 
    height - (frameThickness * 2), 
    cornerRadius - frameThickness
  );
  ctx.fill();
  
  // Ajouter une encoche en haut (pour les téléphones modernes)
  ctx.fillStyle = '#333333';
  const notchWidth = 100;
  const notchHeight = 25;
  const notchX = (width - notchWidth) / 2;
  
  ctx.beginPath();
  ctx.moveTo(notchX, frameThickness);
  ctx.lineTo(notchX + notchWidth, frameThickness);
  ctx.quadraticCurveTo(notchX + notchWidth + 10, frameThickness + 10, notchX + notchWidth, frameThickness + notchHeight);
  ctx.lineTo(notchX, frameThickness + notchHeight);
  ctx.quadraticCurveTo(notchX - 10, frameThickness + 10, notchX, frameThickness);
  ctx.closePath();
  ctx.fill();
}

// Fonction pour dessiner l'interface BIGWIN
function drawBigwinInterface(ctx, width, height) {
  // Barre de navigation supérieure (verte)
  ctx.fillStyle = '#4CAF50';  // Vert BIGWIN
  ctx.fillRect(10, 50, width - 20, 60);
  
  // Logo BIGWIN
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('BIGWIN', 100, 90);
  
  // Icône de menu (trois lignes)
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(30, 75 + (i * 7));
    ctx.lineTo(50, 75 + (i * 7));
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
  }
  
  // Bouton Subscribe (jaune)
  ctx.fillStyle = '#FFC107';  // Jaune
  roundedRect(ctx, width - 130, 65, 100, 30, 15);
  ctx.fill();
  
  ctx.fillStyle = '#333333';
  ctx.font = '16px Arial';
  ctx.fillText('Subscribe', width - 115, 85);
  
  // Titre "Old Tips"
  ctx.fillStyle = '#4CAF50';  // Vert BIGWIN
  ctx.font = 'bold 26px Arial';
  ctx.fillText('Old Tips', 30, 140);
  
  // Sélecteur de type de pronostic (Free, VIP, Platinum)
  drawSelectorButtons(ctx, 30, 160);
}

// Fonction pour dessiner les boutons de sélection (Free, VIP, Platinum)
function drawSelectorButtons(ctx, x, y) {
  // Bouton Free (actif)
  ctx.fillStyle = '#4CAF50';
  roundedRect(ctx, x, y, 80, 40, 20);
  ctx.fill();
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '16px Arial';
  ctx.fillText('Free', x + 25, y + 25);
  
  // Icône de vérification
  ctx.beginPath();
  ctx.moveTo(x + 15, y + 20);
  ctx.lineTo(x + 20, y + 25);
  ctx.lineTo(x + 25, y + 15);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();
  
  // Bouton VIP (inactif)
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  roundedRect(ctx, x + 90, y, 80, 40, 20);
  ctx.stroke();
  
  ctx.fillStyle = '#333333';
  ctx.font = '16px Arial';
  ctx.fillText('VIP', x + 115, y + 25);
  
  // Bouton Platinum (inactif)
  roundedRect(ctx, x + 180, y, 90, 40, 20);
  ctx.stroke();
  
  ctx.fillStyle = '#333333';
  ctx.font = '16px Arial';
  ctx.fillText('Platinum', x + 195, y + 25);
}

// Fonction utilitaire pour dessiner un rectangle avec des coins arrondis
function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// La fonction originale generateImage reste inchangée
// Insérez ici la fonction originale generateImage...

// Fonction principale qui génère l'image dans le cadre mobile
async function generateMobilePronosticImage(data) {
  try {
    return await generateMobileView(data);
  } catch (error) {
    console.error('Erreur lors de la génération de l\'image mobile:', error);
    
    // Créer une image d'erreur
    const errorCanvas = createCanvas(420, 700);
    const errorCtx = errorCanvas.getContext('2d');
    errorCtx.fillStyle = '#FFFFFF';
    errorCtx.fillRect(0, 0, 420, 700);
    errorCtx.fillStyle = '#F44336';
    errorCtx.font = '24px Arial';
    errorCtx.fillText('Erreur lors de la génération', 50, 350);
    errorCtx.fillText('de l\'image mobile', 100, 380);
    
    return errorCanvas.toBuffer('image/png');
  }
}

module.exports = { generateImage };