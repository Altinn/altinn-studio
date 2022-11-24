const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const commonConfig = require('./webpack.common');
const setupMiddlewares = require('./mockend/src');
const devServerConfig = require('./mockend/config.json');

module.exports = {
  ...commonConfig,
  mode: 'development',
  devtool: 'inline-source-map',
  performance: {
    hints: 'warning',
  },
  optimization: {
    chunkIds: 'natural',
  },
  module: {
    rules: [
      ...commonConfig.module.rules,
      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader',
      },
      {
        test: /\.([jt]sx?)?$/,
        use: 'swc-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [...commonConfig.plugins, new ForkTsCheckerNotifierWebpackPlugin()],
  devServer: {
    setupMiddlewares,
    hot: true,
    allowedHosts: 'all',
    port:
      process.env.npm_package_name === 'dashboard'
        ? devServerConfig.DASHBOARD_PORT
        : devServerConfig.APP_DEVELOPMENT_PORT,
    historyApiFallback: true,
    client: {
      overlay: {
        errors: false,
        warnings: false,
      },
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      // prettier-ignore
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
  },
};
