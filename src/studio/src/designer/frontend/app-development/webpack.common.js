const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const MonacoPlugin = require('monaco-editor-webpack-plugin');
const path = require('path');

module.exports = {
  entry: './index.tsx',
  output: {
    path: path.resolve(__dirname, '../dist/app-development'),
    filename: 'app-development.js',
  },
  optimization: {
    chunkIds: 'natural',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'],
    alias: {
      'app-shared': path.resolve(__dirname, '../shared/'),
      '@altinn/schema-editor': path.resolve(
        __dirname,
        '../packages/schema-editor/src/',
      ),
      utils: path.resolve(__dirname, 'utils/'),
      services: path.resolve(__dirname, 'src/services/'),
      common: path.resolve(__dirname, 'common/'),
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
    new MiniCssExtractPlugin({
      filename: 'app-development.css',
    }),
    new MonacoPlugin({
      languages: ['typescript', 'javascript', 'csharp'],
    }),
  ],
};
