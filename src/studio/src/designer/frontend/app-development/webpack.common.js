const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const MonacoPlugin = require('monaco-editor-webpack-plugin');
const path = require('path');

module.exports = {
  entry: [
    'core-js/modules/es.object.assign',
    'core-js/modules/es.array.find-index',
    'core-js/modules/es.array.find',
    './index.tsx',
  ],
  output: {
    path: path.resolve(__dirname, '../dist/app-development'),
    filename: 'app-development.js',
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
      output: path.join('../app-development', 'js', 'react'),
      languages: ['typescript', 'javascript', 'csharp'],
    }),
  ],
};
