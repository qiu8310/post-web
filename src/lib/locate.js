/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var path = require('path'),
  fs = require('fs-extra'),
  _ = require('lodash'),
  ylog = require('ylog')('post:locate');

var locatePatternDirs = require('./locate-pattern-dirs'),
  h = require('./../helper');



// 排除 用户指定的要忽略的文件夹 及 distDir
function getIgnoresFromLocateBaseDir(locateBaseDir, options) {
  var ignores = _.map(options.excludeDirs.concat(options.distDir), function(dir) {
    return path.relative(locateBaseDir, path.join(dir, '**'));
  });
  ylog.verbose('locating directories exclude those file patterns ^%o^', ignores);
  return ignores;
}

/**
 *
 * 得到 styles, scripts, templates, images, fonts 对应的目录
 * 它们都是相对于 projectDir 的一个目录
 *
 * // 同时，将 assetDir 目录下的所有文件的后缀名小写（会影响 glob 匹配）（还是不要这样做了）
 *
 * @param {Object} options
 */
module.exports = function(options) {
  var cfg = options.locate;

  var assetDir = options.assetDir,
    distDir = options.distDir,
    projectDir = options.projectDir;

  ylog.line();
  ylog.info.title('locating asset directory');

  // 保存各类文件所在的目录
  var locateBaseDir = assetDir || '.'; // . 表示的是 projectDir，因为默认的 projectDir 是 absolute path

  var ignores = getIgnoresFromLocateBaseDir(locateBaseDir, options), foundAny;

  _.each(cfg, function(exts, key) {
    ylog.verbose('locating @%s@ directory by searching file extensions ^%o^', key, exts);
    var locatedDirs = locatePatternDirs('**/[^_]*.' + h.getGlobPatternFromList(cfg[key]), locateBaseDir, ignores);

    switch (locatedDirs.length) {
      case 0:
        //options.src[key] = false;
        //options.dist[key] = false;
        ylog.info('located @%s@ directory: *(none)*', key);
        break;
      case 1:
        foundAny = true;
        var locatedDir = path.relative(projectDir, locatedDirs[0]) || '.'; // 两个目录一样会返回空字符串
        ylog.info('located @%s@ directory: ^%s^', key, locatedDir);

        // 如果没有设置 assetDir，则把当前目录的父目录设置成 assetDir
        // 有可能 css 和 html 在同一个文件夹下
        if (!assetDir) {
          assetDir = path.dirname(locatedDir);
          options.assetDir = assetDir;
          ylog.info('assume your asset directory is ^%s^', assetDir);

          if (locateBaseDir !== assetDir) {
            locateBaseDir = assetDir;
            ignores = getIgnoresFromLocateBaseDir(locateBaseDir, options);
          }
        }
        options.src[key] = locatedDir;
        options.dist[key] = path.join(distDir, path.relative(assetDir, locatedDir));

        // 临时文件可能是和项目文件夹同一级别，它可能不在 projectDir 中
        options.tmp[key] = path.relative(projectDir, path.join(path.dirname(path.resolve(locatedDir)), '.tmp-' + key));
        break;
      default :
        ylog.fatal('#%s files directory should be in one directory, two located: %o#', key, locatedDirs);
        throw new Error(key + ' files not in one directory');
    }
  });


  if (!foundAny) {
    ylog.fatal('#located no files#');
    throw new Error('located no files');
  }

  ylog.verbose.writeFlag(options.src, 'Src directory');
  ylog.verbose.writeFlag(options.dist, 'Dist directory');


  // 清空 distDir （清空后图片得重新压缩，太慢了，所以只有在发布的时候才清空）
  if (options.environment === 'production') {
    fs.emptyDirSync(options.distDir);
    ylog.info('empty dist directory ^%s^', options.distDir);
  }
};
