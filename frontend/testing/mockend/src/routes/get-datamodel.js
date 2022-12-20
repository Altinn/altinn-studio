const fs = require('fs');
const { getStoragePath } = require('../utils');

module.exports = (req, res) => {
  const filepath = getStoragePath(req.params.filename);
  const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  res.json(content);
};
