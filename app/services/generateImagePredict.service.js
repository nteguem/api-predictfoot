const { createCanvas, loadImage } = require('canvas');
const moment = require('moment');
moment.locale('fr');

/**
 * Fonction principale pour générer une image de pronostics dans un cadre iPhone 15
 * @param {Array} data Les données de pronostics
 * @returns {Buffer} L'image générée au format PNG
 */
async function generateImage(data,pseudo=null) {
  // Générer d'abord l'image de pronostic normale
  const pronosticImageBuffer = await generateBaseImage(data);
  
  // Ensuite, placer cette image dans un cadre iPhone 15
  return generateMobileFramedImage(pronosticImageBuffer,pseudo);
}

/**
 * Crée une image de remplacement en cas d'erreur
 * @param {number} width Largeur du canvas
 * @param {number} height Hauteur du canvas
 * @param {string} message Message d'erreur à afficher
 * @returns {Buffer} Image d'erreur au format PNG
 */
function createErrorImage(width, height, message) {
  const errorCanvas = createCanvas(width, height);
  const ctx = errorCanvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#F44336';
  ctx.font = '24px Arial';
  ctx.fillText(message, width / 6, height / 2);
  
  if (arguments.length > 3) {
    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';
    ctx.fillText(arguments[3], width / 4, height / 2 + 40);
  }
  
  return errorCanvas.toBuffer('image/png');
}

/**
 * Dessine une image avec border-radius
 * @param {CanvasRenderingContext2D} ctx Contexte du canvas
 * @param {Image} img Image à dessiner
 * @param {number} x Position X
 * @param {number} y Position Y
 * @param {number} width Largeur
 * @param {number} height Hauteur
 * @param {number} radius Rayon des coins
 */
function drawImageWithBorderRadius(ctx, img, x, y, width, height, radius) {
  if (!img) return; // Éviter les erreurs si l'image est null
  
  // Sauvegarder le contexte actuel
  ctx.save();
  
  // Créer le chemin avec border-radius
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
  
  // Créer un clip pour que l'image ne s'affiche qu'à l'intérieur du chemin
  ctx.clip();
  
  // Dessiner l'image
  ctx.drawImage(img, x, y, width, height);
  
  // Restaurer le contexte
  ctx.restore();
}

/**
 * Charge une image avec gestion d'erreur
 * @param {string} url URL de l'image à charger
 * @param {string} fallbackText Texte de remplacement en cas d'erreur
 * @returns {Promise<Image>} L'image chargée ou une image de remplacement
 */
async function safeLoadImage(url, fallbackText) {
  if (!url) {
    // Créer une image de remplacement si l'URL est null
    const fallbackCanvas = createCanvas(55, 55);
    const fallbackCtx = fallbackCanvas.getContext('2d');
    fallbackCtx.fillStyle = '#E0E0E0';
    fallbackCtx.fillRect(0, 0, 55, 55);
    fallbackCtx.fillStyle = '#555555';
    fallbackCtx.font = '12px Arial';
    fallbackCtx.fillText(fallbackText || 'N/A', 15, 30);
    return fallbackCanvas;
  }
  
  try {
    return await loadImage(url);
  } catch (error) {
    console.error(`Erreur lors du chargement de l'image (${url}):`, error);
    // Créer une image de remplacement en cas d'erreur
    const fallbackCanvas = createCanvas(55, 55);
    const fallbackCtx = fallbackCanvas.getContext('2d');
    fallbackCtx.fillStyle = '#E0E0E0';
    fallbackCtx.fillRect(0, 0, 55, 55);
    fallbackCtx.fillStyle = '#555555';
    fallbackCtx.font = '12px Arial';
    fallbackCtx.fillText(fallbackText || 'Erreur', 10, 30);
    return fallbackCanvas;
  }
}

/**
 * Fonction pour dessiner un rectangle avec des coins arrondis
 * @param {CanvasRenderingContext2D} ctx Contexte du canvas
 * @param {number} x Position X
 * @param {number} y Position Y
 * @param {number} width Largeur
 * @param {number} height Hauteur
 * @param {number} radius Rayon des coins
 */
function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/**
 * Dessine un bloc de statut avec couleur selon le résultat
 * @param {CanvasRenderingContext2D} ctx Contexte du canvas
 * @param {number} blockX Position X
 * @param {number} blockY Position Y
 * @param {number} blockWidth Largeur du bloc
 * @param {number} blockHeight Hauteur du bloc
 * @param {string} color Couleur du bloc
 * @param {string} coastText Texte de la cote
 * @param {string} statusText Texte du statut
 */
function drawStatusBlock(ctx, blockX, blockY, blockWidth, blockHeight, color, coastText, statusText) {
  // Dessiner le bloc avec coins arrondis
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(blockX + 8, blockY);
  ctx.lineTo(blockX + blockWidth - 8, blockY);
  ctx.quadraticCurveTo(blockX + blockWidth, blockY, blockX + blockWidth, blockY + 8);
  ctx.lineTo(blockX + blockWidth, blockY + blockHeight - 8);
  ctx.quadraticCurveTo(blockX + blockWidth, blockY + blockHeight, blockX + blockWidth - 8, blockY + blockHeight);
  ctx.lineTo(blockX + 8, blockY + blockHeight);
  ctx.quadraticCurveTo(blockX, blockY + blockHeight, blockX, blockY + blockHeight - 8);
  ctx.lineTo(blockX, blockY + 8);
  ctx.quadraticCurveTo(blockX, blockY, blockX + 8, blockY);
  ctx.closePath();
  ctx.fill();

  // Texte de la cote
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '26px Arial';
  const coastTextWidth = ctx.measureText(coastText).width;
  const coastTextX = blockX + (blockWidth - coastTextWidth) / 2;
  ctx.fillText(coastText, coastTextX, blockY + 30);

  // Texte du statut
  ctx.font = '16px Arial';
  const statusTextWidth = ctx.measureText(statusText).width;
  const statusTextX = blockX + (blockWidth - statusTextWidth) / 2;
  ctx.fillText(statusText, statusTextX, blockY + 52);
}

/**
 * Dessine un cadre style iPhone 15 avec une encoche et éléments d'interface
 * @param {CanvasRenderingContext2D} ctx Contexte du canvas
 * @param {number} width Largeur du cadre
 * @param {number} height Hauteur du cadre
 * @param {number} scale Facteur d'échelle
 */
function drawIphone15Frame(ctx, width, height, scale,pseudo) {
  // Paramètres du cadre
  const frameThickness = 12 * scale;
  const cornerRadius = 40 * scale;
  
  // Couleur du cadre (noir comme iPhone 15 Pro)
  const frameColor = '#1A1A1A';
  const cameraRed = '#F44336';
  
  // Dessiner le cadre externe avec un clip pour éviter les coins blancs
  ctx.save();
  
  // Créer le chemin pour le cadre externe avec arc pour des coins plus lisses
  roundedRect(ctx, 0, 0, width, height, cornerRadius);
  
  // Le dessiner et le remplir
  ctx.fillStyle = frameColor;
  ctx.fill();
  
  // Créer un clip pour que rien ne soit dessiné en dehors
  ctx.clip();
  
  // Dessiner l'écran intérieur
  ctx.fillStyle = '#FFFFFF';
  roundedRect(
    ctx, 
    frameThickness, 
    frameThickness, 
    width - (frameThickness * 2), 
    height - (frameThickness * 2), 
    cornerRadius - 5 * scale
  );
  ctx.fill();
  
  // Ajouter la Dynamic Island (Apple iPhone 15)
  const islandWidth = width * 0.30;
  const islandHeight = 40 * scale;
  const islandX = (width - islandWidth) / 2;
  const islandY = frameThickness + 4 * scale;
  const islandRadius = islandHeight / 2;
  
  ctx.fillStyle = frameColor;
  roundedRect(ctx, islandX, islandY, islandWidth, islandHeight, islandRadius);
  ctx.fill();
  
  // Ajouter les détails de la Dynamic Island
  // Cercle pour caméra - EN ROUGE
  ctx.fillStyle = cameraRed;
  ctx.beginPath();
  ctx.arc(islandX + islandWidth - islandHeight/2, islandY + islandHeight/2, 6 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Ajouter un deuxième capteur
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(islandX + islandWidth/2, islandY + islandHeight/2, 5 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Ajouter la barre d'état (style iOS actuel avec l'heure à gauche et indicateurs à droite)
  const statusBarY = frameThickness + islandHeight + 10 * scale;
  
  // Ajouter l'heure à gauche en haut
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${14 * scale}px Arial`;
  ctx.textAlign = 'left';
  
  // Obtenir l'heure actuelle
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  
  const timeX = frameThickness + 15 * scale;
  ctx.fillText(timeStr, timeX, statusBarY + 5 * scale);
  
  // Ajouter les indicateurs à droite
  const statusRightX = width - frameThickness - 15 * scale;
  
  // Icône réseau cellulaire 
  const signalX = statusRightX - 60 * scale;
  const signalY = statusBarY;
  
  // Dessiner les barres de signal (4 barres)
  ctx.fillStyle = '#000000';
  for (let i = 0; i < 4; i++) {
    const barHeight = (i + 1) * 2 * scale;
    const barWidth = 2 * scale;
    const barX = signalX + i * 4 * scale;
    ctx.fillRect(barX, signalY - barHeight + 2 * scale, barWidth, barHeight);
  }
  
  // Ajouter l'indicateur de batterie à droite
  const batteryX = statusRightX - 25 * scale;
  const batteryY = statusBarY;
  const batteryWidth = 22 * scale;
  const batteryHeight = 10 * scale;
  
  // Corps principal de la batterie
  ctx.lineWidth = 1 * scale;
  ctx.strokeStyle = '#000000';
  // Arrondir seulement les coins gauches
  ctx.beginPath();
  ctx.moveTo(batteryX, batteryY - batteryHeight/2);
  ctx.lineTo(batteryX + batteryWidth - 2 * scale, batteryY - batteryHeight/2);
  ctx.lineTo(batteryX + batteryWidth - 2 * scale, batteryY + batteryHeight/2);
  ctx.lineTo(batteryX, batteryY + batteryHeight/2);
  ctx.closePath();
  ctx.stroke();
  
  // Capuchon de la batterie
  ctx.fillStyle = '#000000';
  ctx.fillRect(batteryX + batteryWidth - 2 * scale, batteryY - batteryHeight/4, 2 * scale, batteryHeight/2);
  
  // Niveau de la batterie (85%)
  ctx.fillStyle = '#000000';
  const batteryLevel = 0.85; // 85%
  ctx.fillRect(batteryX + 1 * scale, batteryY - batteryHeight/2 + 1 * scale, 
    (batteryWidth - 4 * scale) * batteryLevel, batteryHeight - 2 * scale);
  
  // Ajouter une notification style iOS
  const notificationY = statusBarY + 25 * scale;
  const notificationHeight = 80 * scale;
  const notificationWidth = width * 0.9;
  const notificationX = (width - notificationWidth) / 2;
  
  // Fond de la notification
  ctx.fillStyle = 'rgba(240, 240, 240, 0.95)';
  roundedRect(ctx, notificationX, notificationY, notificationWidth, notificationHeight, 15 * scale);
  ctx.fill();
  
  // Ajouter une image de profil utilisateur (cercle) - corrigée et bien positionnée
  const userImageSize = 40 * scale; // Légèrement réduit pour ne pas déborder
  const userImageX = notificationX + 25 * scale;
  const userImageY = notificationY + notificationHeight/2;
  
  // Cercle de l'image utilisateur
  ctx.fillStyle = '#4CAF50'; // Fond vert
  ctx.beginPath();
  ctx.arc(userImageX, userImageY, userImageSize/2, 0, Math.PI * 2);
  ctx.fill();
  
  // Silhouette utilisateur plus simple (forme ovale)
  ctx.fillStyle = '#FFFFFF';
  // Tête
  ctx.beginPath();
  ctx.arc(userImageX, userImageY - 5 * scale, userImageSize/6, 0, Math.PI * 2);
  ctx.fill();
  
  // Corps - dessiné comme un ovale simple
  ctx.beginPath();
  ctx.ellipse(
    userImageX, 
    userImageY + 8 * scale, 
    userImageSize/4, 
    userImageSize/3.5, 
    0, 
    0, 
    Math.PI * 2
  );
  ctx.fill();
  
  // Texte "Assistant virtuelle BigWin" en gras
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${14 * scale}px -apple-system, BlinkMacSystemFont, Arial`;
  const titleX = userImageX + userImageSize/2 + 15 * scale;
  ctx.fillText('Assistant virtuel', titleX, notificationY + 30 * scale);
  
  // Ligne de "now" (maintenant)
  ctx.fillStyle = '#888888';
  ctx.font = `${12 * scale}px -apple-system, BlinkMacSystemFont, Arial`;
  ctx.textAlign = 'right';
  ctx.fillText('now', notificationX + notificationWidth - 15 * scale, notificationY + 30 * scale);
  ctx.textAlign = 'left';
  
  // Texte du message "Nouveau pronostic disponible!"
  ctx.fillStyle = '#000000';
  ctx.font = `${13 * scale}px -apple-system, BlinkMacSystemFont, Arial`;
  ctx.fillText(pseudo ? `Pronostic disponible pour toi ${pseudo}` : "Nouveau pronostic disponible", titleX, notificationY + 55 * scale);
  
  // Restaurer le contexte après avoir terminé
  ctx.restore();
  
  // Ajouter un léger effet de brillance sur les bords du cadre
  ctx.save();
  roundedRect(ctx, 0, 0, width, height, cornerRadius);
  ctx.clip();
  
  // Effet subtil de reflet sur le bord
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
  
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 1 * scale;
  roundedRect(ctx, 1 * scale, 1 * scale, width - 2 * scale, height - 2 * scale, cornerRadius - 1 * scale);
  ctx.stroke();
  
  ctx.restore();
}

/**
 * Fonction originale génération d'image sans cadre iPhone
 * @param {Array} data Les données de pronostics
 * @returns {Buffer} L'image générée au format PNG
 */
async function generateBaseImage(data) {
  // Vérifier si data existe et n'est pas vide
  if (!data || data.length === 0) {
    return createErrorImage(600, 300, 'Aucune donnée de pronostic disponible');
  }

  // Configuration des constantes
  const spacingBetweenFixtures = 30;
  const fixtureHeight = 180;
  const canvasWidth = 600;
  const canvasHeight = 400 + (data.length * (fixtureHeight + spacingBetweenFixtures));
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  const textColor = '#1B5E20';

  // Fond blanc
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  try {
    // Préparation des données de base
    const eventDate = data[0]?.fixture?.event_date;
    const formattedDate = eventDate ? moment(eventDate).format('dddd, MMMM Do YYYY') : 'Date non disponible';
    const isVip = data[0]?.isVip ?? false;
    const resultText = data[0]?.fixture?.score?.fulltime != null ? "résultat " : 'pronos ';
    const vipText = isVip ? 'VIP ' : 'Gratuits ';
    const titleText = resultText + vipText;

    // Charger et dessiner le logo
    let logoPronostic;
    try {
      logoPronostic = await loadImage('https://res.cloudinary.com/nwccompany/image/upload/v1739009050/nmyxfglhznextbg4jiok.png');
    } catch (error) {
      console.error('Erreur lors du chargement du logo pronostic:', error);
      const fallbackCanvas = createCanvas(200, 100);
      const fallbackCtx = fallbackCanvas.getContext('2d');
      fallbackCtx.fillStyle = '#1B5E20';
      fallbackCtx.fillRect(0, 0, 200, 100);
      fallbackCtx.fillStyle = '#FFFFFF';
      fallbackCtx.font = '20px Arial';
      fallbackCtx.fillText('PRONOSTIC', 40, 60);
      logoPronostic = fallbackCanvas;
    }

    // Obtenir les dimensions originales du logo et le dessiner
    const logoWidth = logoPronostic.width || 200;
    const logoHeight = logoPronostic.height || 100;
    const maxLogoHeight = 80;
    const ratio = maxLogoHeight / logoHeight;
    const newLogoWidth = logoWidth * ratio;
    const newLogoHeight = maxLogoHeight;
    const logoX = (canvasWidth - newLogoWidth) / 2;
    ctx.drawImage(logoPronostic, logoX, 20, newLogoWidth, newLogoHeight);

    // Afficher le titre
    ctx.font = '32px Arial';
    ctx.fillStyle = textColor;
    ctx.fillText(titleText, 20, 130);

    // Afficher la date avec gestion de la longueur
    const maxWidthDate = 450;
    ctx.font = '26px Arial';
    if (ctx.measureText(formattedDate).width > maxWidthDate) {
      const truncatedDate = formattedDate.slice(0, 30) + '...';
      ctx.fillText(truncatedDate, canvasWidth - ctx.measureText(truncatedDate).width - 20, 130);
    } else {
      ctx.fillText(formattedDate, canvasWidth - ctx.measureText(formattedDate).width - 20, 130);
    }

    // Initialisation des variables pour les pronostics
    let fixtureYStart = 180;
    const lineHeight = fixtureHeight + spacingBetweenFixtures;
    let totalCoast = 1;
    let winCount = 0;

    // Traitement de chaque item de pronostic
    for (const item of data) {
      // Extraire les données avec gestion null
      const fixture = item?.fixture || {};
      const homeTeam = fixture?.homeTeam || { team_name: 'Équipe à domicile', logo: null };
      const awayTeam = fixture?.awayTeam || { team_name: 'Équipe à l\'extérieur', logo: null };
      const championship = item?.championship || { name: 'Championnat', logo: null };
      const country = item?.country || { name: 'Pays', logo: null };
      const prediction = item?.prediction || { description_fr: 'Pronostic non disponible' };
      const coast = item?.coast || 1.00;
      const iswin = item?.iswin;

      // Charger les logos
      const homeTeamLogo = await safeLoadImage(homeTeam.logo, 'Home');
      const awayTeamLogo = await safeLoadImage(awayTeam.logo, 'Away');
      const leagueLogo = await safeLoadImage(championship.logo, 'League');
      const countryLogo = await safeLoadImage(country.logo, 'Country');

      // Hauteur du bloc de pronostic
      const blockHeight = fixtureHeight - 30;

      // Fond vert ciel clair pour chaque pronostic avec border radius
      ctx.fillStyle = '#E0FBE0';
      ctx.beginPath();
      ctx.moveTo(30, fixtureYStart - 20);
      ctx.lineTo(canvasWidth - 30, fixtureYStart - 20);
      ctx.quadraticCurveTo(canvasWidth - 10, fixtureYStart - 20, canvasWidth - 10, fixtureYStart);
      ctx.lineTo(canvasWidth - 10, fixtureYStart + blockHeight);
      ctx.quadraticCurveTo(canvasWidth - 10, fixtureYStart + blockHeight + 20, canvasWidth - 30, fixtureYStart + blockHeight + 20);
      ctx.lineTo(30, fixtureYStart + blockHeight + 20);
      ctx.quadraticCurveTo(10, fixtureYStart + blockHeight + 20, 10, fixtureYStart + blockHeight);
      ctx.lineTo(10, fixtureYStart);
      ctx.quadraticCurveTo(10, fixtureYStart - 20, 30, fixtureYStart - 20);
      ctx.closePath();
      ctx.fill();

      // Country Logo and Name à gauche
      const countryLogoSize = 30;
      drawImageWithBorderRadius(ctx, countryLogo, 20, fixtureYStart - 35, countryLogoSize, countryLogoSize, 5);
      ctx.font = '18px Arial';
      ctx.fillStyle = textColor;
      ctx.fillText(country.name || 'Pays non spécifié', 55, fixtureYStart - 15);

      // League Logo and Name à droite
      const leagueLogoSize = 30;
      ctx.font = '18px Arial';
      const leagueNameWidth = ctx.measureText(championship.name || 'Championnat non spécifié').width;
      const leagueLogoRightX = canvasWidth - 20 - leagueLogoSize;
      drawImageWithBorderRadius(ctx, leagueLogo, leagueLogoRightX, fixtureYStart - 35, leagueLogoSize, leagueLogoSize, 5);
      ctx.fillText(championship.name || 'Championnat non spécifié', leagueLogoRightX - leagueNameWidth - 5, fixtureYStart - 15);

      // Home Team Logo and Name
      drawImageWithBorderRadius(ctx, homeTeamLogo, 20, fixtureYStart, 55, 55, 8);
      ctx.font = '20px Arial';
      ctx.fillStyle = textColor;
      ctx.fillText(homeTeam.team_name || 'Équipe à domicile', 85, fixtureYStart + 32);

      // Away Team Logo and Name
      const awayTeamName = awayTeam.team_name || 'Équipe à l\'extérieur';
      ctx.font = '20px Arial';
      const awayTeamNameWidth = ctx.measureText(awayTeamName).width;
      const awayTeamLogoX = canvasWidth - 80;
      drawImageWithBorderRadius(ctx, awayTeamLogo, awayTeamLogoX, fixtureYStart, 55, 55, 8);
      const awayTeamNameX = awayTeamLogoX - 10 - awayTeamNameWidth;
      ctx.fillText(awayTeamName, awayTeamNameX, fixtureYStart + 32);

      // Match Time or Score
      let matchInfo = '';
      if (fixture.score?.fulltime != null) {
        matchInfo = `${fixture.score.fulltime}`;
      } else if (fixture.event_date) {
        matchInfo = moment(fixture.event_date).format('HH:mm');
      } else {
        matchInfo = 'Heure N/A';
      }
      ctx.font = '20px Arial'; 
      ctx.fillStyle = textColor;
      const blockCenterX = canvasWidth / 2 - ctx.measureText(matchInfo).width / 2;
      ctx.fillText(matchInfo, blockCenterX, fixtureYStart + 32);

      // Prediction
      ctx.font = '28px Arial';
      ctx.fillText(prediction.description_fr || 'Pronostic non disponible', 20, fixtureYStart + 105);

      // Affichage de la cote et du statut
      const coastText = `${coast.toFixed(2)}`;
      let statusText;
      if (iswin === true) {
        statusText = 'Gagné';
      } else if (iswin === false && fixture.score?.fulltime != null) {
        statusText = 'Perdu';
      } else {
        statusText = 'En attente';
      }

      // Bloc de statut
      const blockWidth = 80;
      const statusBlockHeight = 70;
      const blockX = canvasWidth - blockWidth - 20;
      const blockY = fixtureYStart + 70;

      // Couleur en fonction du statut
      let blockColor;
      if (iswin === true) {
        blockColor = '#4CAF50'; // Vert pour gagné
      } else if (iswin === false && fixture.score?.fulltime != null) {
        blockColor = '#F44336'; // Rouge pour perdu
      } else {
        blockColor = '#0F5784'; // Bleu pour en attente
      }
      
      // Dessiner le bloc de statut
      drawStatusBlock(ctx, blockX, blockY, blockWidth, statusBlockHeight, blockColor, coastText, statusText);

      // Mise à jour des totaux
      totalCoast *= coast;
      if (iswin === true) {
        winCount++;
      }

      // Ajuster la position Y pour le prochain pronostic
      fixtureYStart += lineHeight;
    }

    // Afficher la cote cumulée ou le ratio de réussite
    let totalInfo = '';
    if (data[0]?.fixture?.score?.fulltime != null) {
      totalInfo = `Ratio: ${winCount}/${data.length} (${((winCount / data.length) * 100).toFixed(2)}%)`;
    } else {
      totalInfo = `Cote totale : ${totalCoast.toFixed(2)}`;
    }
    ctx.font = '28px Arial';
    ctx.fillStyle = textColor;
    ctx.fillText(totalInfo, 20, fixtureYStart + 20);

    // Ajouter message de responsabilité en bas
    ctx.font = '16px Arial';
    ctx.fillStyle = textColor;
    ctx.fillText("Jouez de manière responsable. Les gains ou pertes sont sous la responsabilité des joueurs.", 20, canvasHeight - 20);

    return canvas.toBuffer('image/png');
    
  } catch (error) {
    console.error('Erreur lors de la génération de l\'image:', error);
    return createErrorImage(
      600, 
      400, 
      'Erreur lors de la génération de l\'image', 
      'Veuillez vérifier vos données et réessayer.'
    );
  }
}

/**
 * Place une image dans un cadre d'iPhone 15
 * @param {Buffer} imageBuffer Buffer de l'image à encadrer
 * @returns {Buffer} L'image avec cadre au format PNG
 */
/**
 * Place une image dans un cadre d'iPhone 15 avec interface utilisateur réaliste
 * @param {Buffer} imageBuffer Buffer de l'image à encadrer
 * @returns {Buffer} L'image avec cadre au format PNG
 */
async function generateMobileFramedImage(imageBuffer,pseudo) {
  try {
    // Charger l'image de pronostic
    const pronosticImage = await loadImage(imageBuffer);
    
    // Dimensions et configuration
    const pronoWidth = pronosticImage.width;
    const pronoHeight = pronosticImage.height;
    const scale = 1.0;
    const frameMargin = 30 * scale;
    
    // Ajuster la taille du téléphone pour laisser plus d'espace pour l'interface
    const mobileWidth = pronoWidth + (frameMargin * 2);
    // Ajouter plus d'espace en haut pour la barre d'état et la notification WhatsApp
    const notificationSpace = 120 * scale; 
    const mobileHeight = pronoHeight + (frameMargin * 2) + notificationSpace;
    
    // Créer le canvas pour l'image finale
    const mobileCanvas = createCanvas(mobileWidth, mobileHeight);
    const ctx = mobileCanvas.getContext('2d', { alpha: true });
    
    // Configuration du rendu
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, mobileWidth, mobileHeight);
    
    // Dessiner le cadre
    drawIphone15Frame(ctx, mobileWidth, mobileHeight, scale,pseudo);
    
    // Calculer les dimensions pour l'image
    const screenMargin = 14 * scale;
    const frameThickness = 12 * scale;
    
    // Augmenter l'offset pour prendre en compte la notification WhatsApp
    const statusBarOffset = 40 * scale; // Espace pour la barre d'état
    const encocheOffset = 50 * scale; // Espace pour la Dynamic Island
    const whatsappOffset = 80 * scale; // Espace pour la notification WhatsApp
    
    const totalTopOffset = encocheOffset + statusBarOffset + whatsappOffset;
    
    // Dimensions disponibles pour l'image du pronostic
    const screenWidth = mobileWidth - (frameThickness * 2) - (screenMargin * 2);
    const screenHeight = mobileHeight - (frameThickness * 2) - (screenMargin * 2) - totalTopOffset;
    
    // Adapter l'image au screen
    const scaleRatio = Math.min(screenWidth / pronoWidth, screenHeight / pronoHeight);
    const scaledWidth = pronoWidth * scaleRatio;
    const scaledHeight = pronoHeight * scaleRatio;
    
    // Positionner l'image dans l'écran, sous la notification
    const pronoX = frameThickness + screenMargin + (screenWidth - scaledWidth) / 2;
    const pronoY = frameThickness + screenMargin + totalTopOffset + 10 * scale; // Ajouter un petit espace supplémentaire
    
    // Dessiner l'image de pronostic
    ctx.drawImage(pronosticImage, pronoX, pronoY, scaledWidth, scaledHeight);
    
    // Retourner l'image avec compression optimisée
    return mobileCanvas.toBuffer('image/png', { 
      quality: 0.9,
      compressionLevel: 6
    });
  } catch (error) {
    console.error('Erreur lors de la génération de l\'image mobile:', error);
    return createErrorImage(
      700, 
      1000, 
      'Erreur lors de la génération de l\'image mobile'
    );
  }
}

// Exporter les fonctions
module.exports = { 
  generateImage,
  generateBaseImage, 
  generateMobileFramedImage 
};