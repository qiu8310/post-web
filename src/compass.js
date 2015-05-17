/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

'use strict';
var dargs = require('dargs'),
  fs = require('fs-extra'),
  path = require('path'),
  glob = require('glob'),
  _ = require('lodash'),
  debug = require('debug')('post:compass');

var spawn = require('./lib/spawn'),
  CpsBoot = require('./lib/compass-bootstrap.js'),
  helper = require('./helper');


/**
 * 执行 compass 命令
 * @param {Object} options              - 全局的配置
 * @param {Function} next               - 下一个要执行回调函数
 * @param {String} options.projectDir     - 项目根目录
 * @param {Object} options.compass        - compass 的命令行配置
 *
 */
function compass (options, next) {

  /*
   compass compile --xxx  =>  Trigger compass show all available options
   */
  if (!options.sassDir) {
    return next();
  }

  var projectDir = options.projectDir,
    assetDir = options.assetDir;

  options.compass = _.extend({
    quiet: false,
    relativeAssets: true,
    noLineComments: true
  }, options.compass, {
    appDir: '.'  // 执行子程序的时候会跳转到 projectDir
  });

  var cpsOpts = options.compass;

  ['sass', 'images', 'js', 'fonts'].forEach(function(key) {

    var optKey = key.replace('js', 'javascripts') + 'Dir';

    // 如果目录不存在，就随便指定一个
    cpsOpts[optKey] = path.relative(projectDir, options[key + 'Dir'] || path.join(assetDir, key));
  });

  cpsOpts.cssDir = path.join(path.dirname(cpsOpts.sassDir), '.tmpCss'); // 将 css 放到一个临时文件夹中，之后将其移走

  if (!cpsOpts.generatedImagesPath) {
    cpsOpts.generatedImagesPath = path.join(cpsOpts.imagesDir, 'gen');
  }

  if (options.command === 'clean') {
    [options.distDir, path.join(projectDir, cpsOpts.generatedImagesPath)].forEach(function(dir) {
      console.out('yellow', 'remove', dir);
      fs.removeSync(dir);
    });
    return next();
  } else if (options.command !== 'compile') {
    return next();
  }

  cpsOpts.require = [].concat(cpsOpts.require || []);
  cpsOpts.importPath = [].concat(cpsOpts.importPath || []);


  // 加载 plugins 中的插件
  var pluginDir = path.resolve(__dirname, '../plugins');
  var mySassExtensions = glob.sync(path.join(pluginDir, 'extensions/**/*.rb'));
  ['compass/import-once/activate', 'ceaser-easing'].concat(mySassExtensions).forEach(function(req) {
    debug('require', req);
    cpsOpts.require.push(req);
  });


  // 加载 import path
  cpsOpts.importPath.push(path.join(pluginDir, 'sass'));
  var bowerDirectory =  path.join(projectDir, options.bowerrc.directory || 'bower_components');
  if (helper.isDirectory(bowerDirectory)) { cpsOpts.importPath.push(bowerDirectory); }

  // 设置 bootstrap
  var boot = new CpsBoot(path.resolve(projectDir, cpsOpts.sassDir), cpsOpts);

  // 执行 compass 命令
  var args = ['compass' + (process.platform === 'win32' ? '.bat' : '')].concat(cpsOpts.command);

  [].push.apply(args, dargs(cpsOpts, {ignoreFalse: true, excludes: ['command']}));

  debug('options', cpsOpts);
  debug('execute', args.join(' '));

  spawn(args, {cwd: projectDir}, function(err) {

    // 删除 .sass-cache 文件
    fs.removeSync(path.join(projectDir, '.sass-cache'));

    // 恢复 bootstrap
    boot.recover();

    next(err);
  });
}

module.exports = compass;
