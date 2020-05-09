'use strict'

const path = require('path')
const webpack = require('webpack')
const merge = require('webpack-merge')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const StatsPlugin = require('stats-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const { fromRoot, pkg, paths, getLibraryName } = require('../utils')
const userConfig = require('./user')()
const isProduction = process.env.NODE_ENV === 'production'

const base = (env, argv) => {
  const filename = [
    'index',
    isProduction ? '.min' : null,
    '.js'
  ]
    .filter(Boolean)
    .join('')

  return {
    bail: Boolean(isProduction),
    mode: isProduction ? 'production' : 'development',
    entry: [userConfig.entry],
    output: {
      path: fromRoot(paths.dist),
      filename: filename,
      sourceMapFilename: filename + '.map',
      library: getLibraryName(pkg.name),
      libraryTarget: 'umd',
      devtoolModuleFilenameTemplate: info => 'file:' + encodeURI(info.absoluteResourcePath)
    },
    module: {
      rules: [
        {
          oneOf: [
            {
              test: /\.js$/,
              include: fromRoot(paths.src),
              use: {
                loader: require.resolve('babel-loader'),
                options: {
                  presets: [require('./babelrc')()],
                  babelrc: false,
                  cacheDirectory: true
                }
              }
            },
            {
              test: /\.js$/,
              exclude: /@babel(?:\/|\\{1,2})runtime/,
              use: {
                loader: require.resolve('babel-loader'),
                options: {
                  presets: [require('./babelrc')()],
                  babelrc: false,
                  cacheDirectory: true,
                  sourceMaps: false
                }
              }
            }
          ]
        }
      ]
    },
    resolve: {
      alias: {
        '@babel/runtime': path.dirname(
          require.resolve('@babel/runtime/package.json')
        )
      }
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        // This is only used in production mode
        new TerserPlugin({
          terserOptions: {
            parse: {
              // we want terser to parse ecma 8 code. However, we don't want it
              // to apply any minfication steps that turns valid ecma 5 code
              // into invalid ecma 5 code. This is why the 'compress' and 'output'
              // sections only apply transformations that are ecma 5 safe
              // https://github.com/facebook/create-react-app/pull/4234
              ecma: 8
            },
            compress: {
              ecma: 5,
              warnings: false
            },
            mangle: {
              safari10: true
            },
            output: {
              ecma: 5,
              comments: false
            }
          },
          // Use multi-process parallel running to improve the build speed
          // Default number of concurrent runs: os.cpus().length - 1
          parallel: true,
          // Enable file caching
          cache: true,
          sourceMap: true
        })
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.DEBUG': JSON.stringify(process.env.DEBUG),
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      })
    ],
    target: 'web',
    node: process.env.AEGIR_NODE === 'false' ? {
      global: true,
      __filename: 'mock',
      __dirname: 'mock',
      dgram: false,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      console: false,
      process: true, // TODO remove this once readable-stream is fixed
      Buffer: false,
      setImmediate: false,
      os: false,
      assert: false,
      constants: false,
      events: false,
      http: false,
      path: false,
      querystring: false,
      stream: false,
      string_decoder: false,
      timers: false,
      url: false,
      util: false,
      crypto: false
    } : {
      dgram: 'empty',
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      child_process: 'empty',
      console: false,
      global: true,
      process: true,
      __filename: 'mock',
      __dirname: 'mock',
      Buffer: true,
      setImmediate: true
    }
  }
}

module.exports = (env, argv) => {
  const external = typeof userConfig.webpack === 'function'
    ? userConfig.webpack(env, argv)
    : userConfig.webpack
  if (process.env.AEGIR_BUILD_ANALYZE === 'true') {
    return merge(
      base(env, argv),
      {
        plugins: [
          new BundleAnalyzerPlugin(),
          new StatsPlugin('stats.json')
        ],
        profile: true
      },
      external
    )
  }

  return merge(
    base(env, argv),
    external
  )
}
