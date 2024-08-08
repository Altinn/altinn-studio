const { request } = require('http');

/**
 * @see http://studio.localhost/repos/api/swagger
 *
 * @param options
 * @returns {Promise<unknown>}
 */
module.exports = (options) =>
  new Promise(function (resolve, reject) {
    const req = request(
      {
        host: 'localhost',
        port: 3000,
        path: options.path,
        auth: [options.user, options.pass].join(':'),
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (response) => {
        const data = [];
        response.on('data', (chunk) => data.push(chunk));
        response.on('end', () => {
          console.log(options.method, options.path, response.statusCode, response.statusMessage);
          if (data.length) {
            console.log({ data });
            resolve(JSON.parse(data.join()));
          } else {
            resolve();
          }
        });
      },
    );
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end(() => {});
  });
