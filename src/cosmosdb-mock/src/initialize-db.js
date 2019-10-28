const http = require('http');

module.exports = {
  createDatabase: function (databaseName) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        id: databaseName,
      });

      const options = {
        port: 8081,
        host: 'localhost',
        method: 'POST',
        path: '/dbs',
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

