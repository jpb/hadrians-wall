const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'index.js',
    libraryTarget: "commonjs2",
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  externals: {
    'aws-sdk': 'aws-sdk',
  },
  module: {
    rules: [
      {
        loader: 'ts-loader',
        test: /\.tsx?$/,
      }
    ]
  },
  devtool: false,
};
