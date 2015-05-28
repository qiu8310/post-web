/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var ylog = require('ylog')('post:scripts');


module.exports = require('./task-base').extend({

  init: function() {
    this.name = 'scripts';
    this.targetExt = 'js';  // asyncCompileUnits 中需要用

    var types = ['js', 'babel', 'coffee', 'iced', 'typescript'];

    // 查看有没有 sass, less, stylus, css，此函数同时会设置 this.enables 属性
    this.typedFiles = this.getTypedFiles(types, true);
  },


  initCoffee: function(coffeeOpts) { coffeeOpts.print = true; },
  initIced: function(icedOpts) { icedOpts.print = true; },


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


  minifyContent: function(content) {
    // @TODO
    return content;
  },


  compile: function(done) {
    ylog.info.title('compiling task %s', this.name);

    this.runParallel('compile', ['js', 'babel', 'coffee', 'iced', 'typescript'], function(err) {
      if (!err) {
        ylog.ok('compiled task @%s@', this.name);
      }
      done(err);
    });
  }

});
