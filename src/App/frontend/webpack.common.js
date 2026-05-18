const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('node:path');
const { defineReactCompilerLoaderOption, reactCompilerLoader } = require('react-compiler-webpack');

module.exports = {
  entry: './src/index.tsx',
  target: 'web',
  output: {
    filename: 'altinn-app-frontend.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
    alias: {
      src: path.resolve(__dirname, './src'),
      // Workspace packages imported from outside this directory (i.e. libs) would otherwise
      // resolve React from the repo root, which can load a different patch
      // version than the app frontend bundle.
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
  module: {
    rules: [
      {
        test: /\.[mc]?[jt]sx?$/i,
        exclude: /node_modules/,
        use: [
          {
            loader: 'esbuild-loader',
            options: {
              target: 'es2020',
            },
          },
          {
            loader: reactCompilerLoader,
            options: defineReactCompilerLoaderOption({}),
          },
        ],
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
              modules: {
                namedExport: false,
                auto: true,
                exportLocalsConvention: 'camel-case',
              },
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
  ],
};
