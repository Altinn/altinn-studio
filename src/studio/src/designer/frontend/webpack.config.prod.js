const TerserPlugin = require('terser-webpack-plugin');
const commonConfig = require('./webpack.common');

module.exports = {
  ...commonConfig,
  mode: 'production',
  devtool: false,
  performance: {
    hints: false,
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  module: {
    rules: [
      ...commonConfig.module.rules,
      {
        test: /\.tsx?/,
        use: [
          {
            loader: 'ts-loader',
            options: { transpileOnly: false },
          },
        ],
      },
    ],
  },
};
