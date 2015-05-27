/*
 * post-web
 * https://github.com/qiu8310/post-web
 *
 * Copyright (c) 2015 Zhonglei Qiu
 * Licensed under the MIT license.
 */

var postcss = require('postcss'),
  path = require('path'),
  fs = require('fs-extra'),
  _ = require('lodash'),
  glob = require('glob'),
  CleanCss = require('clean-css');

var cssgrace = require('cssgrace'),
  cssnext = require('cssnext');

function css(options, next) {

  var minify = ('minify' in options.css) ? options.css.minify : options.minify;
  var cssDirs = [];
  var cssDistDir = options.cssDistDir;

  if (options.compass.cssDir) {
    // compass 下的所有目录都是相对于 projectDir 的，而不是当前目录
    cssDirs.push(path.join(options.projectDir, options.compass.cssDir));
  }

  if (options.cssDir) {
    cssDirs.push(options.cssDir);
  }

  if (!cssDirs.length) {
    return next();
  }

  // autoprefixer
  // https://github.com/ai/browserslist
  var browsers = ['last 10 versions', 'Chrome >= 20', 'Android >= 20', 'Firefox >= 20'];
  if (options.mobile) { browsers = ['last 2 versions', 'Android >= 20', 'Chrome >= 20']; }

  // cleanCss 的兼容属性
  var compat = {};
  if (!options.mobile) {
    compat.compatibility = [
      'ie8',
      '+properties.backgroundSizeMerging',
      '+properties.iePrefixHack',
      '+properties.ieSuffixHack'].join(',')
  }


  var process = function (cssDir, cssFile) {
    var content = fs.readFileSync(cssFile).toString();

    // postcss 的 plugins
    var plugins = [
      require('postcss-colormin'),
      cssnext(_.assign({ browsers: browsers }, options.cssnext))
    ].concat(options.css.plugins || []);

    if (!options.mobile) {
      plugins.push(function(css) { return cssgrace.postcss(css, {from: cssFile}); });
    }

    console.out('postcss', cssFile);
    content = postcss(plugins).process(content).css;


    if (minify) {
      console.out('cssmin', cssFile);
      content = new CleanCss(_.assign({

        // advanced: false,
        relativeTo: path.dirname(cssFile)

      }, compat, options.cleanCss)).minify(content).styles;
    }

    cssFile = path.join(cssDistDir, path.relative(cssDir, cssFile));
    console.out('save', cssFile);
    fs.writeFileSync(cssFile, content);
  };

  cssDirs.forEach(function(cssDir) {
    glob.sync(cssDir + '/**.css').forEach(function(cssFile) {
      process(cssDir, cssFile);
    });
  });

  if (options.compass.cssDir) {
    console.out('remove', cssDirs[0]);
    fs.removeSync(cssDirs[0]);
  }
  next();
}

module.exports = css;

