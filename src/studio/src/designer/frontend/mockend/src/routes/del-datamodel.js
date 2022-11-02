const fs = require('fs');
const { getStoragePath } = require('../utils');

module.exports = (modelpath) => {
  const filepath = getStoragePath(modelpath.split('/').pop());
  return fs.unlinkSync(filepath);
};
