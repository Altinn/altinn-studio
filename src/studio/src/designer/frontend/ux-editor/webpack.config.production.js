const HtmlWebPackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'production',
  devtool: false,
  entry: [
    "core-js/modules/es.object.assign",
    "core-js/modules/es.array.find-index",
    "core-js/modules/es.array.find",
    "./index.tsx"
  ],
  output: {
    filename: "ui-editor.js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".css", ".scss"],
    alias: {
      "app-shared": path.resolve(__dirname, "../shared/")
    }
  },
  performance: {
    hints: false,
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin(),
    ],
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
        test: /\.scss$/,
        use: [
          "style-loader",
          "css-loader"
        ]
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
          }
        ]
      },
      {
        test: /\.tsx?/,
        loader: "ts-loader",
      }
    ],
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      async: false,
    }),
    new HtmlWebPackPlugin({
      template: './public/index.html',
      filename: 'index.html'
    }),
    new MiniCssExtractPlugin({
      filename: "ui-editor.css",
    }),
  ],
}
