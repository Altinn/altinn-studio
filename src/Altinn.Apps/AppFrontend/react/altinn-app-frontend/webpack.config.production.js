const HtmlWebPackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const webpack = require('webpack');
const GitRevisionPlugin = require('git-revision-webpack-plugin');
const gitRevisionPlugin = new GitRevisionPlugin();
const package = require('./package.json');
const path = require('path');

module.exports = {
  mode: 'production',
  devtool: false,
  entry: [
    "core-js/es",
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
    alias: {
      // CUSTOM PACKAGES
      'altinn-shared': path.resolve(__dirname, './../shared/src'),
      'src': path.resolve(__dirname, './src')
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
    rules: [
      {
        test: /\.jsx?/,
        include: [
          path.resolve(__dirname, "./src"),
          path.resolve(__dirname, "../node_modules/ajv"),
          path.resolve(__dirname, "../node_modules/ajv-formats")
        ],
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
      use: [
        {loader: "ts-loader", options: { transpileOnly: true } }
      ]
    }
    ],
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({ async: false }),
    new HtmlWebPackPlugin({
      template: './public/index.html',
      filename: 'index.html'
    }),
    new MiniCssExtractPlugin({
      filename: "altinn-app-frontend.css",
    }),
    new webpack.BannerPlugin({
      banner: package.name + ', v' + package.version + ', https://github.com/Altinn/altinn-studio/tree/' + gitRevisionPlugin.commithash() + '/src/react-apps/applications/altinn-app-frontend'
    })
  ],
};
