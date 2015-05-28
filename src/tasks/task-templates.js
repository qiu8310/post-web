/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var os = require('os'),
  _ = require('lodash');


var ylog = require('ylog')('post:tpl');


var htmlMinifier = require('html-minifier').minify,
  markdown = require('markdown').markdown,
  jade = require('jade');


module.exports = require('./task-base').extend({

  init: function() {
    this.name = 'templates';
    this.targetExt = 'html';  // asyncCompileUnits 中需要用


    var types = ['html', 'markdown', 'jade', 'slim', 'haml'];

    // 查看有没有 sass, less, stylus, css，此函数同时会设置 this.enables 属性
    this.typedFiles = this.getTypedFiles(types, true);
  },

  initJade: function(jadeOpts) {
    jadeOpts.pretty = true; // 永远都是 pretty，压缩交给 htmlMinifier
    if ('data' in jadeOpts) {
      var data = jadeOpts.data;
      delete jadeOpts.data;
      this.taskOpts.jade = _.assign({}, data, jadeOpts);
    }

    ylog.debug('jade options', this.taskOpts.jade);
  },

  initSlim: function(slimOpts) {
    slimOpts.pretty = true;
    if ('data' in slimOpts) {
      var data = slimOpts.data;
      delete slimOpts.data;
      slimOpts.locals = JSON.stringify(data);
    }
    ylog.debug('slim options', slimOpts);
  },

  initHaml: function(hamlOpts) {
    hamlOpts.style = 'indented';

    if ('data' in hamlOpts) {
      var rtn = [];
      _.each(hamlOpts.data, function(val, key) {
        var inject = JSON.stringify(val);
        if (typeof val === 'object') {
          inject = 'JSON.parse(\'' + inject + '\')';
        }
        rtn.push('- ' + key + ' = ' + inject);
      });
      if (rtn.length) {
        rtn.unshift('- require \'json\'');
        rtn.push('');
        hamlOpts.locals = rtn.join(os.EOL);
      }
    }

    ylog.debug('slim options', hamlOpts);
  },

  asyncCompileUnits: {
    jade: function(data, cfg, cb) {
      var opts = this.taskOpts.jade;
      opts.filename = cfg.src;
      cb(null, jade.render(data, opts));
    },
    markdown: function(data, cfg, cb) {
      cb(null, markdown.toHTML(data));
    },
    html: function(data, cfg, cb) {
      cb(null, data);
    },
    slim: function(data, cfg, cb) {
      var prog = this.run(
        ['slimrb', '--stdin'],
        {argsOpts: this.taskOpts.slim},
        cb
      );

      prog.stdin.write(data);
      prog.stdin.end();
    },
    haml: function(data, cfg, cb) {
      var opts = this.taskOpts.haml;

      var prog = this.run(
        ['haml', '--stdin'],
        {
          argsOpts: opts,
          dargs: { excludes: ['locals', 'data'] }
        },
        cb
      );

      if (opts.locals) { prog.stdin.write(opts.locals); }
      prog.stdin.write(data);
      prog.stdin.end();
    }
  },


  minifyContent: function(content) {
    return htmlMinifier(content, this.taskOpts.htmlMinifier);
  },


  compile: function(done) {
    ylog.info.title('compiling task %s', this.name);

    this.runParallel('compile', ['markdown', 'jade', 'slim', 'haml', 'html'], function(err) {
      if (!err) {
        ylog.ok('compiled task @%s@', this.name);
      }
      done(err);
    });
  }

});