const HtmlWebPackPlugin = require('html-webpack-plugin');
const CheckerPlugin = require('awesome-typescript-loader').CheckerPlugin;
const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'eval',
  entry: './src/index.tsx',
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".css", ".scss"],
    alias: {
      // CUSTOM PACKAGES
      'altinn-shared': path.resolve(__dirname, './../shared/src'),
      'src': path.resolve(__dirname, './src')
    }
  },
  performance: {
    hints: 'warning',
  },
  module: {
    rules: [{
        test: /\.jsx?/,
        exclude: path.resolve(__dirname, 'node_modules'),
        include: path.resolve(__dirname, './src'),
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
        use: [
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
        exclude: path.resolve(__dirname, 'node_modules'),
        include: [
          path.resolve(__dirname, './src'),
          path.resolve(__dirname, './styleguide'),
        ],
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
    new CheckerPlugin(),
  ],
  devServer: {
    historyApiFallback: true,
  }
}
