/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */
var Uglify = require('uglify-js');
var path = require('path');
var ngAnnotate = require('ng-annotate');

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
    this.runParallel('compile', ['js', 'babel', 'coffee', 'iced', 'typescript'], function(err) {
      if (!err && this.production) {
        this.concat();
      }
      done(err);
    });
  }

});
