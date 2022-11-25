const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('node:path');

module.exports = {
  entry: './src/index.tsx',
  output: {
    filename: 'altinn-app-frontend.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'],
    alias: {
      'altinn-shared': path.resolve(__dirname, './../shared/src'),
      src: path.resolve(__dirname, './src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.jsx?/,
        include: [
          path.resolve(__dirname, './src'),
          path.resolve(__dirname, '../node_modules/ajv'),
          path.resolve(__dirname, '../node_modules/ajv-formats'),
        ],
        use: {
          loader: 'babel-loader',
        },
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
      {
        test: /\.png$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: 'altinn-app-frontend.css',
    }),
    new NodePolyfillPlugin({
      excludeAliases: ['console'],
    }),
  ],
};
