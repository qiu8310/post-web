/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */
var Uglify = require('uglify-js');
var path = require('path');
var _ = require('lodash');
var fs = require('fs-extra');
var ngAnnotate = require('ng-annotate');
var ylog = require('ylog')('post:scripts');

module.exports = require('./task-base').extend({

  init: function() {
    // uglify 配置
    this.taskOpts.uglify.fromString = true;
  },


  initCoffee: function(coffeeOpts) {
    coffeeOpts.print = true;
  },

  initIced: function(icedOpts) {
    icedOpts.print = true;
  },


  asyncCompileUnits: {
    js: function(data, cfg, cb) {
      cb(null, data);
    },
    babel: function(data, cfg, cb) {
      var opts = this.taskOpts.babel;
      opts.filename = cfg.src;
      cb(null, require('babel-core').transform(data, opts).code);
    },
    coffee: function(data, cfg, cb) {
      var opts = this.taskOpts.coffee;
      var prog = this.run( ['coffee', '--stdio'], { argsOpts: opts }, cb );
      prog.stdin.write(data);
      prog.stdin.end();
    },
    iced: function(data, cfg, cb) {
      var opts = this.taskOpts.iced;
      var prog = this.run( ['iced', '--stdio'], { argsOpts: opts }, cb );
      prog.stdin.write(data);
      prog.stdin.end();
    },
    typescript: function(data, cfg, cb) {
      cb(null, require('typescript').transpile(data, this.taskOpts.typescript));
    }
  },


  getDistFile: function(file, ext) {
    var dist = this.options.webpack ? this.tmp : this.dist;
    file = path.join(dist, path.relative(this.src, file.replace(this.tmp, this.src)));
    return this._getFile(file, ext);
  },

  compileWebpack: function (done) {
    var opts = this.options;
    var wpOpts = opts.webpack;
    var webpack = require('webpack');
    var CommonsChunkPlugin = webpack.optimize.CommonsChunkPlugin;

    var production = this.production;
    var injectVariables = _.assign({
      __PROD__: production,
      __DEV__: !production
    }, wpOpts.injectVariables);
    _.each(injectVariables, function (val, key) {
      injectVariables[key] = JSON.stringify(val);
    });
    var stats = _.assign({
      errors: true,
      warnings: true,
      assets: true,
      colors: true,
      hash: false,
      timings: true,
      chunks: false,
      chunkModules: false,
      modules: false
    }, wpOpts.stats);

    wpOpts.context = this.tmp;
    if (!wpOpts.output) {
      wpOpts.output = { filename: '[name].js' };
    }
    if (!wpOpts.resolve) {
      wpOpts.resolve = {};
    }
    if (!wpOpts.plugins) {
      wpOpts.plugins = [];
    }

    wpOpts.plugins.push(new webpack.DefinePlugin(injectVariables));
    if (this.minify) {
      wpOpts.plugins.push(new webpack.optimize.UglifyJsPlugin({compressor: {warnings: false}}));
    }

    wpOpts.resolve.modulesDirectories = [path.join(opts.projectDir, 'node_modules')];
    wpOpts.output.path = this.dist;

    // entry
    var entry = wpOpts.entry,
      commonEntry = entry.common,
      vendorEntry = entry.vendor;

    delete entry.common;
    delete entry.vendor;
    if (commonEntry) {
      if (!_.isPlainObject(commonEntry)) {
        commonEntry = {};
      }
      if (!commonEntry.name) {
        commonEntry.name = 'common';
      }
      if (!commonEntry.minChunks) {
        commonEntry.minChunks = 2;
      }
      wpOpts.plugins.push(new CommonsChunkPlugin(commonEntry));
    }
    if (vendorEntry && vendorEntry.length) {
      entry.vendor = vendorEntry;
      wpOpts.plugins.push(new CommonsChunkPlugin({
        name: 'vendor',
        minChunks: Infinity
      }));
    }

    webpack(wpOpts, function (err, out) {
      console.log('\n\nWebpack stats: \n\n%s\n', out.toString(stats));
      done(err);
    });
  },

  compileRollup: function (done) {
    var opts = this.options;
    var ruOpts = opts.rollup;

    var initOpts = ruOpts.options || {};
    var bundleOpts = ruOpts.bundle || {};

    initOpts.entry = path.join(this.src, initOpts.entry || 'index.js');
    bundleOpts.dest = path.join(this.dist, bundleOpts.dest || path.basename(initOpts.entry));

    require('rollup').rollup(initOpts).then(
      function (bundle) {
        bundle.write(bundleOpts);
        done();
      },
      done
    );
  },

  //postCompile: function(data, cfg) {
  //  return data;
  //},

  minifyContent: function(content, src) {
    var opts = this.options;
    // 如果是 angular，对其进行 annotate
    // 对 bower 项目下的文件也要 annotate
    // angular 1.0
    if (opts.angular && opts.angular.match(/1\.\d+\./)) {
      var needNgAnnotate = false;
      if (this.inBowerDir(src)) {
        // 只有依赖了 angular 的 bower 项目才需要 annotate
        var bowerName = src.replace(opts.bowerDirectory, '').split('/')[1];
        var bowerData = this.h.safeReadJson(opts.bowerDirectory, bowerName, 'bower.json');
        if (Object.keys(bowerData.dependencies || {}).indexOf('angular') >= 0) {

          needNgAnnotate = true;
        }
      } else {
        if (!/^(?:lodash|kinetic|jquery)\./.test(path.basename(src))) {
          needNgAnnotate = true;
        }
      }

      if (needNgAnnotate) {
        this.ylog.info('&ng annotate& ^%s^', src);
        content = ngAnnotate(content, {add:true, 'single_quotes': true}).src;
      }
    }

    return Uglify.minify(content, this.taskOpts.uglify).code;
  },

  compile: function(done) {
    var fn = 'runParallel',
      tasks = ['js', 'babel', 'coffee', 'iced', 'typescript'],
      enableWebpack = this.options.webpack,
      enableRollup = this.options.rollup;

    if (enableRollup) {
      tasks = ['rollup'];
      this.enables.rollup = true;
    } else if (enableWebpack) {
      fn = 'runSeriesParallel';
      tasks = [tasks, 'webpack'];

      this.enables.webpack = true;
      fs.ensureDirSync(this.tmp);
    }

    this[fn]('compile', tasks, function (err) {
      if (!err && this.production) {
        this.concat();
      }

      if (enableWebpack) {
        ylog.info('remove directory ^%s^', this.tmp);
        fs.removeSync(this.tmp);
      }

      done(err);
    });

  }



});
