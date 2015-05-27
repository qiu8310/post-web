/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 *
 * 根据 https://github.com/sindresorhus/dargs 改编
 *
 * 因为有些命令不能使用 --foo=bar，需要使用 --foo bar
 *
 */

'use strict';

module.exports = function (input, opts) {
  var args = [],
    createArg = function (key, val) {
      key = '--' + key.replace(/[A-Z]/g, '-$&').toLowerCase();

      if (opts.noEqual) {
        args.push(key);
        if (val) {
          args.push(val);
        }
      } else {
        args.push(key + (val ? '=' + val : ''));
      }
    };

  opts = opts || {};

  Object.keys(input).forEach(function (key) {
    var val = input[key];

    if (Array.isArray(opts.excludes) && opts.excludes.indexOf(key) !== -1) {
      return;
    }

    if (Array.isArray(opts.includes) && opts.includes.indexOf(key) === -1) {
      return;
    }

    if (val === true) {
      createArg(key);

    } else if (val === false && opts.autoPrefixNo) {
      createArg('no-' + key);

    } else if (typeof val === 'string') {
      createArg(key, val);


    } else if (typeof val === 'number' && isNaN(val) === false) {
      createArg(key, val + '');

    } else if (Array.isArray(val)) {
      val.forEach(function (arrVal) {
        createArg(key, arrVal)
      });
    }
  });

  return args;
};
