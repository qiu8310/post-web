/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var _ = require('lodash'),
  path = require('path'),
  fs = require('fs-extra'),
  async = require('async'),
  spawn = require('../lib/spawn'),
  h = require('../helper'),
  dargs = require('../lib/dargs'),
  ylog = require('ylog')('post:base');

module.exports = require('class-extend').extend({

  constructor: function(name, options) {

    this.name = name;
    this.options = options;

    this.meta = options.metas[name];
    this.taskOpts = options.tasks[name];

    this.src = options.src[name];
    this.dist = options.dist[name];
    this.tmp = options.tmp[name];
    this.minify = this.attr('minify');


    // 得到本 task 中每类文件的后缀名 到文件类型的映射
    var extensionToType = this.extensionToType = {};
    var extensions = this.extensions = [];
    _.each(this.meta.types, function(type) {

      // 防止用户没有配置此项
      this.taskOpts[type] = this.taskOpts[type] || {};

      _.each(this.getFileTypeExtensions(type), function(ext) {
        extensions.push(ext);
        extensionToType[ext] = type;
      });
    }, this);


    // 执行子类的 init 方法
    if ('init' in this) { this.init(); }

    // 根据 asyncCompileUnits 生成 compileXxx 函数
    this.initAsyncCompileFn();

    ylog.silly(this);
  },

  compile: function() {

    // 每次文件变化都要执行此函数，重新定位文件（目录结构变化了就没办法了）
    this.locate();

    // 方便其它 task 判断当前 task 运行了哪些任务
    //this.taskOpts.enables = this.enables;


    // 在 taskOpts 中初始化对应的配置项
    var enabledTasks = Object.keys(this.enables);
    ylog.info.writeFlag(this.enables, 'Exist file types');

    // 执行 initXxx 脚本
    this._getRunnableTasks('init', enabledTasks, function(task, fn) {
      fn(this.taskOpts[task]);
      ylog.verbose('get @%s.%s@ options', this.name, task, this.taskOpts[task]);
      ylog.verbose('end run @%s.init%s@', this.name, _.capitalize(task));
    });


    ylog.silly('task @%s@ options', this.name, this.taskOpts);
    ylog.ok('initialized task @%s@', this.name);

  },


  /**
   * 给 util.inspect 用的，另外 ylog 调用了 util.inspect
   * @returns {{}}
   */
  inspect: function() {
    var rtn = {};
    Object.keys(this).forEach(function(key) {
      var val = this[key];
      if (key !== 'options' && typeof val !== 'function') {
        rtn[key] = val;
      }
    }.bind(this));
    return rtn;
  },

  _getRunnableTask: function(key, task) {
    if (this.enables[task]) {
      var fnName = key + _.capitalize(task);
      if (this[fnName]) {
        return function() {
          ylog.verbose('run @%s.%s@', this.name, fnName);
          this[fnName].apply(this, arguments);
        }.bind(this);
      }
    }
    return false;
  },

  _getRunnableTasks: function(key, tasks, cb) {
    var rtn = {};
    _.each(tasks, function(task) {
      var fn = this._getRunnableTask(key, task);
      if (fn) {
        if (cb) { cb.call(this, task, fn); }
        rtn[task] = fn;
      }
    }, this);
    return rtn;
  },

  runParallel: function(key, tasks, cb) {
    async.parallelLimit(this._getRunnableTasks(key, tasks), this.options.runLimit, cb.bind(this));
  },

  runSeries: function(key, tasks, cb) {
    async.series(this._getRunnableTasks(key, tasks), cb.bind(this));
  },

  runSeriesParallel: function(key, tasks, cb) {
    var seriesTasks = [];
    _.each(tasks, function(task) {
      var fn;
      if (Array.isArray(task)) {
        fn = function(done) {
          this.runParallel(key, task, done);
        }.bind(this);
      } else {
        fn = this._getRunnableTask(key, task);
      }
      if (fn) { seriesTasks.push(fn); }
    }, this);

    async.series(seriesTasks, cb.bind(this));
  },


  /**
   * 向一个配置中的某个键中加了一项
   * @param {Object} opts
   * @param {String} key
   * @param {*} item
   */
  arrayOptionAddItem: function(opts, key, item) {
    if (item) {
      opts[key] = opts[key] || [];
      if (!Array.isArray(opts[key])) {
        opts[key] = [opts[key]];
      }
      opts[key].push(item);
    }
  },

  /**
   * 将文件（没有目录）按目录分类，如果指定了 exts，可以用 exts 来过滤文件
   * @param {Array} files
   * @param {Array.<String>|null} exts
   * @returns {Object}
   */
  groupFilesToDirectory: function(files, exts) {
    var rtn = {};
    _.each(files, function(f) {
      var dir = path.dirname(f);
      if (!exts || _.includes(exts, h.ext(f))) {
        rtn[dir] = rtn[dir] || [];
        rtn[dir].push(f);
      }
    });
    return rtn;
  },


  /**
   * 根据文件得到文件的类型
   * @param {String} file
   * @returns {String|Boolean}
   */
  fileType: function(file) {
    var ext = h.ext(file);
    return ext ? this.extensionToType[ext] : false;
  },

  /**
   * 定位当前 task 中的所有文件，并将它们按类型分类，保存到 typedFiles
   */
  locate: function() {
    var files = h.findFilesByExtensions(this.src, this.extensions, true);
    var typedFiles = {};
    var enables = {};

    _.each(files, function(file) {
      var type = this.fileType(file);
      if (type) {
        typedFiles[type] = typedFiles[type] || [];
        typedFiles[type].push(file);
        enables[type] = true;
      }
    }, this);

    this.enables = enables;
    this.typedFiles = typedFiles;
  },

  /**
   * 根据配置得到某一文件类型的所有可能的后缀名
   * @param {string} fileType
   * @returns {Array.<string>}
   */
  getFileTypeExtensions: function(fileType) {
    var exts = this.options.extensions;
    return fileType in exts ? exts[fileType] : [fileType];
  },


  /**
   * 得到一个异步处理文件的 task，可以用到 async 中
   * @param {String} processName
   * @param {String} file
   * @param {Function} fn
   * @param {String} ext
   * @returns {Function}
   */
  getProcessFileTask: function(processName, file, ext, fn) {
    var self = this;

    return function(done) {
      ylog.verbose('reading %s file ^%s^', processName, file);
      fs.readFile(file, function(err, data) {
        if (err) {
          done(err);
        } else {
          ylog.verbose('processing %s file ^%s^', processName, file);

          // fn 在执行的过程中可能出错
          try {
            var dist = self.getDistFile(file, ext),
              cfg = {src: file, dist: dist};
            ylog.debug('start compile ^%s^ to ^%s^', file, dist);
            fn.call(self, data.toString(), cfg, function(err, data) {
              if (err) {
                done(err);
              } else {
                var postCompile = 'post' + _.capitalize(processName) + 'Compile';
                postCompile = (postCompile in self) ? postCompile : 'postCompile';
                if (self[postCompile]) {
                  ylog.verbose('use @%s@ on ^%s^', postCompile, cfg.src);
                  data = self[postCompile](data, cfg);
                }

                if (typeof data !== 'string') { return done(err); }

                if (self.minify && self.minifyContent) {
                  ylog.info('minify ^%s^', cfg.dist);
                  data = self.minifyContent(data, cfg);
                }

                fs.writeFile(dist, data, function(err) {
                  if (!err) {
                    ylog.info('&write& ^%s^', dist);
                  }
                  done(err);
                });
              }
            });

          } catch (e) { done(e); }

        }
      });
    };
  },

  /**
   * 根据 asyncCompileUnits 中的 key => fn 对，生成
   * compileXxx 函数
   *
   * 须要指定 this.meta.finalExtension
   * 如果没有，则生成的 dist 文件和原文件的后缀名一致
   */
  initAsyncCompileFn: function() {
    _.each(this.asyncCompileUnits, function(fn, key) {

      var protoKey = 'compile' + _.capitalize(key);

      this[protoKey] = function(done) {
        var tasks = [];

        _.each(this.typedFiles[key], function(f) {
          tasks.push(this.getProcessFileTask(key, f, this.meta.finalExtension, fn.bind(this)));
        }, this);

        this.async.parallelLimit(tasks, this.options.runLimit, done);
      }

    }, this);
  },




  /**
   * 全局配置放在 options 下
   * 每个 task 的配置可以放在 options.tasks[taskName] 下
   *
   * 用 attr 去获取配置时首先从 task 中找，没找到再去全局配置中找
   * @param {String} key
   * @returns {*}
   */
  attr: function(key) {
    return (key in this.taskOpts) ? this.taskOpts[key] : this.options[key];
  },

  _getFile: function(file, ext) {
    fs.ensureDirSync(path.dirname(file));
    if (ext) {
      file = file.replace(/\.\w*$/, '.' + ext);
    }
    return file;
  },

  getTmpFile: function(file, ext) {
    file = path.join(this.tmp, path.relative(this.src, file));
    return this._getFile(file, ext);
  },

  getDistFile: function(file, ext) {
    file = path.join(this.dist, path.relative(this.src, file.replace(this.tmp, this.src)));
    return this._getFile(file, ext);
  },

  _getDir: function(file) {
    fs.ensureDirSync(file);
    return file;
  },

  getTmpDir: function(dir) {
    dir = path.join(this.tmp, path.relative(this.src, dir));
    return this._getDir(dir);
  },

  getDistDir: function(dir) {
    dir = path.join(this.dist, path.relative(this.src, dir.replace(this.tmp, this.src)));
    return this._getDir(dir);
  },

  /**
   * 调用系统命令
   * @param {String|Array} cmds
   * @param {{argsOpts: Object, dargs: Object, spawn: Object}} opts
   * @param {Function} cb
   */
  run: function(cmds, opts, cb) {
    var args = [].concat(cmds);
    [].push.apply(args, dargs(opts.argsOpts, opts.dargs));
    return spawn(args, opts.spawn, cb);
  },

  async: async,
  spawn: spawn,
  dargs: dargs
});
