'use strict'

// node built-in modules

import fs from 'fs'
import { resolve } from 'path'

// npm modules

import express from 'express'
import gulp from 'gulp'
import http from 'http'
import require_reload from 'require-reload'
import socket from 'socket.io'
import webpack from 'webpack'

// global config

import { server } from './option.json'

const paths = {
  app: './app',
  dist: './dist'
}

const app = express()
var io = null, webpack_hot_middleware = null

gulp.task('hmr', () => webpack_hot_middleware.publish({ action: 'hmr' }))

gulp.task('server', () => {
  // express setting

  app.use(express.static(resolve(paths.dist)))

  // http server setting

  const httpServer = http.createServer(app)
  httpServer.listen(server.port, () => console.log(`Socket attached HTTP server listening on ${server.port}...`))

  // socket setting

  io = socket(httpServer)
})

gulp.task('socket', () => {
  io.removeAllListeners('connect')
  require_reload('./serv.js')(io)
})

gulp.task('watch', () => {
  gulp.watch([`${paths.app}/*.pug`, `${paths.app}/*.sass`], ['hmr'])
  gulp.watch(['./serv.js'], ['socket', 'hmr'])
})

gulp.task('webpack', () => {
  const webpack_config = require('./webpack/webpack.dev.config.js').default
  const compiler = webpack(webpack_config.global)

  app.use(require('webpack-dev-middleware')(compiler, webpack_config.devServer))
  app.use(webpack_hot_middleware = require('webpack-hot-middleware')(compiler))
})

gulp.task('dev', ['webpack', 'server', 'socket', 'watch'])
