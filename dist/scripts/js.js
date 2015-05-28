/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var ts = require('typescript');

console.log(Object.keys(ts).filter(function(k) { return typeof ts[k] === 'function'; }));
