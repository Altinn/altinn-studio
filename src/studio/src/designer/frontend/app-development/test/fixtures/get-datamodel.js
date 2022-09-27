const fs = require('fs');
const path = require('path');

module.exports = (filename) => {
  const filepath = path.resolve(__dirname, 'storage', filename);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
};
