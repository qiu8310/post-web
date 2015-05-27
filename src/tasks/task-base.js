/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var _ = require('lodash'),
  path = require('path'),
  async = require('async'),
  spawn = require('../lib/spawn'),
  h = require('../helper'),
  dargs = require('../lib/dargs'),
  ylog = require('ylog')('post:base');

module.exports = require('class-extend').extend({

  constructor: function(options) {
    this.enables = null;
    this.name = null;

    this.options = options;

    this.init();

    this.taskOpts = options.tasks[this.name];
    this.src = options.src[this.name];
    this.dist = options.dist[this.name];
    this.tmp = options.tmp[this.name];
    this.minify = this.attr('minify');

    this.taskOpts.enables = this.enables;


    ylog.info.title('initializing task %s', this.name);

    this._getRunnableTasks('init', Object.keys(this.enables), function(task, fn) {
      this.taskOpts[task] = this.taskOpts[task] || {};
      fn(this.taskOpts[task]);
      ylog.silly('initialized task @%s.%s@', this.name, task);
    });

    ylog.debug('task @%s@ options', this.name, this.options.tasks[this.name]);
    ylog.ok('initialized task @%s@', this.name);

  },


  _getRunnableTask: function(key, task) {
    if (this.enables[task]) {
      var fnName = key + _.capitalize(task);
      if (this[fnName]) {
        return function() {
          ylog.info('run @%s.%s@', this.name, fnName);
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
   * 解析文件的类型，得到在对应 src directory 中的所有这些类型的文件，同时根据文件类型设置 enables 属性
   * @param {Array} fileTypes
   * @param {boolean} deep - 是否遍历子文件夹
   * @returns {*}
   */
  getTypedFiles: function(fileTypes, deep) {
    var exts = [], enables = {}, extMap = {};

    _.each(fileTypes, function(fileType) {
      extMap[fileType] = this.getFileTypeExtensions(fileType);
      [].push.apply(exts, extMap[fileType]);
    }, this);

    var files = h.findFilesByExtensions(this.options.src[this.name], _.uniq(exts), deep);
    var typedFiles = {};

    _.each(files, function(f) {
      var ext = h.ext(f);
      var type = _.find(fileTypes, function(t) {
        return _.includes(extMap[t], ext);
      });
      if (type) {
        typedFiles[type] = typedFiles[type] || [];
        typedFiles[type].push(f);
        enables[type] = true;
      }
    });

    this.enables = enables;

    return typedFiles;
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


  /**
   * 调用系统命令
   * @param {String|Array} cmds
   * @param {{argsOpts: Object, dargs: Object, spawn: Object}} opts
   * @param {Function} cb
   */
  run: function(cmds, opts, cb) {
    var args = [].concat(cmds);
    [].push.apply(args, dargs(opts.argsOpts, opts.dargs));
    spawn(args, opts.spawn, cb);
  },

  async: async,
  spawn: spawn,
  dargs: dargs
});
