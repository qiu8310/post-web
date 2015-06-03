/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var glob = require('glob');
var fs = require('fs-extra');
var lookup = require('look-up');
var path = require('path');


/**
 * 过滤点以 . 开头的文件，并且文件必须要存在 targetDirectory 之内
 */
function filter(file, targetDirectory) {
  if (file[0] !== '.' && file.indexOf(targetDirectory) === 0) {
    file = file.substr(targetDirectory.length + 1);
    if (file && file[0] !== '.') {
      return file;
    }
  }
  return false;
}

/**
 *
 * 解析 directory 下的 .gitignore 文件，得到可以在 targetDirectory 下忽略的文件
 *
 * - 如果不指定 targetDirectory，则 targetDirectory = directory
 *
 */
function parseGitIgnoreFiles(directory, targetDirectory) {
  var result = [];

  targetDirectory = targetDirectory || directory;
  try {
    fs.readFileSync(path.join(directory, '.gitignore')).toString().split('\n').forEach(function(file) {
      file = file.split('#').shift().trim();
      if (file && file[0] !== '.') {
        glob.sync(path.resolve(directory, file)).forEach(function(globFile) {
          result.push(filter(globFile, targetDirectory));
        });
      }
    });
  } catch (e) { }

  return result;
}

/**
 *
 * 忽略 .bowerrc 中指定的 directory 文件
 *
 */
function ignoreBowerDirectory(directory, targetDirectory) {
  var ignore;
  targetDirectory = targetDirectory || directory;
  try {
    var bowerrc = fs.readJsonFileSync(path.resolve(directory, '.bowerrc'));

    if (bowerrc.directory) {
      ignore = path.resolve(directory, bowerrc.directory);
      return filter(ignore, targetDirectory);
    }
  } catch (e) { }
}

/**
 *
 * 得到一批文件的共同父目录
 *
 */
function getFilesParentDirectories(files) {

  if (!files.length) { return []; }

  files = files.map(function(file) {
    return path.dirname(file);
  });

  var result = [], first;

  files.sort(function(a, b) { return a.length - b.length; });

  first = files.shift();
  result.push(first);

  // 如果是当前目录，则没有比它更上一层的了，直接把它当作父目录了
  if (first === '.') { return result; }

  files.forEach(function(file) {
    var exists;
    result.forEach(function(r) {
      if (file.indexOf(r) === 0) {
        exists = true;
      }
    });
    if (!exists) {
      result.push(file);
    }
  });
  return result;
}


var ignoresCache = {};
function getIgnores(directory) {
  if (!ignoresCache[directory]) {
    var ignores = [

      '**/{bower_components,vendors,vendor,plugin,plugins,node_modules}/**',
      '{test,example,examples}/**'

    ], addIgnore = function(items) {
      [].concat(items).forEach(function(item) {
        if (item && ignores.indexOf(item) < 0) { ignores.push(item); }
      });
    };

    var root = lookup('package.json', { cwd: directory });
    root = root && path.dirname(root);

    if (root) {
      addIgnore(parseGitIgnoreFiles(root, directory));
      addIgnore(ignoreBowerDirectory(root, directory));
    }

    if (root !== directory) {
      addIgnore(parseGitIgnoreFiles(directory));
      addIgnore(ignoreBowerDirectory(directory));
    }

    ignoresCache[directory] = ignores;
  }

  return ignoresCache[directory];
}

/**
 * 在 directory 下查找 pattern 指定的文件的父目录
 *
 * 查找 pattern 文件前要排除以下文件：
 *
 *  - 所有 . 开头的文件夹
 *  - .gitignore 中指定的所有文件
 *  - 根目录下的 test, example, examples 目录
 *  - 所有目录下的 node_modules 目录
 *  - .bowerrc 中指定的 {"directory": "..."} 目录
 *
 *
 * @param {String} pattern
 * @param {String} directory
 * @param {String|Array} [ignores]
 * @returns {Array}
 */
function findPatternDirectoriesIn(pattern, directory, ignores) {
  directory = path.resolve(directory);

  // '**/[!_]*.s{a,c}ss' => sass
  var files = glob.sync(pattern, {
    cwd: directory,
    dot: false,
    nocase: true, // 主要是匹配文件后缀名，文件后缀名大小写不敏感
    nosort: true,
    nodir: true,
    ignore: getIgnores(directory).concat(ignores || [])
  });

  return getFilesParentDirectories(files).map(function(dir) {
    return path.join(directory, dir);
  });
}

module.exports = findPatternDirectoriesIn;
