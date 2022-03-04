const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const commonConfig = require('./webpack.common');

module.exports = {
  ...commonConfig,
  mode: 'development',
  devtool: 'eval',
  performance: {
    hints: 'warning',
  },
  module: {
    rules: [
      ...commonConfig.module.rules,
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
            options: {
              minimize: true,
            },
          },
        ],
      },
      {
        test: /\.svg$/,
        use: {
          loader: 'svg-inline-loader',
        },
      },
      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader',
      },
    ],
  },
  plugins: [
    ...commonConfig.plugins,
    new ForkTsCheckerWebpackPlugin({
      eslint: {
        files:
          './{actions,config,features,reducers,sagas,sharedResources,store,types,utils}/**/*.{ts,tsx,js,jsx}',
      },
    }),
    new ForkTsCheckerNotifierWebpackPlugin({
      title: 'TypeScript',
      excludeWarnings: false,
    }),
  ],
  devServer: {
    historyApiFallback: true,
  },
};
