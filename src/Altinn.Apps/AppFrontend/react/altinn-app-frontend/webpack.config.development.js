const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');

const common = require('./webpack.common');

module.exports = {
  ...common,
  mode: 'development',
  devtool: 'inline-source-map',
  performance: {
    hints: 'warning',
  },
  module: {
    rules: [
      ...common.module.rules,
      {
        test: /\.tsx?/,
        use: [
          {
            loader: 'ts-loader',
            options: { transpileOnly: true },
          },
        ],
      },
      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader',
      },
    ],
  },
  plugins: [...common.plugins, new ForkTsCheckerNotifierWebpackPlugin()],
  devServer: {
    historyApiFallback: true,
    allowedHosts: 'all',
  },
};
