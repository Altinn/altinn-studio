const HtmlWebPackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

module.exports = {
  entry: [
    'core-js/modules/es.object.assign',
    'core-js/modules/es.array.find-index',
    'core-js/modules/es.array.find',
    './src/index.tsx',
  ],
  output: {
    filename: 'receipt.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'],
    alias: {
      'altinn-shared': path.resolve(__dirname, '../shared/src'),
      utils: path.resolve(__dirname, './src/utils'),
      features: path.resolve(__dirname, './src/features'),
      testConfig: path.resolve(__dirname, './testConfig'),
    },
  },
  module: {
    rules: [
      {
        test: /\.jsx?/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
            options: {
              url: false,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: './public/index.html',
      filename: 'index.html',
    }),
    new MiniCssExtractPlugin({
      filename: 'receipt.css',
    }),
  ],
};
