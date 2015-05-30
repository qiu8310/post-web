/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var glob = require('glob'),
  path = require('path'),
  _ = require('lodash'),
  ImageMin = require('imagemin');


module.exports = require('./task-base').extend({

  // 这个不能设置成 initImg，因为它和文件有关，文件都是在变化的
  beforeCompileImage: function() {
    var imageFiles = this.typedFiles.image, imgDir = this.options.src.images;

    // 过滤掉 compass 已经生成了 sprite 文件的源文件
    var genImgDir = this.options.tasks.styles.compass.generatedImagesPath;
    if (genImgDir) {
      var genImgFiles = glob.sync('**/*.*', {nodir: true, cwd: genImgDir}).map(function(f) {
        return path.join(imgDir, f.replace(/-\w+\.\w+$/, '/')); // xxx/sp-s84ab2f73b6.png => xxx/sp
      });

      imageFiles = imageFiles.filter(function(f) {
        return _.all(genImgFiles, function(gf) { return f.indexOf(gf) !== 0; });
      });
    }

    this.imageFiles = imageFiles;
  },

  compileImage: function(done) {
    this.beforeCompileImage();
    var imgMinOpts = this.taskOpts.imagemin;

    this.batchMinProcess('image', this.imageFiles, function(src, dist, cb) {
      var min = new ImageMin()
        .src(src)
        .dest(path.dirname(dist));

      // 如果不传任何 use， ImageMin 默认就使用下面四种 plugin，但为了给它传参数，咱们还是加上吧
      min.use(ImageMin.jpegtran(imgMinOpts))
        .use(ImageMin.gifsicle(imgMinOpts))
        .use(ImageMin.optipng(imgMinOpts))
        .use(ImageMin.svgo(imgMinOpts));

      min.run(function(err, files) {
        cb(err, files && files[0] && files[0].contents);
      });
    }, done);
  },

  compile: function(done) {
    this.runParallel('compile', ['image'], done);
  }

});
