/* eslint-disable no-console */
const env = require('dotenv').config().parsed;
const path = require('path');

const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { EsbuildPlugin } = require('esbuild-loader');

const common = require('./webpack.common');

const enableNotifier = !('WEBPACK_SILENT' in env) || env.WEBPACK_SILENT === 'false';
const plugins = [...common.plugins, new ReactRefreshWebpackPlugin()];

if (enableNotifier) {
  plugins.push(new ForkTsCheckerNotifierWebpackPlugin());
}

const enableSourceMaps = !('WEBPACK_SOURCE_MAPS' in env) || env.WEBPACK_SOURCE_MAPS === 'true';
const enableMinify = !('WEBPACK_MINIFY' in env) || env.WEBPACK_MINIFY === 'true';

console.log('Starting Altinn 3 app-frontend-react development server');
console.log('See template.env for available environment variables and how to set them');
console.log('');
console.log('Current settings:');
console.log('WEBPACK_SILENT =', !enableNotifier);
console.log('WEBPACK_SOURCE_MAPS =', enableSourceMaps);
console.log('WEBPACK_MINIFY =', enableMinify);
console.log('====================================');

module.exports = {
  ...common,
  mode: 'development',
  devtool: enableSourceMaps ? 'inline-source-map' : false,
  performance: {
    // We should fix this here: https://github.com/Altinn/app-frontend-react/issues/1597
    hints: false,
  },
  optimization: {
    minimizer: enableMinify
      ? [
          new EsbuildPlugin({
            target: 'es2020',
            css: true,
          }),
        ]
      : [],
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        loader: 'esbuild-loader',
        options: {
          target: 'es2020',
        },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.png$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins,
  devServer: {
    historyApiFallback: true,
    allowedHosts: 'all',
    hot: true,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    static: [
      {
        directory: path.join(__dirname, 'schemas'),
        publicPath: '/schemas',
      },
    ],
  },
};
