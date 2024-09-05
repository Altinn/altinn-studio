const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const commonConfig = require('./webpack.common');

module.exports = {
  ...commonConfig,
  mode: 'production',
  devtool: 'source-map',
  performance: {
    hints: false,
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],
    splitChunks: {
      chunks: 'all',
      maxSize: 244000,
    },
  },
  module: {
    rules: [
      ...commonConfig.module.rules,
      {
        test: /\.tsx?/,
        use: 'swc-loader',
        exclude: /node_modules/,
      },
    ],
  },
};
