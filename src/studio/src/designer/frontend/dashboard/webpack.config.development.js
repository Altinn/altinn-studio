const HtmlWebPackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'eval',
  entry: [
    "core-js/modules/es.object.assign",
    "core-js/modules/es.array.find-index",
    "core-js/modules/es.array.find",
    "./index.tsx"
  ],
  output: {
    path: path.resolve(__dirname, "../dist/dashboard"),
    filename: "dashboard.js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".css", ".scss"],
    alias: {
      "app-shared": path.resolve(__dirname, "../shared/"),
      "@altinn/schema-editor": path.resolve(__dirname, "../packages/schema-editor/src/"),
    }
  },
  performance: {
    hints: 'warning',
  },
  module: {
    rules: [{
      test: /\.jsx?/,
      exclude: /node_modules/,
      use: {
        loader: "babel-loader",
      }
    },
    {
      test: /\.html$/,
      use: [{
        loader: "html-loader",
        options: {
          minimize: true
        }
      }]
    },
    {
      test: /\.scss$/,
      use: [
        "style-loader",
        "css-loader"
      ]
    },
    {
      test: /\.svg$/,
      use: {
        loader: "svg-inline-loader",
      }
    },
    {
      test: /\.css$/,
      use: [{
        loader: MiniCssExtractPlugin.loader,
      },
      {
        loader: "css-loader",
        options: {
          url: false
        }
      },
      ]
    },
    {
      test: /\.tsx?/,
      loader: "ts-loader",
    },
    {
      enforce: "pre",
      test: /\.js$/,
      loader: "source-map-loader",
    }
    ],
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      eslint: {
        files: './{actions,config,features,reducers,sagas,sharedResources,store,types,utils}/**/*.{ts,tsx,js,jsx}'
      }
    }),
    new ForkTsCheckerNotifierWebpackPlugin({ title: 'TypeScript', excludeWarnings: false }),
    new HtmlWebPackPlugin({
      template: './public/index.html',
      filename: 'index.html'
    }),
    new MiniCssExtractPlugin({
      filename: "dashboard.css",
    }),
  ],
  devServer: {
    historyApiFallback: true,
  }
}
