const { createCanvas, loadImage } = require('canvas');
const moment = require('moment');
moment.locale('fr');

// Fonction pour générer une image HD optimisée pour WhatsApp
async function generateHDImage(data) {
  // Vérifier si data existe et n'est pas vide
  if (!data || data.length === 0) {
    // Créer une image d'erreur si aucune donnée n'est disponible
    const errorCanvas = createCanvas(1200, 600); // Doublé la résolution
    const ctx = errorCanvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 1200, 600);
    ctx.fillStyle = '#F44336';
    ctx.font = '48px Arial'; // Doublé la taille de police
    ctx.fillText('Aucune donnée de pronostic disponible', 200, 300);
    return errorCanvas.toBuffer('image/png', { quality: 1.0, compressionLevel: 0 });
  }

  // Facteur d'échelle pour la HD (multiplicateur de résolution)
  const scale = 2.5;
  
  // Augmenter l'espacement entre les pronostics
  const spacingBetweenFixtures = 30 * scale;
  const fixtureHeight = 180 * scale;

  const canvasWidth = 600 * scale;
  // Ajuster la hauteur du canvas pour inclure l'espacement supplémentaire
  const canvasHeight = (400 + (data.length * (fixtureHeight / scale + spacingBetweenFixtures / scale))) * scale;
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d', { alpha: true });

  // Activer l'anticrénelage pour des lignes plus nettes
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

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
      logoPronostic = await loadImage('https://res.cloudinary.com/nwccompany/image/upload/v1742381887/fbx8xkn1zrckulw4djkh.png');
    } catch (error) {
      console.error('Erreur lors du chargement du logo pronostic:', error);
      // Créer un logo de remplacement avec une résolution plus élevée
      const fallbackCanvas = createCanvas(400 * scale, 200 * scale);
      const fallbackCtx = fallbackCanvas.getContext('2d');
      fallbackCtx.fillStyle = '#1B5E20';
      fallbackCtx.fillRect(0, 0, 400 * scale, 200 * scale);
      fallbackCtx.fillStyle = '#FFFFFF';
      fallbackCtx.font = `${40 * scale}px Arial`;
      fallbackCtx.fillText('PRONOSTIC', 80 * scale, 120 * scale);
      logoPronostic = fallbackCanvas;
    }

    // Obtenir les dimensions originales du logo
    const logoWidth = logoPronostic.width || 200 * scale;
    const logoHeight = logoPronostic.height || 100 * scale;

    // Calculer la taille de redimensionnement en maintenant le ratio
    const maxLogoHeight = 80 * scale;
    const ratio = maxLogoHeight / logoHeight;
    const newLogoWidth = logoWidth * ratio;
    const newLogoHeight = maxLogoHeight;

    // Dessiner le logo du pronostic centré en haut
    const logoX = (canvasWidth - newLogoWidth) / 2;
    ctx.drawImage(logoPronostic, logoX, 20 * scale, newLogoWidth, newLogoHeight);

    // Déterminer le titre en fonction des conditions
    const isVip = data[0]?.isVip ?? false;
    const resultText = data[0]?.fixture?.score?.fulltime != null ? "résultat " : 'pronos ';
    const vipText = isVip ? 'VIP ' : 'Gratuits';
    const titleText = resultText + vipText;

    // Afficher le titre en haut à gauche avec une police plus grande
    ctx.font = `${32 * scale}px Arial`;
    ctx.fillStyle = textColor;
    ctx.fillText(titleText, 20 * scale, 130 * scale);

    // Limiter la longueur de la date pour qu'elle ne dépasse pas
    const maxWidthDate = 450 * scale;
    ctx.font = `${26 * scale}px Arial`;
    ctx.fillStyle = textColor;
    if (ctx.measureText(formattedDate).width > maxWidthDate) {
      const truncatedDate = formattedDate.slice(0, 30) + '...';
      ctx.fillText(truncatedDate, canvasWidth - ctx.measureText(truncatedDate).width - 20 * scale, 130 * scale);
    } else {
      ctx.fillText(formattedDate, canvasWidth - ctx.measureText(formattedDate).width - 20 * scale, 130 * scale);
    }

    // Position de départ pour les pronostics
    let fixtureYStart = 180 * scale;
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
      const fallbackCanvas = createCanvas(300 * scale, 300 * scale);
      const fallbackCtx = fallbackCanvas.getContext('2d');
      fallbackCtx.fillStyle = '#E0E0E0';
      fallbackCtx.font = `${30 * scale}px Arial`;
      fallbackCtx.fillText('PRONOSTIC', 70 * scale, 150 * scale);
      watermark = fallbackCanvas;
    }

    // Fonction pour dessiner une image avec border-radius améliorée pour HD
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
    const watermarkWidth = 300 * scale;
    const watermarkHeight = 300 * scale;
    const watermarkX = (canvasWidth - watermarkWidth) / 2;
    const watermarkY = (canvasHeight - watermarkHeight) / 2;
    ctx.globalAlpha = 0.1;
    ctx.drawImage(watermark, watermarkX, watermarkY, watermarkWidth, watermarkHeight);
    ctx.globalAlpha = 1;

    // Créer une fonction pour charger une image avec gestion d'erreur
    const safeLoadImage = async (url, fallbackText) => {
      if (!url) {
        // Créer une image de remplacement si l'URL est null
        const fallbackCanvas = createCanvas(55 * scale, 55 * scale);
        const fallbackCtx = fallbackCanvas.getContext('2d');
        fallbackCtx.fillStyle = '#E0E0E0';
        fallbackCtx.fillRect(0, 0, 55 * scale, 55 * scale);
        fallbackCtx.fillStyle = '#555555';
        fallbackCtx.font = `${12 * scale}px Arial`;
        fallbackCtx.fillText(fallbackText || 'N/A', 15 * scale, 30 * scale);
        return fallbackCanvas;
      }
      
      try {
        return await loadImage(url);
      } catch (error) {
        console.error(`Erreur lors du chargement de l'image (${url}):`, error);
        // Créer une image de remplacement en cas d'erreur
        const fallbackCanvas = createCanvas(55 * scale, 55 * scale);
        const fallbackCtx = fallbackCanvas.getContext('2d');
        fallbackCtx.fillStyle = '#E0E0E0';
        fallbackCtx.fillRect(0, 0, 55 * scale, 55 * scale);
        fallbackCtx.fillStyle = '#555555';
        fallbackCtx.font = `${12 * scale}px Arial`;
        fallbackCtx.fillText(fallbackText || 'Erreur', 10 * scale, 30 * scale);
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

      // Hauteur du bloc de pronostic - augmentée pour éviter les débordements
      const blockHeight = fixtureHeight - 10 * scale; // Augmenté de 30*scale à 10*scale
      
      // Ajouter plus d'espace pour les informations
      const leftMargin = 30 * scale;
      const rightMargin = 30 * scale;
      const topOffset = 20 * scale;
      const bottomPadding = 30 * scale; // Espace supplémentaire en bas
      
      // Fond vert ciel clair pour chaque pronostic avec border radius
      ctx.fillStyle = '#E0FBE0';
      
      // Améliorer le rendu des coins arrondis en utilisant arcTo pour des courbes plus douces
      const cornerRadius = 20 * scale;
      ctx.beginPath();
      // Haut gauche
      ctx.moveTo(leftMargin, fixtureYStart - topOffset + cornerRadius);
      ctx.arcTo(
        leftMargin, fixtureYStart - topOffset,
        leftMargin + cornerRadius, fixtureYStart - topOffset,
        cornerRadius
      );
      // Haut droit
      ctx.arcTo(
        canvasWidth - rightMargin, fixtureYStart - topOffset,
        canvasWidth - rightMargin, fixtureYStart - topOffset + cornerRadius,
        cornerRadius
      );
      // Bas droit
      ctx.arcTo(
        canvasWidth - rightMargin, fixtureYStart + blockHeight + bottomPadding,
        canvasWidth - rightMargin - cornerRadius, fixtureYStart + blockHeight + bottomPadding,
        cornerRadius
      );
      // Bas gauche
      ctx.arcTo(
        leftMargin, fixtureYStart + blockHeight + bottomPadding,
        leftMargin, fixtureYStart + blockHeight + bottomPadding - cornerRadius,
        cornerRadius
      );
      // Fermer
      ctx.closePath();
      ctx.fill();

      // Country Logo and Name à gauche avec border-radius - déplacé un peu plus à gauche
      const countryLogoSize = 30 * scale;
      const countryLogoX = 40 * scale; // Déplacé de 20*scale à 40*scale
      drawImageWithBorderRadius(
        countryLogo, 
        countryLogoX, 
        fixtureYStart - 35 * scale, 
        countryLogoSize, 
        countryLogoSize, 
        5 * scale
      );
      ctx.font = `${18 * scale}px Arial`;
      ctx.fillStyle = textColor;
      
      // Limiter la taille du texte du pays pour éviter le débordement
      const countryName = country.name || 'Pays non spécifié';
      const countryTextX = countryLogoX + countryLogoSize + 5 * scale;
      const maxCountryWidth = (canvasWidth / 2) - countryTextX - 10 * scale;
      
      // Tronquer le nom du pays si nécessaire
      let displayCountryName = countryName;
      if (ctx.measureText(countryName).width > maxCountryWidth) {
        // Tronquer si trop long
        let i = countryName.length - 1;
        while (i > 0 && ctx.measureText(countryName.substring(0, i) + '...').width > maxCountryWidth) {
          i--;
        }
        displayCountryName = countryName.substring(0, i) + '...';
      }
      
      ctx.fillText(displayCountryName, countryTextX, fixtureYStart - 15 * scale);

      // League Logo and Name à droite avec border-radius - déplacé un peu plus à droite
      const leagueLogoSize = 30 * scale;
      ctx.font = `${18 * scale}px Arial`;
      const leagueText = championship.name || 'Championnat non spécifié';
      const leagueNameWidth = ctx.measureText(leagueText).width;
      
      // S'assurer que le logo de la ligue n'est pas trop près du bord droit
      const leagueLogoRightX = canvasWidth - 50 * scale - leagueLogoSize; // Déplacé de 20*scale à 50*scale
      
      // Limiter la taille du texte de la ligue
      const maxLeagueWidth = (canvasWidth / 2) - 40 * scale;
      let displayLeagueText = leagueText;
      
      if (leagueNameWidth > maxLeagueWidth) {
        // Tronquer si trop long
        let i = leagueText.length - 1;
        while (i > 0 && ctx.measureText(leagueText.substring(0, i) + '...').width > maxLeagueWidth) {
          i--;
        }
        displayLeagueText = leagueText.substring(0, i) + '...';
      }
      
      // Recalculer la largeur après troncature possible
      const finalLeagueWidth = ctx.measureText(displayLeagueText).width;
      
      drawImageWithBorderRadius(
        leagueLogo, 
        leagueLogoRightX, 
        fixtureYStart - 35 * scale, 
        leagueLogoSize, 
        leagueLogoSize, 
        5 * scale
      );
      
      ctx.fillText(
        displayLeagueText, 
        leagueLogoRightX - finalLeagueWidth - 5 * scale, 
        fixtureYStart - 15 * scale
      );

      // Home Team Logo and Name avec police diminuée - repositionné
      const homeTeamLogoX = 40 * scale; // Déplacé de 20*scale à 40*scale
      const teamLogoSize = 55 * scale;
      
      drawImageWithBorderRadius(
        homeTeamLogo, 
        homeTeamLogoX, 
        fixtureYStart, 
        teamLogoSize, 
        teamLogoSize, 
        8 * scale
      );
      
      ctx.font = `${20 * scale}px Arial`;
      ctx.fillStyle = textColor;
      
      // Limiter la taille du nom de l'équipe à domicile
      const homeTeamText = homeTeam.team_name || 'Équipe à domicile';
      const maxHomeTeamWidth = (canvasWidth / 2) - 150 * scale; // Laisser de l'espace pour le temps/score au centre
      
      let displayHomeTeamText = homeTeamText;
      if (ctx.measureText(homeTeamText).width > maxHomeTeamWidth) {
        // Tronquer si trop long
        let i = homeTeamText.length - 1;
        while (i > 0 && ctx.measureText(homeTeamText.substring(0, i) + '...').width > maxHomeTeamWidth) {
          i--;
        }
        displayHomeTeamText = homeTeamText.substring(0, i) + '...';
      }
      
      ctx.fillText(displayHomeTeamText, homeTeamLogoX + teamLogoSize + 10 * scale, fixtureYStart + 32 * scale);

      // Away Team Name avec police diminuée
      const awayTeamText = awayTeam.team_name || 'Équipe à l\'extérieur';
      ctx.font = `${20 * scale}px Arial`;
      
      // Limiter la taille du nom de l'équipe à l'extérieur
      const maxAwayTeamWidth = (canvasWidth / 2) - 150 * scale;
      
      let displayAwayTeamText = awayTeamText;
      if (ctx.measureText(awayTeamText).width > maxAwayTeamWidth) {
        // Tronquer si trop long
        let i = awayTeamText.length - 1;
        while (i > 0 && ctx.measureText(awayTeamText.substring(0, i) + '...').width > maxAwayTeamWidth) {
          i--;
        }
        displayAwayTeamText = awayTeamText.substring(0, i) + '...';
      }
      
      const awayTeamNameWidth = ctx.measureText(displayAwayTeamText).width;

      // Away Team Logo avec border-radius - repositionné
      const awayTeamLogoX = canvasWidth - teamLogoSize - 40 * scale; // Déplacé pour éviter le débordement
      drawImageWithBorderRadius(
        awayTeamLogo, 
        awayTeamLogoX, 
        fixtureYStart, 
        teamLogoSize, 
        teamLogoSize, 
        8 * scale
      );

      // Positionner le nom de l'équipe à l'extérieur de manière à ce qu'il prenne de l'espace vers la gauche
      const awayTeamNameX = awayTeamLogoX - 10 * scale - awayTeamNameWidth;
      ctx.fillText(displayAwayTeamText, awayTeamNameX, fixtureYStart + 32 * scale);

      // Match Time or Score
      let matchInfo = '';
      if (fixture.score?.fulltime != null) {
        matchInfo = `${fixture.score.fulltime}`;
      } else if (fixture.event_date) {
        matchInfo = moment(fixture.event_date).format('HH:mm');
      } else {
        matchInfo = 'Heure N/A';
      }
      ctx.font = `${20 * scale}px Arial`; 
      ctx.fillStyle = textColor;
   
      // Calculer la position X du temps de match pour qu'il soit centré
      const blockCenterX = canvasWidth / 2 - ctx.measureText(matchInfo).width / 2;
      ctx.fillText(matchInfo, blockCenterX, fixtureYStart + 32 * scale);

      // Prediction aligned below home team logo with larger font - avec limitation de la longueur
      ctx.font = `${28 * scale}px Arial`;
      
      // Limiter la longueur du pronostic pour éviter le débordement
      const predictionText = prediction.description_fr || 'Pronostic non disponible';
      
      // Calculer l'espace disponible pour le pronostic (en évitant le bloc de cote)
      const blockWidth = 90 * scale; // Légèrement plus large pour plus d'espace
      const availableWidth = canvasWidth - 90 * scale - blockWidth - 40 * scale;
      
      // Vérifier si le texte dépasse l'espace disponible
      let displayPredictionText = predictionText;
      if (ctx.measureText(predictionText).width > availableWidth) {
        // Tronquer si trop long
        let i = predictionText.length - 1;
        while (i > 0 && ctx.measureText(predictionText.substring(0, i) + '...').width > availableWidth) {
          i--;
        }
        displayPredictionText = predictionText.substring(0, i) + '...';
      }
      
      ctx.fillText(
        displayPredictionText, 
        40 * scale, // Augmenté de 20*scale à 40*scale pour correspondre aux autres éléments
        fixtureYStart + 105 * scale
      );

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

      // Augmenter légèrement la taille du bloc et le déplacer un peu plus à droite
      const statusBlockHeight = 70 * scale;
      const blockX = canvasWidth - blockWidth - 40 * scale; // Augmenté de 20*scale à 40*scale
      const blockY = fixtureYStart + 70 * scale;

      // Couleur en fonction du statut, avec gestion des nulls
      let blockColor;
      if (iswin === true) {
        blockColor = '#4CAF50'; // Vert pour gagné
      } else if (iswin === false && fixture.score?.fulltime != null) {
        blockColor = '#F44336'; // Rouge pour perdu
      } else {
        blockColor = '#0F5784'; // Bleu pour en attente
      }
      
      // Assurer que le bloc n'est pas trop près du bord
      const safeBlockX = Math.min(blockX, canvasWidth - blockWidth - 30 * scale);
      
      ctx.fillStyle = blockColor;
      const blockRadius = 8 * scale;
      ctx.beginPath();
      // Haut gauche
      ctx.moveTo(safeBlockX + blockRadius, blockY);
      ctx.arcTo(
        safeBlockX, blockY,
        safeBlockX, blockY + blockRadius,
        blockRadius
      );
      // Bas gauche
      ctx.arcTo(
        safeBlockX, blockY + statusBlockHeight,
        safeBlockX + blockRadius, blockY + statusBlockHeight,
        blockRadius
      );
      // Bas droit
      ctx.arcTo(
        safeBlockX + blockWidth, blockY + statusBlockHeight,
        safeBlockX + blockWidth, blockY + statusBlockHeight - blockRadius,
        blockRadius
      );
      // Haut droit
      ctx.arcTo(
        safeBlockX + blockWidth, blockY,
        safeBlockX + blockWidth - blockRadius, blockY,
        blockRadius
      );
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FFFFFF'; // Texte blanc
      ctx.font = `${26 * scale}px Arial`;
      const coastTextWidth = ctx.measureText(coastText).width;
      const coastTextX = safeBlockX + (blockWidth - coastTextWidth) / 2;
      ctx.fillText(coastText, coastTextX, blockY + 30 * scale);

      ctx.font = `${16 * scale}px Arial`;
      const statusTextWidth = ctx.measureText(statusText).width;
      const statusTextX = safeBlockX + (blockWidth - statusTextWidth) / 2;
      ctx.fillText(statusText, statusTextX, blockY + 52 * scale);

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
    ctx.font = `${28 * scale}px Arial`;
    ctx.fillStyle = textColor;
    ctx.fillText(totalInfo, 20 * scale, fixtureYStart + 20 * scale);

    // Ajouter "NB" en bas avec police plus grande
    ctx.font = `${14 * scale}px Arial`;
    ctx.fillStyle = textColor;
    ctx.fillText(
      "Jouez de manière responsable. Les gains ou pertes sont sous la responsabilité des joueurs.", 
      20 * scale, 
      canvasHeight - 20 * scale
    );

    // Enregistrer avec la plus haute qualité possible
    const buffer = canvas.toBuffer('image/png', { 
      quality: 1.0,             // Qualité maximale pour JPEG (non utilisé pour PNG)
      compressionLevel: 0,      // Pas de compression pour PNG
      resolution: 300           // Résolution DPI élevée
    });
    
    return buffer;
    
  } catch (error) {
    // Gérer toute erreur inattendue
    console.error('Erreur lors de la génération de l\'image HD:', error);
    
    // Créer une image d'erreur
    const errorCanvas = createCanvas(1200, 800);
    const errorCtx = errorCanvas.getContext('2d');
    errorCtx.fillStyle = '#FFFFFF';
    errorCtx.fillRect(0, 0, 1200, 800);
    errorCtx.fillStyle = '#F44336';
    errorCtx.font = '48px Arial';
    errorCtx.fillText('Erreur lors de la génération de l\'image', 200, 360);
    errorCtx.fillStyle = '#000000';
    errorCtx.font = '32px Arial';
    errorCtx.fillText('Veuillez vérifier vos données et réessayer.', 300, 440);
    
    return errorCanvas.toBuffer('image/png', { quality: 1.0, compressionLevel: 0 });
  }
}

// Version HD de la fonction mobile qui place l'image dans un cadre iPhone 15
async function generateHDMobileImage(data) {
  try {
    // D'abord, générer l'image de pronostic HD
    const pronosticImageBuffer = await generateHDImage(data);
    const pronosticImage = await loadImage(pronosticImageBuffer);
    
    // Dimensions du pronostic
    const pronoWidth = pronosticImage.width;
    const pronoHeight = pronosticImage.height;
    
    // Facteur d'échelle pour la HD
    const scale = 2.5;
    
    // Calculer les dimensions du téléphone pour s'assurer que tout est visible
    // Ajouter de l'espace pour le cadre du téléphone
    const frameMargin = 30 * scale;
    const mobileWidth = pronoWidth + (frameMargin * 2);
    // S'assurer que la hauteur est suffisante pour tout afficher avec une marge
    const mobileHeight = pronoHeight + (frameMargin * 2) + 50 * scale;
    
    const mobileCanvas = createCanvas(mobileWidth, mobileHeight);
    const ctx = mobileCanvas.getContext('2d', { alpha: true });
    
    // Activer l'anticrénelage pour des lignes plus nettes
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Fond transparent
    ctx.clearRect(0, 0, mobileWidth, mobileHeight);
    
    // Dessiner le cadre d'iPhone 15 HD
    drawHDIphone15Frame(ctx, mobileWidth, mobileHeight, scale);
    
    // Dessiner le contenu dans le "téléphone" avec une légère marge
    const screenMargin = 14 * scale;
    
    // Calculer les dimensions de l'écran (espace disponible pour l'image)
    const frameThickness = 12 * scale;
    const screenWidth = mobileWidth - (frameThickness * 2) - (screenMargin * 2);
    const screenHeight = mobileHeight - (frameThickness * 2) - (screenMargin * 2);
    
    // Adapter l'image au screen
    const scaleRatio = Math.min(screenWidth / pronoWidth, screenHeight / pronoHeight);
    const scaledWidth = pronoWidth * scaleRatio;
    const scaledHeight = pronoHeight * scaleRatio;
    
    // Centrer l'image dans l'écran
    const pronoX = frameThickness + screenMargin + (screenWidth - scaledWidth) / 2;
    const pronoY = frameThickness + screenMargin + (screenHeight - scaledHeight) / 2;
    
    // Dessiner l'image de pronostic adaptée à l'écran
    ctx.drawImage(pronosticImage, pronoX, pronoY, scaledWidth, scaledHeight);
    
    // Retourner l'image finale avec haute qualité
    return mobileCanvas.toBuffer('image/png', { 
      quality: 1.0,             // Qualité maximale
      compressionLevel: 0,      // Pas de compression
      resolution: 300           // Résolution DPI élevée
    });
  } catch (error) {
    console.error('Erreur lors de la génération de l\'image mobile HD:', error);
    
    // Créer une image d'erreur
    const errorCanvas = createCanvas(1050, 1750); // 420*2.5, 700*2.5
    const errorCtx = errorCanvas.getContext('2d');
    errorCtx.fillStyle = '#FFFFFF';
    errorCtx.fillRect(0, 0, 1050, 1750);
    errorCtx.fillStyle = '#F44336';
    errorCtx.font = '60px Arial'; // 24*2.5
    errorCtx.fillText('Erreur lors de la génération', 125, 875);
    errorCtx.fillText('de l\'image mobile HD', 250, 950);
    
    return errorCanvas.toBuffer('image/png', { quality: 1.0, compressionLevel: 0 });
  }
}

// Fonction pour dessiner un cadre style iPhone 15 en HD
function drawHDIphone15Frame(ctx, width, height, scale) {
  // Paramètres du cadre
  const frameThickness = 12 * scale;
  const cornerRadius = 40 * scale;
  
  // Couleur du cadre (noir comme iPhone 15 Pro)
  const frameColor = '#1A1A1A';
  
  // Couleur ROUGE pour le capteur de la Dynamic Island
  const cameraRed = '#F44336';
  
  // Dessiner le cadre externe avec un clip pour éviter les coins blancs
  ctx.save();
  
  // Créer le chemin pour le cadre externe avec arc pour des coins plus lisses
  roundedRectHD(ctx, 0, 0, width, height, cornerRadius);
  
  // Le dessiner et le remplir
  ctx.fillStyle = frameColor;
  ctx.fill();
  
  // Maintenant, créer un clip basé sur ce chemin pour que rien ne soit dessiné en dehors
  ctx.clip();
  
  // Dessiner l'écran intérieur
  ctx.fillStyle = '#FFFFFF';
  roundedRectHD(
    ctx, 
    frameThickness, 
    frameThickness, 
    width - (frameThickness * 2), 
    height - (frameThickness * 2), 
    cornerRadius - 5 * scale
  );
  ctx.fill();
  
  // Ajouter la Dynamic Island (Apple iPhone 15)
  const islandWidth = width * 0.25;
  const islandHeight = 35 * scale;
  const islandX = (width - islandWidth) / 2;
  const islandY = frameThickness + 4 * scale;
  const islandRadius = islandHeight / 2;
  
  ctx.fillStyle = frameColor;
  roundedRectHD(ctx, islandX, islandY, islandWidth, islandHeight, islandRadius);
  ctx.fill();
  
  // Ajouter les détails de la Dynamic Island
  // Cercle pour caméra - EN ROUGE
  ctx.fillStyle = cameraRed;
  ctx.beginPath();
  ctx.arc(islandX + islandWidth - islandHeight/2, islandY + islandHeight/2, 6 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Restaurer le contexte après avoir terminé
  ctx.restore();
  
  // Ajouter un léger effet de brillance sur les bords du cadre
  ctx.save();
  roundedRectHD(ctx, 0, 0, width, height, cornerRadius);
  ctx.clip();
  
  // Effet subtil de reflet sur le bord
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
  
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 1 * scale;
  roundedRectHD(ctx, 1 * scale, 1 * scale, width - 2 * scale, height - 2 * scale, cornerRadius - 1 * scale);
  ctx.stroke();
  
  ctx.restore();
}

// Fonction utilitaire améliorée pour dessiner un rectangle avec des coins arrondis en HD
function roundedRectHD(ctx, x, y, width, height, radius) {
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

// Optimiser les images pour le partage WhatsApp
async function optimizeForWhatsApp(imageBuffer) {
  try {
    // Charger l'image générée
    const image = await loadImage(imageBuffer);
    
    // Déterminer la taille idéale pour WhatsApp
    // WhatsApp compresse moins les images qui respectent certaines dimensions
    // 1920x1080 est une résolution idéale pour le partage mobile
    const maxWidth = 1920;
    const maxHeight = 1080;
    
    // Calculer les dimensions tout en conservant le ratio
    let newWidth, newHeight;
    if (image.width / image.height > maxWidth / maxHeight) {
      // L'image est plus large que haute
      newWidth = maxWidth;
      newHeight = (image.height * maxWidth) / image.width;
    } else {
      // L'image est plus haute que large
      newHeight = maxHeight;
      newWidth = (image.width * maxHeight) / image.height;
    }
    
    // Créer un nouveau canvas aux dimensions optimisées
    const canvas = createCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d', { alpha: true });
    
    // Activer l'anticrénelage pour des lignes plus nettes
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Dessiner l'image
    ctx.drawImage(image, 0, 0, newWidth, newHeight);
    
    // Améliorer la netteté
    // Note: la méthode d'amélioration de netteté est limitée dans node-canvas
    // Nous utilisons un petit hack pour simuler un effet de netteté
    const imageData = ctx.getImageData(0, 0, newWidth, newHeight);
    const data = imageData.data;
    
    // Appliquer un filtre de netteté simplifié (simulation)
    // Ce n'est pas un vrai filtre de netteté, mais il peut aider un peu
    for (let i = 0; i < data.length; i += 4) {
      // Augmenter légèrement le contraste
      data[i] = Math.min(255, Math.max(0, data[i] * 1.05));         // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * 1.05)); // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * 1.05)); // B
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Retourner l'image optimisée avec paramètres de haute qualité
    return canvas.toBuffer('image/png', { 
      quality: 1.0,             // Qualité maximale
      compressionLevel: 0,      // Pas de compression pour PNG
      resolution: 300           // Résolution DPI élevée
    });
  } catch (error) {
    console.error('Erreur lors de l\'optimisation pour WhatsApp:', error);
    return imageBuffer; // Retourner l'image originale en cas d'erreur
  }
}

// Exporter les fonctions
module.exports = { 
  generateImage: generateHDMobileImage,
  generateHDImage,
  generateOriginalImage: generateHDImage,
  optimizeForWhatsApp
};