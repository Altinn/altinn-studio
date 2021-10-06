const path = require('path');
const fs = require('fs-extra');

function getConfigurationByFile(pathToFile, file) {
  const pathToJsonDataFile = path.resolve(pathToFile, `${file}.json`);
  return fs.readJson(pathToJsonDataFile);
}

module.exports = (on, config) => {
  console.log(config);
  if (config.env.component === 'appfrontend') {
    var pathToConfig = 'e2e/config/app';
    switch (config.env.environment) {
      case 'local':
        return getConfigurationByFile(pathToConfig, 'local');
      case 'at21':
        return getConfigurationByFile(pathToConfig, 'at21');
      case 'at22':
        return getConfigurationByFile(pathToConfig, 'at22');
      case 'tt02':
        return getConfigurationByFile(pathToConfig, 'tt02');
    }
  }

  if (config.env.component === 'studio') {
    var pathToConfig = 'e2e/config/studio';
    switch (config.env.environment) {
      case 'local':
        return getConfigurationByFile(pathToConfig, 'local');
      case 'dev':
        return getConfigurationByFile(pathToConfig, 'dev');
      case 'staging':
        return getConfigurationByFile(pathToConfig, 'staging');
      case 'prod':
        return getConfigurationByFile(pathToConfig, 'prod');
    }
  }

  return config;
};
