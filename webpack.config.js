const { resolve } = require('path');

const path = resolve(__dirname, 'dist');
const entry = './src/index.js';
const library = 'ScanThng';

const babelrc = {
  presets: ['@babel/preset-env'],
};

const browserConfig = {
  entry,
  output: {
    path,
    library,
    filename: 'scanthng.browser.js',
    libraryTarget: 'var',
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: babelrc,
      },
    }],
  },
};

const nodeConfig = {
  entry,
  target: 'node',
  output: {
    path,
    library,
    filename: 'scanthng.node.js',
    libraryTarget: 'commonjs2',
    umdNamedDefine: true,
    globalObject: "typeof self !== 'undefined' ? self : this"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules|dist/
      }
    ]
  }
}

module.exports = [
  browserConfig,
  nodeConfig,
];
