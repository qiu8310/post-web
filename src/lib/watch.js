/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var path = require('path'),
  _ = require('lodash'),
  gaze = require('gaze');

var ylog = require('ylog')('post:watch');

var ignores = [];

/**
 * 监听 dir 中的文件的变化
 *
 * @param {String} dir
 * @param {Object} opts
 * @param {Number} opts.interval
 * @param {Number} opts.debounceDelay
 * @param {Function} cb
 */
function watch (dir, opts, cb) {
  var gazePattern = path.join(dir, '**/*.*');
  opts = _.assign({
    interval: 400,
    debounceDelay: 600
  }, opts);

  ylog.debug('watch %s', path.resolve(gazePattern));
  ylog.debug('watch options', opts);


  var files = [],
    dotFileRe = /(^|\\|\/)\.\w/,
    handler = _.debounce(function() {
      cb(files);
      files.length = 0; // 清空数组
    }, opts.debounceDelay - 200);

  gaze(gazePattern, opts, function(err) {

    // On changed/added/deleted
    this.on('all', function(event, file) {

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
    this.on('error', function(err) { ylog.error(err); });
    if (err) { ylog.error(err); }
  });
}

watch.addIgnoreFile = function (file) {
  if (!_.includes(ignores, file)) {
    ignores.push(file);
  }
};

module.exports = watch;
