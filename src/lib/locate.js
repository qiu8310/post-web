/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var path = require('path'),
  chalk = require('chalk'),
  fs = require('fs-extra');

var locatePatternDirs = require('./locate-pattern-dirs'),
  helper = require('./../helper');

/**
 *
 * 得到 sassDir, assetDir, jsDir, imagesDir, fontsDir
 * 它们都是相对于 projectDir 的一个目录
 *
 * 得到 cssDistDir, jsDistDir, imagesDistDir, fontsDistDir
 *
 * 同时，将 assetDir 目录下的所有文件的后缀名小写
 *
 * @param {Object} options
 */
module.exports = function(options) {
  var ext = options.ext;

  var assetDir = options.assetDir,
    distDir = options.distDir,
    projectDir = options.projectDir,

    getPattern = function (key) {
      var es = [].concat(ext[key]);
      if (es.length > 1) {
        es = '{' + es.join(',') + '}';
      } else if (!es.length) {
        throw new Error('Extensions for ' + key + ' not found.');
      }
      return (key === 'sass' ? '**/[!_]*.' : '**/*.') + es;
    };

  // assetDir 可能是用户配置的，它可能是相对于当前目录，也可能是相对于 projectDir，这里自动判断哪个文件存在就用哪个
  if (assetDir) { assetDir = helper.relativePath(assetDir, projectDir); }

  // 保存各类文件所在的目录
  //options.src = {};
  //options.dist = {};
  //var locateBaseDir = assetDir || projectDir, foundAnyTypedFiles;
  //['styles', 'scripts', 'templates', 'sass', 'images', 'fonts'].forEach(function(key) {
  //  var ignoreDistDirPattern = path.relative(locateBaseDir, distDir) + '/**';
  //  var typedFileDirs = locatePatternDirs(getPattern(key), locateBaseDir, ignoreDistDirPattern);
  //
  //
  //
  //});

  var locateDir = assetDir || projectDir, foundAny;
  var fileTypes = ['sass', 'css', 'images', 'fonts', 'js', 'html'];
  fileTypes.forEach(function(key) {
    var ignore = path.relative(locateDir, distDir) + '/**';
    var dirs = locatePatternDirs(getPattern(key), locateDir, ignore).map(function(dir) {
      return path.join(locateDir, dir);
    });
    var optKey = key + 'Dir';
    if (!dirs.length) {
      console.out('yellow', 'locate', key + ' directory: ' + chalk.gray('(not found)'));
      options[optKey] = false;
    } else if (dirs.length === 1) {
      console.out('green', 'locate', key + ' directory: ' + chalk.cyan(dirs[0]));
      options[optKey] = dirs[0];
      foundAny = true;
      if (!assetDir && key !== 'html') {
        assetDir = path.dirname(dirs[0]);
        // 不这样的话，根目录下有很多 js 文件，很容易把根目录当作 jsDir，所以上面也是把 js 和 html 放在最后定位
        locateDir = assetDir;
      }
    } else {
      throw new Error('Found ' + key + ' files in ' + dirs.length + ' directories: ' + dirs.join(', '));
    }
  });

  if (!foundAny) {
    console.out('yellow', 'locate', 'not found any asset files, exit!');
    process.exit(0);
  }


  options.assetDir = assetDir;


  // 清空 distDir （清空后图片得重新压缩，太慢了）
  //fs.emptyDirSync(options.distDir);


  // 确定 xxxDistDir
  // @TODO 不需要 xxxDistDir ， 只需要一个 dist 和 distFile 函数就行了，注意（coffee, sass 这些文件夹）
  fileTypes.forEach(function(key) {
    var optKey = key + 'Dir', optDistKey = (key === 'sass' ? 'css' : key) + 'DistDir';

    if (!options[optKey]) {
      options[optDistKey] = false;
    } else {
      var target = path.relative(assetDir, options[optKey]);
      if (key === 'sass' || key === 'css') {  // @TODO a little trick, fix it (css 或 saa 必须放到一个文件夹内？)
        target = target.replace(/(sass|scss)$/, 'css');
      }
      options[optDistKey] = path.join(distDir, target);

      fs.ensureDirSync(options[optDistKey]);
    }
  });

};
