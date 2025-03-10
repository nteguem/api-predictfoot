const { createCanvas, loadImage } = require('canvas');
const moment = require('moment');
moment.locale('fr');

async function generateImage(data) {
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

  // Formater la date avec moment.js
  const formattedDate = moment(data[0]?.fixture?.event_date).format('dddd, MMMM Do YYYY');

  // Charger le logo du pronostic
  const logoPronostic = await loadImage('https://res.cloudinary.com/nwccompany/image/upload/v1739009050/nmyxfglhznextbg4jiok.png');

  // Obtenir les dimensions originales du logo
  const logoWidth = logoPronostic.width;
  const logoHeight = logoPronostic.height;

  // Calculer la taille de redimensionnement en maintenant le ratio
  const maxLogoHeight = 80;
  const ratio = maxLogoHeight / logoHeight;
  const newLogoWidth = logoWidth * ratio;
  const newLogoHeight = maxLogoHeight;

  // Dessiner le logo du pronostic centré en haut
  const logoX = (canvasWidth - newLogoWidth) / 2;
  ctx.drawImage(logoPronostic, logoX, 20, newLogoWidth, newLogoHeight); // Positionner le logo centré en haut

  // Déterminer le titre en fonction des conditions
  const isVip = data[0]?.isVip;
  const resultText = data[0]?.fixture.score?.fulltime != null ? "résultat " : 'combinaison ';
  const vipText = isVip ? 'VIP ' : 'Gratuites ';
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
    ctx.fillText(truncatedDate, canvasWidth - ctx.measureText(truncatedDate).width - 20, 130); // Aligné à droite sur la même ligne que "Combinaison"
  } else {
    ctx.fillText(formattedDate, canvasWidth - ctx.measureText(formattedDate).width - 20, 130); // Aligné à droite sur la même ligne que "Combinaison"
  }

  // Position de départ pour les pronostics
  let fixtureYStart = 180;
  // Augmenter la hauteur de ligne pour inclure l'espacement
  const lineHeight = fixtureHeight + spacingBetweenFixtures;

  let totalCoast = 1;
  let winCount = 0;

  // Charger le logo pour le filigrane
  const watermark = await loadImage('https://res.cloudinary.com/nwccompany/image/upload/v1739009367/i938xqbcaae0aymqdjgm.png');

  // Fonction pour dessiner une image avec border-radius
  const drawImageWithBorderRadius = (img, x, y, width, height, radius) => {
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
  const watermarkWidth = 300; // Largeur souhaitée du filigrane
  const watermarkHeight = 300; // Hauteur souhaitée du filigrane
  const watermarkX = (canvasWidth - watermarkWidth) / 2; // Position X
  const watermarkY = (canvasHeight - watermarkHeight) / 2; // Position Y
  ctx.globalAlpha = 0.1; // Opacité du filigrane
  ctx.drawImage(watermark, watermarkX, watermarkY, watermarkWidth, watermarkHeight);
  ctx.globalAlpha = 1; // Réinitialiser l'opacité

  for (const item of data) {
    const homeTeamLogo = await loadImage(item.fixture.homeTeam.logo);
    const awayTeamLogo = await loadImage(item.fixture.awayTeam.logo);
    const leagueLogo = await loadImage(item.championship.logo);
    const countryLogo = await loadImage(item.country.logo);

    // Hauteur du bloc de pronostic
    const blockHeight = fixtureHeight - 30; // Réduire légèrement pour augmenter l'espace visuel

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
    ctx.fillText(item.country.name, 55, fixtureYStart - 15);

    // League Logo and Name à droite avec border-radius
    const leagueLogoSize = 30;
    ctx.font = '18px Arial';
    const leagueNameWidth = ctx.measureText(item.championship.name).width;
    const leagueLogoRightX = canvasWidth - 20 - leagueLogoSize;
    drawImageWithBorderRadius(leagueLogo, leagueLogoRightX, fixtureYStart - 35, leagueLogoSize, leagueLogoSize, 5);
    ctx.fillText(item.championship.name, leagueLogoRightX - leagueNameWidth - 5, fixtureYStart - 15);

    // Home Team Logo and Name avec police diminuée
    drawImageWithBorderRadius(homeTeamLogo, 20, fixtureYStart, 55, 55, 8);
    ctx.font = '20px Arial'; // Diminué de 24px à 20px
    ctx.fillStyle = textColor;
    ctx.fillText(item.fixture.homeTeam.team_name, 85, fixtureYStart + 32);

    // Away Team Name avec police diminuée
    const awayTeamName = item.fixture.awayTeam.team_name;
    ctx.font = '20px Arial'; // Diminué de 24px à 20px
    const awayTeamNameWidth = ctx.measureText(awayTeamName).width;

    // Away Team Logo avec border-radius
    const awayTeamLogoX = canvasWidth - 80;
    drawImageWithBorderRadius(awayTeamLogo, awayTeamLogoX, fixtureYStart, 55, 55, 8);

    // Positionner le nom de l'équipe à l'extérieur de manière à ce qu'il prenne de l'espace vers la gauche
    const awayTeamNameX = awayTeamLogoX - 10 - awayTeamNameWidth; // 10 est la marge entre le nom et le logo
    ctx.fillText(awayTeamName, awayTeamNameX, fixtureYStart + 32);

    // Match Time or Score
    let matchInfo = '';
    if (item.fixture.score?.fulltime != null) {
      matchInfo = `${item.fixture.score?.fulltime}`;
    } else {
      matchInfo = moment(item.fixture.event_date).format('HH:mm');
    }
    ctx.font = '20px Arial'; 
    ctx.fillStyle = textColor;
 
    // Calculer la position X du temps de match pour qu'il soit centré dans le bloc bleu ciel
    const blockCenterX = canvasWidth / 2 - ctx.measureText(matchInfo).width / 2;
    ctx.fillText(matchInfo, blockCenterX, fixtureYStart + 32);

    // Prediction aligned below home team logo with larger font
    ctx.font = '28px Arial';
    ctx.fillText(item.prediction?.description_fr, 20, fixtureYStart + 105);

    // Affichage de la cote et du statut
    const coastText = `${item.coast}`;
    const statusText = item.iswin === true ? 'Gagné' : (item.iswin === false && item.fixture.score?.fulltime != null ? 'Perdu' : 'En attente');

    const blockWidth = 80; // Largeur fixe du bloc augmentée
    const statusBlockHeight = 70; // Hauteur fixe du bloc augmentée
    const blockX = canvasWidth - blockWidth - 20;
    const blockY = fixtureYStart + 70;

    ctx.fillStyle = item.iswin === true ? '#4CAF50' : (item.iswin === false && item.fixture.score?.fulltime != null ? '#F44336' : '#0F5784');
    ctx.beginPath();
    ctx.moveTo(blockX + 8, blockY); // Border radius augmenté
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
    ctx.font = '26px Arial'; // Texte de la cote avec police plus grande
    const coastTextWidth = ctx.measureText(coastText).width;
    const coastTextX = blockX + (blockWidth - coastTextWidth) / 2;
    ctx.fillText(coastText, coastTextX, blockY + 30);

    ctx.font = '16px Arial'; // Texte de statut avec police plus grande
    const statusTextWidth = ctx.measureText(statusText).width;
    const statusTextX = blockX + (blockWidth - statusTextWidth) / 2;
    ctx.fillText(statusText, statusTextX, blockY + 52);

    // Calculating total coast
    totalCoast *= item.coast;
    if (item.iswin === true) {
      winCount++;
    }

    // Ajuster la position Y pour le prochain pronostic avec un espacement supplémentaire
    fixtureYStart += lineHeight;
  }

  // Afficher la cote cumulée ou le ratio de réussite avec police plus grande
  let totalInfo = '';
  if (data[0]?.fixture.score?.fulltime != null) {
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
}

module.exports = { generateImage };