import { resolve } from 'path'
import webpack from 'webpack'

import _config from './webpack.default.config.js'

_config.entry = ['webpack-hot-middleware/client?reload=true', _config.entry]

_config.plugins = [
  new webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('development') }),
  new webpack.HotModuleReplacementPlugin(),
  new webpack.NoEmitOnErrorsPlugin()
]

export default {
  devServer: {
    contentBase: resolve('./dist'),
    inline: true,
    publicPath: _config.output.publicPath,
    stats: { chunkModules: false }
  },
  global: _config
}
