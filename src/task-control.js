/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */
var ylog = require('ylog')('post:control'),
  _ = require('lodash'),
  h = require('./helper'),
  async = require('async'),
  path = require('path'),
  fs = require('fs-extra'),
  watch = require('./lib/watch');

var EventEmitter = require('events').EventEmitter,
  util = require('util');

function TaskControl(options) {
  EventEmitter.call(this);

  var orders = {
    templates: 10,
    styles: 9,
    scripts: 8,
    images: 5,
    fonts: 4,
    others: 1
  };

  var enabledTaskNames = Object.keys(options.dist)
    .filter(function(key) { return options.metas[key].enabled; })
    .sort(function(a, b) { return orders[b] - orders[a]; });

  var tasks = [];


  enabledTaskNames.forEach(function(taskName) {

    ylog.ln.info.title('initializing task %s', taskName);

    var C = require('./tasks/task-' + taskName),
      task = new C(taskName, options);
    tasks.push(task);

    task.compileWrap = function(done) {
      ylog.info.ln.title('compiling task %s', task.name);
      task.isCompiling = true;
      task.compile(function(err) {
        if (!err) { ylog.ok('compiled task @%s@ ', task.name); }
        task.isCompiling = false;
        done(err);
      });
    };

    ylog.silly('task @%s@ options', taskName, task.taskOpts);
    ylog.ok('initialized task @%s@', taskName);
  });

  this.options = options;
  this.tasks = tasks;
}

util.inherits(TaskControl, EventEmitter);

_.assign(TaskControl.prototype, {
  compile: function(done) {
    var opts = this.options;
    async.eachSeries(
      this.tasks,
      function(task, done) {
        // 如果正在编译没必要执行（有些编译可能会修改源代码）
        if (task.isCompiling || (task.watchedFiles && !task.watchedFiles.length)) {
          done();
        } else {
          if (task.hasFileAdd) {
            task.locate(); // 如果有文件添加需要更新下文件索引
          }
          task.compileWrap(done);
        }
      },
      function(err) {
        if (!err) {
          if (opts.environment === 'production') {
            this.transformOtherFiles();
            this.removeEmptyDirectories();
          }
        }
        if (done) {
          done(err);
        } else if (err) {
          ylog.fatal(err);
        }
      }.bind(this)
    );
  },

  /**
   * 清除空的文件夹
   */
  removeEmptyDirectories: function() {
    h.removeEmptyDirectories(this.options.distDir);
  },

  /**
   * 当 environment = production 时
   * 移动除了几个 tasks 之外的其它文件到 dist 目录中去
   */
  transformOtherFiles: function() {
    var opts = this.options;

    var assetDir = opts.assetDir, distDir = opts.distDir;

    var ignores = ['pwebrc.{json,js}', '{bower,package}.json'];
    opts.excludeDirs.concat(distDir, opts.bowerDirectory || []).forEach(function(dir) {
      ignores.push(path.join(dir, '**/*'));
    });

    var allFiles = h.findFilesByExtensions(assetDir, ['*'], true, ignores);
    var allTaskFiles = _.reduce(this.tasks, function(sum, task) {
      _.each(task.typedFiles, function(files) {
        sum.push.apply(sum, files);
      });
      return sum;
    }, []);

    var copy = _.assign({}, opts.copy);

    ylog.info.ln.title('process other type files');
    _.difference(allFiles, allTaskFiles).forEach(function(file) {
      var distFile = path.join(distDir, path.relative(assetDir, file));
      copy[distFile] = file;
    });

    _.each(copy, function(src, dist) {
      fs.ensureDirSync(path.dirname(dist));
      fs.writeFileSync(dist, fs.readFileSync(src), {encoding: null});
      ylog.info('&copy& ^%s^ => ^%s^', src, dist);
    });

  },

  /**
   * 监听 assetDir 中的所有文件的变化，如果有变化，启动编译
   *
   * @param {Object} opts
   * @param {Number} opts.interval
   * @param {Number} opts.debounceDelay
   */
  watch: function(opts) {
    var self = this;
    ylog.info.ln.title('watch src');
    ylog.info('watch directory ^%s^', this.options.assetDir);
    ylog.debug('watch options', opts);

    watch(this.options.assetDir, opts, function(files) {
      // files 是一个数组：[[event, filepath], ... ]

      _.each(self.tasks, function(task) {
        task.watchedFiles = [];
        task.hasFileAdd = false;
      });

      // 判断更新的文件是在哪个位置：styles? scripts? templates? images?
      files.forEach(function(it) {
        var event = it[0], file = it[1], task;
        // 文件删除了没必要重新编译
        if (event !== 'deleted') {
          task = _.find(self.tasks, function(t) { return t.includesFile(file); });
          if (task) {
            task.watchedFiles.push(file);
            task.hasFileAdd = true;
          }
        }
      });

      self.compile();
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
   * @param {Number} opts.port          - 指定 web 服务器端口，默认 9000
   * @param {Number} opts.livereload    - 指定 livereload 服务器端口，默认 35729，
   *                                      如果不想使用 livereload，可以将它设置成 false
   *
   * @param {String|Boolean} opts.open  - 在浏览器上打开一个文件
   * @param {String} opts.host          - 指定 web 服务器 host，默认 0.0.0.0
   * @param {String} opts.protocol      - 指定 web 服务器协议，默认 http
   * @param {Object} opts.watch         - watch 用的选项，有 interval 和 debounceDelay
   *
   * 注意，指定的 port 和 livereload 的端口可能会被使用，如果被使用了，
   *      服务器会自动定位到一个没使用的端口，所以你想要确认最新的端口是什么时，
   *      可以使用 modifiedOpts 中的 port 和 livereload 中的值
   */
  server: function(opts) {
    var self = this;
    var distDir = self.options.distDir, assetDir = self.options.assetDir;

    ylog.info.ln.title('start server');
    ylog.debug('server options', opts);

    ylog.info('watch directory ^%s^', distDir);
    watch(distDir, opts && opts.watch, function(files) {
      self.livereload(files.map(function(item) {
        return path.relative('.', item[1]);
      }));
    });

    require('./server/express-app')(opts, function(app, serOpts) {

      self.lr = app.lr;

      var express = this;

      // 处理 proxy
      var proxyOpts = self.options.proxy || self.options.server.proxy;
      if (proxyOpts) {
        var modProxy = express.modProxy = require('express-http-proxy');
        if (_.isPlainObject(proxyOpts)) {
          _.each(proxyOpts, function (target, pathPrefix) {
            app.use(pathPrefix, modProxy(target, {
              forwardPath: function(req, res) {
                ylog.info('proxy to: ^%s%s^', target, pathPrefix + req.url);
                return pathPrefix + req.url;
              }
            }));
          });
        }
      }


      // 处理 rewrite
      var rewriteOpts = self.options.rewrite || self.options.server.rewrite;
      if (rewriteOpts) {
        var modRewrite = express.modRewrite = require('connect-modrewrite');
        if (_.isArray(rewriteOpts)) {
          app.use(modRewrite(rewriteOpts));
        }
      }


      self.options.server.handler.call(this, app, serOpts, self.options);

      /*
       Url Rewrite Example:

       // http://x.com/a/b/c/styles/spring => http://x.com/spring.html
       '^/(?:[\\w\\/]+\\/)?(' + APPS.join('|') + ')([^\\.]*)$ /$1.html [L]',

       // http://x.com/a/b/c/styles/spring.css => http://x.com/styles/spring.css
       '^.*?(styles|images|scripts|views)(\\/.*)$ /$1$2 [L]'
       */

      //app.use(this.modRewrite([ '^/static/(.*) /$1' ]));


      // 这个放在最后，因为此 middle ware 是会终止的，不会继续向下执行
      app.use(express.static(distDir));
      app.use(express.static(assetDir));  // 以免有些文件没有移进来
      app.use(express.static(path.join(self.options.projectDir, 'node_modules')));

      // 也可以加上前缀
      // app.use('/static', express.static('public'));

    }, function(app, serOpts) {

      h.open(distDir, self.options.server.open, serOpts.base);

    });
  }
});

module.exports = TaskControl;
