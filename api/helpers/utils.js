function getRandomDelay(minDelay, maxDelay) {
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  }

  module.exports = {getRandomDelay};
