const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('node:path');
const { defineReactCompilerLoaderOption, reactCompilerLoader } = require('react-compiler-webpack');
const repoNodeModules = path.resolve(__dirname, '../../..', 'node_modules');

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
      '@app/form-component$': path.resolve(__dirname, '../../../libs/form-component/src/index.ts'),
      '@app/form-component': path.resolve(__dirname, '../../../libs/form-component/src'),
      '@app/language$': path.resolve(__dirname, '../../../libs/app-language/src/index.ts'),
      '@app/language': path.resolve(__dirname, '../../../libs/app-language/src'),
      // Workspace packages imported from outside this directory (i.e. libs) should resolve
      // the same React instance as the app frontend bundle and Jest runtime.
      react: path.join(repoNodeModules, 'react'),
      'react-dom': path.join(repoNodeModules, 'react-dom'),
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
