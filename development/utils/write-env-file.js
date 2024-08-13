const path = require('path');
const fs = require('fs');
const os = require('os');

module.exports = (envData) => {
  const newEnv = [];
  const dotenvLocations = path.resolve(__dirname, '..', '..', '.env');
  const { O_RDWR, O_CREAT } = fs.constants;
  const fd = fs.openSync(dotenvLocations, O_RDWR | O_CREAT, 0o600);
  Object.keys(envData).forEach((key) => newEnv.push([key, envData[key]].join('=')));
  fs.writeFileSync(fd, newEnv.join(os.EOL), 'utf-8');
  fs.closeSync(fd);
  console.log('Ensuring .env variables at:', dotenvLocations);
};
