const path = require('path');

module.exports = {
  getStoragePath: (filename) => path.resolve(__dirname, '..', 'storage', filename),
  getTemplatePath: (filename) => path.resolve(__dirname, 'templates', filename),
  getLanguagePath: (filename) => path.resolve(__dirname, '..', '..', '..', 'backend', 'Languages', 'ini', filename),
};
