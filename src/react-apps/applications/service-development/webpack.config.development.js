const HtmlWebPackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CheckerPlugin = require('awesome-typescript-loader').CheckerPlugin
//const MonacoPlugin = require('monaco-editor-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'eval',
  entry: {
    "service-development": "./src/index.tsx",
    "editor.worker": 'monaco-editor/esm/vs/editor/editor.worker.js',
    "json.worker": 'monaco-editor/esm/vs/language/json/json.worker.js',
    "css.worker": 'monaco-editor/esm/vs/language/css/css.worker.js',
    "html.worker": 'monaco-editor/esm/vs/language/html/html.worker.js',
    "ts.worker": 'monaco-editor/esm/vs/language/typescript/ts.worker.js',
  },
  output: {
    globalObject: 'self',
    filename: "[name].js",
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".css", ".scss"],
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
          "css-loader",
          "sass-loader"
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
            options: {
              url: false
            }
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
        loader: "awesome-typescript-loader",
      },
      {
        enforce: "pre",
        test: /\.js$/,
        loader: "source-map-loader",
      }
    ],
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: './public/index.html',
      filename: 'index.html'
    }),
    new MiniCssExtractPlugin({
      filename: "service-development.css",
    }),
    new CheckerPlugin(),
    // new MonacoPlugin({
    //   output: path.join('..','js', 'react')
    // }),
  ],
  devServer: {
    historyApiFallback: true,
  }
}