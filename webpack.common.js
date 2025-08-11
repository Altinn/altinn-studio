const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
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
      axios: require.resolve('./node_modules/axios/dist/browser/axios.cjs'),
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
    new NodePolyfillPlugin({
      excludeAliases: ['console'],
    }),
  ],
};
