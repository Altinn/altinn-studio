const HtmlWebPackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const CheckerPlugin = require('awesome-typescript-loader').CheckerPlugin;
const webpack = require('webpack');
const GitRevisionPlugin = require('git-revision-webpack-plugin');
const gitRevisionPlugin = new GitRevisionPlugin();
const package = require('./package.json');

module.exports = {
  mode: 'production',
  devtool: false,
  entry: [
    "core-js/modules/es.object.assign",
    "core-js/modules/es.array.find-index",
    "core-js/modules/es.array.find",
    "./src/index.tsx"
  ],
  output: {
    filename: "altinn-app-frontend.js",
    // chunkFilename: '[name].bundle.js'
  },
  /*optimization: {
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 0,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
            return `npm.${packageName.replace('@', '')}`;
          }
        }
      }
    },
  },*/
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".css", ".scss"],
  },
  performance: {
    hints: false,
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
      filename: "altinn-app-frontend.css",
    }),
    new UglifyJsPlugin(),
    new webpack.BannerPlugin({
      banner: package.name + ', v' + package.version + ', https://github.com/Altinn/altinn-studio/tree/' + gitRevisionPlugin.commithash() + '/src/react-apps/applications/altinn-app-frontend'
    })
  ],
};
