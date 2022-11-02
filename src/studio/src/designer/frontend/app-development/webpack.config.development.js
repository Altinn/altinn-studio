const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const commonConfig = require('./webpack.common');
const setupMiddlewares = require('../mockend/src');
module.exports = {
  ...commonConfig,
  mode: 'development',
  devtool: 'inline-source-map',
  performance: {
    hints: 'warning',
  },
  module: {
    rules: [
      ...commonConfig.module.rules,
      {
        test: /\.svg$/,
        use: {
          loader: 'svg-inline-loader',
        },
        exclude: /schema-editor/,
      },
      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader',
      },
      {
        test: /\.tsx?/,
        use: [
          {
            loader: 'ts-loader',
            options: { transpileOnly: true },
          },
        ],
      },
    ],
  },
  plugins: [...commonConfig.plugins, new ForkTsCheckerNotifierWebpackPlugin()],
  devServer: {
    setupMiddlewares,
    hot: true,
    port: 2004,
    historyApiFallback: true,
    allowedHosts: 'all',
    client: {
      overlay: {
        errors: false,
        warnings: false,
      },
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers':
        'X-Requested-With, content-type, Authorization',
    },
  },
};
