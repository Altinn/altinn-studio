const { get } = require('http');
module.exports = (url, givenAttempts = 10) =>
  new Promise(function (resolve, reject) {
    let attempts = 0;

    const checkAttempts = () => {
      attempts++;
      if (attempts > givenAttempts) {
        clearInterval(intervalId);
        console.log('Giving up: ', url);
        reject('Giving up this');
      } else {
        console.log('Waiting for:', url);
      }
    };

    const intervalId = setInterval(function () {
      const req = get(url, (res) => {
        if (res.statusCode === 200) {
          console.log(url, ' is up!');
          clearInterval(intervalId);
          resolve();
        } else {
          checkAttempts();
        }
      });

      req.on('error', (err) => {
        if (err.code !== 'ECONNREFUSED') {
          console.error(err);
          reject();
        } else {
          checkAttempts();
        }
      });
    }, 1000);
  });
