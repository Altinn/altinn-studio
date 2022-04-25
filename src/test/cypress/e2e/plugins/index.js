const path = require('path');
const fs = require('fs-extra');

function getConfigurationByFile(pathToFile, file) {
  const pathToJsonDataFile = path.resolve(pathToFile, `${file}.json`);
  return fs.readJson(pathToJsonDataFile);
}

module.exports = (on, config) => {
  var pathToConfig = 'e2e/config';
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

  return config;
};
