const HtmlWebPackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CheckerPlugin = require('awesome-typescript-loader').CheckerPlugin;
const MonacoPlugin = require('monaco-editor-webpack-plugin');
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
    path: path.resolve(__dirname, '../dist/app-development'),
    filename: "app-development.js",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".css", ".scss"],
    alias: {
      "app-shared": path.resolve(__dirname, "../shared/"),
      //"ux-editor": path.resolve(__dirname, "../ux-editor/")
    }
  },
  performance: {
    hints: false,
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      }),
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
            options: {
              url: false
            }
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
        loader: "awesome-typescript-loader",
      }
    ],
  },
  plugins: [
    new CheckerPlugin(),
    new HtmlWebPackPlugin({
      template: './public/index.html',
      filename: 'index.html'
    }),
    new MiniCssExtractPlugin({
      filename: "app-development.css",
    }),
    new MonacoPlugin({
      output: path.join('../app-development', 'js', 'react'),
      languages: ['typescript', 'javascript', 'csharp'],
    }),
  ],
}
