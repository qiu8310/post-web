/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var fs = require('fs-extra'),
  path = require('path'),
  _ = require('lodash'),
  glob = require('glob');


var ylog = require('ylog')('post:tpl');


module.exports = require('./task-base').extend({

  init: function() {
    this.name = 'templates';

    var types = ['html', 'markdown', 'jade', 'slim', 'haml'];

    // 查看有没有 sass, less, stylus, css，此函数同时会设置 this.enables 属性
    this.typedFiles = this.getTypedFiles(types, true);

    // 有 styles 就一定要编译 html
    this.enables.html = true;
  },

  compile: function(done) {
    ylog.info.title('compiling task %s', this.name);

    fs.ensureDirSync(this.tmp);
    //this.runSeriesParallel('compile', [['compass', 'stylus', 'less'], 'css'], function(err) {
    //  fs.removeSync(this.tmp);
    //  if (!err) {
    //    ylog.ok('compiled task @%s@', this.name);
    //  }
    //  done(err);
    //});
  }

});
