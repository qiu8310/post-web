/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var spawn = require('cross-spawn');
var _ = require('lodash');

module.exports = function(args, options, next) {

  options = _.extend({
    env: process.env,
    cwd: process.cwd()
  }, options);

  var cmd = args.join(' ');

  var child = spawn(args.shift(), args, {
    env: options.env,
    cwd: options.cwd,
    stdio: [
      process.stdin,
      process.stdout,
      process.stderr
    ]
  });

  child.on('exit', function (code) {
    if (next) {
      next(code === 0 ? null : new Error('Execute script error: \r\n' + cmd));
    }
  });
};
