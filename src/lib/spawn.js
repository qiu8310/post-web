/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var spawn = require('cross-spawn');
var _ = require('lodash');
var ylog = require('ylog')('post:spawn');

/**
 *
 * @param {Array.<String>} args
 * @param {Object} options
 * @param {Function} done
 */
module.exports = function(args, options, done) {

  options = _.extend({
    env: process.env,
    cwd: process.cwd(),
    stdin: process.stdin,
    stdout: null,   // 默认不要执行的命令输出任何东西
    stderr: process.stderr
  }, options);


  if (options.autoAppendBat !== false && process.platform === 'win32') {
    args[0] = args[0] + '.bat';
  }

  var cmd = args.join(' ');
  ylog.debug('executing ^%s^', cmd);

  var child = spawn(args.shift(), args, {
    env: options.env,
    cwd: options.cwd,
    stdio: [
      options.stdin,
      options.stdout,
      options.stderr
    ]
  });

  child.on('exit', function (code) {
    if (done) {
      if (code === 0) {
        ylog.debug('executed ^%s^', cmd);
        done(null);
      } else {
        ylog.fatal('executing error `%s`', cmd);
        done(new Error('Execute script error.'));
      }
    }
  });
};
