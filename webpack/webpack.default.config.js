import autoprefixer from 'autoprefixer'
import { resolve } from 'path'
import webpack from 'webpack'

import { server } from '../option.json'

export default {
  context: resolve('./app'),
  entry: './app.js',
  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader?insertAt=top', 'css-loader'] },
      { test: /\.(eot|otf|svg|ttf|woff(2)?)(\?[a-z0-9]+)?$/, use: 'file-loader?name=fonts/[hash:7].[ext]' },
      { test: /\.(jpeg|jpg|png|ico)$/, use: 'url-loader?limit=10000' },
      { test: /\.js$/, use: 'babel-loader', exclude: /node_modules/ },
      { test: /\.pug$/, use: ['file-loader?name=[name].html', 'extract-loader', 'html-loader', 'pug-html-loader?exports=false'] },
      { test: /\.sass$/, use: ['file-loader?name=[name].css', 'extract-loader', 'css-loader', { loader: 'postcss-loader', options: { plugins: [autoprefixer] } }, 'sass-loader'] }
    ]
  },
  output: {
    filename: 'app.js',
    path: resolve('./dist'),
    publicPath: `http://${server.host}:${server.port}/`
  }
}
