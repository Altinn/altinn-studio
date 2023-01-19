const dns = require('dns');

const options = {
  all: true,
};

module.exports = (hostname) =>
  new Promise((resolve, reject) => {
    dns.lookup(hostname, options, (err, addresses) => resolve(addresses !== undefined));
  });
