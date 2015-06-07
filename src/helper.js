/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var fs = require('fs-extra'),
  _ = require('lodash'),
  glob = require('glob'),
  xopen = require('open'),
  path = require('path');

var EOL = require('os').EOL;

function join(args) {
  return path.join.apply(path, args);
}

var helper = {

  /**
   * End of Line
   *
   * @type {String}
   */
  EOL: EOL,

  /**
   * 得到文件的不带 . 的后缀名（可能是空字符串）
   * @param {string} file
   * @returns {string}
   */
  ext: function(file) {
    return path.extname(file).substr(1).toLowerCase();
  },

  /**
   * 从一个数组中得到一个 glob 的 pattern
   * @param {Array} arr
   * @returns {String}
   */
  getGlobPatternFromList: function(arr) {
    switch (arr.length) {
      case 0:
        return '*';
      case 1:
        return arr[0];
      default:
        return '{' + arr.join(',') + '}';
    }
  },

  findFilesByPattern: function(pattern, ignore) {
    return glob.sync(pattern, {
      dot: false,
      nocase: true,
      nosort: true,
      nodir: true,
      ignore: [].concat(ignore || [])
    });
  },

  findFilesByExtensions: function(dir, extensions, deep, ignore) {
    var pattern = path.join(dir, (deep ? '**/' : '') + '[!_]*.');
    return this.findFilesByPattern(pattern + this.getGlobPatternFromList(extensions), ignore);
  },

  /**
   *
   * 读取 json 文件，忽略一切错误，有错误就返回一个空的 object
   *
   * @returns {Object}
   */
  safeReadJson: function () {
    try {
      return fs.readJsonFileSync(join(arguments));
    } catch (e) {
    }
    return {};
  },

  /**
   * 读取像 .gitignore 文件一样的文件列表文件，忽略一切错误
   *
   * @returns {Array}
   */
  safeReadFileList: function () {
    try {
      var content = helper.readFile(join(arguments));
      return _(content.split(/[\r]?\n/))
        .map(function (line) {
          return line.split('#').shift();
        })
        .filter(function (line) {
          return line;
        }).value();
    } catch (e) {
    }
    return [];
  },


  /**
   * 读取文件内容，默认的 fs.readFileSync 总是返回一个 Buffer，需要手动 toString 下，好烦
   *
   * @returns {String}
   */
  readFile: function () {
    return fs.readFileSync(join(arguments)).toString();
  },


  /**
   * 判断某个文件是否是个文件夹
   *
   * @returns {Boolean}
   */
  isDirectory: function () {
    try {
      return fs.statSync(join(arguments)).isDirectory();
    } catch (e) {
    }
    return false;
  },

  isFile: function() {
    try {
      return fs.statSync(join(arguments)).isFile();
    } catch (e) {}
    return false;
  },

  /**
   *
   * 用户配置的目录可能是相对于当前路径的目录，也可能是相对于 projectDir 的目录；
   * 由此程序来根据文件是否存在来判断用哪个目录，如果两个目录都不存在，则使用相对于当前路径的目录
   *
   * 最后返回相对于 projectDir 的目录
   *
   * @param {String} dir
   * @param {String} projectDir
   * @returns {String}
   */
  relativePath: function (dir, projectDir) {
    var target = path.resolve(dir),
      projectTarget = path.resolve(projectDir, dir);

    if (helper.isDirectory(projectTarget)) {
      target = projectTarget;
    }

    return path.relative(projectDir, target);
  },

  /**
   * 用浏览器打开文件
   */
  open: function(dirs, file, host) {
    if (!file) { return false; }

    var target;
    var found = file === true ? '**/*.{html,htm}' : file;
    _.each([].concat(dirs), function(dir) {
      _.each(helper.findFilesByPattern(path.join(dir, found)), function(f) {
        target = path.relative(dir, f);
        return false;
      });
      if (target) { return false; }
    });

    xopen(host + '/' + (target || (file === true ? '' : file)));
  },


  removeEmptyDirectories: function(dir) {
    var isEmpty = false, count = 0;
    _.each(fs.readdirSync(dir), function(file) {
      var child = path.join(dir, file);
      if (helper.isDirectory(child)) {
        count += helper.removeEmptyDirectories(child) ? 0 : 1;
      } else {
        count ++;
      }
    });

    if (count === 0) {
      fs.removeSync(dir);
      isEmpty = true;
    }

    return isEmpty;
  }
};


module.exports = helper;
