const {
  DASHBOARD_BASENAME,
  APP_DEVELOPMENT_BASENAME,
} = require('../../../../packages/shared/src/constants');
module.exports = (req, res) => {
  const startUrl = {
    dashboard: DASHBOARD_BASENAME,
    'app-development': `${APP_DEVELOPMENT_BASENAME}/someorg/someapp`,
    'app-preview': '/preview/someorg/someapp',
  }[process.env.npm_package_name];
  res.redirect(startUrl);
};
