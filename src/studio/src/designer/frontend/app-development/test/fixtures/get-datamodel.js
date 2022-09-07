const fs = require('fs');
const path = require('path');

module.exports = (filename) => {
  const filepath = path.resolve(__dirname, 'storage', filename);
  return fs.readFileSync(filepath, 'utf-8');
};
