module.exports = (on, config) => {
  switch (config.env.environment) {
    case 'local':
      config.baseUrl = config.env.localTest;
      config.env.userFullName = 'Ola Nordmann';
      config.defaultCommandTimeout = 15000;
      config.requestTimeout = 15000;
      break;
    case 'at21':
      config.baseUrl = `https://${config.env.at21}`;
      config.env.userFullName = 'RIBE AMUND';
      break;
    case 'at22':
      config.baseUrl = `https://${config.env.at22}`;
      config.env.userFullName = 'ÅSLAND DAG';
      break;
    case 'tt02':
      config.baseUrl = `https://${config.env.tt02}`;
      config.env.userFullName = 'FAGERLAND MAIKEN';
      break;
  }

  return config;
};
