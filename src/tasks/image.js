/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var os = require('os'),
  fs = require('fs-extra'),
  path = require('path');

var glob = require('glob'),
  async = require('async'),
  chalk = require('chalk'),
  debug = require('debug')('post:image'),
  ImageMin = require('imagemin'),
  prettyBytes = require('pretty-bytes'),
  _ = require('lodash');

function image(options, next) {

  var projectDir = options.projectDir,
    imageOpts = options.image,
    minOpts = options.imagemin,
    minify = ('minify' in imageOpts) ? imageOpts.minify : options.minify,
    imagesDir = options.imagesDir,
    // TODO 没有执行 compass
    imagesGenDir = path.join(projectDir, options.compass.generatedImagesPath || 'images/gen'),

    imagesDistDir = options.imagesDistDir;

  if (!imagesDir) { return next(); }


  var pattern = '**/*.{' + options.ext.images + '}';

  var imageFiles = glob.sync(pattern, {nodir: true, cwd: imagesDir});

  if (imageOpts.ignoreSpriteSrc) {
    var spriteFiles = _.map(glob.sync(pattern, {nodir: true, cwd: imagesGenDir}), function(f) {
      return f.replace(/-\w+\.\w+$/, '');
    });
    imageFiles = _.filter(imageFiles, function(f) {
      return _.all(spriteFiles, function(sf) { return f.indexOf(sf) !== 0; });
    });
  }

  var totalSaved = 0, filesCount = 0;
  async.forEachLimit(imageFiles, os.cpus().length * 2, function(f, done) {
    var target = path.join(imagesDistDir, f),
      targetStats;

    f = path.join(imagesDir, f);

    var min = new ImageMin()
      .src(f)
      .dest(path.dirname(target));

    if (minify) {
      min.use(ImageMin.jpegtran(minOpts))
        .use(ImageMin.gifsicle(minOpts))
        .use(ImageMin.optipng(minOpts))
        .use(ImageMin.svgo(minOpts));
    }


    fs.stat(f, function (err, stats) {
      if (err) {
        console.out('red', 'error', f, err);
        return done();
      }

      try {
        targetStats = fs.statSync(target);
        if (targetStats.mtime > stats.mtime) {
          //console.out('yellow', 'unchanged', target);
          return done();
        }
      } catch (e) {}


      min.run(function(err, data) {
        if (err) {
          console.out('red', 'error', f, err);
          return done();
        }

        if (minify) {
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
          // ℡ (U+2121), ☎ (U+260E), ☏ (U+260F), ✆ (U+2706)
          // ✓ ✔ ☑
          // ✗ ✘ ☒
          console.out('✔ ', f, chalk.gray('(' + msg + ')'));
        } else {
          console.out('copy', f, '=>', target);
        }
        process.nextTick(done);
      });
    });

  }, function (err) {

    if (filesCount > 0) {
      console.out('imagemin', 'minified ' + filesCount +
        (filesCount > 1 ? ' images' : ' image') +
        chalk.gray(' (saved ' + prettyBytes(totalSaved) + ')')
      );
    }

    // 清除 imagesGenDir ( sass 会缓存，不要清除，影响编译速度 )
    // fs.removeSync(imagesGenDir);

    next(err);
  });
}

module.exports = image;
