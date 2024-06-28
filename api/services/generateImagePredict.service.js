const { createCanvas, loadImage } = require('canvas');
const moment = require('moment');
moment.locale('en');

async function generateImage(data) {
  const canvasWidth = 600;
  const canvasHeight = 400 + data.length * 180;
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Fond blanc
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Couleur du texte
  const textColor = '#0F5784';

  // Formater la date avec moment.js
  const formattedDate = moment(data[0]?.fixture?.event_date).format('dddd, MMMM Do YYYY');

  // Charger le logo du pronostic
  const logoPronostic = await loadImage('https://res.cloudinary.com/nwccompany/image/upload/v1697473945/svwv6rpzuqox412llrnm.jpg');

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
  const resultText = data[0]?.fixture.score?.fulltime != null ? "prediction result " : 'prediction combination ';
  const vipText = isVip ? 'VIP ' : 'Free ';
  const titleText = vipText + resultText;

  // Afficher le titre en haut à gauche
  ctx.font = '25px Arial';
  ctx.fillStyle = textColor;
  ctx.fillText(titleText, 20, 130);

  // Limiter la longueur de la date pour qu'elle ne dépasse pas
  const maxWidthDate = 450;
  ctx.font = '20px Arial';
  ctx.fillStyle = textColor;
  if (ctx.measureText(formattedDate).width > maxWidthDate) {
    const truncatedDate = formattedDate.slice(0, 30) + '...';
    ctx.fillText(truncatedDate, canvasWidth - ctx.measureText(truncatedDate).width - 20, 130); // Aligné à droite sur la même ligne que "Combinaison"
  } else {
    ctx.fillText(formattedDate, canvasWidth - ctx.measureText(formattedDate).width - 20, 130); // Aligné à droite sur la même ligne que "Combinaison"
  }

  // Position de départ pour les pronostics
  let fixtureYStart = 180;
  const lineHeight = 180;

  let totalCoast = 1;
  let winCount = 0;

  // Charger le logo pour le filigrane
  const watermark = await loadImage('https://res.cloudinary.com/nwccompany/image/upload/v1691058952/PredictFoot_icon_ib9dvl.png');

  for (const item of data) {
    const homeTeamLogo = await loadImage(item.fixture.homeTeam.logo);
    const awayTeamLogo = await loadImage(item.fixture.awayTeam.logo);
    const leagueLogo = await loadImage(item.championship.logo);

    // Fond bleu ciel clair pour chaque pronostic avec border radius
    ctx.fillStyle = '#E0F7FA';
    ctx.beginPath();
    ctx.moveTo(30, fixtureYStart - 20);
    ctx.lineTo(canvasWidth - 30, fixtureYStart - 20);
    ctx.quadraticCurveTo(canvasWidth - 10, fixtureYStart - 20, canvasWidth - 10, fixtureYStart);
    ctx.lineTo(canvasWidth - 10, fixtureYStart + lineHeight - 50);
    ctx.quadraticCurveTo(canvasWidth - 10, fixtureYStart + lineHeight - 30, canvasWidth - 30, fixtureYStart + lineHeight - 30);
    ctx.lineTo(30, fixtureYStart + lineHeight - 30);
    ctx.quadraticCurveTo(10, fixtureYStart + lineHeight - 30, 10, fixtureYStart + lineHeight - 50);
    ctx.lineTo(10, fixtureYStart);
    ctx.quadraticCurveTo(10, fixtureYStart - 20, 30, fixtureYStart - 20);
    ctx.closePath();
    ctx.fill();

    // Ajouter un filigrane centré
    const watermarkWidth = 300; // Largeur souhaitée du filigrane
    const watermarkHeight = 300; // Hauteur souhaitée du filigrane
    const watermarkX = (canvasWidth - watermarkWidth) / 2; // Position X
    const watermarkY = (canvasHeight - watermarkHeight) / 2; // Position Y
    ctx.globalAlpha = 0.1; // Opacité du filigrane
    ctx.drawImage(watermark, watermarkX, watermarkY, watermarkWidth, watermarkHeight);
    ctx.globalAlpha = 1; // Réinitialiser l'opacité

    // League Logo and Name
    ctx.drawImage(leagueLogo, 20, fixtureYStart - 30, 20, 20); // Très petit logo de la ligue
    ctx.font = '12px Arial';
    ctx.fillStyle = textColor;
    ctx.fillText(item.championship.name, 45, fixtureYStart - 15);

    // Home Team Logo and Name
    ctx.drawImage(homeTeamLogo, 20, fixtureYStart, 50, 50); // Logo de l'équipe à domicile
    ctx.font = '20px Arial';
    ctx.fillStyle = textColor;
    ctx.fillText(item.fixture.homeTeam.team_name, 80, fixtureYStart + 30);

    // Away Team Name
    const awayTeamName = item.fixture.awayTeam.team_name;
    const awayTeamNameWidth = ctx.measureText(awayTeamName).width;

    // Away Team Logo
    const awayTeamLogoX = canvasWidth - 80; // Position du logo de l'équipe à l'extérieur
    ctx.drawImage(awayTeamLogo, awayTeamLogoX, fixtureYStart, 50, 50); // Logo de l'équipe à l'extérieur

    // Positionner le nom de l'équipe à l'extérieur de manière à ce qu'il prenne de l'espace vers la gauche
    const awayTeamNameX = awayTeamLogoX - 10 - awayTeamNameWidth; // 10 est la marge entre le nom et le logo
    ctx.fillText(awayTeamName, awayTeamNameX, fixtureYStart + 30);

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
    ctx.fillText(matchInfo, blockCenterX, fixtureYStart + 30);

    // Prediction aligned below home team logo
    ctx.font = '20px Arial';
    ctx.fillText(item.prediction, 20, fixtureYStart + 100);

    // Affichage de la cote et du statut
    const coastText = `${item.coast}`;
    const statusText = item.iswin === true ? 'Win' : (item.iswin === false && item.fixture.score?.fulltime != null ? 'Lost' : 'Pending');

    const padding = 10;
    const blockWidth = 70; // Largeur fixe du bloc diminuée
    const blockHeight = 60; // Hauteur fixe du bloc pour inclure les deux lignes de texte
    const blockX = canvasWidth - blockWidth - 20;
    const blockY = fixtureYStart + 70;

    ctx.fillStyle = item.iswin === true ? '#4CAF50' : (item.iswin === false && item.fixture.score?.fulltime != null ? '#F44336' : '#0F5784');
    ctx.beginPath();
    ctx.moveTo(blockX + 5, blockY); // Commencer à 5px du coin pour le border radius
    ctx.lineTo(blockX + blockWidth - 5, blockY); // Dessiner la ligne supérieure
    ctx.quadraticCurveTo(blockX + blockWidth, blockY, blockX + blockWidth, blockY + 5); // Coin supérieur droit
    ctx.lineTo(blockX + blockWidth, blockY + blockHeight - 5); // Ligne droite droite
    ctx.quadraticCurveTo(blockX + blockWidth, blockY + blockHeight, blockX + blockWidth - 5, blockY + blockHeight); // Coin inférieur droit
    ctx.lineTo(blockX + 5, blockY + blockHeight); // Ligne inférieure
    ctx.quadraticCurveTo(blockX, blockY + blockHeight, blockX, blockY + blockHeight - 5); // Coin inférieur gauche
    ctx.lineTo(blockX, blockY + 5); // Ligne gauche
    ctx.quadraticCurveTo(blockX, blockY, blockX + 5, blockY); // Coin supérieur gauche
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF'; // Texte blanc
    ctx.font = '20px Arial'; // Texte de la cote
    const coastTextWidth = ctx.measureText(coastText).width;
    const coastTextX = blockX + (blockWidth - coastTextWidth) / 2;
    ctx.fillText(coastText, coastTextX, blockY + 25);

    ctx.font = '12px Arial'; // Texte de statut
    const statusTextWidth = ctx.measureText(statusText).width;
    const statusTextX = blockX + (blockWidth - statusTextWidth) / 2;
    ctx.fillText(statusText, statusTextX, blockY + 45);

    // Calculating total coast
    totalCoast *= item.coast;
    if (item.iswin === true) {
      winCount++;
    }

    // Ajuster la position Y pour le prochain pronostic
    fixtureYStart += lineHeight;
  }

  // Afficher la cote cumulée ou le ratio de réussite
  let totalInfo = '';
  if (data[0]?.fixture.score?.fulltime != null) {
    totalInfo = `Rate: ${winCount}/${data.length} (${((winCount / data.length) * 100).toFixed(2)}%)`;
  } else {
    totalInfo = `Total odds: ${totalCoast.toFixed(2)}`;
  }
  ctx.font = '20px Arial';
  ctx.fillStyle = textColor;
  ctx.fillText(totalInfo, 20, fixtureYStart + 20);

  // Ajouter "NB" en bas
  ctx.font = '15px Arial';
  ctx.fillStyle = textColor;
  ctx.fillText("NB: Play responsibly. Positive or negative winnings are the responsibility of the players.", 20, canvasHeight - 20);

  const buffer = canvas.toBuffer('image/png');
  return buffer;
}

module.exports = { generateImage };
