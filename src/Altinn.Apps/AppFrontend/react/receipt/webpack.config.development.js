const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');

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
  plugins: [...commonConfig.plugins, new ForkTsCheckerNotifierWebpackPlugin()],
  devServer: {
    historyApiFallback: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },
};
