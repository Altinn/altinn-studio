const commonConfig = require('./webpack.common');

module.exports = {
  ...commonConfig,
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    hot: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },
};
