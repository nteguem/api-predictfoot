const fetch = require('node-fetch');
const fs = require('fs/promises');
const path = require('path');
const moment = require('moment');
moment.locale('fr');
const directoryData = 'data-football';

async function getMatchesPerDay(date) {
    try {
      const response = await fetch(`https://${process.env.RAPID_API_HOST}/v2/fixtures/date/${date}`, {
        headers: {
          'x-rapidapi-host': process.env.RAPID_API_HOST,
          'x-rapidapi-key': process.env.RAPID_API_KEY,
        },
      });
      const { api: { fixtures, results } } = await response.json();
      const matchesByCountry = fixtures.reduce((acc, fixture) => {
        const {
          league: { country, name: leagueName, logo: leagueLogo, flag: leagueFlag },
          event_date,
          venue,
          status,
          referee,
          statusShort,
          round,
          homeTeam,
          awayTeam,
          score,
        } = fixture;
        const matchDetails = { event_date, status, venue, statusShort, round, referee, homeTeam, awayTeam, score };
        acc[country] = acc[country] || { name: country, logo: leagueFlag, leagues: {} };
        acc[country].leagues[leagueName] = acc[country].leagues[leagueName] || { name: leagueName, logo: leagueLogo, fixtures: [] };
        acc[country].leagues[leagueName].fixtures.push(matchDetails);
        return acc;
      }, {});
      return { results, fixtures: matchesByCountry };
    } catch (error) {
      console.log('Erreur lors de la récupération des données :', error);
      throw error;
    }
  }
  
async function extractCountries(data) {
    const countries = Object.entries(data.fixtures || {}).reduce((acc, [countryName, country]) => {
      acc[countryName] = {
        name: countryName,
        logo: country.logo || null, 
        totalMatches: country.leagues ? Object.values(country.leagues).flatMap(league => league.fixtures).length : 0,
      };
      return acc;
    }, {});
    return Object.values(countries);
  }

async function extractLeaguesByCountry(data, countryName) {
    const countryData = data.fixtures?.[countryName];
    if (!countryData) {
      return `Country ${countryName} not found in the data.`;
    }
    const leagues = Object.keys(countryData.leagues).map(leagueName => {
      const league = countryData.leagues[leagueName];
      const totalMatches = league.fixtures?.length || 0; 
      return {
        name: league.name,
        logo: league.logo,
        totalMatches,
      };
    });  
    return leagues;
  }

  async function extractMatchesByLeague(data, leagueName,logo) {
    for (const countryName in data.fixtures) {
        const country = data.fixtures[countryName];
        console.log("country",country)
        if (country.leagues[leagueName] && country.leagues[leagueName].logo === logo) {
            const league = country.leagues[leagueName];
            return league.fixtures;
        }
    }
    return `League ${leagueName} not found in the data.`;
}

async function getAvailableMatchDays() {
  try {
    const files = await fs.readdir(directoryData);
    const today = moment().startOf('day');
    const availableDays = files.reduce((acc, file) => {
      const date = file.split('.')[0];
      const matchDate = moment(date, 'YYYY-MM-DD');
      if (matchDate.isSameOrAfter(today, 'day')) {
        let formattedDate;
        const diffDays = matchDate.diff(today, 'days');
        switch (diffDays) {
          case 0:
            formattedDate = "Aujourd'hui";
            break;
          case 1:
            formattedDate = "Demain";
            break;
          default:
            if (diffDays < 7) {
              formattedDate = matchDate.format('dddd');
            } else {
              formattedDate = matchDate.format('dddd, D MMMM YYYY');
            }
            break;
        }
        acc[formattedDate] = date;
      }
      return acc;
    }, {});
    return availableDays;
  } catch (error) {
    console.log('Error fetching available match days:', error);
  }
}

async function fetchAndSaveMatches() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const dates = Array.from({ length: 6 }).map((_, i) => new Date(yesterday).setDate(yesterday.getDate() + i)).map(date => new Date(date).toISOString().split('T')[0]);
    try {
      await fs.mkdir(directoryData, { recursive: true });
      const files = await fs.readdir(directoryData);
      await Promise.all(files.map(file => fs.unlink(path.join(directoryData, file))));
      for (const date of dates) {
        const filename = path.join(directoryData, `${date}.json`);
        const matches = await getMatchesPerDay(date);
        await fs.writeFile(filename, JSON.stringify(matches, null, 2));
        console.log(`Saved matches for ${date} to file.`);
      }
    } catch (error) {
      console.log('Error fetching and saving matches:', error);
    }
  }

  async function loadFixtureData(date) {
    const filePath = path.join(directoryData, `${date}.json`);
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log(`Error loading fixture data for date ${date}:`, error);
    }
}

function findFixtureByTeamId(fixtureData, teamId) {
  for (const countryKey in fixtureData.fixtures) {
    const leagues = fixtureData.fixtures[countryKey].leagues;
    for (const leagueKey in leagues) {
      const fixtures = leagues[leagueKey].fixtures;
      const fixture = fixtures.find(fix => fix.homeTeam.team_id === teamId);
      if (fixture) {
        return fixture;
      }
    }
  }
  return null;
}
  
  
module.exports = {
    getMatchesPerDay,
    extractCountries,
    extractLeaguesByCountry,
    extractMatchesByLeague,
    fetchAndSaveMatches,
    getAvailableMatchDays,
    loadFixtureData,
    findFixtureByTeamId
}