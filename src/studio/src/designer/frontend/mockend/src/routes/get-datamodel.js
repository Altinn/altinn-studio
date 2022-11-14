const fs = require('fs');
const { getStoragePath } = require('../utils');

module.exports = (filename) => {
  const filepath = getStoragePath(filename);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
};
