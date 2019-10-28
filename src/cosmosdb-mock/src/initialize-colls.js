const http = require('http');

module.exports = {
  createCollection: function (databaseName, collectionName) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        id: collectionName,
      });

      const options = {
        port: 8081,
        host: 'localhost',
        method: 'POST',
        path: `/dbs/${databaseName}/colls`,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      };

      const request = http.request(options);

      request.on('error', reject);
      request.write(data);
      request.end();
      resolve();
    });
  }
};
