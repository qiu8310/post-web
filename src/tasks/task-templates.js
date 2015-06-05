/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var _ = require('lodash');
var h = require('../helper');
var path = require('path');
var wiredep = require('wiredep');

var htmlMinifier = require('html-minifier').minify,
  markdown = require('markdown').markdown,
  jade = require('jade');


module.exports = require('./task-base').extend({

  init: function() {
    // <!--concat:all.js ts,js,__bower,__ng,babel-->
    this.concatPattern = /([ \t]*)<!--\s*concat:(\S*)\s+([\s\S]*?)\s*-->/gi;

    this.wiredep = {};
    var opts = this.options;

    if (!_.isEmpty(opts.bower)) {
      this.wiredep = wiredep({
        directory: opts.bowerDirectory,
        bowerJson: opts.bower
      });

      // 复制 bootstrap 的字体文件
      var pkgs = this.wiredep.packages;
      if (pkgs.bootstrap) {
        pkgs.bootstrap.main.forEach(function(file) {
          if (file.indexOf('fonts') > 0) {
            opts.copy[path.join(opts.distDir, 'fonts', path.basename(file))] = file;
          }
        });
      }
      this.ylog.info('bower file types', Object.keys(this.wiredep));
    }
  },


  initJade: function(jadeOpts) {
    jadeOpts.pretty = true; // 永远都是 pretty，压缩交给 htmlMinifier
    if ('data' in jadeOpts) {
      var data = jadeOpts.data;
      delete jadeOpts.data;
      this.taskOpts.jade = _.assign({}, data, jadeOpts);
    }
  },

  initSlim: function(slimOpts) {
    slimOpts.pretty = true;
    if ('data' in slimOpts) {
      var data = slimOpts.data;
      delete slimOpts.data;
      slimOpts.locals = JSON.stringify(data);
    }
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
        hamlOpts.locals = rtn.join(this.options.EOL);
      }
    }
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

  scriptsTag: function(file) {
    return '<script src="' + file + '"></script>';
  },

  stylesTag: function(file) {
    return '<link rel="stylesheet" href="' + file + '">';
  },

  getBowerFiles: function(ext, target) {
    var bowerFiles = this.wiredep[ext] || [];
    return bowerFiles.map(function(f) {
      return path.relative(path.dirname(target), f);
    });
  },

  // 分析 content，得到需要 concat 的脚本
  // 同时给 html 添加上 script 或 style 标签
  postCompile: function(content, cfg) {
    var self = this, opts = self.options;

    return content.replace(self.concatPattern, function(raw, space, target, files) {
      var ext = target.split('.').pop();
      var task = ext === 'js' ? 'scripts' : 'styles';
      var rel = function(file) {
        return path.relative(
          path.dirname(cfg.dist),
          // 后一个 path.join 主要是为了避免用户用没 styles 文件夹，但配置了 concat，这是这个也不会起作用，只是为了避免报错
          path.join(opts.dist[task] || path.join(opts.distDir, task), file)
        );
      };

      // 有两类文件，一类是专门给 concat 用的（它不需要前缀，会自动在 dist, tmp, src 文件夹中寻找文件）
      // 另一类是用来替换 html 中的内容的
      var concatFiles = [], showFiles = [], bowerFiles;

      files = files.split(/\r?\n|,/);
      self.ylog.debug('concat original files', files);
      files.forEach(function(f) {
        f = f.trim();
        if (!f) { return true; }
        if (f === '__bower') {
          bowerFiles = self.getBowerFiles(ext, cfg.src);
          self.ylog.debug('%s bower files', ext, bowerFiles);
          [].push.apply(concatFiles, bowerFiles);
          [].push.apply(showFiles, bowerFiles);
        } else {
          f = self.appendExt(f, ext);
          var attempt = path.join(path.dirname(cfg.src), f);
          if (h.isFile(attempt)) {  // 可能直接引用真实文件
            showFiles.push(f);
            concatFiles.push(attempt);
          } else {  // 引用编译前的文件
            showFiles.push(rel(f));
            concatFiles.push(f);
          }
        }
      });

      self.ylog.info('concat options added ^%s^', target, concatFiles);

      opts.tasks[task].concat[target] = concatFiles;

      var tagKey = task + 'Tag', inject = [];
      if (self.production) {
        inject.push(space + self[tagKey](rel(target)));
      } else {
        showFiles.forEach(function(f) {
          inject.push(space + self[tagKey](f));
        });
      }
      self.ylog.info('inject ^%s^ with', cfg.dist, inject);
      return inject.join(opts.EOL);
    });
  },

  compile: function(done) {
    this.runParallel('compile', ['markdown', 'jade', 'slim', 'haml', 'html'], done);
  }

});
