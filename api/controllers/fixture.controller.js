const FixtureService = require('../services/fixture.service');
const ResponseService = require('../services/response.service');

async function getCountries(req, res) {
    const { date } = req.query;
    try {
        const data = await FixtureService.loadFixtureData(date);
        const countries = await FixtureService.extractCountries(data);
        return ResponseService.success(res, { countries });
    } catch (error) {
        console.log('Error getting countries:', error);
        return ResponseService.internalServerError(res, { error: 'Error getting countries' });
    }
}

async function getLeaguesByCountry(req, res) {
    const { date, country } = req.query;
    try {
        const data = await FixtureService.loadFixtureData(date);
        const leagues = await FixtureService.extractLeaguesByCountry(data, country);
        return ResponseService.success(res, { leagues });
    } catch (error) {
        console.log('Error getting leagues by country:', error);
        return ResponseService.internalServerError(res, { error: 'Error getting leagues by country' });
    }
}

async function getMatchesByLeague(req, res) {
    const { date, league } = req.query;
    try {
        const data = await FixtureService.loadFixtureData(date);
        const matches = await FixtureService.extractMatchesByLeague(data, league);
        return ResponseService.success(res, { matches });
    } catch (error) {
        console.log('Error getting matches by league:', error);
        return ResponseService.internalServerError(res, { error: 'Error getting matches by league' });
    }
}

async function getAvailableMatchDays(req, res) {
    try {
        const availableDays = await FixtureService.getAvailableMatchDays();
        return ResponseService.success(res, { availableDays });
    } catch (error) {
        console.log('Error getting available match days:', error);
        return ResponseService.internalServerError(res, { error: 'Error getting available match days' });
    }
}

module.exports = {
    getCountries,
    getLeaguesByCountry,
    getMatchesByLeague,
    getAvailableMatchDays
};
