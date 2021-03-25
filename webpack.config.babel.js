const { join } = require('path')
const extensionConfig = require('./src/config.json')

const { title, identifier } = extensionConfig

const mode = process.env.NODE_ENV || 'production'
const target = process.env.BUILD_TARGET === '4' ? 'web' : 'node-webkit'

const config = {
  mode,
  target,
  entry: './src/index.ts',
  output: {
    path: join(__dirname, `./dist/${identifier}`),
    filename: `${title}.js`,
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    modules: ['./src/**'],
    extensions: ['.ts', '.js', '.d.ts'],
  },
  devtool: 'inline-source-map',
  optimization: {
    minimize: false,
  },
}

module.exports = config
