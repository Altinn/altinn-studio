const dns = require('dns');

const options = {
  all: true,
};

module.exports = (hostname) =>
  new Promise((resolve, reject) => {
    dns.lookup(hostname, options, (err, addresses) => {
      if (addresses !== undefined) {
        console.log(`DNS entry for ${hostname} is correct.`);
        resolve(true);
      } else {
        reject(
          `DNS entry for ${hostname} does not resolve to 127.0.0.1. Check that it is set in  /etc/hosts`,
        );
      }
    });
  });
