const fs = require('fs');
const { getStoragePath } = require('../utils');

module.exports = (req, res) => {
  const { modelPath } = req.query;
  const filepath = getStoragePath(modelPath.split('/').pop());
  res.status(200);
  fs.unlinkSync(filepath);
  res.json();
};
