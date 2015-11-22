/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var path = require('path'),
  _ = require('lodash'),
  chokidar = require('chokidar');
  // gaze 在监听文件夹到查看文件夹内容之间会有个间隙，如果在这个间隙内文件夹被删除，程序就会出错
  // gaze = require('gaze');


var ylog = require('ylog')('post:watch');

var ignores = [];

/**
 * 监听 dirs 中的文件的变化
 *
 * @param {String} dirs
 * @param {Object} opts
 * @param {Number} opts.interval
 * @param {Number} opts.debounceDelay
 * @param {Function} cb
 */
function watch (dirs, opts, cb) {
  var watchPattern = [].concat(dirs).map(function(dir) {
    return path.join(dir, '**/*.*');
  });

  opts = _.assign({
    interval: 400,
    ignored: '.tmp-*',
    debounceDelay: 600
  }, opts);

  ylog.debug('watch %o', watchPattern);
  ylog.debug('watch options', opts);


  var files = [],
    dotFileRe = /(^|\\|\/)\.\w/,
    handler = _.debounce(function() {
      cb(files);
      files.length = 0; // 清空数组
    }, opts.debounceDelay - 200);

  var watcher = chokidar.watch(watchPattern, opts);
    // gaze: changed/added/deleted
    // chokidar: add/change/unlink/addDir/unlinkDir/ready/error/raw

  var startTime = Date.now();
  watcher.on('all', function(event, file) {
    // 忽略前两秒的文件变化，主要是 chokidar 会将初始化的监听也加上来
    if (Date.now() - startTime < 2000) return false;

    if (event === 'add') event = 'added';
    else if (event === 'change') event = 'changed';
    else if (event === 'unlink') event = 'deleted';
    else {
      ylog.info('ignore ~%s~ ^%s^', event, file);
      return false;
    }

    // 只有第一次忽略，第二次再过来就不忽略了
    if (_.includes(ignores, file)) {
      return ignores.splice(ignores.indexOf(file), 1);
    }

    // dot 开头的文件不需要监听
    if (!dotFileRe.test(file)) {
      files.push([event, file]);
      var md = event === 'changed' ? '&' : (event === 'added' ? '**' : '#');
      ylog.info('%s%s%s ^%s^', md, event, md, file);
      handler();
    }
  });

  // 处理错误
  watcher.on('error', function(err) { ylog.error(err); });
}

watch.addIgnoreFile = function (file) {
  if (!_.includes(ignores, file)) {
    ignores.push(file);
  }
};

module.exports = watch;
