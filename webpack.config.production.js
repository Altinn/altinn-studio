const { EsbuildPlugin } = require('esbuild-loader');

const common = require('./webpack.common');

module.exports = {
  ...common,
  mode: 'production',
  devtool: false,
  performance: {
    hints: false,
  },
  optimization: {
    minimize: true,
        minimizer: [
      new EsbuildPlugin({
        target: 'es2020',
        css: true,
      }),
    ],
  },
  module: {
    rules: [
      ...common.module.rules,
      {
        test: /\.tsx?$/,
        loader: 'esbuild-loader',
        options: {
          target: 'es2020',
        },
      },
    ],
  },
};
