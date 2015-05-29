/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */
var ylog = require('ylog')('post:control'),
  _ = require('lodash'),
  async = require('async'),
  path = require('path'),
  watch = require('./lib/watch');

function TaskControl(options) {
  var orders = {
    styles: 9,
    scripts: 8,
    templates: 7,
    images: 5,
    fonts: 4,
    others: 1
  };

  var enabledTaskNames = Object.keys(options.dist)
    .sort(function(a, b) { return orders[b] - orders[a]; });


  var tasks = [], compiles = [];


  enabledTaskNames.forEach(function(taskName) {

    ylog.ln.info.title('initializing task %s', taskName);

    var C = require('./tasks/task-' + taskName),
      task = new C(taskName, options);

    //tasks.push(task);

    //compiles.push(function(done) {
    //  ylog.line();
    //  ylog.info.title('compiling task %s', task.name);
    //  task.compile(function(err) {
    //    if (!err) { ylog.ok('compiled task @%s@ ', task.name); }
    //    done(err);
    //  });
    //});

    ylog.ok('initialized task @%s@', taskName);
  });


  this.options = options;
  this.tasks = tasks;
  this.compiles = compiles;
}


TaskControl.prototype = {
  compile: function(done) {
    //this.compiling = true;
    //async.series(this.compiles, function(err) {
    //  this.compiling = false;
    //  done(err);
    //}.bind(this));
  },

  /**
   * 监听 assetDir 中的所有文件的变化，如果有变化，启动编译
   *
   * @param {String} dir
   * @param {Object} opts
   * @param {Number} opts.interval
   * @param {Number} opts.debounceDelay
   */
  watch: function(dir, opts) {

    ylog.info.ln.title('watch directory %s', this.options.assetDir);
    ylog.debug('watch options', opts);

    watch(this.options.assetDir, opts, function(files) {
      // files 是一个数组：[[event, filepath], ... ]

      // 判断更新的文件是在哪个位置：styles? scripts? templates? images?
      ylog.info(files);
    });
  },



  /**
   * 触发浏览器自动刷新
   * @param {Array.<String>} files
   */
  livereload: function(files) {
    if (this.lr) {
      this.lr.trigger([].concat(files));
    }
  },


  /**
   * 启动 web 和 livereload 服务器
   *
   * @param {Object} opts
   * @param {Number} opts.port        - 指定 web 服务器端口，默认 9000
   * @param {Number} opts.livereload  - 指定 livereload 服务器端口，默认 35729，
   *                                    如果不想使用 livereload，可以将它设置成 false
   *
   * @param {String} opts.host        - 指定 web 服务器 host，默认 0.0.0.0
   * @param {String} opts.protocol    - 指定 web 服务器协议，默认 http
   * @param {Object} opts.watch       - watch 用的选项，有 interval 和 debounceDelay
   *
   * 注意，指定的 port 和 livereload 的端口可能会被使用，如果被使用了，
   *      服务器会自动定位到一个没使用的端口，所以你想要确认最新的端口是什么时，
   *      可以使用 modifiedOpts 中的 port 和 livereload 中的值
   */
  server: function(opts) {
    var self = this;

    ylog.info.ln.title('start server');
    ylog.debug('server options', opts);

    ylog.info('watch directory ^%s^', this.options.distDir);
    watch(this.options.distDir, opts && opts.watch, function(files) {
      self.livereload(files.map(function(item) {
        return path.relative('.', item[1]);
      }));
    });

    require('./server/express-app')(opts, function(app, modifiedOpts) {

      self.lr = app.lr;

      // 这个放在最后，因为此 middle ware 是会终止的，不会继续向下执行
      // this === require('express')
      app.use(this.static(self.options.distDir));

      // 也可以加上前缀
      // app.use('/static', express.static('public'));

    });
  }
};


module.exports = TaskControl;
