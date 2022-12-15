const commonConfig = require('./webpack.common');
const setupMiddlewares = require('./testing/mockend/src');
const devServerPorts = require('./testing/mockend/ports.json');

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
  plugins: [...commonConfig.plugins],
  devServer: {
    setupMiddlewares,
    hot: true,
    allowedHosts: 'all',
    port: devServerPorts[process.env.npm_package_name],
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
