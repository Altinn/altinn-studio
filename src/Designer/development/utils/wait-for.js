const { get } = require('http');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isUp = (url) =>
  new Promise((resolve) => {
    const req = get(url, (res) => {
      res.resume(); // discard the body so the socket is freed
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });

/**
 * Polls `url` until it answers 200. The first check runs immediately, so an already running stack
 * does not cost a full poll interval.
 */
module.exports = async (url, givenAttempts = 10) => {
  for (let attempt = 1; attempt <= givenAttempts; attempt++) {
    if (await isUp(url)) {
      console.log(url, ' is up!');
      return;
    }
    console.log('Waiting for:', url);
    if (attempt < givenAttempts) {
      await delay(1000);
    }
  }
  throw new Error(`Giving up waiting for: ${url}`);
};
