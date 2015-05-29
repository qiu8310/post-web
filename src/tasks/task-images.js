/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var ylog = require('ylog')('post:images'),
  glob = require('glob'),
  path = require('path'),
  fs = require('fs-extra'),
  _ = require('lodash'),
  ImageMin = require('imagemin'),
  prettyBytes = require('pretty-bytes');


module.exports = require('./task-base').extend({

  xinit: function() {
    this.name = 'images';
    this.typedFiles = this.getTypedFiles(['img'], true);
  },

  initImg: function() {
    var imgFiles = this.typedFiles.img, imgDir = this.options.src.images;

    // 过滤掉 compass 已经生成了 sprite 文件的源文件
    var genImgDir = this.options.tasks.styles.compass.generatedImagesPath;
    if (genImgDir) {
      var genImgFiles = glob.sync('**/*.*', {nodir: true, cwd: genImgDir}).map(function(f) {
        return path.join(imgDir, f.replace(/-\w+\.\w+$/, '/')); // xxx/sp-s84ab2f73b6.png => xxx/sp
      });
      imgFiles = imgFiles.filter(function(f) {
        return _.all(genImgFiles, function(gf) { return f.indexOf(gf) !== 0; });
      });
    }

    this.imgFiles = imgFiles;
  },

  compileImg: function(done) {
    var totalSaved = 0, filesCount = 0,
      self = this, imgMinOpts = this.taskOpts.imagemin;

    this.async.forEachLimit(this.imgFiles, this.options.runLimit, function(f, done) {
      var target = self.getDistFile(f),
        targetStats;

      var min = new ImageMin()
        .src(f)
        .dest(path.dirname(target));

      if (self.minify) {
        min.use(ImageMin.jpegtran(imgMinOpts))
          .use(ImageMin.gifsicle(imgMinOpts))
          .use(ImageMin.optipng(imgMinOpts))
          .use(ImageMin.svgo(imgMinOpts));
      }


      fs.stat(f, function (err, stats) {
        if (err) { return done(err); }

        if (!self.minify) {
          try {
            targetStats = fs.statSync(target);
            if (targetStats.mtime > stats.mtime) {
              ylog.info('!unchaged! ^%s^', target);
              return done();
            }
          } catch (e) {}
        }

        min.run(function(err, data) {
          if (err) { return done(err); }

          if (self.minify) {
            filesCount++;
            var msg;
            var origSize = stats.size;
            var diffSize = origSize - data[0].contents.length;

            totalSaved += diffSize;
            if (diffSize < 10) {
              msg = 'already optimized';
            } else {
              msg = 'saved ' + prettyBytes(diffSize) + ' - ' + (diffSize / origSize * 100).toFixed() + '%';
            }
            ylog.info.writeOk('^%s^ *(%s)*', f, msg);
          } else {
            ylog.info.writeOk('copy ^%s^ to ^%s^', f, target);
          }

          process.nextTick(done);
        });
      });

    }, function (err) {

      if (filesCount > 0) {
        ylog.ok('@imagemin@ minified %d image%s (saved %s)',
          filesCount, filesCount > 1 ? 's' : '', prettyBytes(totalSaved));
      }

      done(err);
    });
  },

  compile: function(done) {
    this.runParallel('compile', ['img'], done);
  }

});
