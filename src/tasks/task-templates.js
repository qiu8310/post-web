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
  swig  = require('swig'),
  jade = require('jade');

var nodeModulesPattern = /^(node_modules|__nm)\//;

module.exports = require('./task-base').extend({

  init: function() {
    // <!--concat:all.js ts,js,__bower,__ng,babel-->
    this.concatPattern = /([ \t]*)<!--\s*concat:(\S*)\s+([\s\S]*?)\s*-->/gi;

    // <!-- build:js({.tmp,app}) /scripts/scripts.js -->  <!-- endbuild -->
    this.buildPattern = /<!--\s*build:(\w+)(?:\([^\)]+\))?\s*([^\s]+)\s*-->([\s\S]*?)<!--\s*endbuild\s*-->/gi;

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

  initSwig: function(swigOpts) {
    swigOpts.locals = swigOpts.locals || swigOpts.data;
    swigOpts.cache = false;
    delete swigOpts.data;
  },

  asyncCompileUnits: {
    jade: function(data, cfg, cb) {
      var opts = this.taskOpts.jade;
      opts.filename = cfg.src;
      cb(null, jade.render(data, opts));
    },
    swig: function(data, cfg, cb) {
      var opts = this.taskOpts.swig;
      opts.filename = cfg.src;
      cb(null, swig.render(data, opts));
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

  getBowerFiles: function(ext, rules, target) {
    var bowerFiles = this.wiredep[ext] || [];
    if (rules) {
      var mode = rules[0];
      rules = rules.substr(1).split(mode);
      bowerFiles = _.filter(bowerFiles, function(file) {
        var name = file.replace(this.options.bowerDirectory, '').split('/')[1];
        return mode === '+' && _.includes(rules, name) || mode === '=' && !_.includes(rules, name);
      }, this);
    }

    return bowerFiles.map(function(f) {
      return path.relative(path.dirname(target), f);
    });
  },

  _normalizeConcatSrc: function(task, file, cfg) {
    var opts = this.options;
    var abs = file.charAt(0) === '/', show, concat;
    if (abs) { file = file.substr(1); }
    var attempt = path.join(path.dirname(cfg.src), file);

    if (h.isFile(attempt)) {  // 可能直接引用真实文件
      show = file;
      concat = attempt;
    } else {  // 引用编译前的文件
      show = path.relative(
        path.dirname(cfg.dist),
        // 后一个 path.join 主要是为了避免用户用没 styles 文件夹，但配置了 concat，这是这个也不会起作用，只是为了避免报错
        path.join(opts.dist[task] || path.join(opts.distDir, task), file)
      );
      concat = file;
    }

    return {show: (abs ? '/' : '') + show, concat: concat};
  },

  _normalizeConcatDist: function(task, file, cfg) {
    var opts = this.options;
    var abs = file.charAt(0) === '/', show, concat;

    // 后一个 path.join 主要是为了避免用户用没 styles 文件夹，但配置了 concat，这是这个也不会起作用，只是为了避免报错
    var taskDist = opts.dist[task] || path.join(opts.distDir, task);

    if (abs) { file = file.substr(1); }
    if (path.join(opts.distDir, file).indexOf(opts.dist[task]) === 0) {
      show = file;
      concat = path.relative(taskDist, path.join(opts.distDir, file));
    } else {
      show = path.relative(
        path.dirname(cfg.dist),
        path.join(taskDist, file)
      );
      concat = file;
    }
    return {show: (abs ? '/' : '') + show, concat: concat};
  },


  addConcatFiles: function(task, target, srcFiles) {
    this.ylog.info('concat options added ^%s^', target, srcFiles);
    this.options.tasks[task].concat[target] = srcFiles;
  },

  // 分析 content，得到需要 concat 的脚本
  // 同时给 html 添加上 script 或 style 标签
  postCompileConcat: function(content, cfg) {
    var self = this, opts = self.options;
    var nm = path.join(opts.projectDir, 'node_modules');

    return content.replace(self.concatPattern, function(raw, space, target, files) {
      var ext = target.split('.').pop();
      var task = ext === 'js' ? 'scripts' : 'styles';

      // 有两类文件，一类是专门给 concat 用的（它不需要前缀，会自动在 dist, tmp, src 文件夹中寻找文件）
      // 另一类是用来替换 html 中的内容的
      var concatFiles = [], showFiles = [], bowerFiles;

      files = files.split(/\r?\n|,/);
      self.ylog.debug('concat original files', files);
      files.forEach(function(f) {
        f = f.trim();
        if (!f) { return true; }
        if (f.indexOf('__bower') === 0) {
          bowerFiles = self.getBowerFiles(ext, f.replace('__bower', ''), cfg.src);
          self.ylog.debug('%s bower files', ext, bowerFiles);
          [].push.apply(concatFiles, bowerFiles);
          [].push.apply(showFiles, bowerFiles);
        } else if (nodeModulesPattern.test(f)) {
          var nmRelative = f.replace(nodeModulesPattern, '');
          showFiles.push(nmRelative);
          concatFiles.push(path.join(nm, nmRelative));
        } else {
          var srcObj = self._normalizeConcatSrc(task, self.appendExt(f, ext), cfg);
          showFiles.push(srcObj.show);
          concatFiles.push(srcObj.concat);
        }
      });

      var targetObj = self._normalizeConcatDist(task, target, cfg);

      self.addConcatFiles(task, targetObj.concat, concatFiles);

      var tagKey = task + 'Tag', inject = [];
      if (self.production) {
        inject.push(space + self[tagKey](targetObj.show));
      } else {
        showFiles.forEach(function(f) {
          inject.push(space + self[tagKey](f));
        });
      }
      self.ylog.info('inject ^%s^ with', cfg.dist, inject);
      return inject.join(opts.EOL);
    });
  },

  // 支持 grunt-usemin 的 build 程序
  postCompileBuild: function(content, cfg) {
    var self = this;
    var commentScriptRe = /<!--\s*<script\s.*<\/script>\s*-->/i;
    var scriptRe = /<script\s.*?src=['"]([^'"]*)['"].*?<\/script>/gi;
    var commentStyleRe = /<!--\s*<link\s.*?>\s*-->/i;
    var styleRe = /<link\s.*?\shref=['"]([^'"]*)['"].*?>/gi;

    return content.replace(self.buildPattern, function(raw, type, target, srcs) {

      var task, cre, re;
      var tag = '___^_^____';  // 用来替换新的脚本

      if (type === 'js') {
        task = 'scripts';
        cre = commentScriptRe;
        re = scriptRe;
      } else {
        task = 'styles';
        cre = commentStyleRe;
        re = styleRe;
      }

      var targetObj = self._normalizeConcatDist(task, target, cfg);
      var concatFiles = [];
      var scriptContent;

      // 去除注释了的脚本
      scriptContent = srcs.replace(cre, '');
      scriptContent = scriptContent.replace(re, function(raw, src) {
        raw = tag;
        tag = '';
        concatFiles.push(src.replace(nodeModulesPattern, ''));
        return raw;
      });
      self.addConcatFiles(task, targetObj.concat, concatFiles);
      scriptContent = scriptContent.replace('___^_^____', self[task + 'Tag'](targetObj.show));
      return raw.replace(srcs, scriptContent.trim());
    });
  },

  postCompile: function(content, cfg) {
    content = this.postCompileConcat(content, cfg);
    if (this.production) {
      content = this.postCompileBuild(content, cfg);
    }
    return content;
  },


  compile: function(done) {
    this.runParallel('compile', ['markdown', 'jade', 'slim', 'swig', 'haml', 'html'], done);
  }

});
