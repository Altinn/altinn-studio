const path = require('path');
const fs = require('fs');

const storageDir = path.resolve(__dirname, '..', 'storage');

module.exports = {
  ensureStorageDir: () => fs.existsSync(storageDir) || fs.mkdirSync(storageDir),
  getStoragePath: (filename) => path.resolve(storageDir, filename),
  getTemplatePath: (filename) => path.resolve(__dirname, 'templates', filename),
  getLanguagePath: (filename) => path.resolve(__dirname, '..', '..', '..', 'backend', 'Languages', 'ini', filename),
};
