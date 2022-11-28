const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const MonacoPlugin = require('monaco-editor-webpack-plugin');
const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, process.env.npm_package_name, 'index.tsx'),
  output: {
    path: path.resolve(__dirname, 'dist', process.env.npm_package_name),
    filename: `${process.env.npm_package_name}.js`,
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.svg'],
    alias: {
      'app-shared': path.resolve(__dirname, 'packages/shared/src'),
      '@altinn/schema-editor': path.resolve(__dirname, 'packages/schema-editor/src'),
      '@altinn/schema-model': path.resolve(__dirname, 'packages/schema-model/src'),
      '@altinn/ux-editor': path.resolve(__dirname, 'packages/ux-editor/src'),
    },
    fallback: {
      'react/jsx-runtime': 'react/jsx-runtime.js',
      'react/jsx-dev-runtime': 'react/jsx-dev-runtime.js',
    },
  },
  module: {
    rules: [
      {
        test: /\.svg$/i,
        enforce: 'pre',
        issuer: /\.[jt]sx?$/,
        use: ['@svgr/webpack'],
      },
      {
        test: /\.module\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: { modules: true },
          },
        ],
      },
      {
        test: /(?<!\.module)\.css$/,
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
      filename: `${process.env.npm_package_name}.css`,
    }),
    new MonacoPlugin({
      languages: ['typescript', 'javascript', 'csharp'],
    }),
  ],
};
