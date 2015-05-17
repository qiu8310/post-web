/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */


var _ = require('lodash'),
  debug = require('debug')('post:web'),
  chalk = require('chalk'),
  path = require('path'),
  async = require('async'),

  locate = require('./lib/locate'),
  helper = require('./helper'),
  compass = require('./compass'),
  image = require('./image'),
  css = require('./css');

/**
 * 绑定一些参数到每个 task 上
 * @param {Function} tasks
 * @returns {Array}
 */
function wrapTasks(tasks) {
  var args = [].slice.call(arguments, 1);
  return tasks.map(function(task) {
    return helper.wrap.apply(helper, [task].concat(args));
  });
}

function cbThrow(err) { if (err) { throw err; } }

function postWeb(dir, options) {

  if (!helper.isDirectory(dir)) { throw new Error('Parameter <dir [' + dir + ']> should be a directory.'); }

  console.out = function () {
    var args = [].slice.call(arguments);

    if (!options.quiet || args[0] === 'red') {
      var color = _.includes(['green', 'red', 'yellow', 'blue', 'cyan', 'gray'], args[0]) ? args.shift() : 'green';

      var hasColor = chalk.hasColor(args[0]);
      args[0] = _.repeat(' ', 9 - chalk.stripColor(args[0]).length) + args[0];
      if (!hasColor) { args[0] = chalk[color](args[0]); }
      console.log.apply(console, args);
    }
  };

  // 配置项
  options = _.merge({
    projectDir: dir,
    distDir: path.join(dir, 'public'),
    environment: 'development',
    minify: false,

    // 常用文件的后缀名
    ext: {
      sass: ['sass', 'scss'],
      css: ['css'],
      js: ['js', 'jsx', 'coffee'],
      html: ['slim', 'html', 'htm', 'jade'],
      fonts: ['eot', 'ttf', 'woff', 'woff2'],
      styles: ['css', 'sass', 'scss'],
      images: ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp']
    },

    compass: {
      command: 'compile',
      require: []         // 导入需要的 compass 库
    },
    css: {

    },
    cssnext: {

    },
    cleanCss: {

    },
    image: {
      // compass 自动将指定文件夹中的所有图片生成一个 sprite 文件，
      // 如果此选项是 true，则会忽略这些有生成 sprite 文件的文件夹中的所有图片文件
      ignoreSpriteSrc: true
    },
    // imagemin 的配置选项
    imagemin: {
      interlaced: true,
      progressive: true,
      optimizationLevel: 3
    }
  }, options);


  // 定位 sassDir, imagesDir, jsDir, assetDir
  // 并且 将 assetDir 下的所有文件的后缀名变成小写的
  locate(options);
  console.out('dist dir', options.distDir);
  console.out('asset dir', options.assetDir);

  debug('all options %o', options);

  _.assign(options, {
    package: helper.safeReadJson(dir, 'package.json'),
    bower: helper.safeReadJson(dir, 'bower.json'),
    bowerrc: helper.safeReadJson(dir, '.bowerrc'),
    gitignore: helper.safeReadFileList(dir, '.gitignore')
  });


  switch (options.command) {
    case 'clean':
      compass(options, cbThrow);
      break;
    case 'server':
      break;
    case 'watch':
      break;
    default :
      async.series( wrapTasks([compass, css, image], options), cbThrow );
      break;
  }

}

module.exports = postWeb;
