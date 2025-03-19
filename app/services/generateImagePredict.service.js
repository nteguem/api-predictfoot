const { createCanvas, loadImage } = require('canvas');
const moment = require('moment');
moment.locale('fr');

async function generateImage(data) {
  // Vérifier si data existe et n'est pas vide
  if (!data || data.length === 0) {
    // Créer une image d'erreur si aucune donnée n'est disponible
    const errorCanvas = createCanvas(600, 300);
    const ctx = errorCanvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 600, 300);
    ctx.fillStyle = '#F44336';
    ctx.font = '24px Arial';
    ctx.fillText('Aucune donnée de pronostic disponible', 100, 150);
    return errorCanvas.toBuffer('image/png');
  }

  // Augmenter l'espacement entre les pronostics
  const spacingBetweenFixtures = 30; // Nouvel espacement entre les pronostics
  const fixtureHeight = 180; // Hauteur de base d'un pronostic

  const canvasWidth = 600;
  // Ajuster la hauteur du canvas pour inclure l'espacement supplémentaire
  const canvasHeight = 400 + (data.length * (fixtureHeight + spacingBetweenFixtures));
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Fond blanc
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Couleur du texte
  const textColor = '#1B5E20';

  try {
    // Formater la date avec moment.js avec gestion de null
    const eventDate = data[0]?.fixture?.event_date;
    const formattedDate = eventDate ? moment(eventDate).format('dddd, MMMM Do YYYY') : 'Date non disponible';

    // Charger le logo du pronostic avec gestion d'erreur
    let logoPronostic;
    try {
      logoPronostic = await loadImage('https://res.cloudinary.com/nwccompany/image/upload/v1739009050/nmyxfglhznextbg4jiok.png');
    } catch (error) {
      console.error('Erreur lors du chargement du logo pronostic:', error);
      // Créer un logo de remplacement
      const fallbackCanvas = createCanvas(200, 100);
      const fallbackCtx = fallbackCanvas.getContext('2d');
      fallbackCtx.fillStyle = '#1B5E20';
      fallbackCtx.fillRect(0, 0, 200, 100);
      fallbackCtx.fillStyle = '#FFFFFF';
      fallbackCtx.font = '20px Arial';
      fallbackCtx.fillText('PRONOSTIC', 40, 60);
      logoPronostic = fallbackCanvas;
    }

    // Obtenir les dimensions originales du logo
    const logoWidth = logoPronostic.width || 200;
    const logoHeight = logoPronostic.height || 100;

    // Calculer la taille de redimensionnement en maintenant le ratio
    const maxLogoHeight = 80;
    const ratio = maxLogoHeight / logoHeight;
    const newLogoWidth = logoWidth * ratio;
    const newLogoHeight = maxLogoHeight;

    // Dessiner le logo du pronostic centré en haut
    const logoX = (canvasWidth - newLogoWidth) / 2;
    ctx.drawImage(logoPronostic, logoX, 20, newLogoWidth, newLogoHeight);

    // Déterminer le titre en fonction des conditions
    const isVip = data[0]?.isVip ?? false; // Utiliser une valeur par défaut si null
    const resultText = data[0]?.fixture?.score?.fulltime != null ? "résultat " : 'pronos ';
    const vipText = isVip ? 'VIP ' : 'Gratuits';
    const titleText = resultText + vipText;

    // Afficher le titre en haut à gauche avec une police plus grande
    ctx.font = '32px Arial';
    ctx.fillStyle = textColor;
    ctx.fillText(titleText, 20, 130);

    // Limiter la longueur de la date pour qu'elle ne dépasse pas
    const maxWidthDate = 450;
    ctx.font = '26px Arial';
    ctx.fillStyle = textColor;
    if (ctx.measureText(formattedDate).width > maxWidthDate) {
      const truncatedDate = formattedDate.slice(0, 30) + '...';
      ctx.fillText(truncatedDate, canvasWidth - ctx.measureText(truncatedDate).width - 20, 130);
    } else {
      ctx.fillText(formattedDate, canvasWidth - ctx.measureText(formattedDate).width - 20, 130);
    }

    // Position de départ pour les pronostics
    let fixtureYStart = 180;
    // Augmenter la hauteur de ligne pour inclure l'espacement
    const lineHeight = fixtureHeight + spacingBetweenFixtures;

    let totalCoast = 1;
    let winCount = 0;

    // Charger le logo pour le filigrane avec gestion d'erreur
    let watermark;
    try {
      watermark = await loadImage('https://res.cloudinary.com/nwccompany/image/upload/v1739009367/i938xqbcaae0aymqdjgm.png');
    } catch (error) {
      console.error('Erreur lors du chargement du filigrane:', error);
      // Créer un filigrane de remplacement
      const fallbackCanvas = createCanvas(300, 300);
      const fallbackCtx = fallbackCanvas.getContext('2d');
      fallbackCtx.fillStyle = '#E0E0E0';
      fallbackCtx.font = '30px Arial';
      fallbackCtx.fillText('PRONOSTIC', 70, 150);
      watermark = fallbackCanvas;
    }

    // Fonction pour dessiner une image avec border-radius
    const drawImageWithBorderRadius = (img, x, y, width, height, radius) => {
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
    };

    // Ajouter un filigrane centré
    const watermarkWidth = 300;
    const watermarkHeight = 300;
    const watermarkX = (canvasWidth - watermarkWidth) / 2;
    const watermarkY = (canvasHeight - watermarkHeight) / 2;
    ctx.globalAlpha = 0.1;
    ctx.drawImage(watermark, watermarkX, watermarkY, watermarkWidth, watermarkHeight);
    ctx.globalAlpha = 1;

    // Créer une fonction pour charger une image avec gestion d'erreur
    const safeLoadImage = async (url, fallbackText) => {
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
    };

    for (const item of data) {
      // Utiliser des valeurs par défaut pour les objets potentiellement null
      const fixture = item?.fixture || {};
      const homeTeam = fixture?.homeTeam || { team_name: 'Équipe à domicile', logo: null };
      const awayTeam = fixture?.awayTeam || { team_name: 'Équipe à l\'extérieur', logo: null };
      const championship = item?.championship || { name: 'Championnat', logo: null };
      const country = item?.country || { name: 'Pays', logo: null };
      const prediction = item?.prediction || { description_fr: 'Pronostic non disponible' };
      const coast = item?.coast || 1.00;
      const iswin = item?.iswin;

      // Charger les logos avec gestion d'erreur
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

      // Country Logo and Name à gauche avec border-radius
      const countryLogoSize = 30;
      drawImageWithBorderRadius(countryLogo, 20, fixtureYStart - 35, countryLogoSize, countryLogoSize, 5);
      ctx.font = '18px Arial';
      ctx.fillStyle = textColor;
      ctx.fillText(country.name || 'Pays non spécifié', 55, fixtureYStart - 15);

      // League Logo and Name à droite avec border-radius
      const leagueLogoSize = 30;
      ctx.font = '18px Arial';
      const leagueNameWidth = ctx.measureText(championship.name || 'Championnat non spécifié').width;
      const leagueLogoRightX = canvasWidth - 20 - leagueLogoSize;
      drawImageWithBorderRadius(leagueLogo, leagueLogoRightX, fixtureYStart - 35, leagueLogoSize, leagueLogoSize, 5);
      ctx.fillText(championship.name || 'Championnat non spécifié', leagueLogoRightX - leagueNameWidth - 5, fixtureYStart - 15);

      // Home Team Logo and Name avec police diminuée
      drawImageWithBorderRadius(homeTeamLogo, 20, fixtureYStart, 55, 55, 8);
      ctx.font = '20px Arial';
      ctx.fillStyle = textColor;
      ctx.fillText(homeTeam.team_name || 'Équipe à domicile', 85, fixtureYStart + 32);

      // Away Team Name avec police diminuée
      const awayTeamName = awayTeam.team_name || 'Équipe à l\'extérieur';
      ctx.font = '20px Arial';
      const awayTeamNameWidth = ctx.measureText(awayTeamName).width;

      // Away Team Logo avec border-radius
      const awayTeamLogoX = canvasWidth - 80;
      drawImageWithBorderRadius(awayTeamLogo, awayTeamLogoX, fixtureYStart, 55, 55, 8);

      // Positionner le nom de l'équipe à l'extérieur de manière à ce qu'il prenne de l'espace vers la gauche
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
   
      // Calculer la position X du temps de match pour qu'il soit centré dans le bloc bleu ciel
      const blockCenterX = canvasWidth / 2 - ctx.measureText(matchInfo).width / 2;
      ctx.fillText(matchInfo, blockCenterX, fixtureYStart + 32);

      // Prediction aligned below home team logo with larger font
      ctx.font = '28px Arial';
      ctx.fillText(prediction.description_fr || 'Pronostic non disponible', 20, fixtureYStart + 105);

      // Affichage de la cote et du statut
      const coastText = `${coast.toFixed(2)}`;
      // Gestion des valeurs nulles pour le statut
      let statusText;
      if (iswin === true) {
        statusText = 'Gagné';
      } else if (iswin === false && fixture.score?.fulltime != null) {
        statusText = 'Perdu';
      } else {
        statusText = 'En attente';
      }

      const blockWidth = 80;
      const statusBlockHeight = 70;
      const blockX = canvasWidth - blockWidth - 20;
      const blockY = fixtureYStart + 70;

      // Couleur en fonction du statut, avec gestion des nulls
      let blockColor;
      if (iswin === true) {
        blockColor = '#4CAF50'; // Vert pour gagné
      } else if (iswin === false && fixture.score?.fulltime != null) {
        blockColor = '#F44336'; // Rouge pour perdu
      } else {
        blockColor = '#0F5784'; // Bleu pour en attente
      }
      
      ctx.fillStyle = blockColor;
      ctx.beginPath();
      ctx.moveTo(blockX + 8, blockY);
      ctx.lineTo(blockX + blockWidth - 8, blockY);
      ctx.quadraticCurveTo(blockX + blockWidth, blockY, blockX + blockWidth, blockY + 8);
      ctx.lineTo(blockX + blockWidth, blockY + statusBlockHeight - 8);
      ctx.quadraticCurveTo(blockX + blockWidth, blockY + statusBlockHeight, blockX + blockWidth - 8, blockY + statusBlockHeight);
      ctx.lineTo(blockX + 8, blockY + statusBlockHeight);
      ctx.quadraticCurveTo(blockX, blockY + statusBlockHeight, blockX, blockY + statusBlockHeight - 8);
      ctx.lineTo(blockX, blockY + 8);
      ctx.quadraticCurveTo(blockX, blockY, blockX + 8, blockY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FFFFFF'; // Texte blanc
      ctx.font = '26px Arial';
      const coastTextWidth = ctx.measureText(coastText).width;
      const coastTextX = blockX + (blockWidth - coastTextWidth) / 2;
      ctx.fillText(coastText, coastTextX, blockY + 30);

      ctx.font = '16px Arial';
      const statusTextWidth = ctx.measureText(statusText).width;
      const statusTextX = blockX + (blockWidth - statusTextWidth) / 2;
      ctx.fillText(statusText, statusTextX, blockY + 52);

      // Calculating total coast
      totalCoast *= coast;
      if (iswin === true) {
        winCount++;
      }

      // Ajuster la position Y pour le prochain pronostic avec un espacement supplémentaire
      fixtureYStart += lineHeight;
    }

    // Afficher la cote cumulée ou le ratio de réussite avec police plus grande
    let totalInfo = '';
    if (data[0]?.fixture?.score?.fulltime != null) {
      totalInfo = `Ratio: ${winCount}/${data.length} (${((winCount / data.length) * 100).toFixed(2)}%)`;
    } else {
      totalInfo = `Cote totale : ${totalCoast.toFixed(2)}`;
    }
    ctx.font = '28px Arial';
    ctx.fillStyle = textColor;
    ctx.fillText(totalInfo, 20, fixtureYStart + 20);

    // Ajouter "NB" en bas avec police plus grande
    ctx.font = '14px Arial';
    ctx.fillStyle = textColor;
    ctx.fillText("NB : Jouez de manière responsable. Les gains ou pertes sont sous la responsabilité des joueurs.", 20, canvasHeight - 20);

    const buffer = canvas.toBuffer('image/png');
    return buffer;
    
  } catch (error) {
    // Gérer toute erreur inattendue
    console.error('Erreur lors de la génération de l\'image:', error);
    
    // Créer une image d'erreur
    const errorCanvas = createCanvas(600, 400);
    const errorCtx = errorCanvas.getContext('2d');
    errorCtx.fillStyle = '#FFFFFF';
    errorCtx.fillRect(0, 0, 600, 400);
    errorCtx.fillStyle = '#F44336';
    errorCtx.font = '24px Arial';
    errorCtx.fillText('Erreur lors de la génération de l\'image', 100, 180);
    errorCtx.fillStyle = '#000000';
    errorCtx.font = '16px Arial';
    errorCtx.fillText('Veuillez vérifier vos données et réessayer.', 150, 220);
    
    return errorCanvas.toBuffer('image/png');
  }
}

async function generateMobileImage(data) {
  // Référence à l'ancienne fonction avec le même nom
  const originalGenerateImage = require('./original-image-generator').generateImage;
  
  // D'abord, générer l'image de pronostic standard en utilisant la fonction originale
  const pronosticImageBuffer = await originalGenerateImage(data);
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

module.exports = { generateImage: generateMobileImage  };