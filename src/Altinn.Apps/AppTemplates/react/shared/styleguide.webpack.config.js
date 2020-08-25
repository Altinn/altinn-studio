const HtmlWebPackPlugin = require('html-webpack-plugin');
const CheckerPlugin = require('awesome-typescript-loader').CheckerPlugin;

module.exports = {
  mode: 'development',
  devtool: 'eval',
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
