/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var fs = require('fs-extra'),
  path = require('path'),
  glob = require('glob'),
  _ = require('lodash');

var helper = require('./../helper');
var watch = require('./watch');

var startTag = '// BOOTSTRAP START',
  endTag = '// BOOTSTRAP END',
  importReg = /@import\s+.*$/m,
  sassReg = new RegExp('\\s' + startTag + '[\\s\\S]*?' + endTag + '\\s');


function getImports(reqFile, isSass, importPaths) {
  var requires = helper.safeReadFileList(reqFile);
  var result = [], tmp, globOpts = {nodir: true};

  result.push('', startTag);

  _.each(requires, function(req) {
    _.each(importPaths, function(ipt) {
      tmp = glob.sync(path.join(ipt, req, '_bootstrap.s{c,a}ss'), globOpts);
      return !tmp.length;
    });

    req = tmp.length ? path.join(req, 'bootstrap') : req;

    result.push('@import "' + req + '"' + (isSass ? '' : ';'));
  });

  result.push(endTag, '');

  return result.join(helper.EOL);
}

function removeBootBlock (content) {
  return content.replace(sassReg, '');
}

function addBootBlock (content, imports) {
  // 在 content 中的第一个 @import 下面 或最上面 注入 require 的文件
  if (importReg.test(content)) {
    return content.replace(importReg, function(raw) { return raw + imports; });
  } else {
    return imports + content;
  }
}


function Bootstrap(sassDir, options) {
  var root = sassDir;

  // sass 文件
  var sassFiles = glob.sync(root + '/[!_]*.s{a,c}ss', {nodir: true});

  // .require 文件
  var reqGlobOpts = {dot: false, nodir: true};
  var commonRequire = glob.sync(root + '/.require', {dot: true, nodir: true}).shift();

  this.sassFiles = _.map(sassFiles, function(file) {
    var isSass = /\.sass$/.test(file);
    var content, newContent, trippedContent;
    var base = path.basename(file).replace(/\.\w*$/, '');

    // 找到是否有和它重名的 .require 文件
    var reqFile = glob.sync(root + '/' + base + '.require', reqGlobOpts).shift() || commonRequire;

    if (reqFile) {
      content = helper.readFile(file);

      trippedContent = removeBootBlock(content);
      newContent = addBootBlock(trippedContent, getImports(reqFile, isSass, options.importPath));

      if (newContent !== content) {
        watch.addIgnoreFile(path.resolve(file));
        fs.writeFileSync(file, newContent);
        return {path: file, content: trippedContent};
      }
    }

    return false;
  });
}


/**
 * 恢复文件内容
 */
Bootstrap.prototype.recover = function() {
  this.sassFiles.forEach(function(file) {
    if (file) {
      watch.addIgnoreFile(path.resolve(file.path));
      fs.writeFileSync(file.path, file.content);
    }
  });
};

module.exports = Bootstrap;
