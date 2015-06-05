/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var _ = require('lodash'),
  ylog = require('ylog')('post:web'),
  path = require('path'),
  lookup = require('look-up'),

  locate = require('./lib/locate'),
  Control = require('./task-control'),
  h = require('./helper');

ylog.attributes.time = true;
ylog.Tag.ns.len = 15;
ylog.Tag.ns.align = 'right';
ylog.timeLevelColors[0][0] = 100;
ylog.timeLevelColors[1][0] = 200;

function postWeb(dir, commands, options) {

  if (_.isPlainObject(commands)) {
    options = commands;
    commands = null;
  }

  options = options || {};
  ylog.setLevel(options.level || 'info');

  ylog.debug('postWeb function arguments', dir, commands, options);

  var cfgFile = lookup('pwebrc{.json,.js,}');
  if (cfgFile) {
    var cfgData = require(cfgFile);
    ylog.verbose('get config file ^%s^', cfgFile, cfgData);
    options = _.merge(cfgData, options);
  }

  dir = path.resolve(dir);

  process.chdir(dir); // 如果目录不存在，这里会抛出异常，就不需要我去控制了

  var pkg = h.safeReadJson(dir, 'package.json'),
    bkg = h.safeReadJson(dir, 'bower.json'),
    projectName = pkg.name || bkg.name,
    projectVersion = pkg.version || bkg.version;

  if (projectName) {
    ylog.color('green.bold').info('%s %s', projectName, projectVersion);
  }
  ylog.info('project root directory ^%s^', dir);


  // 初始化配置
  options = require('./options')(dir, options);

  // 导入项目下常见文件的数据
  _.assign(options, {
    projectName: projectName,
    projectVersion: projectVersion,
    package: pkg,
    bower: bkg,
    bowerrc: h.safeReadJson(dir, '.bowerrc'),
    gitignore: h.safeReadFileList(dir, '.gitignore')
  });

  var bowerDirectory = options.bowerrc.directory || 'bower_components';
  if (h.isDirectory(bowerDirectory)) {
    options.bowerDirectory = bowerDirectory;  // 大部分插件都需要将这个目录加入 include path
  }

  var env = options.environment;
  if (options[env]) {
    _.merge(options, options[env]);
  }
  ['production', 'development'].forEach(function(k) { delete options[k]; });

  if (options.assetDir === options.distDir) {
    throw new Error('distDir should not equal to assetDir');
  }

  // 定位每类文件所在的位置，并将其写入 options
  locate(options);



  // 运行
  commands = [].concat(commands || 'compile');
  var control = new Control(options);
  var doneCompile = function(err) {
    if (err) {
      return ylog.fatal(err);
    }

    ylog.ln.ln.ok('&Compiled ok!&').ln();
    if (_.includes(commands, 'watch')) {
      control.watch();
    }

    if (_.includes(commands, 'server')) {
      control.server();
    }

    if (options.compileEnd) {
      options.compileEnd();
    }
  };

  if (_.includes(commands, 'compile')) {
    control.compile(doneCompile);
  } else {
    doneCompile();
  }
}

module.exports = postWeb;
