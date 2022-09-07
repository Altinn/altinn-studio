const path = require('path');
const fs = require('fs');
module.exports = (modelpath) => {
  const filename = modelpath.split('/').pop();
  const filepath = path.resolve(__dirname, 'storage', filename);
  return fs.unlinkSync(filepath);
};
