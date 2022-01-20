const HtmlWebPackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

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
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      }),
    ],
  },
  module: {
    rules: [
      ...commonConfig.module.rules,
      {
        test: /\.tsx?/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    ...commonConfig.plugins,
    new ForkTsCheckerWebpackPlugin({
      async: false,
    }),
    new HtmlWebPackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
    }),
  ],
};
