const path = require('path');
const fs = require('fs-extra');

function getConfigurationByFile(file) {
  const pathToJsonDataFile = path.resolve('e2e', 'config', `${file}.json`);
  return fs.readJson(pathToJsonDataFile);
}

module.exports = (on, config) => {
  switch (config.env.environment) {
    case 'local-app':
      return getConfigurationByFile('local-app');
    case 'at21':
      return getConfigurationByFile('at21');
    case 'at22':
      return getConfigurationByFile('at22');
    case 'tt02':
      return getConfigurationByFile('tt02');
  }

  return config;
};
