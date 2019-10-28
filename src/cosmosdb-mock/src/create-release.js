const http = require('http');

module.exports = {
  createRelease: function (databaseName, collectionName, release) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        ...release
      });

      const options = {
        port: 8081,
        host: 'localhost',
        method: 'POST',
        path: `/dbs/${databaseName}/colls/${collectionName}/docs`,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      };

      const request = http.request(options, (res) => {
        console.log(`Create collection statuscode: ${res.statusCode}`);
        res.on('data',(d) => {
          process.stdout.write(d);
        });
      });

      request.on('error', reject);
      request.write(data);
      request.end();
      resolve();
    });
  }
};
