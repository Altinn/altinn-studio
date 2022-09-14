const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

module.exports = {
  entry: './index.tsx',
  output: {
    path: path.resolve(__dirname, '../dist/dashboard'),
    filename: 'dashboard.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'],
    alias: {
      'app-shared': path.resolve(__dirname, '../shared/'),
      app: path.resolve(__dirname, './app/'),
      features: path.resolve(__dirname, './features/'),
      common: path.resolve(__dirname, './common/'),
      services: path.resolve(__dirname, './services/'),
      '@altinn/schema-editor': path.resolve(
        __dirname,
        '../packages/schema-editor/src/',
      ),
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
      {
        test: /\.png$/,
        type: 'asset/resource'
      }
    ],
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: 'dashboard.css',
    }),
  ],
};
