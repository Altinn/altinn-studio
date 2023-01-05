const { get } = require("http");
module.exports = (url) =>
  new Promise(function (resolve, reject) {
    let attemts = 0;
    const intervalId = setInterval(function () {
      get(url, (res) => {
        if (res.statusCode === 200) {
          console.log(url, " is up!");
          clearInterval(intervalId);
          resolve();
        } else {
          console.log("Waiting for:", url);
        }
        if (attemts > 5) {
          clearInterval(intervalId);
          console.log("Giving up: ", url);
          reject("Giving up this");
        }
        attemts++;
      }).end();
    }, 1000);
  });
