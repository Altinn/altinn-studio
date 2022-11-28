const path = require('path');
const fs = require('fs');

const storageDir = path.resolve(__dirname, '..', 'storage');

module.exports = {
  projectRootDir: () => path.resolve(__dirname, '..', '..', '..'),
  ensureStorageDir: () => fs.existsSync(storageDir) || fs.mkdirSync(storageDir),
  getStoragePath: (filename) => path.resolve(storageDir, filename),
  getTemplatePath: (filename) => path.resolve(__dirname, 'templates', filename),
};
