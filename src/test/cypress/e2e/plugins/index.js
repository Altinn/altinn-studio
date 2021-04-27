module.exports = (on, config) => {
  switch (config.env.environment) {
    case 'local':
      config.baseUrl = config.env.localTest;
      break;
    case 'at21':
      config.baseUrl = `https://${config.env.at21}`;
      break;
    case 'at22':
      config.baseUrl = `https://${config.env.at22}`;
      break;
  }

  return config;
};
