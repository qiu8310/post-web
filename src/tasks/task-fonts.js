/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var h = require('../helper');
var _ = require('lodash');
var path = require('path');
var FontMin = require('fontmin');

module.exports = require('./task-base').extend({

  compileFont: function(done) {
    var fontFiles = this.typedFiles.font;

    this.batchMinProcess('font', function(src, dist, cb) {
      var fm = new FontMin()
        .src(src)
        .dest(path.dirname(dist));


      fm.use(FontMin.glyph()); // 只能压缩 ttf（不过其它 font 都可以通过 FontMin 由 ttf 生成）

      var ext = h.ext(src), base = path.basename(src).replace(/\.\w+$/, '');

      // 自动根据 ttf 字体格式判断有没有其它三类字体格式，没有则创建它们
      if (ext === 'ttf') {
        ['eot', 'svg', 'woff'].forEach(function(k) {
          var exist = _.find(fontFiles, function(f) {
            return path.basename(f) === base + '.' + k;
          });

          if (!exist) {
            fm.use(FontMin['ttf2' + k]());
          }

          // 如果是 ttf 还可以生成 css
          //fm.use(FontMin.css());
        });
      }

      fm.run(function(err, files) {
        cb(err, files && files[0] && files[0].contents);
      });
    }, done);
  },


  compile: function(done) {
    this.runParallel('compile', ['font'], done);
  }

});
