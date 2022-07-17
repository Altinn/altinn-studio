const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const ReactRefreshTypeScript = require('react-refresh-typescript');

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
            options: {
              getCustomTransformers: () => ({
                before: [ReactRefreshTypeScript()],
              }),
              transpileOnly: true,
            },
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
  plugins: [
    ...common.plugins,
    new ForkTsCheckerNotifierWebpackPlugin(),
    new ReactRefreshWebpackPlugin(),
  ],
  devServer: {
    historyApiFallback: true,
    allowedHosts: 'all',
    hot: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },
};
