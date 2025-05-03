const fetch = require('node-fetch');
const fs = require('fs/promises');
const path = require('path');
const moment = require('moment');
moment.locale('fr');
const directoryData = 'data-football';

async function getMatchesPerDay(date) {
    try {
      const response = await fetch(`https://${process.env.RAPID_API_HOST}/v3/fixtures?date=${date}`, {
        headers: {
          'x-rapidapi-host': process.env.RAPID_API_HOST,
          'x-rapidapi-key': process.env.RAPID_API_KEY,
        },
      });
      const data = await response.json();
      
      if (data.errors && data.errors.length > 0) {
        console.log("Erreur API:", data.errors);
        throw new Error(data.errors);
      }
      
      // Transformer les données v3 en format v2
      const fixturesV2Format = data.response.map(item => ({
        fixture_id: item.fixture.id,
        league_id: item.league.id,
        league: {
          name: item.league.name,
          country: item.league.country,
          logo: item.league.logo,
          flag: item.league.flag
        },
        event_date: item.fixture.date,
        event_timestamp: item.fixture.timestamp,
        firstHalfStart: null,
        secondHalfStart: null,
        round: item.league.round,
        status: item.fixture.status.long,
        statusShort: item.fixture.status.short,
        elapsed: item.fixture.status.elapsed,
        venue: item.fixture.venue?.name || '',
        referee: item.fixture.referee,
        homeTeam: {
          team_id: item.teams.home.id,
          team_name: item.teams.home.name,
          logo: item.teams.home.logo
        },
        awayTeam: {
          team_id: item.teams.away.id,
          team_name: item.teams.away.name,
          logo: item.teams.away.logo
        },
        goalsHomeTeam: item.goals.home,
        goalsAwayTeam: item.goals.away,
        score: {
          halftime: item.score.halftime.home !== null ? `${item.score.halftime.home}-${item.score.halftime.away}` : null,
          fulltime: item.score.fulltime.home !== null ? `${item.score.fulltime.home}-${item.score.fulltime.away}` : null,
          extratime: item.score.extratime.home !== null ? `${item.score.extratime.home}-${item.score.extratime.away}` : null,
          penalty: item.score.penalty.home !== null ? `${item.score.penalty.home}-${item.score.penalty.away}` : null
        }
      }));
      
      // Organiser par pays et ligues comme dans v2
      const matchesByCountry = fixturesV2Format.reduce((acc, fixture) => {
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
      
      // Retourner dans le format exact de v2
      return { 
        api: {
          results: data.results,
          fixtures: matchesByCountry
        }
      };
    } catch (error) {
      console.log('Erreur lors de la récupération des données :', error);
      throw error;
    }
}

async function extractCountries(data) {
    // Vérifier si le format est l'ancien ou le nouveau
    const fixtures = data.api ? data.api.fixtures : data.fixtures;
    
    if (!fixtures) {
      console.log('No fixtures found in data:', data);
      return [];
    }
    
    const countries = Object.entries(fixtures).reduce((acc, [countryName, country]) => {
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
    // Vérifier si le format est l'ancien ou le nouveau
    const fixtures = data.api ? data.api.fixtures : data.fixtures;
    
    if (!fixtures) {
      console.log('No fixtures found in data:', data);
      return `Data structure error`;
    }
    
    const countryData = fixtures[countryName];
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

async function extractMatchesByLeague(data, leagueName, logo) {
    // Vérifier si le format est l'ancien ou le nouveau
    const fixtures = data.api ? data.api.fixtures : data.fixtures;
    
    if (!fixtures) {
      console.log('No fixtures found in data:', data);
      return `Data structure error`;
    }
    
    for (const countryName in fixtures) {
        const country = fixtures[countryName];
        console.log("country", country);
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
    return {};
  }
}

async function fetchAndSaveMatches() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const dates = Array.from({ length: 6 }).map((_, i) => {
      const newDate = new Date(yesterday);
      newDate.setDate(yesterday.getDate() + i);
      return newDate.toISOString().split('T')[0];
    });
    
    try {
      await fs.mkdir(directoryData, { recursive: true });
      const files = await fs.readdir(directoryData);
      // Ne supprimer que les fichiers qui correspondent aux dates qu'on va récupérer
      const filesToDelete = files.filter(file => dates.includes(file.split('.')[0]));
      await Promise.all(filesToDelete.map(file => fs.unlink(path.join(directoryData, file))));
      
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
        return null;
    }
}

function findFixtureByTeamId(fixtureData, teamId) {
  // Vérifier si le format est l'ancien ou le nouveau
  const fixtures = fixtureData.api ? fixtureData.api.fixtures : fixtureData.fixtures;
  
  if (!fixtures) return null;
  
  for (const countryKey in fixtures) {
    const leagues = fixtures[countryKey].leagues;
    for (const leagueKey in leagues) {
      const leagueFixtures = leagues[leagueKey].fixtures;
      const fixture = leagueFixtures.find(fix => fix.homeTeam.team_id === teamId);
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