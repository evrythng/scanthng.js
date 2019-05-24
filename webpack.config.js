const { resolve } = require('path')

const path = resolve(__dirname, 'dist')
const entry = './src/index.js'
const library = 'scanthng'

const babelrc = {
  presets: ['@babel/preset-env'],
  // plugins: [
  //   ['@babel/transform-runtime', { regenerator: true }]
  // ]
}

const browserConfig = {
  entry,
  output: {
    path,
    library,
    filename: 'scanthng.js',
    libraryTarget: 'var'
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: babelrc
      }
    }]
  }
}

module.exports = [
  browserConfig
]
