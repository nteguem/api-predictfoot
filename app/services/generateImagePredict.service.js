const { createCanvas, loadImage } = require('canvas');
const moment = require('moment');
moment.locale('fr');

async function generateMobileImage(data) {
  // Récupérer l'image de pronostic normale d'abord
  const pronosticImage = await generateImage(data);
  
  // Créer un canvas plus grand pour le téléphone mobile
  const mobileWidth = 750;
  const mobileHeight = 1500;
  const mobileCanvas = createCanvas(mobileWidth, mobileHeight);
  const mobileCtx = mobileCanvas.getContext('2d');
  
  // Charger l'image de fond du mobile (ou la dessiner directement)
  try {
    // Option 1: Charger une image de téléphone mobile
    const phoneFrame = await loadImage('https://exemple.com/phone-frame.png');
    mobileCtx.drawImage(phoneFrame, 0, 0, mobileWidth, mobileHeight);
  } catch (error) {
    console.error('Erreur lors du chargement du cadre de téléphone, dessin du cadre par défaut:', error);
    
    // Option 2: Dessiner un téléphone mobile directement
    // Fond gris foncé
    mobileCtx.fillStyle = '#333333';
    mobileCtx.fillRect(0, 0, mobileWidth, mobileHeight);
    
    // Cadre du téléphone
    mobileCtx.fillStyle = '#222222';
    const phoneX = 50;
    const phoneY = 100;
    const phoneWidth = mobileWidth - 100;
    const phoneHeight = mobileHeight - 200;
    
    // Dessiner le cadre avec des coins arrondis
    mobileCtx.beginPath();
    mobileCtx.moveTo(phoneX + 30, phoneY);
    mobileCtx.lineTo(phoneX + phoneWidth - 30, phoneY);
    mobileCtx.quadraticCurveTo(phoneX + phoneWidth, phoneY, phoneX + phoneWidth, phoneY + 30);
    mobileCtx.lineTo(phoneX + phoneWidth, phoneY + phoneHeight - 30);
    mobileCtx.quadraticCurveTo(phoneX + phoneWidth, phoneY + phoneHeight, phoneX + phoneWidth - 30, phoneY + phoneHeight);
    mobileCtx.lineTo(phoneX + 30, phoneY + phoneHeight);
    mobileCtx.quadraticCurveTo(phoneX, phoneY + phoneHeight, phoneX, phoneY + phoneHeight - 30);
    mobileCtx.lineTo(phoneX, phoneY + 30);
    mobileCtx.quadraticCurveTo(phoneX, phoneY, phoneX + 30, phoneY);
    mobileCtx.closePath();
    mobileCtx.fill();
    
    // Écran du téléphone (blanc)
    mobileCtx.fillStyle = '#FFFFFF';
    const screenMargin = 10;
    const screenX = phoneX + screenMargin;
    const screenY = phoneY + screenMargin;
    const screenWidth = phoneWidth - (screenMargin * 2);
    const screenHeight = phoneHeight - (screenMargin * 2);
    
    mobileCtx.beginPath();
    mobileCtx.moveTo(screenX + 20, screenY);
    mobileCtx.lineTo(screenX + screenWidth - 20, screenY);
    mobileCtx.quadraticCurveTo(screenX + screenWidth, screenY, screenX + screenWidth, screenY + 20);
    mobileCtx.lineTo(screenX + screenWidth, screenY + screenHeight - 20);
    mobileCtx.quadraticCurveTo(screenX + screenWidth, screenY + screenHeight, screenX + screenWidth - 20, screenY + screenHeight);
    mobileCtx.lineTo(screenX + 20, screenY + screenHeight);
    mobileCtx.quadraticCurveTo(screenX, screenY + screenHeight, screenX, screenY + screenHeight - 20);
    mobileCtx.lineTo(screenX, screenY + 20);
    mobileCtx.quadraticCurveTo(screenX, screenY, screenX + 20, screenY);
    mobileCtx.closePath();
    mobileCtx.fill();
    
    // Dessiner une encoche en haut (pour les téléphones modernes)
    mobileCtx.fillStyle = '#222222';
    const notchWidth = 100;
    const notchHeight = 30;
    const notchX = phoneX + (phoneWidth - notchWidth) / 2;
    const notchY = phoneY + screenMargin;
    
    mobileCtx.beginPath();
    mobileCtx.moveTo(notchX, notchY);
    mobileCtx.lineTo(notchX + notchWidth, notchY);
    mobileCtx.quadraticCurveTo(notchX + notchWidth + 10, notchY + 10, notchX + notchWidth, notchY + notchHeight);
    mobileCtx.lineTo(notchX, notchY + notchHeight);
    mobileCtx.quadraticCurveTo(notchX - 10, notchY + 10, notchX, notchY);
    mobileCtx.closePath();
    mobileCtx.fill();
    
    // Bouton home (pour certains téléphones)
    mobileCtx.fillStyle = '#444444';
    const buttonSize = 40;
    const buttonX = phoneX + (phoneWidth - buttonSize) / 2;
    const buttonY = phoneY + phoneHeight - 50;
    
    mobileCtx.beginPath();
    mobileCtx.arc(buttonX + buttonSize/2, buttonY, buttonSize/2, 0, Math.PI * 2);
    mobileCtx.closePath();
    mobileCtx.fill();
  }
  
  // Calculer les dimensions pour l'image de pronostic
  const pronoImg = await loadImage(pronosticImage);
  const imgWidth = pronoImg.width;
  const imgHeight = pronoImg.height;
  
  // Calculer les dimensions à l'intérieur de l'écran
  const screenPaddingX = 80;  // Marge horizontale
  const screenPaddingY = 220; // Marge verticale en haut pour la barre d'application
  const screenWidth = mobileWidth - (screenPaddingX * 2);
  const screenHeight = mobileHeight - screenPaddingY - 250; // Marge inférieure pour navigation
  
  // Calculer le ratio pour redimensionner l'image de pronostic
  const ratio = Math.min(
    screenWidth / imgWidth,
    screenHeight / imgHeight
  );
  const newWidth = imgWidth * ratio;
  const newHeight = imgHeight * ratio;
  
  // Centrer l'image sur l'écran
  const imgX = (mobileWidth - newWidth) / 2;
  const imgY = screenPaddingY;
  
  // Dessiner l'interface de l'application
  // Barre verte en haut comme dans l'image de référence
  mobileCtx.fillStyle = '#4CAF50';
  mobileCtx.fillRect(screenPaddingX, screenPaddingY - 60, screenWidth, 60);
  
  // Logo BIGWIN (texte simple au lieu d'une image)
  mobileCtx.fillStyle = '#FFFFFF';
  mobileCtx.font = '24px Arial';
  mobileCtx.fillText('BIGWIN', screenPaddingX + 80, screenPaddingY - 25);
  
  // Bouton d'abonnement jaune
  mobileCtx.fillStyle = '#FFC107';
  mobileCtx.beginPath();
  const buttonX = screenPaddingX + screenWidth - 120;
  const buttonY = screenPaddingY - 45;
  const buttonWidth = 100;
  const buttonHeight = 30;
  mobileCtx.moveTo(buttonX + 10, buttonY);
  mobileCtx.lineTo(buttonX + buttonWidth - 10, buttonY);
  mobileCtx.quadraticCurveTo(buttonX + buttonWidth, buttonY, buttonX + buttonWidth, buttonY + 10);
  mobileCtx.lineTo(buttonX + buttonWidth, buttonY + buttonHeight - 10);
  mobileCtx.quadraticCurveTo(buttonX + buttonWidth, buttonY + buttonHeight, buttonX + buttonWidth - 10, buttonY + buttonHeight);
  mobileCtx.lineTo(buttonX + 10, buttonY + buttonHeight);
  mobileCtx.quadraticCurveTo(buttonX, buttonY + buttonHeight, buttonX, buttonY + buttonHeight - 10);
  mobileCtx.lineTo(buttonX, buttonY + 10);
  mobileCtx.quadraticCurveTo(buttonX, buttonY, buttonX + 10, buttonY);
  mobileCtx.closePath();
  mobileCtx.fill();
  
  mobileCtx.fillStyle = '#333333';
  mobileCtx.font = '16px Arial';
  mobileCtx.fillText('Subscribe', buttonX + 15, buttonY + 20);
  
  // Icône de menu (trois lignes)
  mobileCtx.strokeStyle = '#FFFFFF';
  mobileCtx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    mobileCtx.beginPath();
    mobileCtx.moveTo(screenPaddingX + 20, screenPaddingY - 40 + (i * 10));
    mobileCtx.lineTo(screenPaddingX + 40, screenPaddingY - 40 + (i * 10));
    mobileCtx.stroke();
  }
  
  // Dessiner l'image de pronostic
  mobileCtx.drawImage(pronoImg, imgX, imgY, newWidth, newHeight);
  
  // Ajouter la barre de navigation en bas
  mobileCtx.fillStyle = '#F5F5F5';
  mobileCtx.fillRect(screenPaddingX, mobileHeight - 200, screenWidth, 70);
  
  // Quelques icônes de navigation simplifiées
  const navItems = ['Free Tips', 'VIP Tips', 'Platinum', 'Like', 'Old Tips'];
  const itemWidth = screenWidth / navItems.length;
  
  mobileCtx.fillStyle = '#777777';
  mobileCtx.font = '12px Arial';
  navItems.forEach((item, index) => {
    // Dessiner une icône simplifiée
    mobileCtx.fillRect(screenPaddingX + (itemWidth * index) + (itemWidth/2) - 10, mobileHeight - 180, 20, 20);
    
    // Texte de navigation
    mobileCtx.fillText(item, screenPaddingX + (itemWidth * index) + (itemWidth/2) - 20, mobileHeight - 150);
  });
  
  // Colorier la dernière icône en vert pour montrer qu'elle est sélectionnée
  mobileCtx.fillStyle = '#4CAF50';
  mobileCtx.fillRect(screenPaddingX + (itemWidth * 4) + (itemWidth/2) - 10, mobileHeight - 180, 20, 20);
  
  return mobileCanvas.toBuffer('image/png');
}

// Fonction originale de génération d'images de pronostics
async function generateImage(data) {
  // Copie de la fonction originale (votre code existant)
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
    ctx.font = '16px Arial';
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

module.exports = { generateImage };