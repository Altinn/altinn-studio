const { execSync } = require('child_process');

module.exports = (name, timeout = 60000) =>
  new Promise(function (resolve, reject) {
    const intervalId = setInterval(function () {
      const buffer = execSync(`docker inspect --format="{{json .State.Health.Status}}" ${name}`);

      const status = JSON.parse(buffer.toString());

      if (status === `healthy`) {
        console.log(name, ' is healthy!');
        clearInterval(intervalId);
        resolve();
      } else {
        setTimeout(() => {
          clearInterval(intervalId);
          console.log('Giving up waiting for healthy of: ', name);
          reject('Giving up this');
        }, timeout);
      }
    }, 1000);
  });
